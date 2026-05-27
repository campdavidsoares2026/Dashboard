// Main dashboard app
const { useState, useEffect, useMemo, useRef } = React;

// ─── Candidato config ──────────────────────────────────────────────
const CANDIDATO = {
  nome: "Dep. Federal David Soares",
  initials: "DS",                  // iniciais para quando não há foto
  partido: "Podemos",
  numero: "20",
  estado: "São Paulo",
  site: "davidsoares.com.br",
  foto: null,                      // substitua por URL real quando disponível
  eleicao: "2026-10-04",
  fase: "Pré-Campanha",            // "Pré-Campanha" | "Campanha"
  teto_precampanha: 300000,
  teto_campanha: 1800000,
};

// ─── Meta budget helpers ───────────────────────────────────────────
function metaBudgetColor(pct) {
  if (pct >= 0.9)  return "critical";  // vermelho + pulso
  if (pct >= 0.6)  return "danger";    // vermelho
  if (pct >= 0.3)  return "warning";   // amarelo
  return "ok";                          // verde
}

function BudgetMetaCard({ label, spend, teto, onEditTeto, badge, badgeVariant, sub, extraLine }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(teto));
  React.useEffect(() => { setDraft(String(teto)); }, [teto]);

  const commit = () => {
    const v = parseFloat(draft.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!isNaN(v) && v > 0 && onEditTeto) onEditTeto(v);
    setEditing(false);
  };

  const pct = teto > 0 ? Math.min(spend / teto, 1) : 0;
  const color = metaBudgetColor(pct);
  return (
    <div className="bmc-card">
      <div className="bmc-head">
        <div className="bmc-label">{label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {badge && <div className={`bmc-badge bmc-badge-${badgeVariant}`}>{badge}</div>}
          {onEditTeto && !editing && (
            <button className="meta-edit-btn" onClick={() => setEditing(true)} title="Editar teto">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83z" fill="currentColor" /></svg>
            </button>
          )}
        </div>
      </div>
      {editing ? (
        <div className="meta-edit-row" style={{ marginBottom: 4 }}>
          <span className="meta-edit-prefix">R$</span>
          <input type="text" className="meta-edit-input" value={draft} autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(String(teto)); setEditing(false); } }} />
          <button className="btn-primary" onClick={commit} style={{ fontSize: 11, padding: "3px 8px" }}>Salvar</button>
          <button className="btn-ghost" onClick={() => { setDraft(String(teto)); setEditing(false); }} style={{ fontSize: 11, padding: "3px 8px" }}>✕</button>
        </div>
      ) : (
        <div className={`bmc-value bmc-value-${color}`}>{BRL(spend)}</div>
      )}
      <div className="bmc-track">
        <div className={`bmc-fill bmc-fill-${color}`} style={{ width: `${(pct * 100).toFixed(1)}%` }} />
      </div>
      {sub && <div className="bmc-sub">{sub}</div>}
      {extraLine && <div className="bmc-extra">{extraLine}</div>}
    </div>
  );
}

