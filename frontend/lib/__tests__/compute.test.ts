import {
  classifyCPEE,
  aggregateSnapshots,
  buildCpeeTrend,
  predictCpeeNextDays,
  generateRecommendations,
} from "../compute";
import type { Snapshot, MetricaConta } from "../types";

const mkSnap = (over: Partial<Snapshot>): Snapshot => ({
  data: "2026-05-20",
  account_id: "act_1",
  nome: "Conta 1",
  papel: null,
  cpee: 0,
  eq: 0,
  spend: 0,
  leads: 0,
  impressoes: 0,
  alcance: 0,
  cliques: 0,
  thruplay: 0,
  frequencia: 0,
  ctr: 0,
  cpc: 0,
  budget_diario: null,
  classificacao: "SEM_DADOS",
  ...over,
});

const mkMet = (over: Partial<MetricaConta>): MetricaConta => ({
  account_id: "act_1",
  nome: "Conta 1",
  papel: null,
  cpee: 0,
  eq: 0,
  classificacao_cpee: "SEM_DADOS",
  spend: 0,
  impressoes: 0,
  alcance: 0,
  frequencia: 0,
  ctr: 0,
  cpc: 0,
  leads: 0,
  cpl: 0,
  budget_atual: null,
  budget_recomendado: null,
  executado_em: "2026-05-27T00:00:00Z",
  ...over,
});

describe("classifyCPEE", () => {
  it("returns SEM_DADOS for 0 or negative", () => {
    expect(classifyCPEE(0)).toBe("SEM_DADOS");
    expect(classifyCPEE(-1)).toBe("SEM_DADOS");
  });
  it("returns BOM under 100", () => expect(classifyCPEE(50)).toBe("BOM"));
  it("returns MEDIO between 100 and 199", () =>
    expect(classifyCPEE(150)).toBe("MEDIO"));
  it("returns RUIM at 200 or above", () =>
    expect(classifyCPEE(200)).toBe("RUIM"));
});

describe("aggregateSnapshots", () => {
  it("sums spend, leads, impressoes; recomputes CPEE/CTR/CPC", () => {
    const rows = [
      mkSnap({ spend: 100, leads: 2, impressoes: 1000, cliques: 10 }),
      mkSnap({ spend: 200, leads: 3, impressoes: 2000, cliques: 20 }),
    ];
    const a = aggregateSnapshots(rows);
    expect(a.spend).toBe(300);
    expect(a.leads).toBe(5);
    expect(a.impressoes).toBe(3000);
    expect(a.cliques).toBe(30);
    expect(a.cpee).toBeCloseTo(60, 0); // 300/5
    expect(a.ctr).toBeCloseTo(1, 1); // 30/3000 * 100
    expect(a.cpc).toBeCloseTo(10, 0); // 300/30
  });
  it("returns zeros for empty input", () => {
    const a = aggregateSnapshots([]);
    expect(a.spend).toBe(0);
    expect(a.cpee).toBe(0);
  });
});

describe("buildCpeeTrend", () => {
  it("groups by date and computes daily CPEE", () => {
    const rows = [
      mkSnap({ data: "2026-05-20", spend: 100, leads: 2 }),
      mkSnap({ data: "2026-05-20", spend: 100, leads: 2 }),
      mkSnap({ data: "2026-05-21", spend: 300, leads: 3 }),
    ];
    const trend = buildCpeeTrend(rows);
    expect(trend).toHaveLength(2);
    expect(trend[0]).toEqual({ date: "2026-05-20", value: 50 }); // 200/4
    expect(trend[1]).toEqual({ date: "2026-05-21", value: 100 }); // 300/3
  });
});

describe("predictCpeeNextDays", () => {
  it("returns 0 confidence with <3 points", () => {
    const p = predictCpeeNextDays([], 7);
    expect(p.confianca).toBe(0);
  });
  it("detects upward trend", () => {
    const trend = [
      { date: "d1", value: 50 },
      { date: "d2", value: 60 },
      { date: "d3", value: 70 },
      { date: "d4", value: 80 },
    ];
    const p = predictCpeeNextDays(trend, 7);
    expect(p.tendencia_pct).toBeGreaterThan(0);
    expect(p.confianca).toBeGreaterThan(50);
  });
});

describe("generateRecommendations", () => {
  it("flags CPC > 150", () => {
    const recs = generateRecommendations([mkMet({ spend: 1000, cpc: 200 })]);
    expect(
      recs.find((r) => r.type === "warning" && /CPC/i.test(r.title))
    ).toBeTruthy();
  });
  it("flags CTR < 0.5%", () => {
    const recs = generateRecommendations([mkMet({ spend: 1000, ctr: 0.3 })]);
    expect(recs.find((r) => /CTR/i.test(r.title))).toBeTruthy();
  });
  it("flags CPEE > 200", () => {
    const recs = generateRecommendations([mkMet({ cpee: 250 })]);
    expect(recs.find((r) => /CPEE/i.test(r.title))).toBeTruthy();
  });
  it("returns empty when all metrics healthy", () => {
    expect(
      generateRecommendations([
        mkMet({ spend: 1000, cpc: 50, ctr: 2, cpee: 80 }),
      ])
    ).toEqual([]);
  });
});
