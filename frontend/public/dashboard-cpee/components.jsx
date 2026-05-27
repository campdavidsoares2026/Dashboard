// Atomic dashboard components
const { useState, useEffect, useMemo, useRef } = React;

// ───────────────────────────── helpers ─────────────────────────────
const BRL = (n) =>
  (n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const BRLfine = (n) =>
  (n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const NUM = (n) => Math.round(n ?? 0).toLocaleString("pt-BR");

const NUMcompact = (n) => {
  const v = n ?? 0;
  if (v >= 1_000_000) return (v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "M";
  if (v >= 10_000) return (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + "k";
  if (v >= 1000) return (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k";
  return v.toLocaleString("pt-BR");
};

const PCT = (n, digits = 1) => `${(n ?? 0).toFixed(digits)}%`;

const cn = (...xs) => xs.filter(Boolean).join(" ");

// ───────────────────────────── primitives ─────────────────────────
function Sparkline({ values, accent = "var(--accent-cold)", height = 28, width = 92 }) {
  if (!values || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return [x, y];
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  const last = points[points.length - 1];
  const gid = `sg-${Math.abs(accent.split("").reduce((a, c) => a + c.charCodeAt(0), 0))}`;
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={accent} />
    </svg>
  );
}

function StatusBadge({ kind, children }) {
  const k = (kind || "cold").toLowerCase();
  return <span className={`badge badge-${k}`}>{children || k}</span>;
}

function Delta({ value, suffix = "%", inverted = false }) {
  if (value == null || isNaN(value)) return null;
  const positive = inverted ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.05;
  const cls = neutral ? "delta-neutral" : positive ? "delta-up" : "delta-down";
  const arrow = neutral ? "→" : value > 0 ? "↑" : "↓";
  return (
    <span className={`delta ${cls}`}>
      <span className="delta-arrow">{arrow}</span>
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

function LiveDot({ on = true }) {
  return (
    <span className={`live-dot ${on ? "" : "off"}`}>
      <span className="live-dot-core" />
      <span className="live-dot-ring" />
    </span>
  );
}

// ───────────────────────────── Period Selector ─────────────────────────────
function PeriodSelector({ value, onChange, customRange, onCustomChange, currentRange }) {
  const [customOpen, setCustomOpen] = useState(false);
  return (
    <div className="period-bar">
      <div className="period-label">PERÍODO</div>
      <div className="period-pills">
        {PERIOD_PRESETS.map((p) => {
          const active = p.id === value;
          if (p.id === "custom") {
            return (
              <div className="custom-wrap" key={p.id}>
                <button
                  className={cn("period-pill", active && "active", "with-icon")}
                  onClick={() => { onChange(p.id); setCustomOpen(true); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {active && customRange.start
                    ? `${fmtDateBR(customRange.start)} – ${fmtDateBR(customRange.end)}`
                    : p.label}
                </button>
                {customOpen && active && (
                  <div className="custom-pop">
                    <div className="custom-pop-head">Período personalizado</div>
                    <div className="custom-pop-row">
                      <label>De
                        <input type="date" value={customRange.start || ""} max={customRange.end || "2026-05-14"}
                          onChange={(e) => onCustomChange({ ...customRange, start: e.target.value })} />
                      </label>
                      <label>Até
                        <input type="date" value={customRange.end || ""} min={customRange.start || "2026-01-01"} max="2026-05-14"
                          onChange={(e) => onCustomChange({ ...customRange, end: e.target.value })} />
                      </label>
                    </div>
                    <div className="custom-pop-actions">
                      <button className="btn-ghost" onClick={() => setCustomOpen(false)}>Fechar</button>
                      <button className="btn-primary" onClick={() => setCustomOpen(false)}>Aplicar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return (
            <button
              key={p.id}
              className={cn("period-pill", active && "active")}
              onClick={() => onChange(p.id)}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="period-range">
        <span className="period-range-dates">
          {fmtDateBR(currentRange.start)} → {fmtDateBR(currentRange.end)}
        </span>
        <span className="period-range-days">
          {daysBetween(currentRange.start, currentRange.end)} dias
        </span>
      </div>
    </div>
  );
}

function fmtDateBR(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
}
function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
}

// ───────────────────────────── KPI ─────────────────────────────
function KpiCard({ label, value, sub, icon, iconColor }) {
  return (
    <div className="card kpi">
      <div className="kpi-row">
        <div className="kpi-label">{label}</div>
        {icon && (
          <div
            className="kpi-icon-chip"
            style={iconColor ? { color: iconColor, background: `color-mix(in oklch, ${iconColor} 18%, transparent)` } : null}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

// ───────────────────────────── KPI Icons (inline svg, neutral stroke) ─────────────────────────────
const Icon = {
  flame: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2s4 3 4 8a4 4 0 11-8 0c0-2 1-4 1-4s-3 2-3 6a6 6 0 1012 0c0-6-6-10-6-10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  money: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 9v6M18 9v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  spark: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17l5-7 4 4 4-6 5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  budget: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  alert: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 9v5M12 17v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  eye: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 19c0-2 2-4 4-4s4 2 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 0115.5-6.36L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.36L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  target: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>,
  leads: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v3l-8 6-8-6V5zM4 11l8 5 8-5v8H4v-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
};

// ───────────────────────────── Monthly Progress (editable) ─────────────────────────────
function MonthlyMetaCard({ monthly, label = "Meta mensal", onEditMeta }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(monthly.meta));
  useEffect(() => { setDraft(String(monthly.meta)); }, [monthly.meta]);

  const pct = monthly.progress * 100;
  const expectedPct = monthly.expected * 100;
  const pacing = pct - expectedPct;
  const onTrack = Math.abs(pacing) < 8;
  const overpacing = pacing > 8;
  const status = onTrack ? "ok" : overpacing ? "over" : "under";
  const statusLabel = onTrack ? "No ritmo" : overpacing ? "Acima do ritmo" : "Abaixo do ritmo";

  const commit = () => {
    const v = parseFloat(draft.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!isNaN(v) && v > 0 && onEditMeta) onEditMeta(v);
    setEditing(false);
  };

  return (
    <div className="card meta-card">
      <div className="meta-card-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="meta-card-toprow">
            <div className="kpi-label">{label}</div>
            {onEditMeta && !editing && (
              <button className="meta-edit-btn" onClick={() => setEditing(true)} title="Editar meta">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83z" fill="currentColor" />
                </svg>
                <span>Editar</span>
              </button>
            )}
          </div>
          {editing ? (
            <div className="meta-edit-row">
              <span className="meta-edit-prefix">R$</span>
              <input
                type="text"
                className="meta-edit-input"
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") { setDraft(String(monthly.meta)); setEditing(false); }
                }}
              />
              <button className="btn-primary" onClick={commit}>Salvar</button>
              <button className="btn-ghost" onClick={() => { setDraft(String(monthly.meta)); setEditing(false); }}>Cancelar</button>
            </div>
          ) : (
            <div className="meta-card-value">
              <span className="meta-card-current">{BRL(monthly.spend)}</span>
              <span className="meta-card-sep">/</span>
              <span className="meta-card-target">{BRL(monthly.meta)}</span>
            </div>
          )}
        </div>
        <div className={`meta-card-pct meta-card-pct-${status}`}>
          {pct.toFixed(1)}%
        </div>
      </div>
      <div className="meta-progress">
        <div className="meta-progress-track">
          <div className={`meta-progress-fill meta-progress-${status}`} style={{ width: `${Math.min(100, pct)}%` }} />
          <div className="meta-progress-expected" style={{ left: `${Math.min(100, expectedPct)}%` }} title={`Esperado: ${expectedPct.toFixed(0)}%`} />
        </div>
        <div className="meta-progress-foot">
          <span>Dia {monthly.daysElapsed} de {monthly.daysTotal}</span>
          <span className={`meta-pacing meta-pacing-${status}`}>
            {pacing >= 0 ? "+" : ""}{pacing.toFixed(1)} pp · {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Distribuição CPEE Gauge ─────────────────────────────
function DistribuicaoCpee({ cpee, target = 28, warmRange = 4 }) {
  const max = Math.max(target * 2, 50);
  const norm = Math.min(1, Math.max(0, cpee / max));
  // angle: -90° at left, 0° at top, +90° at right
  const angle = -90 + norm * 180;

  // Classification thresholds
  const hotMax = target - warmRange / 2; // <= hotMax = HOT
  const warmMax = target + warmRange / 2; // <= warmMax = WARM
  let kind, statusLabel, statusColor;
  if (cpee <= hotMax) {
    kind = "hot"; statusLabel = "Saudável"; statusColor = "var(--accent-success)";
  } else if (cpee <= warmMax) {
    kind = "warm"; statusLabel = "Alerta"; statusColor = "var(--accent-warm)";
  } else {
    kind = "cold"; statusLabel = "Crítico"; statusColor = "var(--accent-hot)";
  }

  // SVG arc geometry
  const cx = 120, cy = 110, r = 80;
  const sweep = (a) => {
    const rad = (a - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const arc = (a1, a2, color) => {
    const [x1, y1] = sweep(a1);
    const [x2, y2] = sweep(a2);
    const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} stroke={color} strokeWidth="16" fill="none" strokeLinecap="butt" />;
  };

  // Segment boundaries (in degrees, -90 at left to +90 at right)
  const a1 = -90;
  const a2 = -90 + (hotMax / max) * 180;
  const a3 = -90 + (warmMax / max) * 180;
  const a4 = 90;

  // Needle endpoints
  const needleRad = (angle - 90) * Math.PI / 180;
  const needleEnd = [cx + (r - 4) * Math.cos(needleRad), cy + (r - 4) * Math.sin(needleRad)];

  return (
    <div className="card gauge-card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Distribuição CPEE</h3>
          <p className="card-sub">Saúde consolidada · meta R$ {target.toFixed(0)}</p>
        </div>
      </div>
      <div className="gauge-wrap">
        <svg viewBox="0 0 240 150" className="gauge-svg">
          {/* arc segments — green/yellow/red (left to right semantic mapping)
              left side (low CPEE) = HOT = green = good */}
          {arc(a1, a2, "var(--accent-success)")}
          {arc(a2, a3, "var(--accent-warm)")}
          {arc(a3, a4, "var(--accent-hot)")}

          {/* tick marks */}
          {[a2, a3].map((a, i) => {
            const [tx1, ty1] = sweep(a);
            const rad = (a - 90) * Math.PI / 180;
            const tx2 = cx + (r + 10) * Math.cos(rad);
            const ty2 = cy + (r + 10) * Math.sin(rad);
            return <line key={i} x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--text-tertiary)" strokeWidth="1.5" />;
          })}

          {/* threshold labels */}
          <text x={sweep(a2)[0]} y={sweep(a2)[1] - 14} textAnchor="middle" className="gauge-tick">R$ {hotMax.toFixed(0)}</text>
          <text x={sweep(a3)[0]} y={sweep(a3)[1] - 14} textAnchor="middle" className="gauge-tick">R$ {warmMax.toFixed(0)}</text>

          {/* needle */}
          <line
            x1={cx} y1={cy}
            x2={needleEnd[0]} y2={needleEnd[1]}
            stroke="var(--text-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ transition: "all 0.5s cubic-bezier(.4,1.4,.6,1)" }}
          />
          <circle cx={cx} cy={cy} r="6" fill="var(--bg-card-hi)" stroke="var(--text-primary)" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="2.5" fill="var(--text-primary)" />
        </svg>
        <div className="gauge-status">
          <span className="gauge-status-badge" style={{ color: statusColor, background: `color-mix(in oklch, ${statusColor} 16%, transparent)`, borderColor: `color-mix(in oklch, ${statusColor} 50%, transparent)` }}>
            {statusLabel}
          </span>
          <div className="gauge-value">{BRLfine(cpee)}</div>
          <div className="gauge-value-label">CPEE Médio</div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Classificação CPEE ─────────────────────────────
function ClassificacaoCpee({ perAccount }) {
  const counts = { HOT: 0, WARM: 0, COLD: 0 };
  perAccount.forEach((a) => counts[a.classificacao_cpee]++);
  const total = perAccount.length || 1;
  const items = [
    { kind: "HOT", label: "CPEE baixo · escalável", icon: Icon.flame, count: counts.HOT, color: "var(--accent-hot)", desc: "Abaixo da média" },
    { kind: "WARM", label: "Na média", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>, count: counts.WARM, color: "var(--accent-warm)", desc: "Próximo da média" },
    { kind: "COLD", label: "Acima da média · ação", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.5"/></svg>, count: counts.COLD, color: "var(--accent-cold)", desc: "Acima da média" },
  ];
  return (
    <div className="card classif-card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Classificação CPEE</h3>
          <p className="card-sub">Distribuição das contas no período</p>
        </div>
      </div>
      <div className="classif-grid">
        {items.map((it) => (
          <div className={`classif-item classif-${it.kind.toLowerCase()}`} key={it.kind}>
            <div className="classif-icon" style={{ color: it.color }}>{it.icon}</div>
            <div className="classif-count">{it.count}</div>
            <div className="classif-kind">{it.kind}</div>
            <div className="classif-desc">{it.desc}</div>
            <div className="classif-bar">
              <div className="classif-bar-fill" style={{ width: `${(it.count / total) * 100}%`, background: it.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────── Funil de Conversão ─────────────────────────────
function FunilConversao({ totals }) {
  const steps = [
    { key: "alcance", label: "Alcance", value: totals.alcance, hint: "Pessoas únicas atingidas" },
    { key: "impressoes", label: "Impressões", value: totals.impressoes, hint: "Total exibido" },
    { key: "eq", label: "Engajamento (EQ)", value: totals.eq, hint: "Engajamento qualificado" },
    { key: "cliques", label: "Cliques (est.)", value: totals.cliques, hint: "Tráfego para LP" },
    { key: "leads", label: "Leads", value: totals.leads, hint: "Conversões" },
  ];
  const max = Math.max(...steps.map((s) => s.value));
  return (
    <div className="card funnel-card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Funil de Conversão</h3>
          <p className="card-sub">Soma do período · 3 contas</p>
        </div>
      </div>
      <div className="funnel">
        {steps.map((s, i) => {
          const width = (s.value / max) * 100;
          const prev = i > 0 ? steps[i - 1].value : null;
          const dropPct = prev ? ((s.value / prev) * 100) : 100;
          return (
            <div className="funnel-step" key={s.key}>
              <div className="funnel-step-row">
                <div className="funnel-step-label">
                  <span className="funnel-step-name">{s.label}</span>
                  <span className="funnel-step-hint">{s.hint}</span>
                </div>
                <div className="funnel-step-value">
                  <span className="funnel-step-num">{NUM(s.value)}</span>
                  {i > 0 && (
                    <span className="funnel-step-rate">{dropPct.toFixed(1)}%</span>
                  )}
                </div>
              </div>
              <div className="funnel-bar">
                <div className="funnel-bar-fill" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────── Spend by Account ─────────────────────────────
function SpendBreakdown({ perAccount, total }) {
  const colors = { SP: "var(--accent-cold)", RJ: "var(--accent-warm)", MG: "var(--accent-hot)" };
  return (
    <div className="card spend-card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Gasto por conta</h3>
          <p className="card-sub">Distribuição do gasto no período</p>
        </div>
        <div className="spend-total">{BRL(total)}</div>
      </div>
      <div className="spend-stack">
        {perAccount.map((a) => (
          <div className="spend-row" key={a.account_id}>
            <div className="spend-row-head">
              <div className="spend-row-acct">
                <span className={`acct-dot acct-${a.regiao}`} style={{ width: 22, height: 22, fontSize: 10 }}>{a.regiao}</span>
                <span className="spend-row-name">{a.nome}</span>
              </div>
              <div className="spend-row-num">
                <span className="spend-row-val">{BRL(a.spend)}</span>
                <span className="spend-row-pct">{((a.spend / total) * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div className="spend-row-bar">
              <div className="spend-row-fill" style={{ width: `${(a.spend / total) * 100}%`, background: colors[a.regiao] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────── Performance Table ─────────────────────────────
function PerformanceTable({ data, onSelect, selectedId }) {
  const [sortBy, setSortBy] = useState("spend");
  const [dir, setDir] = useState("desc");
  const sorted = useMemo(() => {
    const x = [...data].sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      return dir === "desc" ? bv - av : av - bv;
    });
    return x;
  }, [data, sortBy, dir]);

  const head = (key, label, align = "right") => (
    <th
      style={{ textAlign: align, cursor: "pointer" }}
      onClick={() => {
        if (sortBy === key) setDir(dir === "desc" ? "asc" : "desc");
        else { setSortBy(key); setDir("desc"); }
      }}
    >
      <span className="th-label">
        {label}
        <span className="th-caret">{sortBy === key ? (dir === "desc" ? "▾" : "▴") : ""}</span>
      </span>
    </th>
  );

  return (
    <div className="card table-card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Performance por Conta</h3>
          <p className="card-sub">{data.length} contas ativas · soma do período</p>
        </div>
      </div>
      <table className="perf-table">
        <thead>
          <tr>
            {head("nome", "Conta", "left")}
            {head("cpee", "CPEE")}
            {head("spend", "Gasto")}
            {head("eq", "EQ")}
            {head("impressoes", "Impr.")}
            {head("ctr", "CTR")}
            {head("cpc", "CPC")}
            <th style={{ textAlign: "center" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const active = row.account_id === selectedId;
            return (
              <tr
                key={row.account_id}
                className={cn(active && "row-active")}
                onClick={() => onSelect?.(row.account_id)}
              >
                <td>
                  <div className="acct">
                    <span className={`acct-dot acct-${row.regiao}`}>{row.regiao}</span>
                    <div>
                      <div className="acct-name">{row.nome}</div>
                      <div className="acct-meta">{row.campanhas_ativas} campanhas · meta {BRL(row.meta_mensal)}</div>
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="num-main">{BRLfine(row.cpee)}</div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="num-main">{BRL(row.spend)}</div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="num-main">{NUM(row.eq)}</div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="num-main">{NUMcompact(row.impressoes)}</div>
                </td>
                <td style={{ textAlign: "right" }}>{row.ctr.toFixed(2)}%</td>
                <td style={{ textAlign: "right" }}>{BRLfine(row.cpc)}</td>
                <td style={{ textAlign: "center" }}><StatusBadge kind={row.classificacao_cpee}>{row.classificacao_cpee}</StatusBadge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────────── Trend Chart ─────────────────────────────
const CHART_PALETTE = [
  "#3B82F6", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6",
  "#06B6D4", "#F97316", "#EC4899", "#84CC16", "#14B8A6",
  "#A78BFA", "#FB923C", "#34D399", "#60A5FA", "#FBBF24",
  "#F472B6", "#4ADE80", "#38BDF8",
];

function TrendChart({ dailySeries, metric, accounts, selectedAccount }) {
  const days = dailySeries.map((d) => d.data);

  // Stable color assignment by account_id order
  const colorMap = useMemo(() => {
    const map = {};
    accounts.forEach((a, i) => { map[a.account_id] = CHART_PALETTE[i % CHART_PALETTE.length]; });
    return map;
  }, [accounts]);

  const colorFor = (account_id) => colorMap[account_id] || CHART_PALETTE[0];

  // Abbreviate account name for legend: "Piloto Auto · São Paulo" → "São Paulo"
  const shortName = (nome) => {
    const parts = nome.split(/[·\-–]/);
    return (parts[parts.length - 1] || nome).trim();
  };

  const series = useMemo(() => {
    const list = selectedAccount
      ? accounts.filter((a) => a.account_id === selectedAccount)
      : accounts;
    return list.map((a) => {
      const points = dailySeries.map((d) => {
        const row = d.byAccount.find((r) => r.account_id === a.account_id);
        return row ? row[metric] : null;
      });
      return { ...a, points };
    });
  }, [dailySeries, metric, accounts, selectedAccount]);

  const W = 900;
  const H = 240;
  const padL = 56, padR = 24, padT = 16, padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const allVals = series.flatMap((s) => s.points.filter((v) => v !== null));
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const padY = (max - min) * 0.15 || 1;
  const yMin = metric === "cpee" ? Math.max(0, min - padY) : 0;
  const yMax = max + padY;
  const stepX = days.length > 1 ? innerW / (days.length - 1) : 0;

  const xy = (i, v) => [padL + i * stepX, padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH];

  const grid = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: padT + innerH * p,
    v: yMax - (yMax - yMin) * p,
  }));

  const labelEvery = Math.max(1, Math.floor(days.length / 7));
  const xLabels = days.map((d, i) => ({
    x: padL + i * stepX,
    d,
    show: i === 0 || i === days.length - 1 || i % labelEvery === 0,
  }));

  const fmt = (v) => metric === "cpee" || metric === "cpl"
    ? BRLfine(v)
    : metric === "spend"
      ? BRL(v)
      : NUMcompact(Math.round(v));

  const target = metric === "cpee" ? 28 : null;
  const [hoverIdx, setHoverIdx] = useState(null);

  return (
    <div className="card chart-card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Tendência diária</h3>
          <p className="card-sub">
            {selectedAccount ? accounts.find((a) => a.account_id === selectedAccount)?.nome : "Todas as contas"}
            {" · "}
            {days.length} dias
          </p>
        </div>
        <div className="legend" style={{ flexWrap: "wrap", gap: "4px 12px", maxWidth: 460 }}>
          {series.map((s) => (
            <div className="legend-item" key={s.account_id} title={s.nome}>
              <span className="legend-swatch" style={{ background: colorFor(s.account_id) }} />
              <span>{shortName(s.nome)}</span>
            </div>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round((px - padL) / stepX);
          if (i >= 0 && i < days.length) setHoverIdx(i);
        }}
      >
        {grid.map((g, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="var(--border-divider)" strokeDasharray="2 4" strokeOpacity="0.6" />
            <text x={padL - 10} y={g.y + 4} textAnchor="end" className="axis-tick">{fmt(g.v)}</text>
          </g>
        ))}

        {target && target >= yMin && target <= yMax && (
          <g>
            <line
              x1={padL} x2={W - padR}
              y1={padT + innerH - ((target - yMin) / (yMax - yMin)) * innerH}
              y2={padT + innerH - ((target - yMin) / (yMax - yMin)) * innerH}
              stroke="var(--accent-success)" strokeDasharray="4 4" strokeOpacity="0.6"
            />
            <text
              x={W - padR}
              y={padT + innerH - ((target - yMin) / (yMax - yMin)) * innerH - 6}
              textAnchor="end"
              className="axis-tick"
              style={{ fill: "var(--accent-success)" }}
            >
              Meta · {fmt(target)}
            </text>
          </g>
        )}

        {xLabels.map((l, i) => l.show && (
          <text key={i} x={l.x} y={H - 10} textAnchor="middle" className="axis-tick">
            {new Date(l.d + "T00:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })}
          </text>
        ))}

        {series.map((s) => {
          const color = colorFor(s.account_id);
          const validPts = s.points.map((v, i) => v == null ? null : [i, v]).filter(Boolean);
          if (validPts.length === 0) return null;

          // Build path segments (skip gaps where value is null)
          let path = "";
          let areaPath = "";
          let segStart = null;
          validPts.forEach(([i, v], idx) => {
            const [x, y] = xy(i, v);
            const isFirst = idx === 0 || validPts[idx - 1][0] !== i - 1;
            if (isFirst) {
              if (segStart !== null) {
                const [prevI, prevV] = validPts[idx - 1];
                const [px] = xy(prevI, prevV);
                areaPath += ` L ${px.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${xy(segStart, validPts.find(p => p[0] === segStart)[1])[0].toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
              }
              path += ` M ${x.toFixed(1)} ${y.toFixed(1)}`;
              areaPath += ` M ${x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
              segStart = i;
            } else {
              path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
              areaPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
            }
          });
          if (segStart !== null) {
            const last = validPts[validPts.length - 1];
            const [lx] = xy(last[0], last[1]);
            const firstInSeg = validPts.find(p => p[0] === segStart);
            const [fx] = xy(segStart, firstInSeg[1]);
            areaPath += ` L ${lx.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${fx.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
          }

          const id = `grad-${s.account_id.replace(/[^a-zA-Z0-9]/g, "")}`;
          return (
            <g key={s.account_id}>
              <defs>
                <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${id})`} />
              <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {hoverIdx !== null && s.points[hoverIdx] != null && (
                <circle
                  key={`${s.account_id}-hover`}
                  cx={xy(hoverIdx, s.points[hoverIdx])[0]}
                  cy={xy(hoverIdx, s.points[hoverIdx])[1]}
                  r={4}
                  fill={color}
                  stroke="var(--bg-card)"
                  strokeWidth="2"
                />
              )}
            </g>
          );
        })}

        {hoverIdx !== null && (
          <line
            x1={padL + hoverIdx * stepX} x2={padL + hoverIdx * stepX}
            y1={padT} y2={padT + innerH}
            stroke="var(--text-secondary)" strokeOpacity="0.3"
          />
        )}
      </svg>

      {hoverIdx !== null && (
        <div className="chart-readout">
          <div className="chart-readout-date">
            {new Date(days[hoverIdx] + "T00:00:00Z").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", timeZone: "UTC" })}
          </div>
          <div className="chart-readout-vals">
            {series.map((s) => (
              <div key={s.account_id} className="chart-readout-val">
                <span className="legend-swatch" style={{ background: colorFor(s.account_id) }} />
                <span className="chart-readout-name">{shortName(s.nome)}</span>
                <span className="chart-readout-num">{s.points[hoverIdx] != null ? fmt(s.points[hoverIdx]) : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── Clusters (audiência) ─────────────────────────────
function TrendArrow({ dir }) {
  if (dir === "up") return <span className="trend-up" title="Em alta">↑</span>;
  if (dir === "down") return <span className="trend-down" title="Em queda">↓</span>;
  return <span className="trend-stable" title="Estável">→</span>;
}

function ClustersPanel({ clusters, accounts }) {
  const acctRegiao = (id) => accounts.find((a) => a.account_id === id)?.regiao || "—";

  // top 3 per tier, sorted by spend desc (significance) then by cpee
  const tiers = [
    {
      key: "QUENTE",
      label: "Quentes",
      hint: "CPEE abaixo da média · escalar",
      color: "var(--accent-success)",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2s4 3 4 8a4 4 0 11-8 0c0-2 1-4 1-4s-3 2-3 6a6 6 0 1012 0c0-6-6-10-6-10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
    },
    {
      key: "MORNO",
      label: "Mornos",
      hint: "CPEE próximo da média · monitorar",
      color: "var(--accent-warm)",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
    },
    {
      key: "FRIO",
      label: "Frios",
      hint: "CPEE acima da média · revisar",
      color: "var(--accent-cold)",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.6"/></svg>,
    },
  ];

  return (
    <div className="card clusters-card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Clusters de audiência</h3>
          <p className="card-sub">Top 3 por gasto em cada classificação · período selecionado</p>
        </div>
        <button className="link-btn">Ver todos →</button>
      </div>
      <div className="clusters-grid">
        {tiers.map((tier) => {
          const items = clusters
            .filter((c) => c.tipo === tier.key)
            .sort((a, b) => b.spend - a.spend)
            .slice(0, 3);
          return (
            <div className={`cluster-col cluster-col-${tier.key.toLowerCase()}`} key={tier.key}>
              <div className="cluster-col-head">
                <div className="cluster-col-title" style={{ color: tier.color }}>
                  <span className="cluster-col-icon">{tier.icon}</span>
                  {tier.label.toUpperCase()}
                </div>
                <div className="cluster-col-hint">{tier.hint}</div>
              </div>
              <div className="cluster-list">
                {items.map((c, i) => (
                  <div className="cluster-item" key={c.id}>
                    <div className="cluster-rank" style={{ color: tier.color, borderColor: `color-mix(in oklch, ${tier.color} 45%, transparent)` }}>{i + 1}</div>
                    <div className="cluster-body">
                      <div className="cluster-name">
                        {c.nome}
                        <TrendArrow dir={c.tendencia} />
                      </div>
                      <div className="cluster-meta">
                        <span className={`acct-dot acct-${c.regiao}`} style={{ width: 16, height: 16, fontSize: 8, borderRadius: 4 }}>{c.regiao}</span>
                        <span>{NUM(c.eq)} EQ</span>
                        <span>·</span>
                        <span>{BRL(c.spend)}</span>
                      </div>
                    </div>
                    <div className="cluster-cpee" style={{ color: tier.color }}>
                      {BRLfine(c.cpee)}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="cluster-empty">Sem clusters {tier.label.toLowerCase()} no período</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────── Recommendations ─────────────────────────────
function RecommendationCard({ rec, accountName, onApply, onDismiss, applied }) {
  return (
    <div className={cn("rec", `rec-${rec.severidade}`, applied && "rec-applied")}>
      <div className="rec-head">
        <div className={`rec-sev rec-sev-${rec.severidade}`}>
          {rec.severidade === "alta" ? "ALTA" : rec.severidade === "media" ? "MÉDIA" : "BAIXA"}
        </div>
        <div className="rec-impact">{rec.impacto_estimado}</div>
      </div>
      <div className="rec-title">{rec.titulo}</div>
      <div className="rec-desc">{rec.descricao}</div>
      <div className="rec-foot">
        <div className="rec-meta">
          <span className="rec-meta-acct">{accountName}</span>
          <span className="rec-meta-sep">·</span>
          <span className="rec-meta-conf">Confiança {Math.round(rec.confianca * 100)}%</span>
        </div>
        <div className="rec-actions">
          {applied ? (
            <span className="rec-applied-tag">✓ Aplicada</span>
          ) : (
            <>
              <button className="btn-ghost" onClick={onDismiss}>Ignorar</button>
              <button className="btn-primary" onClick={onApply}>Aplicar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Creatives ─────────────────────────────
function CreativeThumb({ kind, imageUrl, name }) {
  const [failed, setFailed] = useState(false);
  const labels = { video: "VIDEO", static: "STATIC", carousel: "CARROSSEL", ugc: "UGC" };
  const hasImage = imageUrl && !failed;
  return (
    <div className={`thumb thumb-${kind} ${hasImage ? "thumb-has-img" : ""}`}>
      {hasImage ? (
        <img
          className="thumb-img"
          src={imageUrl}
          alt={name || "Criativo"}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="thumb-stripes" />
      )}
      <div className="thumb-shade" />
      <div className="thumb-label">{labels[kind]}</div>
      {kind === "video" && <div className="thumb-play">▶</div>}
    </div>
  );
}

function CreativeRow({ c, accountName }) {
  return (
    <div className="creative">
      <CreativeThumb kind={c.thumb} imageUrl={c.image_url} name={c.nome} />
      <div className="creative-body">
        <div className="creative-name">{c.nome}</div>
        <div className="creative-meta">{accountName}</div>
      </div>
      <div className="creative-stats">
        <div className="creative-stat"><span className="creative-stat-label">CPEE</span><span className="creative-stat-val">{BRLfine(c.cpee)}</span></div>
        <div className="creative-stat"><span className="creative-stat-label">Gasto</span><span className="creative-stat-val">{BRL(c.spend)}</span></div>
        <div className="creative-stat"><span className="creative-stat-label">CTR</span><span className="creative-stat-val">{c.ctr.toFixed(2)}%</span></div>
      </div>
      <div className={`creative-tag creative-tag-${c.status}`}>
        {c.status === "winner" ? "★ WINNER" : c.status === "loser" ? "△ LOSER" : "● STABLE"}
      </div>
    </div>
  );
}

// ───────────────────────────── Alert Banner ─────────────────────────────
function AlertBanner({ count, onClick }) {
  if (count === 0) return null;
  return (
    <div className="alert-banner" onClick={onClick}>
      <div className="alert-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 10v5M12 17.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="alert-body">
        <div className="alert-title">{count} recomendaç{count === 1 ? "ão" : "ões"} pendente{count === 1 ? "" : "s"}</div>
        <div className="alert-sub">CPEE da conta MG está acima da meta. Ação recomendada.</div>
      </div>
      <div className="alert-cta">Ver detalhes →</div>
    </div>
  );
}

Object.assign(window, {
  BRL, BRLfine, NUM, NUMcompact, PCT, cn, fmtDateBR, daysBetween,
  Sparkline, StatusBadge, Delta, LiveDot, Icon,
  KpiCard, PerformanceTable, TrendChart, PeriodSelector,
  RecommendationCard, CreativeRow, CreativeThumb, AlertBanner,
  MonthlyMetaCard, ClassificacaoCpee, FunilConversao, SpendBreakdown, DistribuicaoCpee, ClustersPanel,
});
