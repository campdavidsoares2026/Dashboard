// Mock data shaped like the Supabase tables in the spec
// Generates 135 days of per-account daily metrics ending 2026-05-14
// Includes: spend, leads, impressões, alcance, cliques, EQ, plus derived

// ─── seeded RNG for stable mock data ─────────────────────────────
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TODAY = new Date("2026-05-14T00:00:00Z");
const START = new Date("2026-01-01T00:00:00Z");
const TOTAL_DAYS = Math.round((TODAY - START) / (1000 * 60 * 60 * 24)) + 1;

const ACCOUNTS = [
  {
    account_id: "act_001",
    nome: "Piloto Auto · São Paulo",
    regiao: "SP",
    base_spend: 5000,     // avg daily R$
    base_cpee: 24.5,      // target CPEE
    ctr_base: 0.024,
    cpm_base: 38,
    lead_rate: 0.42,      // leads as fraction of EQ
    meta_mensal: 150000,
    budget_diario: 5500,
  },
  {
    account_id: "act_002",
    nome: "Piloto Auto · Rio de Janeiro",
    regiao: "RJ",
    base_spend: 3800,
    base_cpee: 30.1,
    ctr_base: 0.019,
    cpm_base: 42,
    lead_rate: 0.36,
    meta_mensal: 114000,
    budget_diario: 4200,
  },
  {
    account_id: "act_003",
    nome: "Piloto Auto · Belo Horizonte",
    regiao: "MG",
    base_spend: 2700,
    base_cpee: 36.0,
    ctr_base: 0.0155,
    cpm_base: 46,
    lead_rate: 0.28,
    meta_mensal: 82000,
    budget_diario: 3000,
  },
];

// ─── Daily snapshot generator ─────────────────────────────────────
function buildDailyData() {
  const out = [];
  for (let acctIdx = 0; acctIdx < ACCOUNTS.length; acctIdx++) {
    const a = ACCOUNTS[acctIdx];
    const rng = mulberry32(42 + acctIdx * 31);
    // Trend factor: slight improvement for SP, flat for RJ, deteriorating for MG
    const trendDir = [-0.0015, 0.0003, 0.0022][acctIdx];
    let cpeeWalk = a.base_cpee - trendDir * TOTAL_DAYS * 0.5;

    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d = new Date(START);
      d.setUTCDate(d.getUTCDate() + i);
      const dow = d.getUTCDay();
      const weekendMod = (dow === 0 || dow === 6) ? 0.85 : 1.0;
      const dom = d.getUTCDate();
      const monthMod = 0.92 + 0.08 * Math.sin((dom / 30) * Math.PI);

      const noise = 0.88 + rng() * 0.24;
      const spend = Math.round(a.base_spend * noise * weekendMod * monthMod);

      cpeeWalk += trendDir + (rng() - 0.5) * 0.45;
      const cpee = Math.max(14, cpeeWalk);

      const impressoes = Math.round(spend / a.cpm_base * 1000 * (0.94 + rng() * 0.12));
      const alcance = Math.round(impressoes / (1.6 + rng() * 0.5));
      const cliques = Math.round(impressoes * a.ctr_base * (0.9 + rng() * 0.2));
      const eq = Math.max(1, Math.round(spend / cpee));
      const leads = Math.max(0, Math.round(eq * a.lead_rate * (0.85 + rng() * 0.3)));
      const ctr = impressoes > 0 ? (cliques / impressoes) * 100 : 0;
      const cpc = cliques > 0 ? spend / cliques : 0;
      const cpm = impressoes > 0 ? (spend / impressoes) * 1000 : 0;
      const cpl = leads > 0 ? spend / leads : 0;

      out.push({
        data: d.toISOString().slice(0, 10),
        account_id: a.account_id,
        regiao: a.regiao,
        spend,
        impressoes,
        alcance,
        cliques,
        eq,
        leads,
        ctr,
        cpc,
        cpm,
        cpl,
        cpee,
      });
    }
  }
  return out;
}

const DAILY = buildDailyData();

// ─── Aggregations ─────────────────────────────────────────────────
// Classification is RELATIVE to the period average (quente = below avg = good)
function classifyCpee(cpee, avgCpee) {
  if (!cpee || cpee <= 0) return "COLD";
  if (!avgCpee || avgCpee <= 0) return "WARM";
  if (cpee <= avgCpee * 0.85) return "HOT";
  if (cpee <= avgCpee * 1.15) return "WARM";
  return "COLD";
}

