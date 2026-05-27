// ─────────────────────────────────────────────────────────────────────
// Backend integration layer (patched for production)
// ─────────────────────────────────────────────────────────────────────
// Originally this file connected directly to Supabase. In production we
// route through the FastAPI backend at /api/dashboard/data which already
// returns the normalized shape { accounts, daily, recs, creatives, clusters }.
// Public surface is preserved 1:1 so app.jsx/meta.jsx need no changes.
//
// Status values: "mock" | "loading" | "connected" | "error"

const SUPA_CONFIG_KEY = "supabase_config_v1";

// Backend base URL — can be overridden via window.__API_BASE__ before this script loads
const API_BASE = (typeof window !== "undefined" && window.__API_BASE__)
  || "https://backend-psi-orpin-13.vercel.app";

function isBadConfigUrl(url) {
  if (!url) return true;
  // Reject insecure (http://) or local/private IPs — production must use the backend
  if (url.startsWith("http://")) return true;
  if (/\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|0\.0\.0\.0)/.test(url)) return true;
  return false;
}

function getSupaConfig() {
  // Auto-enable backend mode unless explicitly configured with a valid Supabase URL.
  try {
    const stored = JSON.parse(localStorage.getItem(SUPA_CONFIG_KEY) || "{}") || {};
    // If stored URL is bad (HTTP, local IP), overwrite with backend default
    if (stored.url && isBadConfigUrl(stored.url)) {
      const fresh = { url: API_BASE, key: "backend" };
      try { localStorage.setItem(SUPA_CONFIG_KEY, JSON.stringify(fresh)); } catch {}
      return fresh;
    }
    if (stored.url || stored.key) return stored;
  } catch {}
  // Default: connect via backend (sentinel values trigger the fetcher)
  return { url: API_BASE, key: "backend" };
}

function saveSupaConfig(cfg) {
  try {
    localStorage.setItem(SUPA_CONFIG_KEY, JSON.stringify(cfg || {}));
  } catch {}
}

// ─── Normalizers (defensive parsing on the client side) ─────────────
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

// ─── Fetcher: BACKEND-FIRST, Supabase fallback ─────────────────────
async function fetchFromBackend(baseUrl) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/dashboard/data`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) {
    let detail;
    try { detail = (await res.json()).detail; } catch {}
    throw new Error(`Backend ${res.status}: ${detail || res.statusText}`);
  }
  const d = await res.json();
  // Dedup accounts by account_id
  const seen = new Set();
  const accounts = (d.accounts || [])
    .map(normalizeAccount)
    .filter(a => a.account_id && !seen.has(a.account_id) && seen.add(a.account_id));
  return {
    accounts,
    daily: (d.daily || []).map(normalizeSnapshot),
    recs: (d.recs || []).map(normalizeRec),
    creatives: (d.creatives || []).map(normalizeCreative),
    clusters: (d.clusters || []).map(normalizeCluster),
    warnings: [],
  };
}

async function fetchFromSupabase(client) {
  const queries = await Promise.allSettled([
    client.from("metricas_conta").select("*"),
    client.from("snapshots_diarios").select("*").order("data", { ascending: true }).limit(20000),
    client.from("recomendacoes").select("*").order("criado_em", { ascending: false }).limit(200),
    client.from("criativos_performance").select("*").order("spend", { ascending: false }).limit(50),
    client.from("clusters_performance").select("*").limit(200),
  ]);
  const [acctsR, snapsR, recsR, creatR, clustR] = queries;
  const acctsOk = acctsR.status === "fulfilled" && !acctsR.value.error;
  if (!acctsOk) {
    const msg = acctsR.status === "rejected"
      ? String(acctsR.reason)
      : (acctsR.value.error?.message || "Tabela metricas_conta não encontrada");
    throw new Error(msg);
  }
  const _rawAccounts = (acctsR.value.data || []).map(normalizeAccount);
  const _seenAccts = new Set();
  const accounts = _rawAccounts.filter(a => a.account_id && !_seenAccts.has(a.account_id) && _seenAccts.add(a.account_id));

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

// Top-level fetcher: decides between backend and Supabase based on config.
async function fetchAllData(config) {
  const usingBackend = !config.key || config.key === "backend" || /backend-psi-orpin|vercel\.app/.test(config.url || "");
  if (usingBackend) {
    return fetchFromBackend(config.url || API_BASE);
  }
  if (!window.supabase || !window.supabase.createClient) {
    throw new Error("SDK Supabase não está disponível (verifique se o script CDN carregou)");
  }
  const client = window.supabase.createClient(config.url, config.key, { auth: { persistSession: false } });
  return fetchFromSupabase(client);
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
    if (!config.url) {
      setStatus("mock");
      setError(null);
      setWarnings([]);
      setLiveData(null);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError(null);
    setWarnings([]);

    fetchAllData(config)
      .then((d) => {
        if (cancelled) return;
        if (!d.accounts || d.accounts.length === 0) {
          setLiveData(null);
          setStatus("mock");
          setWarnings(["Backend retornou 0 contas — exibindo dados de demonstração"]);
        } else {
          setLiveData(d);
          setStatus("connected");
          setWarnings(d.warnings || []);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || String(e));
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [config.url, config.key, tick]);

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

  const handleSave = () => onSave({ url: url.trim(), key: key.trim() });
  const handleUseBackend = () => onSave({ url: API_BASE, key: "backend" });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal supa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">Fonte de dados</h3>
            <p className="modal-sub">Conecte via Backend (Meta Ads sincronizado) ou Supabase direto.</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="schema-hint" style={{ marginBottom: 12 }}>
            <div className="schema-hint-title">Modo recomendado: Backend</div>
            <div className="schema-hint-foot">
              Usa <code>{API_BASE}/api/dashboard/data</code> — 75 campanhas Meta Ads já sincronizadas.
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn-primary" onClick={handleUseBackend}>Usar Backend</button>
            </div>
          </div>

          <label className="field">
            <span className="field-label">Project URL (Supabase ou Backend)</span>
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
              Anon public key (ou "backend")
              <button type="button" className="field-toggle" onClick={() => setShowKey(!showKey)}>
                {showKey ? "ocultar" : "mostrar"}
              </button>
            </span>
            <input
              type={showKey ? "text" : "password"}
              className="field-input field-mono"
              placeholder='eyJhbGciOi… ou "backend"'
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
          </label>

          {status === "connected" && <div className="status-line status-ok">✓ Conectado · dados carregados</div>}
          {status === "loading" && <div className="status-line status-loading">⟳ Buscando dados…</div>}
          {status === "error" && error && <div className="status-line status-err">⚠ {error}</div>}
          {warnings && warnings.length > 0 && (
            <div className="status-warnings">
              <div className="status-warnings-title">Avisos:</div>
              {warnings.map((w, i) => <div key={i} className="status-warning">· {w}</div>)}
            </div>
          )}
        </div>

        <div className="modal-foot">
          {config.url && <button className="btn-ghost" onClick={onDisconnect}>Desconectar</button>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={!url}>Conectar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared client factory (used by meta.jsx for Supabase write ops) ─
function getSupabaseClient() {
  const cfg = getSupaConfig();
  if (!cfg.url || !cfg.key || cfg.key === "backend") return null;
  if (!window.supabase?.createClient) return null;
  try {
    return window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
  } catch { return null; }
}

Object.assign(window, {
  useDashboardData,
  SupabaseSettings,
  getSupaConfig,
  saveSupaConfig,
  getSupabaseClient,
});
