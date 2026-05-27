// ─────────────────────────────────────────────────────────────────────
// Supabase integration layer
// ─────────────────────────────────────────────────────────────────────
// Public surface (exposed on window):
//   useDashboardData()  → { accounts, daily, recs, creatives, clusters, config, setConfig, status, error, refresh, disconnect }
//   SupabaseSettings    → modal component for URL + anon key
//   getSupaConfig(), saveSupaConfig()
//
// Status values: "mock" | "loading" | "connected" | "error"
//
// Column mapping is defensive: alternative names are accepted (spend/gasto,
// impressoes/impressions, cliques/clicks, etc.). Adjust normalize* funcs
// below to match your exact schema if needed.

const SUPA_CONFIG_KEY = "supabase_config_v1";

function getSupaConfig() {
  try {
    return JSON.parse(localStorage.getItem(SUPA_CONFIG_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveSupaConfig(cfg) {
  try {
    localStorage.setItem(SUPA_CONFIG_KEY, JSON.stringify(cfg || {}));
  } catch {}
}

// ─── Normalizers ─────────────────────────────────────────────────────
function n(v, def = 0) { const x = Number(v); return isNaN(x) ? def : x; }

function normalizeAccount(row) {
  return {
    account_id: row.account_id || row.id || row.act_id,
    nome: row.nome || row.name || row.account_name || row.conta || "—",
    regiao: row.regiao || row.region || row.uf || row.sigla || "—",
    meta_mensal: n(row.meta_mensal || row.monthly_target || row.budget_mensal || row.meta),
    budget_diario: n(row.budget_diario || row.budget_atual || row.daily_budget || row.budget),
    campanhas_ativas: n(row.campanhas_ativas || row.active_campaigns || row.num_campanhas, 0),
  };
}

function normalizeSnapshot(row) {
  const date = row.data || row.date || row.dia;
  return {
    data: typeof date === "string" ? date.slice(0, 10) : (date instanceof Date ? date.toISOString().slice(0, 10) : ""),
    account_id: row.account_id || row.act_id,
    regiao: row.regiao || row.region || "",
    spend: n(row.spend ?? row.gasto ?? row.investimento),
    impressoes: n(row.impressoes ?? row.impressions ?? row.imp),
    alcance: n(row.alcance ?? row.reach),
    cliques: n(row.cliques ?? row.clicks),
    eq: n(row.eq ?? row.engajamento_qualificado ?? row.qualified_engagement),
    leads: n(row.leads ?? row.conversions ?? row.conversoes),
    ctr: n(row.ctr),
    cpc: n(row.cpc),
    cpm: n(row.cpm),
    cpl: n(row.cpl),
    cpee: n(row.cpee),
  };
}

function normalizeRec(row) {
  const sev = (row.severidade || row.severity || "media").toLowerCase();
  return {
    id: row.id || row.rec_id,
    severidade: ["alta", "media", "baixa"].includes(sev) ? sev : "media",
    account_id: row.account_id || row.act_id,
    titulo: row.titulo || row.title || "—",
    descricao: row.descricao || row.description || "",
    impacto_estimado: row.impacto_estimado || row.impact || "—",
    confianca: n(row.confianca ?? row.confidence ?? 0.7, 0.7),
    criado_em: row.criado_em || row.created_at || new Date().toISOString(),
  };
}

function normalizeCreative(row) {
  const kindRaw = (row.pauta || row.thumb || row.tipo || row.creative_type || "EST").toUpperCase();
  const thumb = kindRaw.includes("VID") ? "video"
    : kindRaw.includes("CAR") ? "carousel"
    : kindRaw.includes("UGC") ? "ugc"
    : "static";
  // classificacao: QUENTE→winner, FRIO→loser, MORNO→stable
  const classif = (row.classificacao || row.status || "MORNO").toUpperCase();
  const status = classif.startsWith("Q") || classif === "WINNER" ? "winner"
    : classif.startsWith("F") || classif === "LOSER" ? "loser"
    : "stable";
  return {
    id: row.ad_id || row.id || row.creative_id,
    nome: row.ad_nome || row.nome || row.name || row.creative_name || "—",
    account_id: row.account_id || row.act_id,
    thumb,
    spend: n(row.spend ?? row.gasto),
    leads: n(row.leads ?? row.conversions),
    cpee: n(row.cpee),
    ctr: n(row.ctr),
    status,
    image_url: row.thumbnail_url || row.image_url || row.preview_url || null,
  };
}

function normalizeCluster(row) {
  const tipoRaw = (row.classificacao || row.tipo || row.classificacao_cpee || "").toString().toUpperCase();
  const tipo = tipoRaw.startsWith("Q") || tipoRaw === "HOT" ? "QUENTE"
    : tipoRaw.startsWith("M") || tipoRaw === "WARM" ? "MORNO"
    : tipoRaw.startsWith("F") || tipoRaw === "COLD" ? "FRIO"
    : "MORNO";
  const tendRaw = (row.tendencia || row.trend || "stable").toLowerCase();
  let tendencia = ["up", "alta"].includes(tendRaw) ? "up"
    : ["down", "queda", "baixa"].includes(tendRaw) ? "down"
    : "stable";
  if (tendencia === "stable" && n(row.cpee_7d) > 0 && n(row.cpee_30d) > 0) {
    const change = (n(row.cpee_7d) - n(row.cpee_30d)) / n(row.cpee_30d);
    tendencia = change > 0.1 ? "down" : change < -0.1 ? "up" : "stable";
  }
  return {
    id: row.adset_id || row.id || row.cluster_id,
    nome: row.cluster_nome || row.nome || row.name || row.cluster_name || "—",
    tipo,
    account_id: row.account_id,
    regiao: row.regiao || row.region || "—",
    cpee: n(row.cpee),
    spend: n(row.spend ?? row.gasto),
    eq: n(row.eq ?? row.engajamento_qualificado),
    leads: n(row.leads),
    ctr: n(row.ctr),
    alcance: n(row.alcance ?? row.reach),
    tendencia,
  };
}

// ─── Fetcher ──────────────────────────────────────────────────────────
async function fetchAllData(client) {
  const queries = await Promise.allSettled([
    client.from("metricas_conta").select("*"),
    client.from("snapshots_diarios").select("*").order("data", { ascending: true }).limit(20000),
    client.from("recomendacoes").select("*").order("criado_em", { ascending: false }).limit(200),
    client.from("criativos_performance").select("*").order("spend", { ascending: false }).limit(50),
    client.from("clusters_performance").select("*").limit(200),
  ]);
  const [acctsR, snapsR, recsR, creatR, clustR] = queries;

  // accounts is critical — if missing, treat as error
  const acctsOk = acctsR.status === "fulfilled" && !acctsR.value.error;
  if (!acctsOk) {
    const msg = acctsR.status === "rejected"
      ? String(acctsR.reason)
      : (acctsR.value.error?.message || "Tabela metricas_conta não encontrada");
    throw new Error(msg);
  }
  const accounts = (acctsR.value.data || []).map(normalizeAccount);

  const pickData = (r) => (r.status === "fulfilled" && !r.value.error) ? (r.value.data || []) : [];
  const warnings = [];
  const checkWarn = (r, name) => {
    if (r.status === "rejected") warnings.push(`${name}: ${r.reason}`);
    else if (r.value.error) warnings.push(`${name}: ${r.value.error.message}`);
  };
  checkWarn(snapsR, "snapshots_diarios");
  checkWarn(recsR, "recomendacoes");
  checkWarn(creatR, "criativos_performance");
  checkWarn(clustR, "clusters_performance");

  return {
    accounts,
    daily: pickData(snapsR).map(normalizeSnapshot),
    recs: pickData(recsR).map(normalizeRec),
    creatives: pickData(creatR).map(normalizeCreative),
    clusters: pickData(clustR).map(normalizeCluster),
    warnings,
  };
}

// ─── React hook ──────────────────────────────────────────────────────
function useDashboardData() {
  const [config, setConfigState] = React.useState(getSupaConfig);
  const [status, setStatus] = React.useState("mock");
  const [error, setError] = React.useState(null);
  const [warnings, setWarnings] = React.useState([]);
  const [tick, setTick] = React.useState(0);
  const [liveData, setLiveData] = React.useState(null);

  const mockData = {
    accounts: window.ACCOUNTS,
    daily: window.DAILY,
    recs: window.RECOMENDACOES,
    creatives: window.CRIATIVOS,
    clusters: window.CLUSTERS,
  };

  const setConfig = (next) => {
    saveSupaConfig(next);
    setConfigState(next);
    setLiveData(null);
    setTick((x) => x + 1);
  };
  const disconnect = () => {
    setConfig({ url: "", key: "" });
    setStatus("mock");
    setError(null);
    setWarnings([]);
  };
  const refresh = () => setTick((x) => x + 1);

  React.useEffect(() => {
    if (!config.url || !config.key) {
      setStatus("mock");
      setError(null);
      setWarnings([]);
      setLiveData(null);
      return;
    }
    if (!window.supabase || !window.supabase.createClient) {
      setStatus("error");
      setError("SDK Supabase não está disponível (verifique se o script CDN carregou)");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError(null);
    setWarnings([]);

    let client;
    try {
      client = window.supabase.createClient(config.url, config.key, {
        auth: { persistSession: false },
      });
    } catch (e) {
      setStatus("error");
      setError(e.message || "URL ou anon key inválida");
      return;
    }

    fetchAllData(client)
      .then((d) => {
        if (cancelled) return;
        setLiveData(d);
        setStatus("connected");
        setWarnings(d.warnings || []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || String(e));
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [config.url, config.key, tick]);

  // Pick which dataset to use
  const data = (status === "connected" && liveData) ? liveData : mockData;

  return {
    accounts: data.accounts || [],
    daily: data.daily || [],
    recs: data.recs || [],
    creatives: data.creatives || [],
    clusters: data.clusters || [],
    config,
    setConfig,
    disconnect,
    status,
    error,
    warnings,
    refresh,
  };
}

// ─── Settings Modal ──────────────────────────────────────────────────
function SupabaseSettings({ open, onClose, config, onSave, onDisconnect, status, error, warnings }) {
  const [url, setUrl] = React.useState(config.url || "");
  const [key, setKey] = React.useState(config.key || "");
  const [showKey, setShowKey] = React.useState(false);
  React.useEffect(() => { setUrl(config.url || ""); setKey(config.key || ""); }, [config]);

  if (!open) return null;

  const handleSave = () => {
    onSave({ url: url.trim(), key: key.trim() });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal supa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">Conectar ao Supabase</h3>
            <p className="modal-sub">Cole seu Project URL + chave pública (anon). A chave service_role NUNCA deve ser usada no browser.</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span className="field-label">Project URL</span>
            <input
              type="url"
              className="field-input"
              placeholder="https://xxxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
          </label>
          <label className="field">
            <span className="field-label">
              Anon public key
              <button type="button" className="field-toggle" onClick={() => setShowKey(!showKey)}>
                {showKey ? "ocultar" : "mostrar"}
              </button>
            </span>
            <input
              type={showKey ? "text" : "password"}
              className="field-input field-mono"
              placeholder="eyJhbGciOi…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
          </label>

          <div className="schema-hint">
            <div className="schema-hint-title">Tabelas esperadas</div>
            <ul className="schema-list">
              <li><code>metricas_conta</code> · <em>obrigatória</em> — account_id, nome, regiao, meta_mensal, budget_diario</li>
              <li><code>snapshots_diarios</code> — data, account_id, spend, impressoes, alcance, cliques, eq, leads, cpee, ctr, cpc, cpm</li>
              <li><code>recomendacoes</code> — id, severidade, account_id, titulo, descricao, impacto_estimado, confianca, criado_em</li>
              <li><code>criativos_performance</code> — id, nome, account_id, thumb, spend, leads, cpee, ctr, status, image_url</li>
              <li><code>clusters_performance</code> — id, nome, tipo, account_id, regiao, cpee, spend, eq, leads, ctr, alcance, tendencia</li>
            </ul>
            <div className="schema-hint-foot">RLS deve permitir SELECT com a chave anon. Nomes alternativos (spend/gasto, clicks/cliques, etc.) são aceitos automaticamente.</div>
          </div>

          {status === "connected" && (
            <div className="status-line status-ok">✓ Conectado · dados carregados do Supabase</div>
          )}
          {status === "loading" && (
            <div className="status-line status-loading">⟳ Buscando dados…</div>
          )}
          {status === "error" && error && (
            <div className="status-line status-err">⚠ {error}</div>
          )}
          {warnings && warnings.length > 0 && (
            <div className="status-warnings">
              <div className="status-warnings-title">Avisos:</div>
              {warnings.map((w, i) => <div key={i} className="status-warning">· {w}</div>)}
            </div>
          )}
        </div>

        <div className="modal-foot">
          {config.url && (
            <button className="btn-ghost" onClick={onDisconnect}>Desconectar</button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={!url || !key}>Conectar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  useDashboardData,
  SupabaseSettings,
  getSupaConfig,
  saveSupaConfig,
});