// Aggregate over a date range (inclusive) — returns per-account + totals
// daily: array of per-day-per-account rows
// accounts: array of account metadata
function aggregate(daily, accounts, startISO, endISO, accountId = null) {
  const filter = (r) => r.data >= startISO && r.data <= endISO && (!accountId || r.account_id === accountId);
  const rows = (daily || []).filter(filter);
  const acctsList = accounts || [];

  // per-account aggregation
  const byAcct = new Map();
  for (const r of rows) {
    if (!byAcct.has(r.account_id)) {
      byAcct.set(r.account_id, {
        account_id: r.account_id,
        spend: 0, impressoes: 0, alcance: 0, cliques: 0, eq: 0, leads: 0,
      });
    }
    const acc = byAcct.get(r.account_id);
    acc.spend += r.spend || 0;
    acc.impressoes += r.impressoes || 0;
    acc.alcance += r.alcance || 0;
    acc.cliques += r.cliques || 0;
    acc.eq += r.eq || 0;
    acc.leads += r.leads || 0;
  }

  // compute derived per-account (without classification — needs avg first)
  const perAccountRaw = [...byAcct.values()].map((acc) => {
    const a = acctsList.find((x) => x.account_id === acc.account_id) || {};
    // CPEE = spend / clicks (cliques). Fall back to eq if no clicks data.
    const cpee = acc.cliques > 0 ? acc.spend / acc.cliques : (acc.eq > 0 ? acc.spend / acc.eq : 0);
    return {
      ...acc,
      nome: a.nome || acc.account_id,
      regiao: a.regiao || "—",
      meta_mensal: a.meta_mensal || 0,
      budget_diario: a.budget_diario || 0,
      campanhas_ativas: a.campanhas_ativas || { SP: 7, RJ: 5, MG: 6 }[a.regiao] || 0,
      cpee,
      ctr: acc.impressoes > 0 ? (acc.cliques / acc.impressoes) * 100 : 0,
      cpc: acc.cliques > 0 ? acc.spend / acc.cliques : 0,
      cpm: acc.impressoes > 0 ? (acc.spend / acc.impressoes) * 1000 : 0,
      cpl: acc.leads > 0 ? acc.spend / acc.leads : 0,
      frequencia: acc.alcance > 0 ? acc.impressoes / acc.alcance : 0,
    };
  });

  // totals (needed for relative classification)
  const totals = perAccountRaw.reduce(
    (a, b) => ({
      spend: a.spend + b.spend,
      impressoes: a.impressoes + b.impressoes,
      alcance: a.alcance + b.alcance,
      cliques: a.cliques + b.cliques,
      eq: a.eq + b.eq,
      leads: a.leads + b.leads,
    }),
    { spend: 0, impressoes: 0, alcance: 0, cliques: 0, eq: 0, leads: 0 }
  );
  // CPEE total = spend / clicks (same formula)
  totals.cpee = totals.cliques > 0 ? totals.spend / totals.cliques : (totals.eq > 0 ? totals.spend / totals.eq : 0);
  totals.ctr = totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0;
  totals.cpc = totals.cliques > 0 ? totals.spend / totals.cliques : 0;
  totals.cpm = totals.impressoes > 0 ? (totals.spend / totals.impressoes) * 1000 : 0;
  totals.cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  totals.frequencia = totals.alcance > 0 ? totals.impressoes / totals.alcance : 0;
  totals.classificacao_cpee = classifyCpee(totals.cpee, totals.cpee); // totals is the baseline → WARM

  // classify each account relative to the period average
  const avgCpee = totals.cpee;
  const perAccount = perAccountRaw.map((acc) => ({
    ...acc,
    classificacao_cpee: classifyCpee(acc.cpee, avgCpee),
  }));

  // daily series (totals + per-account)
  const dailyMap = new Map();
  for (const r of rows) {
    if (!dailyMap.has(r.data)) dailyMap.set(r.data, []);
    dailyMap.get(r.data).push(r);
  }
  const dailySeries = [...dailyMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([data, list]) => {
      const sum = list.reduce(
        (a, b) => ({
          spend: a.spend + (b.spend || 0),
          eq: a.eq + (b.eq || 0),
          leads: a.leads + (b.leads || 0),
          impressoes: a.impressoes + (b.impressoes || 0),
          cliques: a.cliques + (b.cliques || 0),
        }),
        { spend: 0, eq: 0, leads: 0, impressoes: 0, cliques: 0 }
      );
      sum.cpee = sum.cliques > 0 ? sum.spend / sum.cliques : (sum.eq > 0 ? sum.spend / sum.eq : 0);
      sum.cpl = sum.leads > 0 ? sum.spend / sum.leads : 0;
      sum.ctr = sum.impressoes > 0 ? (sum.cliques / sum.impressoes) * 100 : 0;
      return { data, ...sum, byAccount: list };
    });

  // monthly target progress (calendar month containing the END date)
  const endDate = new Date(endISO + "T00:00:00Z");
  const monthStart = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0));
  const monthRows = (daily || []).filter((r) => {
    const d = new Date(r.data + "T00:00:00Z");
    return d >= monthStart && d <= endDate && (!accountId || r.account_id === accountId);
  });
  const monthSpend = monthRows.reduce((a, b) => a + (b.spend || 0), 0);
  const monthMeta = accountId
    ? (acctsList.find((a) => a.account_id === accountId)?.meta_mensal || 0)
    : acctsList.reduce((a, b) => a + (b.meta_mensal || 0), 0);
  const monthDaysElapsed = Math.round((endDate - monthStart) / (1000 * 60 * 60 * 24)) + 1;
  const monthDaysTotal = Math.round((monthEnd - monthStart) / (1000 * 60 * 60 * 24)) + 1;
  const monthProgress = monthMeta > 0 ? monthSpend / monthMeta : 0;
  const monthExpected = monthDaysElapsed / monthDaysTotal;

  // delta vs equivalent previous period
  const prevEnd = new Date(new Date(startISO + "T00:00:00Z").getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (new Date(endISO + "T00:00:00Z") - new Date(startISO + "T00:00:00Z")));
  const prevRows = (daily || []).filter((r) => {
    const d = new Date(r.data + "T00:00:00Z");
    return d >= prevStart && d <= prevEnd && (!accountId || r.account_id === accountId);
  });
  const prevSpend = prevRows.reduce((a, b) => a + (b.spend || 0), 0);
  const prevEq = prevRows.reduce((a, b) => a + (b.eq || 0), 0);
  const prevLeads = prevRows.reduce((a, b) => a + (b.leads || 0), 0);
  const prevImpr = prevRows.reduce((a, b) => a + (b.impressoes || 0), 0);
  const prevAlc = prevRows.reduce((a, b) => a + (b.alcance || 0), 0);
  const prevCli = prevRows.reduce((a, b) => a + (b.cliques || 0), 0);
  const prevCpee = prevCli > 0 ? prevSpend / prevCli : (prevEq > 0 ? prevSpend / prevEq : 0);
  const prevCtr = prevImpr > 0 ? (prevCli / prevImpr) * 100 : 0;
  const prevCpl = prevLeads > 0 ? prevSpend / prevLeads : 0;
  const prevFreq = prevAlc > 0 ? prevImpr / prevAlc : 0;

  const deltaPct = (curr, prev) => prev > 0 ? ((curr - prev) / prev) * 100 : 0;

  return {
    perAccount,
    totals,
    dailySeries,
    monthly: {
      spend: monthSpend,
      meta: monthMeta,
      progress: monthProgress,
      expected: monthExpected,
      daysElapsed: monthDaysElapsed,
      daysTotal: monthDaysTotal,
    },
    deltas: {
      spend: deltaPct(totals.spend, prevSpend),
      eq: deltaPct(totals.eq, prevEq),
      leads: deltaPct(totals.leads, prevLeads),
      impressoes: deltaPct(totals.impressoes, prevImpr),
      alcance: deltaPct(totals.alcance, prevAlc),
      cliques: deltaPct(totals.cliques, prevCli),
      cpee: deltaPct(totals.cpee, prevCpee),
      ctr: deltaPct(totals.ctr, prevCtr),
      cpl: deltaPct(totals.cpl, prevCpl),
      frequencia: deltaPct(totals.frequencia, prevFreq),
    },
  };
}

