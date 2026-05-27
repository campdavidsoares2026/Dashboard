// ─────────────────────────────────────────────────────────────────────
// Meta Marketing API integration layer
// Token → validate → list adaccounts → fetch insights+creatives → upsert Supabase
// ─────────────────────────────────────────────────────────────────────

const META_CONFIG_KEY = "meta_config_v1";
const META_BASE = "https://graph.facebook.com/v20.0";

function getMetaConfig() {
  try { return JSON.parse(localStorage.getItem(META_CONFIG_KEY) || "{}"); } catch { return {}; }
}
function saveMetaConfig(cfg) {
  try { localStorage.setItem(META_CONFIG_KEY, JSON.stringify(cfg)); } catch {}
}

// ─── Low-level fetch ──────────────────────────────────────────────────
async function metaFetch(path, params, token) {
  const url = new URL(`${META_BASE}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  Object.entries(params || {}).forEach(([k, v]) =>
    url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v))
  );
  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.error) {
    const e = json.error;
    throw new Error(`Meta API [${e.code}]: ${e.message}`);
  }
  return json;
}

// auto-paginate through all pages (up to 10 k rows)
async function metaFetchAll(path, params, token) {
  const out = [];
  let data = await metaFetch(path, { ...params, limit: 500 }, token);
  if (Array.isArray(data.data)) out.push(...data.data);
  while (data.paging?.next && out.length < 10000) {
    const next = new URL(data.paging.next);
    const p = {};
    next.searchParams.forEach((v, k) => { if (k !== "access_token") p[k] = v; });
    data = await metaFetch(path, p, token);
    if (Array.isArray(data.data)) out.push(...data.data);
  }
  return out;
}

// ─── Validate token ───────────────────────────────────────────────────
async function validateMetaToken(token) {
  return metaFetch("me", { fields: "id,name" }, token);
}

// ─── Fetch ad accounts ────────────────────────────────────────────────
async function fetchAdAccounts(token) {
  const data = await metaFetch("me/adaccounts", {
    fields: "id,name,account_id,account_status,currency,timezone_name,amount_spent,spend_cap",
    limit: 100,
  }, token);
  // status 1 = ACTIVE
  return (data.data || []).filter(a => Number(a.account_status) === 1);
}

// ─── Fetch daily insights ─────────────────────────────────────────────
async function fetchInsights(accountId, since, until, token, eqAction) {
  const fields = [
    "spend", "impressions", "reach", "clicks", "ctr", "cpm", "cpc",
    "actions", "date_start", "date_stop",
  ].join(",");

  const rows = await metaFetchAll(`${accountId}/insights`, {
    fields,
    time_increment: 1,
    time_range: { since, until },
    level: "account",
  }, token);

  return rows.map(r => {
    const actions = Array.isArray(r.actions) ? r.actions : [];
    const getAction = (type) => {
      const found = actions.find(a => a.action_type === type);
      return found ? parseFloat(found.value || "0") : 0;
    };
    const spend = parseFloat(r.spend || 0);
    const eq = getAction(eqAction);
    const leads = getAction("lead") || getAction("offsite_conversion.fb_pixel_lead") || eq;
    const cpee = eq > 0 ? spend / eq : 0;
    return {
      data: r.date_start,
      account_id: accountId,
      spend,
      impressoes: parseInt(r.impressions || 0, 10),
      alcance: parseInt(r.reach || 0, 10),
      cliques: parseInt(r.clicks || 0, 10),
      ctr: parseFloat(r.ctr || 0),
      cpc: parseFloat(r.cpc || 0),
      cpm: parseFloat(r.cpm || 0),
      eq,
      leads,
      cpee,
      cpl: leads > 0 ? spend / leads : 0,
    };
  });
}

// ─── Fetch ad creatives ───────────────────────────────────────────────
async function fetchCreatives(accountId, since, until, token, eqAction) {
  let rows;
  try {
    rows = await metaFetchAll(`${accountId}/ads`, {
      fields: [
        "id", "name", "status",
        "creative{id,thumbnail_url,image_url,video_id,title,body}",
        `insights.date_preset(last_30d){spend,ctr,impressions,cpc,cpm,actions}`,
      ].join(","),
      effective_status: ["ACTIVE", "PAUSED"],
    }, token);
  } catch {
    return []; // creatives are non-critical
  }

  return rows.map(row => {
    const ins = row.insights?.data?.[0] || {};
    const spend = parseFloat(ins.spend || 0);
    const actions = Array.isArray(ins.actions) ? ins.actions : [];
    const getAction = (type) => {
      const f = actions.find(a => a.action_type === type);
      return f ? parseFloat(f.value || "0") : 0;
    };
    const eq = getAction(eqAction);
    const leads = getAction("lead") || getAction("offsite_conversion.fb_pixel_lead") || eq;
    const cpee = eq > 0 ? spend / eq : 0;
    const creative = row.creative || {};
    const imageUrl = creative.thumbnail_url || creative.image_url || null;
    const isVideo = !!creative.video_id;
    const thumb = isVideo ? "video" : "static";
    const status = cpee > 0 && cpee <= 27 ? "winner" : cpee > 35 ? "loser" : "stable";
    return {
      id: row.id,
      nome: row.name || row.id,
      account_id: accountId,
      thumb,
      spend,
      leads,
      cpee,
      ctr: parseFloat(ins.ctr || 0),
      status,
      image_url: imageUrl,
    };
  }).filter(c => c.spend > 0 || c.id);
}

// ─── Upsert to Supabase ───────────────────────────────────────────────
async function upsertToSupabase(client, { accountRows, snapshots, creatives }, onProgress) {
  const errors = [];
  let accountsUpserted = 0, snapshotsUpserted = 0, creativesUpserted = 0;

  if (accountRows.length > 0) {
    onProgress("Salvando metricas_conta…");
    const { error } = await client
      .from("metricas_conta")
      .upsert(accountRows, { onConflict: "account_id" });
    if (error) errors.push(`metricas_conta: ${error.message}`);
    else accountsUpserted = accountRows.length;
  }

  if (snapshots.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < snapshots.length; i += CHUNK) {
      const chunk = snapshots.slice(i, i + CHUNK);
      onProgress(`Snapshots: ${Math.min(i + CHUNK, snapshots.length)} / ${snapshots.length}`);
      const { error } = await client
        .from("snapshots_diarios")
        .upsert(chunk, { onConflict: "data,account_id" });
      if (error) {
        errors.push(`snapshots_diarios (bloco ${Math.floor(i / CHUNK) + 1}): ${error.message}`);
        // first chunk fail = likely missing constraint — warn once
        if (i === 0) break;
      } else {
        snapshotsUpserted += chunk.length;
      }
    }
  }

  if (creatives.length > 0) {
    onProgress(`Salvando ${creatives.length} criativos…`);
    const { error } = await client
      .from("criativos_performance")
      .upsert(creatives, { onConflict: "id" });
    if (error) errors.push(`criativos_performance: ${error.message}`);
    else creativesUpserted = creatives.length;
  }

  return { accountsUpserted, snapshotsUpserted, creativesUpserted, errors };
}

// ─── EQ action type options ───────────────────────────────────────────
const META_ACTION_TYPES = [
  { value: "lead",                                   label: "Lead (formulário Meta)" },
  { value: "offsite_conversion.fb_pixel_lead",       label: "Pixel Lead (off-site)" },
  { value: "onsite_conversion.lead_grouped",         label: "Lead Agrupado (on-site)" },
  { value: "landing_page_view",                      label: "Visualização de LP" },
  { value: "post_engagement",                        label: "Engajamento no Post" },
  { value: "page_engagement",                        label: "Engajamento na Página" },
  { value: "link_click",                             label: "Clique no Link" },
];

// ─── useMetaImport hook ───────────────────────────────────────────────
function useMetaImport(supabaseClient) {
  const saved = getMetaConfig();
  const [step, setStep] = React.useState(0);
  const [token, setToken] = React.useState(saved.token || "");
  const [showToken, setShowToken] = React.useState(false);
  const [eqAction, setEqAction] = React.useState(saved.eqAction || "lead");
  const [since, setSince] = React.useState("2026-01-01");
  const [until, setUntil] = React.useState("2026-05-17");
  const [metaAccounts, setMetaAccounts] = React.useState([]);
  const [selected, setSelected] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [log, setLog] = React.useState([]);
  const [progress, setProgress] = React.useState("");
  const [results, setResults] = React.useState(null);
  const [error, setError] = React.useState(null);

  const addLog = (msg) =>
    setLog(prev => [...prev, { t: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), msg }]);

  const validateToken = async () => {
    setLoading(true); setError(null);
    try {
      addLog("Validando token…");
      const me = await validateMetaToken(token);
      addLog(`✓ Token válido — ${me.name} (${me.id})`);
      const accts = await fetchAdAccounts(token);
      addLog(`✓ ${accts.length} conta(s) ativa(s) encontrada(s)`);
      saveMetaConfig({ token, eqAction });
      setMetaAccounts(accts);
      setSelected(accts.map(a => a.id));
      setStep(1);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const runImport = async () => {
    if (!supabaseClient) { setError("Conecte ao Supabase antes de importar"); return; }
    setStep(2); setLog([]); setResults(null); setError(null);
    const allSnapshots = [], allCreatives = [], accountRows = [];
    try {
      for (const accId of selected) {
        const acc = metaAccounts.find(a => a.id === accId);
        const label = acc?.name || accId;
        addLog(`Buscando insights: ${label}`);
        setProgress(`Insights · ${label}`);
        const snaps = await fetchInsights(accId, since, until, token, eqAction);
        allSnapshots.push(...snaps);
        addLog(`  ✓ ${snaps.length} dias`);

        // build metricas_conta row from period totals
        const totalSpend = snaps.reduce((s, r) => s + r.spend, 0);
        const totalEq    = snaps.reduce((s, r) => s + r.eq, 0);
        const totalLeads = snaps.reduce((s, r) => s + r.leads, 0);
        const cpee = totalEq > 0 ? totalSpend / totalEq : 0;
        accountRows.push({
          account_id: accId,
          nome: label,
          regiao: "—",
          meta_mensal: 0,
          budget_diario: 0,
          campanhas_ativas: 0,
          cpee,
          classificacao_cpee: classifyCpee(cpee),
          spend: totalSpend,
          leads: totalLeads,
          eq: totalEq,
          executado_em: new Date().toISOString(),
        });

        addLog(`Buscando criativos: ${label}`);
        setProgress(`Criativos · ${label}`);
        const crs = await fetchCreatives(accId, since, until, token, eqAction);
        allCreatives.push(...crs);
        addLog(`  ✓ ${crs.length} criativos`);
      }

      setProgress("Salvando no Supabase…");
      addLog("Salvando no Supabase…");
      const res = await upsertToSupabase(
        supabaseClient,
        { accountRows, snapshots: allSnapshots, creatives: allCreatives },
        (msg) => { setProgress(msg); addLog(msg); }
      );
      res.errors.forEach(e => addLog(`⚠ ${e}`));
      addLog("✓ Importação concluída");
      setResults(res);
      setStep(3);
    } catch (e) {
      addLog(`✗ ${e.message}`);
      setError(e.message);
    }
  };

  const reset = () => { setStep(0); setError(null); setLog([]); setResults(null); };

  return {
    step, setStep, token, setToken, showToken, setShowToken,
    eqAction, setEqAction, since, setSince, until, setUntil,
    metaAccounts, selected, setSelected,
    loading, log, progress, results, error,
    validateToken, runImport, reset,
  };
}

// ─── MetaImportModal ──────────────────────────────────────────────────
function MetaImportModal({ open, onClose, supabaseClient, onImportDone }) {
  const m = useMetaImport(supabaseClient);
  const logRef = React.useRef(null);
  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [m.log]);

  if (!open) return null;

  const STEPS = ["Token", "Contas", "Importando", "Concluído"];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal meta-modal" onClick={e => e.stopPropagation()}>
        {/* head */}
        <div className="modal-head">
          <div>
            <h3 className="modal-title">
              <span style={{ color: "var(--accent-cold)", marginRight: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: "middle" }}>
                  <rect x="2" y="3" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 3v16M2 10h20" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </span>
              Importar do Meta Ads
            </h3>
            <p className="modal-sub">
              Busca insights diários, contas e criativos via Marketing API v20 e salva no Supabase
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* step bar */}
        <div className="meta-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`meta-step${m.step === i ? " active" : ""}${m.step > i ? " done" : ""}`}>
              <div className="meta-step-num">{m.step > i ? "✓" : i + 1}</div>
              <div className="meta-step-lbl">{s}</div>
            </div>
          ))}
        </div>

        <div className="modal-body">

          {/* ── STEP 0: Token ─────────────────────────────────────── */}
          {m.step === 0 && (
            <>
              <div className="meta-info-box">
                <div className="meta-info-title">Como obter o Access Token</div>
                <ol className="meta-info-ol">
                  <li>Acesse <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="meta-link">Meta Graph API Explorer →</a></li>
                  <li>Selecione seu App → clique em <b>Generate Access Token</b></li>
                  <li>Permissões necessárias: <code>ads_read</code> + <code>ads_management</code></li>
                  <li>Para token de longa duração use o <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noreferrer" className="meta-link">Token Debugger →</a></li>
                </ol>
              </div>

              <label className="field">
                <span className="field-label">
                  User Access Token
                  <button type="button" className="field-toggle" onClick={() => m.setShowToken(!m.showToken)}>
                    {m.showToken ? "ocultar" : "mostrar"}
                  </button>
                </span>
                <input
                  className="field-input field-mono"
                  type={m.showToken ? "text" : "password"}
                  placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx…"
                  value={m.token}
                  onChange={e => m.setToken(e.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                />
              </label>

              <label className="field">
                <span className="field-label">Métrica EQ — Engajamento Qualificado</span>
                <select className="field-input" value={m.eqAction} onChange={e => m.setEqAction(e.target.value)}>
                  {META_ACTION_TYPES.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </label>

              <div className="meta-date-row">
                <label className="field">
                  <span className="field-label">De</span>
                  <input type="date" className="field-input" value={m.since}
                    onChange={e => m.setSince(e.target.value)} max={m.until} />
                </label>
                <label className="field">
                  <span className="field-label">Até</span>
                  <input type="date" className="field-input" value={m.until}
                    onChange={e => m.setUntil(e.target.value)} min={m.since} />
                </label>
              </div>

              {m.error && <div className="status-line status-err">✗ {m.error}</div>}
              {m.log.length > 0 && (
                <div className="meta-log" ref={logRef} style={{ maxHeight: 80 }}>
                  {m.log.map((l, i) => (
                    <div key={i} className={`meta-log-line${l.msg.startsWith("✓") ? " ok" : l.msg.startsWith("✗") ? " err" : ""}`}>
                      <span className="meta-log-t">{l.t}</span> {l.msg}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── STEP 1: Accounts ──────────────────────────────────── */}
          {m.step === 1 && (
            <>
              <div className="field-label" style={{ marginBottom: 8 }}>
                {m.selected.length} de {m.metaAccounts.length} conta(s) selecionada(s)
              </div>
              <div className="meta-accts">
                {m.metaAccounts.map(acc => {
                  const checked = m.selected.includes(acc.id);
                  return (
                    <label key={acc.id} className={`meta-acct${checked ? " checked" : ""}`}>
                      <input
                        type="checkbox"
                        className="meta-acct-check"
                        checked={checked}
                        onChange={e => m.setSelected(prev =>
                          e.target.checked ? [...prev, acc.id] : prev.filter(x => x !== acc.id)
                        )}
                      />
                      <div className="meta-acct-body">
                        <div className="meta-acct-name">{acc.name}</div>
                        <div className="meta-acct-id">{acc.id} · {acc.currency || "BRL"} · {acc.timezone_name || ""}</div>
                      </div>
                      <div className="meta-acct-spent">
                        {parseFloat(acc.amount_spent || 0).toLocaleString("pt-BR", {
                          style: "currency", currency: acc.currency || "BRL", maximumFractionDigits: 0
                        })}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="meta-range-chip">
                <span>📅 {m.since} → {m.until}</span>
                <span>·</span>
                <span>EQ: {META_ACTION_TYPES.find(a => a.value === m.eqAction)?.label}</span>
              </div>

              <div className="meta-schema-warn">
                <div className="meta-schema-warn-title">⚠ Antes de importar — rode este SQL no Supabase:</div>
                <pre className="meta-sql">{`ALTER TABLE metricas_conta
  ADD CONSTRAINT IF NOT EXISTS metricas_conta_account_id_key
  UNIQUE (account_id);

ALTER TABLE snapshots_diarios
  ADD CONSTRAINT IF NOT EXISTS snapshots_diarios_data_acct_key
  UNIQUE (data, account_id);

ALTER TABLE criativos_performance
  ADD CONSTRAINT IF NOT EXISTS criativos_perf_id_key
  UNIQUE (id);`}</pre>
                <button
                  className="meta-copy-btn"
                  onClick={() => {
                    const sql = `ALTER TABLE metricas_conta\n  ADD CONSTRAINT IF NOT EXISTS metricas_conta_account_id_key\n  UNIQUE (account_id);\n\nALTER TABLE snapshots_diarios\n  ADD CONSTRAINT IF NOT EXISTS snapshots_diarios_data_acct_key\n  UNIQUE (data, account_id);\n\nALTER TABLE criativos_performance\n  ADD CONSTRAINT IF NOT EXISTS criativos_perf_id_key\n  UNIQUE (id);`;
                    navigator.clipboard?.writeText(sql).catch(() => {});
                  }}
                >
                  Copiar SQL
                </button>
              </div>

              {m.error && <div className="status-line status-err">✗ {m.error}</div>}
            </>
          )}

          {/* ── STEP 2: Importing ─────────────────────────────────── */}
          {m.step === 2 && (
            <>
              <div className="meta-importing-header">
                <div className="meta-spinner" />
                <span className="meta-progress-text">{m.progress || "Iniciando…"}</span>
              </div>
              <div className="meta-log" ref={logRef}>
                {m.log.map((l, i) => (
                  <div key={i} className={`meta-log-line${l.msg.startsWith("✓") ? " ok" : l.msg.startsWith("✗") || l.msg.startsWith("⚠") ? " err" : ""}`}>
                    <span className="meta-log-t">{l.t}</span> {l.msg}
                  </div>
                ))}
                {m.log.length === 0 && <div className="meta-log-line">Aguardando…</div>}
              </div>
              {m.error && <div className="status-line status-err" style={{ marginTop: 10 }}>✗ {m.error}</div>}
            </>
          )}

          {/* ── STEP 3: Done ──────────────────────────────────────── */}
          {m.step === 3 && m.results && (
            <>
              <div className="meta-done">
                <div className="meta-done-icon">✓</div>
                <div className="meta-done-title">Importação concluída!</div>
                <div className="meta-done-stats">
                  <div className="meta-done-stat">
                    <span className="meta-done-num">{m.results.accountsUpserted}</span>
                    <span>contas</span>
                  </div>
                  <div className="meta-done-sep">·</div>
                  <div className="meta-done-stat">
                    <span className="meta-done-num">{m.results.snapshotsUpserted}</span>
                    <span>snapshots</span>
                  </div>
                  <div className="meta-done-sep">·</div>
                  <div className="meta-done-stat">
                    <span className="meta-done-num">{m.results.creativesUpserted}</span>
                    <span>criativos</span>
                  </div>
                </div>
                {m.results.errors.length > 0 && (
                  <div className="status-warnings" style={{ width: "100%", marginTop: 12, textAlign: "left" }}>
                    <div className="status-warnings-title">⚠ {m.results.errors.length} aviso(s)</div>
                    {m.results.errors.map((e, i) => (
                      <div key={i} className="status-warning">· {e}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="meta-log" ref={logRef} style={{ maxHeight: 140 }}>
                {m.log.map((l, i) => (
                  <div key={i} className={`meta-log-line${l.msg.startsWith("✓") ? " ok" : l.msg.startsWith("✗") || l.msg.startsWith("⚠") ? " err" : ""}`}>
                    <span className="meta-log-t">{l.t}</span> {l.msg}
                  </div>
                ))}
              </div>
            </>
          )}

        </div>{/* modal-body */}

        <div className="modal-foot">
          {m.step === 3 && (
            <button className="btn-ghost" onClick={m.reset}>Nova importação</button>
          )}
          {m.step === 1 && (
            <button className="btn-ghost" onClick={() => m.setStep(0)}>← Voltar</button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {m.step === 3 ? (
              <button className="btn-primary" onClick={() => { onImportDone?.(); onClose(); }}>
                ✓ Ver dados atualizados
              </button>
            ) : m.step === 0 ? (
              <button className="btn-primary" onClick={m.validateToken}
                disabled={!m.token || m.loading}>
                {m.loading ? "Validando…" : "Conectar →"}
              </button>
            ) : m.step === 1 ? (
              <button className="btn-primary" onClick={m.runImport}
                disabled={m.selected.length === 0}>
                Importar {m.selected.length} conta(s) →
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  MetaImportModal,
  getMetaConfig,
  saveMetaConfig,
  META_ACTION_TYPES,
});