function PhotoOrInitials({ foto, initials, nome }) {
  const [failed, setFailed] = React.useState(false);
  if (foto && !failed) {
    return (
      <div className="candidate-photo">
        <img src={foto} alt={nome} onError={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div className="candidate-photo">
      <span className="candidate-initials">{initials || "?"}</span>
    </div>
  );
}

function CandidateHero({ spend, periodLabel, teto, onEditTeto, monthly, onEditMonthly, pvd, now, onOpenSettings, status }) {
  const c = CANDIDATO;
  const diasEleicao = Math.max(0, Math.floor((new Date(c.eleicao) - now) / 86400000));

  const monthPct   = monthly.progress;
  const monthColor = metaBudgetColor(monthPct);
  const pacing     = monthly.progress - monthly.expected;
  const pacingLbl  = Math.abs(pacing) < 0.08 ? "No ritmo" : pacing > 0.08 ? "Acima do esperado" : "Abaixo do esperado";

  return (
    <div className="candidate-hero">
      {/* Left: candidate info */}
      <div className="candidate-info">
        <PhotoOrInitials foto={c.foto} initials={c.initials} nome={c.nome} />
        <div className="candidate-text">
          <div className="candidate-name">{c.nome}</div>
          <div className="candidate-sub">{c.partido} · Número {c.numero} · {c.estado}</div>
          <a className="candidate-site" href={`https://${c.site}`} target="_blank" rel="noopener noreferrer">{c.site}</a>
        </div>
        <button className={`cand-conn-pill conn-pill-${status}`} onClick={onOpenSettings} title="Configurar Supabase">
          <span className="conn-dot" />
          <span>{{ mock: "Mock", loading: "Carregando…", connected: "Conectado", error: "Erro" }[status] || "Mock"}</span>
        </button>
      </div>

      {/* Right: meta cards */}
      <div className="candidate-metas">
        <BudgetMetaCard
          label={`GASTO ${c.fase.toUpperCase()} · ${periodLabel}`}
          spend={spend}
          teto={teto}
          onEditTeto={onEditTeto}
          sub={`${(Math.min(teto > 0 ? spend / teto : 0, 1) * 100).toFixed(1)}% do teto ${BRL(teto)}`}
        />
        <BudgetMetaCard
          label="BUDGET MENSAL"
          spend={monthly.spend}
          teto={monthly.meta}
          onEditTeto={onEditMonthly}
          badge={pacingLbl}
          badgeVariant={monthColor}
          sub={`${BRL(monthly.spend)} consumido · ${(monthPct * 100).toFixed(1)}% do mês`}
          extraLine={`Esperado: ${(monthly.expected * 100).toFixed(1)}% · ${pacing >= 0 ? "+" : ""}${(pacing * 100).toFixed(1)} p.p.`}
        />
      </div>

      {/* Bottom: stats row */}
      <div className="candidate-stats">
        <div className="cstat">
          <div className="cstat-label">PVD ATUAL</div>
          <div className="cstat-value cstat-blue">{NUM(pvd)}</div>
        </div>
        <div className="cstat-sep" />
        <div className="cstat">
          <div className="cstat-label">DIAS ATÉ ELEIÇÃO</div>
          <div className={`cstat-value ${diasEleicao < 30 ? "cstat-red" : "cstat-yellow"}`}>{diasEleicao}</div>
        </div>
        <div className="cstat-sep" />
        <div className="cstat">
          <div className="cstat-label">FASE</div>
          <div className="cstat-pill">{c.fase}</div>
        </div>
      </div>
    </div>
  );
}

function Header({ liveOn, setLiveOn, lastUpdate, onRefresh, refreshing, status, onOpenSettings, onOpenMeta, countdown }) {
  const statusLabel = {
    mock: "Mock",
    loading: "Carregando…",
    connected: "Conectado",
    error: "Erro de conexão",
  }[status] || "Mock";

  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  return (
    <header className="dash-header">
      <div className="brand">
        <img src="uploads/Logo01.png" alt="Logo David Soares" className="brand-logo" />
        <div>
          <div className="brand-name">Dashboard Campanha <em>David Soares 2026</em></div>
        </div>
      </div>

      <div className="header-tools">
        <button className="btn-meta" onClick={onOpenMeta}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v13M8 10l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Importar Meta
        </button>
        <button className={`conn-pill conn-pill-${status}`} onClick={onOpenSettings} title="Configurar Supabase">
          <span className="conn-dot" />
          <span>{statusLabel}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }}>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button className={`live-toggle ${liveOn ? "on" : "off"}`} onClick={() => setLiveOn(!liveOn)} title={liveOn ? "Auto-refresh ativo · clique para pausar" : "Auto-refresh pausado · clique para ativar"}>
          <LiveDot on={liveOn} />
          <span>{liveOn ? `${mm}:${ss}` : "Pausado"}</span>
        </button>
        <div className="last-update">
          <span className="last-update-label">Últ. sync</span>
          <span className="last-update-time">{lastUpdate}</span>
        </div>
        <button className={`btn-refresh ${refreshing ? "spinning" : ""}`} onClick={onRefresh} disabled={refreshing}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M3 12a9 9 0 0115.5-6.36L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.36L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}

function Dashboard() {
  const [t, setTweak] = useTweaks({
    accent_hot: "#EF4444",
    accent_warm: "#F59E0B",
    accent_cold: "#3B82F6",
    accent_success: "#10B981",
    bg_tone: "navy",
    display_font: "Space Grotesk",
    body_font: "Inter",
    density: "comfortable",
    show_creatives: true,
  });

  // Data source: mocks or Supabase
  const dataSource = useDashboardData();
  const { accounts, daily, recs, creatives, clusters, status, config, setConfig, disconnect, refresh: refreshData, error, warnings } = dataSource;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [metaImportOpen, setMetaImportOpen] = useState(false);
  const supabaseClient = useMemo(() => getSupabaseClient(), [config]);

  const [liveOn, setLiveOn] = useState(true);
  const [countdown, setCountdown] = useState(300);
  const [periodId, setPeriodId] = useState("14d");
  const [customRange, setCustomRange] = useState({ start: "2026-04-01", end: "2026-05-14" });
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [chartMetric, setChartMetric] = useState("cpee");
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date("2026-05-14T14:32:00"));
  const [appliedRecs, setAppliedRecs] = useState(new Set());
  const [dismissedRecs, setDismissedRecs] = useState(new Set());

  // editable monthly meta (overrides per account; null = use default from ACCOUNTS)
  const [metaOverrides, setMetaOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("meta_overrides") || "{}"); }
    catch { return {}; }
  });
  const saveMeta = (val) => {
    const key = selectedAccount || "__consolidated";
    const next = { ...metaOverrides, [key]: val };
    setMetaOverrides(next);
    try { localStorage.setItem("meta_overrides", JSON.stringify(next)); } catch {}
  };

  const currentRange = useMemo(
    () => rangeFromPreset(periodId, customRange.start, customRange.end),
    [periodId, customRange]
  );

  const agg = useMemo(
    () => aggregate(daily, accounts, currentRange.start, currentRange.end, selectedAccount),
    [daily, accounts, currentRange.start, currentRange.end, selectedAccount]
  );

  // apply meta override if set; align spend with selected period (consistent with hero + breakdown)
  const monthlyWithOverride = useMemo(() => {
    const key = selectedAccount || "__consolidated";
    const override = metaOverrides[key];
    const meta = override || agg.monthly.meta;
    // Use period spend (agg.totals.spend) so all three cards — Gasto no período,
    // Gasto por conta e Meta mensal — mostram o mesmo número de gasto.
    const spend = agg.totals.spend;
    return {
      ...agg.monthly,
      meta,
      spend,
      progress: meta > 0 ? spend / meta : 0,
    };
  }, [agg.monthly, agg.totals.spend, metaOverrides, selectedAccount]);

  // auto-refresh: countdown 5 min, refreshes Supabase data at zero
  useEffect(() => {
    if (!liveOn) return;
    setCountdown(300);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          refreshData();
          setNow(new Date());
          return 300;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [liveOn]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setNow(new Date(now.getTime() + 30000));
    }, 700);
  };

  // "Hoje" KPIs always show today (or the most recent date in dataset)
  const todayAgg = useMemo(() => {
    const mostRecent = daily.length > 0
      ? daily.reduce((m, r) => r.data > m ? r.data : m, "0000-00-00")
      : "2026-05-14";
    return aggregate(daily, accounts, mostRecent, mostRecent);
  }, [daily, accounts]);
  const totalBudgetDiario = accounts.reduce((a, b) => a + (b.budget_diario || 0), 0);

  // Teto pré-campanha — editável, persistido em localStorage
  const [tetoOverride, setTetoOverride] = useState(() => {
    try { return parseFloat(localStorage.getItem("teto_precampanha") || "0") || CANDIDATO.teto_precampanha; }
    catch { return CANDIDATO.teto_precampanha; }
  });
  const saveTeto = (v) => { setTetoOverride(v); try { localStorage.setItem("teto_precampanha", String(v)); } catch {} };

  // Period label for the hero card
  const periodLabel = useMemo(() => {
    const labels = { "7d": "7 DIAS", "14d": "14 DIAS", "30d": "30 DIAS", "60d": "60 DIAS", "90d": "90 DIAS", month: "MÊS ATUAL", ytd: "DESDE JAN" };
    if (labels[periodId]) return labels[periodId];
    const days = daysBetween(currentRange.start, currentRange.end) + 1;
    return `${days} DIAS`;
  }, [periodId, currentRange]);

  // PVD = cumulative EQ across all data
  const pvdTotal = useMemo(() => daily.reduce((s, d) => s + (d.eq || 0), 0), [daily]);

  const visibleRecs = recs.filter((r) => !dismissedRecs.has(r.id));
  const pendingCount = visibleRecs.filter((r) => !appliedRecs.has(r.id)).length;
  const acctName = (id) => accounts.find((a) => a.account_id === id)?.nome || id;
  const lastUpdateStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // CPEE classification status for top KPI
  const cpeeKind = agg.totals.classificacao_cpee;
  const cpeeAccent = cpeeKind === "HOT" ? "var(--accent-success)" : cpeeKind === "WARM" ? "var(--accent-warm)" : "var(--accent-hot)";

  // monthly status variant
  const pacing = agg.monthly.progress - agg.monthly.expected;
  const monthVariant = Math.abs(pacing) < 0.08 ? "ok" : pacing > 0.08 ? "over" : "under";

  // apply tweaks to CSS vars
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent-hot", t.accent_hot);
    r.style.setProperty("--accent-warm", t.accent_warm);
    r.style.setProperty("--accent-cold", t.accent_cold);
    r.style.setProperty("--accent-success", t.accent_success);
    document.body.dataset.tone = t.bg_tone;
    document.body.dataset.density = t.density;
    r.style.setProperty("--font-display", `"${t.display_font}", system-ui, sans-serif`);
    r.style.setProperty("--font-body", `"${t.body_font}", system-ui, sans-serif`);
  }, [t]);

  return (
    <div className="dashboard-container">
      <Header
        liveOn={liveOn}
        setLiveOn={(v) => { setLiveOn(v); setCountdown(300); }}
        lastUpdate={lastUpdateStr}
        onRefresh={() => { handleRefresh(); refreshData(); setCountdown(300); }}
        refreshing={refreshing}
        status={status}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenMeta={() => setMetaImportOpen(true)}
        countdown={countdown}
      />

      <CandidateHero
        spend={agg.totals.spend}
        periodLabel={periodLabel}
        teto={tetoOverride}
        onEditTeto={saveTeto}
        monthly={monthlyWithOverride}
        onEditMonthly={saveMeta}
        pvd={pvdTotal}
        now={now}
        onOpenSettings={() => setSettingsOpen(true)}
        status={status}
      />

      <MetaImportModal
        open={metaImportOpen}
        onClose={() => setMetaImportOpen(false)}
        supabaseClient={supabaseClient}
        onImportDone={() => { refreshData(); setMetaImportOpen(false); }}
      />

      <SupabaseSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSave={(c) => { setConfig(c); }}
        onDisconnect={() => { disconnect(); setSettingsOpen(false); }}
        status={status}
        error={error}
        warnings={warnings}
      />

      <PeriodSelector
        value={periodId}
        onChange={setPeriodId}
        customRange={customRange}
        onCustomChange={setCustomRange}
        currentRange={currentRange}
      />

      <AlertBanner count={pendingCount} onClick={() => {
        const el = document.getElementById("recs-section");
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 24;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }} />

      {/* Hero row — spend + monthly meta progress */}
      <section className="hero-grid" data-screen-label="01 Visão geral">
        <div className="card hero-spend">
          <div className="hero-spend-left">
            <div className="kpi-label">Gasto no período</div>
            <div className="hero-spend-value">{BRL(agg.totals.spend)}</div>
            <div className="hero-spend-foot">
              <Delta value={agg.deltas.spend} />
              <span className="kpi-hint">vs. período anterior</span>
            </div>
          </div>
          <div className="hero-spend-right">
            <Sparkline values={agg.dailySeries.map((d) => d.spend)} accent="var(--accent-cold)" height={56} width={220} />
          </div>
        </div>

        <MonthlyMetaCard
          monthly={monthlyWithOverride}
          label={selectedAccount ? `Meta mensal · ${acctName(selectedAccount).split("·")[1]?.trim() || ""}` : "Meta mensal consolidada"}
          onEditMeta={saveMeta}
        />

        <SpendBreakdown perAccount={agg.perAccount} total={agg.totals.spend} />
      </section>

      {/* KPI Grid — row 1 (4 cards) */}
      <section className="kpi-grid kpi-grid-4" data-screen-label="02 KPIs principais">
        <KpiCard
          label="CPEE CONSOLIDADO"
          value={BRLfine(agg.totals.cpee)}
          sub={`Classificação · ${cpeeKind}`}
          icon={Icon.flame}
          iconColor={cpeeAccent}
        />
        <KpiCard
          label="GASTO HOJE"
          value={BRL(todayAgg.totals.spend)}
          sub={`${(todayAgg.totals.spend / totalBudgetDiario * 100).toFixed(0)}% do budget diário`}
          icon={Icon.money}
          iconColor="var(--accent-success)"
        />
        <KpiCard
          label="BUDGET DIÁRIO"
          value={BRL(totalBudgetDiario)}
          sub={`Soma das ${accounts.length} contas`}
          icon={Icon.budget}
          iconColor="var(--accent-cold)"
        />
        <KpiCard
          label="ALERTAS PENDENTES"
          value={pendingCount}
          sub="Recomendações não aprovadas"
          icon={Icon.alert}
          iconColor={pendingCount > 0 ? "var(--accent-warm)" : "var(--text-tertiary)"}
        />
      </section>

      {/* KPI Grid — row 2 (6 cards) */}
      <section className="kpi-grid kpi-grid-6">
        <KpiCard
          label="IMPRESSÕES"
          value={NUMcompact(agg.totals.impressoes)}
          sub={NUM(agg.totals.impressoes) + " total"}
          icon={Icon.eye}
          iconColor="var(--accent-cold)"
        />
        <KpiCard
          label="ALCANCE"
          value={NUMcompact(agg.totals.alcance)}
          sub="Pessoas únicas"
          icon={Icon.users}
          iconColor="#F59E0B"
        />
        <KpiCard
          label="FREQUÊNCIA"
          value={`${agg.totals.frequencia.toFixed(2)}×`}
          sub="Impressões / alcance"
          icon={Icon.refresh}
          iconColor="#EC4899"
        />
        <KpiCard
          label="CTR MÉDIO"
          value={`${agg.totals.ctr.toFixed(2)}%`}
          sub={`CPC ${BRLfine(agg.totals.cpc)}`}
          icon={Icon.target}
          iconColor="#F97316"
        />
        <KpiCard
          label="LEADS"
          value={NUM(agg.totals.leads)}
          sub={`CPL ${BRLfine(agg.totals.cpl)}`}
          icon={Icon.leads}
          iconColor="var(--accent-success)"
        />
        <KpiCard
          label="EQ TOTAL"
          value={NUM(agg.totals.eq)}
          sub="Engajamento Qualificado"
          icon={Icon.spark}
          iconColor="#EF4444"
        />
      </section>

      {/* Distribuição + Classificação + Funil */}
      <section className="triple-grid" data-screen-label="03 Distribuição + Classificação + Funil">
        <DistribuicaoCpee cpee={agg.totals.cpee} target={28} warmRange={4} />
        <ClassificacaoCpee perAccount={agg.perAccount} />
        <FunilConversao totals={agg.totals} />
      </section>

      {/* Main grid: table + chart */}
      <section className="main-grid" data-screen-label="04 Performance">
        <div className="main-left">
          <PerformanceTable
            data={agg.perAccount}
            onSelect={(id) => setSelectedAccount(selectedAccount === id ? null : id)}
            selectedId={selectedAccount}
          />
        </div>
        <div className="main-right">
          <div className="chart-meta-toggle">
            <button className={`pill ${chartMetric === "cpee" ? "active" : ""}`} onClick={() => setChartMetric("cpee")}>CPEE</button>
            <button className={`pill ${chartMetric === "spend" ? "active" : ""}`} onClick={() => setChartMetric("spend")}>Gasto</button>
            <button className={`pill ${chartMetric === "eq" ? "active" : ""}`} onClick={() => setChartMetric("eq")}>EQ</button>
            <button className={`pill ${chartMetric === "leads" ? "active" : ""}`} onClick={() => setChartMetric("leads")}>Leads</button>
            <button className={`pill ${chartMetric === "impressoes" ? "active" : ""}`} onClick={() => setChartMetric("impressoes")}>Impressões</button>
          </div>
          <TrendChart
            dailySeries={agg.dailySeries}
            metric={chartMetric}
            accounts={accounts}
            selectedAccount={selectedAccount}
          />
        </div>
      </section>

      {/* Criativos — 5 por categoria */}
      {t.show_creatives && (() => {
        const byStatus = (s) => creatives.filter(c => c.status === s).sort((a, b) => b.spend - a.spend).slice(0, 5);
        const winners = byStatus("winner");
        const stable  = byStatus("stable");
        const losers  = byStatus("loser");
        const groups  = [
          { key: "winner", label: "Winners", color: "var(--accent-success)", items: winners },
          { key: "stable", label: "Stable",  color: "var(--accent-warm)",   items: stable },
          { key: "loser",  label: "Losers",  color: "var(--accent-hot)",    items: losers },
        ];
        return (
          <section className="card-section" data-screen-label="05 Criativos">
            {groups.map(({ key, label, color, items }) => (
              <div key={key} className="card creatives-card" style={{ marginBottom: 12 }}>
                <div className="card-head">
                  <div>
                    <h3 className="card-title" style={{ color }}>
                      {label} · top {items.length}
                    </h3>
                    <p className="card-sub">
                      {key === "winner" ? "CPEE abaixo da média · escalar" : key === "stable" ? "CPEE próximo da média · monitorar" : "CPEE acima da média · revisar"}
                    </p>
                  </div>
                </div>
                {items.length > 0 ? (
                  <div className="creatives-list creatives-list-grid">
                    {items.map((c) => (
                      <CreativeRow key={c.id} c={c} accountName={acctName(c.account_id)} />
                    ))}
                  </div>
                ) : (
                  <div className="empty">Nenhum criativo nesta categoria</div>
                )}
              </div>
            ))}
          </section>
        );
      })()}

      {/* Clusters de audiência */}
      <section className="card-section" data-screen-label="06 Clusters">
        <ClustersPanel clusters={clusters} accounts={accounts} />
      </section>

      {/* Recomendações */}
      <section className="card-section" data-screen-label="07 Recomendações">
        <div className="card recs-card" id="recs-section">
          <div className="card-head">
            <div>
              <h3 className="card-title">Recomendações automáticas</h3>
              <p className="card-sub">{pendingCount} pendentes · IA · atualizado às {lastUpdateStr.slice(0, 5)}</p>
            </div>
          </div>
          <div className="recs-list">
            {visibleRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                accountName={acctName(rec.account_id)}
                applied={appliedRecs.has(rec.id)}
                onApply={() => setAppliedRecs(new Set([...appliedRecs, rec.id]))}
                onDismiss={() => setDismissedRecs(new Set([...dismissedRecs, rec.id]))}
              />
            ))}
            {visibleRecs.length === 0 && (
              <div className="empty">Nenhuma recomendação pendente · contas operando dentro das metas</div>
            )}
          </div>
        </div>
      </section>

      <footer className="dash-footer">
        <span>CPEE Dashboard · v2.6</span>
        <span>·</span>
        <span>Conectado · Supabase realtime</span>
        <span>·</span>
        <span>Polling 30s</span>
        <span>·</span>
        <span>Dados de mock para preview · 2026-05-14</span>
      </footer>

      <TweaksPanel>
        <TweakSection label="Tema">
          <TweakRadio
            label="Background"
            value={t.bg_tone}
            onChange={(v) => setTweak("bg_tone", v)}
            options={["navy", "graphite", "midnight"]}
          />
          <TweakRadio
            label="Densidade"
            value={t.density}
            onChange={(v) => setTweak("density", v)}
            options={["comfortable", "compact"]}
          />
        </TweakSection>
        <TweakSection label="Acentos">
          <TweakColor label="Hot" value={t.accent_hot}
            onChange={(v) => setTweak("accent_hot", v)}
            options={["#EF4444", "#F43F5E", "#DC2626", "#F97316"]} />
          <TweakColor label="Warm" value={t.accent_warm}
            onChange={(v) => setTweak("accent_warm", v)}
            options={["#F59E0B", "#FBBF24", "#EAB308", "#F97316"]} />
          <TweakColor label="Cold" value={t.accent_cold}
            onChange={(v) => setTweak("accent_cold", v)}
            options={["#3B82F6", "#6366F1", "#0EA5E9", "#8B5CF6"]} />
          <TweakColor label="Success" value={t.accent_success}
            onChange={(v) => setTweak("accent_success", v)}
            options={["#10B981", "#22C55E", "#14B8A6", "#84CC16"]} />
        </TweakSection>
        <TweakSection label="Tipografia">
          <TweakSelect label="Display" value={t.display_font}
            onChange={(v) => setTweak("display_font", v)}
            options={["Space Grotesk", "Inter", "IBM Plex Sans", "JetBrains Mono"]} />
          <TweakSelect label="Body" value={t.body_font}
            onChange={(v) => setTweak("body_font", v)}
            options={["Inter", "IBM Plex Sans", "Space Grotesk"]} />
        </TweakSection>
        <TweakSection label="Layout">
          <TweakToggle label="Painel de criativos"
            value={t.show_creatives}
            onChange={(v) => setTweak("show_creatives", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Dashboard />);