// Period presets
const PERIOD_PRESETS = [
  { id: "7d", label: "7 dias", days: 7 },
  { id: "14d", label: "14 dias", days: 14 },
  { id: "30d", label: "30 dias", days: 30 },
  { id: "60d", label: "60 dias", days: 60 },
  { id: "90d", label: "90 dias", days: 90 },
  { id: "ytd", label: "Desde 01/01/2026", days: null },
  { id: "mtd", label: "Mês atual", days: null },
  { id: "custom", label: "Personalizado", days: null },
];

function rangeFromPreset(presetId, customStart, customEnd) {
  const fmt = (d) => d.toISOString().slice(0, 10);
  if (presetId === "ytd") {
    return { start: "2026-01-01", end: fmt(TODAY) };
  }
  if (presetId === "mtd") {
    const s = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), 1));
    return { start: fmt(s), end: fmt(TODAY) };
  }
  if (presetId === "custom") {
    return { start: customStart, end: customEnd };
  }
  const preset = PERIOD_PRESETS.find((p) => p.id === presetId);
  const days = preset?.days ?? 14;
  const s = new Date(TODAY);
  s.setUTCDate(s.getUTCDate() - (days - 1));
  return { start: fmt(s), end: fmt(TODAY) };
}

// ─── Recommendations ─────────────────────────────────────────────────
const RECOMENDACOES = [
  {
    id: "rec_001",
    severidade: "alta",
    account_id: "act_003",
    titulo: "Pausar 2 adsets com CPEE > R$ 48",
    descricao: "Belo Horizonte está 30% acima do CPEE alvo. Adsets BH-LAL-3 e BH-INT-7 concentram 41% do gasto e geram apenas 18% do EQ.",
    impacto_estimado: "−R$ 2.140 / semana",
    confianca: 0.92,
    criado_em: "2026-05-14T13:48:00Z",
  },
  {
    id: "rec_002",
    severidade: "media",
    account_id: "act_001",
    titulo: "Escalar criativo SP-Video-04 em +30%",
    descricao: "CPEE 18% abaixo da média da conta nos últimos 5 dias. CTR de 3.4% sustentado. Budget atual sub-utilizado.",
    impacto_estimado: "+62 EQ / semana",
    confianca: 0.87,
    criado_em: "2026-05-14T12:11:00Z",
  },
  {
    id: "rec_003",
    severidade: "media",
    account_id: "act_002",
    titulo: "Testar nova LP para campanha RJ-Conversão",
    descricao: "Taxa de conversão da LP atual caiu de 4.1% → 2.8% em 14 dias. CPM estável, problema está pós-clique.",
    impacto_estimado: "−R$ 6 CPEE",
    confianca: 0.74,
    criado_em: "2026-05-14T10:24:00Z",
  },
  {
    id: "rec_004",
    severidade: "baixa",
    account_id: "act_001",
    titulo: "Consolidar 3 adsets similares (LAL 1%)",
    descricao: "Saída do learning prejudicada por orçamentos fragmentados. Consolidar libera fase de otimização.",
    impacto_estimado: "+12% eficiência",
    confianca: 0.68,
    criado_em: "2026-05-14T09:02:00Z",
  },
];

