// frontend/lib/compute.ts
// Pure functions: aggregation, classification, linear prediction, alert rules.
// No side effects, no Supabase calls — easy to test.

import type { Snapshot, MetricaConta } from "./types";

export type Classificacao = "BOM" | "MEDIO" | "RUIM" | "SEM_DADOS";

export function classifyCPEE(cpee: number): Classificacao {
  if (cpee <= 0) return "SEM_DADOS";
  if (cpee < 100) return "BOM";
  if (cpee < 200) return "MEDIO";
  return "RUIM";
}

export interface Totals {
  spend: number;
  leads: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  thruplay: number;
  eq: number;
  cpee: number;
  ctr: number;
  cpc: number;
  cpl: number;
  cpm: number;
  frequencia: number;
}

export function aggregateSnapshots(rows: Snapshot[]): Totals {
  const t: Totals = {
    spend: 0,
    leads: 0,
    impressoes: 0,
    alcance: 0,
    cliques: 0,
    thruplay: 0,
    eq: 0,
    cpee: 0,
    ctr: 0,
    cpc: 0,
    cpl: 0,
    cpm: 0,
    frequencia: 0,
  };
  if (rows.length === 0) return t;

  for (const r of rows) {
    t.spend += Number(r.spend) || 0;
    t.leads += Number(r.leads) || 0;
    t.impressoes += Number(r.impressoes) || 0;
    t.alcance += Number(r.alcance) || 0;
    t.cliques += Number(r.cliques) || 0;
    t.thruplay += Number(r.thruplay) || 0;
    t.eq += Number(r.eq) || 0;
  }

  t.cpee = t.leads > 0 ? t.spend / t.leads : 0;
  t.cpl = t.cpee;
  t.ctr = t.impressoes > 0 ? (t.cliques / t.impressoes) * 100 : 0;
  t.cpc = t.cliques > 0 ? t.spend / t.cliques : 0;
  t.cpm = t.impressoes > 0 ? (t.spend / t.impressoes) * 1000 : 0;
  t.frequencia = t.alcance > 0 ? t.impressoes / t.alcance : 0;

  return t;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export function buildCpeeTrend(rows: Snapshot[]): TrendPoint[] {
  const byDate = new Map<string, { spend: number; leads: number }>();
  for (const r of rows) {
    const cur = byDate.get(r.data) ?? { spend: 0, leads: 0 };
    cur.spend += Number(r.spend) || 0;
    cur.leads += Number(r.leads) || 0;
    byDate.set(r.data, cur);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { spend, leads }]) => ({
      date,
      value: leads > 0 ? Math.round((spend / leads) * 100) / 100 : 0,
    }));
}

export function buildSpendTrend(rows: Snapshot[]): TrendPoint[] {
  const byDate = new Map<string, number>();
  for (const r of rows) {
    byDate.set(r.data, (byDate.get(r.data) ?? 0) + (Number(r.spend) || 0));
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      value: Math.round(value * 100) / 100,
    }));
}

export interface Prediction {
  tendencia_pct: number;
  confianca: number;
  slope: number;
  intercept: number;
}

/**
 * Linear regression on a CPEE time series.
 * Returns daily slope as a percent of mean + R² as confidence.
 */
export function predictCpeeNextDays(
  trend: TrendPoint[],
  _daysAhead = 7
): Prediction {
  const points = trend.filter((p) => p.value > 0);
  if (points.length < 3) {
    return { tendencia_pct: 0, confianca: 0, slope: 0, intercept: 0 };
  }
  const n = points.length;
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.value);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const confianca = Math.max(0, Math.min(100, Math.round(r2 * 100)));

  const tendencia_pct =
    meanY === 0 ? 0 : Math.round((slope / meanY) * 10000) / 100;

  return { tendencia_pct, confianca, slope, intercept };
}

export interface Alert {
  id: string;
  cluster: string;
  type: "warning" | "success" | "info";
  title: string;
  reason: string;
  actions: Array<{ label: string; action: string }>;
  sentiment?: string;
}

export function generateRecommendations(metricas: MetricaConta[]): Alert[] {
  const alerts: Alert[] = [];
  for (const m of metricas) {
    const base = {
      cluster: m.nome,
      actions: [{ label: "Analisar", action: "analyze" }],
    };
    if (m.spend > 0 && m.cpc > 150) {
      alerts.push({
        ...base,
        id: `cpc-${m.account_id}`,
        type: "warning",
        title: `CPC elevado em ${m.nome}`,
        reason: `CPC R$ ${m.cpc.toFixed(2)} acima da meta R$ 100`,
      });
    }
    if (m.spend > 0 && m.ctr > 0 && m.ctr < 0.5) {
      alerts.push({
        ...base,
        id: `ctr-${m.account_id}`,
        type: "warning",
        title: `CTR baixo em ${m.nome}`,
        reason: `CTR ${m.ctr.toFixed(2)}% abaixo do esperado`,
      });
    }
    if (m.cpee > 200) {
      alerts.push({
        ...base,
        id: `cpee-${m.account_id}`,
        type: "warning",
        title: `CPEE elevado em ${m.nome}`,
        reason: `CPEE R$ ${m.cpee.toFixed(2)} acima da meta R$ 100`,
      });
    }
  }
  return alerts;
}