const CRIATIVOS = [
  { id: "cr_01", nome: "SP-Video-04", account_id: "act_001", thumb: "video", spend: 4820, leads: 218, cpee: 22.1, ctr: 3.42, status: "winner", image_url: "https://picsum.photos/seed/cpee-sp-video-04/240/240" },
  { id: "cr_02", nome: "SP-Static-12", account_id: "act_001", thumb: "static", spend: 3640, leads: 152, cpee: 23.9, ctr: 2.81, status: "winner", image_url: "https://picsum.photos/seed/cpee-sp-static-12/240/240" },
  { id: "cr_03", nome: "RJ-Carrossel-08", account_id: "act_002", thumb: "carousel", spend: 4120, leads: 142, cpee: 29.0, ctr: 2.04, status: "stable", image_url: "https://picsum.photos/seed/cpee-rj-carr-08/240/240" },
  { id: "cr_04", nome: "MG-Video-02", account_id: "act_003", thumb: "video", spend: 5310, leads: 116, cpee: 45.8, ctr: 1.42, status: "loser", image_url: "https://picsum.photos/seed/cpee-mg-video-02/240/240" },
  { id: "cr_05", nome: "MG-Static-09", account_id: "act_003", thumb: "static", spend: 3210, leads: 84, cpee: 38.2, ctr: 1.71, status: "loser", image_url: "https://picsum.photos/seed/cpee-mg-static-09/240/240" },
  { id: "cr_06", nome: "SP-UGC-11", account_id: "act_001", thumb: "ugc", spend: 2890, leads: 134, cpee: 21.6, ctr: 3.18, status: "winner", image_url: "https://picsum.photos/seed/cpee-sp-ugc-11/240/240" },
];

// ─── Audience Clusters (from clusters_performance) ──────────────────────
const CLUSTERS = [
  // HOT (≤ R$ 27)
  { id: "cl_h1", nome: "Visitantes LP · 7d", tipo: "QUENTE", account_id: "act_001", regiao: "SP", cpee: 17.8, spend: 8420, eq: 473, leads: 198, ctr: 3.84, alcance: 42180, tendencia: "up" },
  { id: "cl_h2", nome: "Carrinho abandonado · 30d", tipo: "QUENTE", account_id: "act_001", regiao: "SP", cpee: 19.4, spend: 6210, eq: 320, leads: 138, ctr: 3.52, alcance: 31240, tendencia: "stable" },
  { id: "cl_h3", nome: "LAL 1% · Compradores", tipo: "QUENTE", account_id: "act_002", regiao: "RJ", cpee: 23.6, spend: 9120, eq: 386, leads: 142, ctr: 2.94, alcance: 58210, tendencia: "up" },
  { id: "cl_h4", nome: "Engajadores 14d · Instagram", tipo: "QUENTE", account_id: "act_001", regiao: "SP", cpee: 24.9, spend: 5410, eq: 217, leads: 78, ctr: 2.82, alcance: 38420, tendencia: "stable" },

  // WARM (R$ 27 – 31)
  { id: "cl_w1", nome: "Interesses · Auto Premium", tipo: "MORNO", account_id: "act_002", regiao: "RJ", cpee: 28.4, spend: 7320, eq: 258, leads: 88, ctr: 2.16, alcance: 64210, tendencia: "stable" },
  { id: "cl_w2", nome: "Engajadores 30d · Facebook", tipo: "MORNO", account_id: "act_002", regiao: "RJ", cpee: 29.7, spend: 5840, eq: 197, leads: 62, ctr: 2.04, alcance: 51820, tendencia: "down" },
  { id: "cl_w3", nome: "LAL 3% · Leads", tipo: "MORNO", account_id: "act_001", regiao: "SP", cpee: 30.2, spend: 4910, eq: 163, leads: 58, ctr: 1.92, alcance: 47120, tendencia: "stable" },
  { id: "cl_w4", nome: "Interesses · Financiamento", tipo: "MORNO", account_id: "act_003", regiao: "MG", cpee: 30.8, spend: 4320, eq: 140, leads: 41, ctr: 1.84, alcance: 38940, tendencia: "down" },

  // COLD (> R$ 31)
  { id: "cl_c1", nome: "Broad · 25-45", tipo: "FRIO", account_id: "act_003", regiao: "MG", cpee: 38.4, spend: 6820, eq: 178, leads: 38, ctr: 1.42, alcance: 82120, tendencia: "down" },
  { id: "cl_c2", nome: "Interesses · Promoções", tipo: "FRIO", account_id: "act_003", regiao: "MG", cpee: 42.6, spend: 5910, eq: 139, leads: 27, ctr: 1.38, alcance: 71240, tendencia: "down" },
  { id: "cl_c3", nome: "Open targeting · Test", tipo: "FRIO", account_id: "act_002", regiao: "RJ", cpee: 48.2, spend: 4180, eq: 87, leads: 18, ctr: 1.21, alcance: 56340, tendencia: "down" },
  { id: "cl_c4", nome: "LAL 5% · App users", tipo: "FRIO", account_id: "act_003", regiao: "MG", cpee: 51.7, spend: 3210, eq: 62, leads: 11, ctr: 1.14, alcance: 41210, tendencia: "stable" },
];

Object.assign(window, {
  ACCOUNTS,
  DAILY,
  RECOMENDACOES,
  CRIATIVOS,
  CLUSTERS,
  PERIOD_PRESETS,
  TODAY,
  aggregate,
  rangeFromPreset,
  classifyCpee,
});
