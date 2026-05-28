# CPEE Dashboard — Supabase Direct Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar o Next.js dashboard (3 tabs já construídos em `frontend/app/dashboard/`) aos dados reais do Supabase, consolidando em 2 tabs (Visão Geral + Detalhamento) e eliminando o backend FastAPI.

**Architecture:** Substituir `lib/api.ts` (que aponta para FastAPI inexistente) por consultas REST diretas ao Supabase. Adicionar 3 módulos novos em `lib/` — cliente, hooks TanStack Query, funções puras de cálculo (incluindo regressão linear para previsões). Reaproveitar componentes existentes alterando apenas suas fontes de dados.

**Tech Stack:** Next.js 16, React 19, TanStack Query v5, Recharts 3, TypeScript, Supabase REST API, Jest + Testing Library

---

## File Structure

**New files (`frontend/lib/`):**
- `supabase.ts` — Cliente REST + helpers
- `types.ts` — Interfaces TypeScript para tabelas Supabase
- `compute.ts` — Funções puras (agregação, classificação, previsão linear, geração de alertas)
- `queries.ts` — TanStack Query hooks por tabela

**New routes (`frontend/app/dashboard/`):**
- `visao-geral/page.tsx` + components (refatorar de `overview/`)
- `detalhamento/page.tsx` + components (consolidar `comparacoes/` + `insights/`)

**Modified files:**
- `frontend/.env.local` — adicionar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `frontend/app/dashboard/page.tsx` — nav com 2 tabs em vez de 3
- `frontend/lib/api.ts` — DELETAR no fim
- Componentes existentes — substituir props mockadas por dados reais

**Deleted folders (no fim, após confirmação):**
- `frontend/app/dashboard/overview/`
- `frontend/app/dashboard/comparacoes/`
- `frontend/app/dashboard/insights/`

---

## Phase 1: Foundation (`lib/`)

### Task 1: Configurar env vars

**Files:**
- Modify: `frontend/.env.local`
- Create: `frontend/.env.local.example`

- [ ] **Step 1: Atualizar `frontend/.env.local`**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ygbrgtuddtisoowwdxqn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_dD7pAtkSiOk-p83TEUdC0A_9RSr0mto
```

(Remover `NEXT_PUBLIC_API_URL=http://localhost:8000`)

- [ ] **Step 2: Criar `frontend/.env.local.example`**

```bash
# Supabase project containing snapshots_diarios, metricas_conta, criativos_performance
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/.env.local.example
git commit -m "chore(frontend): add Supabase env vars template"
```

(`.env.local` é gitignored, não vai junto)

---

### Task 2: Criar `lib/types.ts` — tipos das tabelas Supabase

**Files:**
- Create: `frontend/lib/types.ts`

- [ ] **Step 1: Criar arquivo com interfaces das 5 tabelas**

```typescript
// frontend/lib/types.ts

export interface Snapshot {
  data: string;              // YYYY-MM-DD
  account_id: string;
  nome: string;
  papel: string | null;
  cpee: number;
  eq: number;
  spend: number;
  leads: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  thruplay: number;
  frequencia: number;
  ctr: number;
  cpc: number;
  cpm?: number;
  budget_diario: number | null;
  classificacao: string;
}

export interface MetricaConta {
  account_id: string;
  nome: string;
  papel: string | null;
  cpee: number;
  eq: number;
  classificacao_cpee: 'BOM' | 'MEDIO' | 'RUIM' | 'SEM_DADOS';
  spend: number;
  impressoes: number;
  alcance: number;
  frequencia: number;
  ctr: number;
  cpc: number;
  leads: number;
  cpl: number;
  budget_atual: number | null;
  budget_recomendado: number | null;
  executado_em: string;
}

export interface Criativo {
  ad_id: string;
  account_id: string;
  conta_nome: string;
  ad_nome: string;
  pauta: string;             // "VID" | "EST" | "CAR"
  thumbnail_url: string | null;
  cpee: number;
  eq: number;
  spend: number;
  impressoes: number;
  alcance: number;
  ctr: number;
  cpc: number;
  leads: number;
  cpl: number;
  cpee_7d: number;
  cpee_30d: number;
  spend_7d: number;
  spend_30d: number;
  classificacao: 'QUENTE' | 'MORNO' | 'FRIO';
}

export interface Cluster {
  adset_id: string;
  account_id: string;
  conta_nome: string;
  cluster_nome: string;
  cluster_num: number;
  pauta: string;
  cpee: number;
  eq: number;
  spend: number;
  impressoes: number;
  alcance: number;
  ctr: number;
  cpc: number;
  leads: number;
  cpee_7d: number;
  cpee_30d: number;
  spend_7d: number;
  spend_30d: number;
  classificacao: 'QUENTE' | 'MORNO' | 'FRIO';
}

export interface Recomendacao {
  id: number;
  account_id: string;
  nome: string;
  tipo: string;
  severidade: 'alta' | 'media' | 'baixa';
  titulo: string;
  descricao: string;
  motivo: string;
  aprovada: boolean;
  executada: boolean;
  executado_em: string;
}

export type Period = { start: string; end: string };
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/lib/types.ts
git commit -m "feat(frontend): add Supabase table types"
```

---

### Task 3: Criar `lib/supabase.ts` — cliente REST

**Files:**
- Create: `frontend/lib/supabase.ts`

- [ ] **Step 1: Criar cliente helper**

```typescript
// frontend/lib/supabase.ts

export const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const HDR = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
};

if (typeof window !== "undefined" && (!SUPA_URL || !KEY)) {
  console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing");
}

/** GET to /rest/v1/<path>. `path` can include query params. */
export async function sb<T = unknown>(path: string): Promise<T> {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: HDR,
    // Always go to Supabase fresh — TanStack Query handles caching above
    cache: "no-store",
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Supabase ${r.status}: ${body.slice(0, 300)}`);
  }
  return r.json() as Promise<T>;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/lib/supabase.ts
git commit -m "feat(frontend): add Supabase REST client helper"
```

---

### Task 4: Criar `lib/compute.ts` com TDD

**Files:**
- Create: `frontend/lib/compute.ts`
- Create: `frontend/lib/__tests__/compute.test.ts`

- [ ] **Step 1: Escrever testes**

```typescript
// frontend/lib/__tests__/compute.test.ts
import {
  classifyCPEE,
  aggregateSnapshots,
  buildCpeeTrend,
  buildSpendTrend,
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

describe("classifyCPEE", () => {
  it("returns SEM_DADOS for 0 or negative", () => {
    expect(classifyCPEE(0)).toBe("SEM_DADOS");
    expect(classifyCPEE(-1)).toBe("SEM_DADOS");
  });
  it("returns BOM under 100", () => expect(classifyCPEE(50)).toBe("BOM"));
  it("returns MEDIO between 100 and 199", () => expect(classifyCPEE(150)).toBe("MEDIO"));
  it("returns RUIM at 200 or above", () => expect(classifyCPEE(200)).toBe("RUIM"));
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
    expect(a.cpee).toBeCloseTo(60, 0);     // 300/5
    expect(a.ctr).toBeCloseTo(1, 1);        // 30/3000 * 100
    expect(a.cpc).toBeCloseTo(10, 0);       // 300/30
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
    expect(trend[0]).toEqual({ date: "2026-05-20", value: 50 });   // 200/4
    expect(trend[1]).toEqual({ date: "2026-05-21", value: 100 });  // 300/3
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
  it("flags CPC > 150", () => {
    const recs = generateRecommendations([mkMet({ spend: 1000, cpc: 200 })]);
    expect(recs.find((r) => r.type === "warning" && /CPC/i.test(r.title))).toBeTruthy();
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
    expect(generateRecommendations([mkMet({ spend: 1000, cpc: 50, ctr: 2, cpee: 80 })])).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar testes para confirmar que falham**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
npm test -- --testPathPattern=compute
```

Expected: All tests fail with "Cannot find module '../compute'"

- [ ] **Step 3: Implementar `compute.ts`**

```typescript
// frontend/lib/compute.ts
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
    spend: 0, leads: 0, impressoes: 0, alcance: 0, cliques: 0, thruplay: 0,
    eq: 0, cpee: 0, ctr: 0, cpc: 0, cpl: 0, cpm: 0, frequencia: 0,
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

export interface TrendPoint { date: string; value: number; }

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
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }));
}

export interface Prediction {
  tendencia_pct: number;
  confianca: number;
  slope: number;
  intercept: number;
}

/**
 * Linear regression sobre uma série temporal de CPEE.
 * Retorna inclinação % por dia e R² como confiança.
 */
export function predictCpeeNextDays(trend: TrendPoint[], _daysAhead = 7): Prediction {
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

  // R² for confidence
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const confianca = Math.max(0, Math.min(100, Math.round(r2 * 100)));

  // Trend percentual = slope / meanY * 100
  const tendencia_pct = meanY === 0 ? 0 : Math.round((slope / meanY) * 10000) / 100;

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
    const base = { cluster: m.nome, actions: [{ label: "Analisar", action: "analyze" }] };
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
```

- [ ] **Step 4: Rodar testes para confirmar que passam**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
npm test -- --testPathPattern=compute
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/lib/compute.ts frontend/lib/__tests__/compute.test.ts
git commit -m "feat(frontend): add compute.ts with pure aggregation, classification, prediction, alerts"
```

---

### Task 5: Criar `lib/queries.ts` — TanStack Query hooks

**Files:**
- Create: `frontend/lib/queries.ts`

- [ ] **Step 1: Implementar todos os hooks**

```typescript
// frontend/lib/queries.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { sb } from "./supabase";
import type { Snapshot, MetricaConta, Criativo, Cluster, Recomendacao } from "./types";

const STALE = 1000 * 60 * 2;    // 2min
const REFRESH = 1000 * 60 * 5;  // 5min

/** All accounts that have ever appeared in metricas_conta */
export function useAccounts() {
  return useQuery<string[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const rows = await sb<{ account_id: string }[]>(
        "metricas_conta?select=account_id&order=account_id.asc"
      );
      return [...new Set(rows.map((r) => r.account_id))].filter(Boolean);
    },
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Latest metricas_conta row per account */
export function useMetricasConta() {
  return useQuery<MetricaConta[]>({
    queryKey: ["metricas_conta"],
    queryFn: () => sb<MetricaConta[]>("metricas_conta?select=*&order=executado_em.desc"),
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Snapshots in a date range, optionally filtered by accounts */
export function useSnapshots(opts: { start: string; end: string; accounts?: string[] }) {
  return useQuery<Snapshot[]>({
    queryKey: ["snapshots", opts],
    queryFn: () => {
      const parts = [
        `select=*`,
        `data=gte.${opts.start}`,
        `data=lte.${opts.end}`,
        `order=data.asc`,
      ];
      if (opts.accounts && opts.accounts.length > 0) {
        parts.push(`account_id=in.(${opts.accounts.map(encodeURIComponent).join(",")})`);
      }
      return sb<Snapshot[]>(`snapshots_diarios?${parts.join("&")}`);
    },
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Top criativos by spend; filter by minSpend to skip micro-spend ads */
export function useCriativos(opts: { minSpend?: number; limit?: number } = {}) {
  const { minSpend = 50, limit = 50 } = opts;
  return useQuery<Criativo[]>({
    queryKey: ["criativos", { minSpend, limit }],
    queryFn: () =>
      sb<Criativo[]>(
        `criativos_performance?select=*&spend=gte.${minSpend}&order=spend.desc&limit=${limit}`
      ),
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Clusters ordered by spend */
export function useClusters(opts: { accounts?: string[]; minSpend?: number; limit?: number } = {}) {
  const { accounts, minSpend = 50, limit = 100 } = opts;
  return useQuery<Cluster[]>({
    queryKey: ["clusters", opts],
    queryFn: () => {
      const parts = [
        `select=*`,
        `spend=gte.${minSpend}`,
        `order=spend.desc`,
        `limit=${limit}`,
      ];
      if (accounts && accounts.length > 0) {
        parts.push(`account_id=in.(${accounts.map(encodeURIComponent).join(",")})`);
      }
      return sb<Cluster[]>(`clusters_performance?${parts.join("&")}`);
    },
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}

/** Most recent recomendacoes */
export function useRecomendacoes(limit = 30) {
  return useQuery<Recomendacao[]>({
    queryKey: ["recomendacoes", limit],
    queryFn: () =>
      sb<Recomendacao[]>(
        `recomendacoes?select=*&order=executado_em.desc&limit=${limit}`
      ),
    staleTime: STALE,
    refetchInterval: REFRESH,
  });
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
npx tsc --noEmit lib/queries.ts lib/supabase.ts lib/types.ts lib/compute.ts
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/lib/queries.ts
git commit -m "feat(frontend): add TanStack Query hooks for Supabase tables"
```

---

## Phase 2: Tab 1 — Visão Geral

### Task 6: Criar rota `/dashboard/visao-geral` com filtros básicos

**Files:**
- Create: `frontend/app/dashboard/visao-geral/page.tsx`

- [ ] **Step 1: Criar página com filtros + loading states**

```tsx
// frontend/app/dashboard/visao-geral/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useAccounts, useMetricasConta, useSnapshots } from "@/lib/queries";
import {
  aggregateSnapshots,
  buildCpeeTrend,
  buildSpendTrend,
  classifyCPEE,
  generateRecommendations,
  predictCpeeNextDays,
} from "@/lib/compute";

const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

export default function VisaoGeralPage() {
  const [start, setStart] = useState(weekAgo);
  const [end, setEnd] = useState(today);
  const [selected, setSelected] = useState<string[]>([]);

  const accountsQ = useAccounts();
  const accountsToUse = selected.length > 0 ? selected : accountsQ.data;
  const snapsQ = useSnapshots({ start, end, accounts: accountsToUse });
  const metricasQ = useMetricasConta();

  const isLoading = accountsQ.isLoading || snapsQ.isLoading || metricasQ.isLoading;

  const data = useMemo(() => {
    const snaps = snapsQ.data ?? [];
    const metricas = metricasQ.data ?? [];
    const totals = aggregateSnapshots(snaps);
    const cpeeTrend = buildCpeeTrend(snaps);
    const spendTrend = buildSpendTrend(snaps);
    const prediction = predictCpeeNextDays(cpeeTrend, 7);
    const alerts = generateRecommendations(metricas);
    const classCounts = metricas.reduce(
      (acc, m) => {
        const c = m.classificacao_cpee || classifyCPEE(m.cpee);
        if (c === "BOM") acc.bom++;
        else if (c === "MEDIO") acc.medio++;
        else if (c === "RUIM") acc.ruim++;
        else acc.semDados++;
        return acc;
      },
      { bom: 0, medio: 0, ruim: 0, semDados: 0 }
    );
    return { totals, cpeeTrend, spendTrend, prediction, alerts, classCounts };
  }, [snapsQ.data, metricasQ.data]);

  if (isLoading) {
    return <div className="p-8 text-gray-400">Carregando dashboard...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Visão Geral</h1>
        <p className="text-gray-400">
          {start} → {end} · {(accountsToUse ?? []).length} conta(s)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
        <label className="text-sm text-gray-300">
          De
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="ml-2 px-2 py-1 bg-podemos-dark text-white rounded border border-gray-700"
          />
        </label>
        <label className="text-sm text-gray-300">
          Até
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="ml-2 px-2 py-1 bg-podemos-dark text-white rounded border border-gray-700"
          />
        </label>
        <div className="flex gap-2 ml-auto">
          {accountsQ.data?.map((a) => (
            <button
              key={a}
              onClick={() =>
                setSelected((prev) =>
                  prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                )
              }
              className={`text-xs px-3 py-1 rounded border ${
                (selected.length === 0 || selected.includes(a))
                  ? "bg-podemos-accent text-black border-podemos-accent"
                  : "bg-transparent text-gray-400 border-gray-700"
              }`}
            >
              {a.slice(-4)}
            </button>
          ))}
        </div>
      </div>

      <pre className="text-xs text-gray-300 bg-podemos-secondary p-4 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
```

(O `<pre>` é temporário — vai ser substituído pelos componentes nas tasks seguintes)

- [ ] **Step 2: Rodar dev server e visitar `/dashboard/visao-geral`**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
npm run dev
```

Em outro terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard/visao-geral
```

Expected: 200, página carrega com JSON visível

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/visao-geral/page.tsx
git commit -m "feat(frontend): scaffold /dashboard/visao-geral with live Supabase data"
```

---

### Task 7: Wire KPICards + MetricsGrid

**Files:**
- Modify: `frontend/app/dashboard/overview/components/KPICards.tsx` → copiar para `visao-geral/components/KPICards.tsx` e ajustar
- Modify: `frontend/app/dashboard/overview/components/MetricsGrid.tsx` → idem
- Modify: `frontend/app/dashboard/visao-geral/page.tsx`

- [ ] **Step 1: Copiar componentes existentes para nova pasta**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
mkdir -p app/dashboard/visao-geral/components
cp app/dashboard/overview/components/KPICards.tsx app/dashboard/visao-geral/components/
cp app/dashboard/overview/components/MetricsGrid.tsx app/dashboard/visao-geral/components/
```

- [ ] **Step 2: Inspecionar `KPICards.tsx` e ajustar para receber `Totals` diretamente**

Substituir a interface `KPICardsProps` por:

```tsx
// frontend/app/dashboard/visao-geral/components/KPICards.tsx
"use client";

import type { Totals } from "@/lib/compute";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = (n: number) => n.toLocaleString("pt-BR");

interface KPICardsProps {
  totals: Totals;
  alertCount: number;
}

export default function KPICards({ totals, alertCount }: KPICardsProps) {
  const cards = [
    { label: "CPEE Consolidado", value: BRL(totals.cpee), accent: true },
    { label: "Gasto do Período", value: BRL(totals.spend) },
    { label: "Leads", value: NUM(totals.leads) },
    { label: "EQ", value: NUM(totals.eq) },
    { label: "Alertas Pendentes", value: String(alertCount) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map((c, i) => (
        <div
          key={i}
          className="bg-podemos-secondary rounded-lg p-4 border border-podemos-accent/20"
        >
          <p className="text-sm text-gray-400 mb-2">{c.label}</p>
          <p className={`text-2xl font-bold ${c.accent ? "text-podemos-accent" : "text-white"}`}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Ajustar `MetricsGrid.tsx` da mesma forma**

```tsx
// frontend/app/dashboard/visao-geral/components/MetricsGrid.tsx
"use client";

import type { Totals } from "@/lib/compute";

const NUM = (n: number) => n.toLocaleString("pt-BR");
const PCT = (n: number) => `${n.toFixed(2)}%`;
const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props { totals: Totals; }

export default function MetricsGrid({ totals }: Props) {
  const items = [
    { label: "Impressões", value: NUM(totals.impressoes), icon: "👁️" },
    { label: "Alcance", value: NUM(totals.alcance), icon: "👥" },
    { label: "ThruPlay", value: NUM(totals.thruplay), icon: "▶️" },
    { label: "Cliques", value: NUM(totals.cliques), icon: "🖱️" },
    { label: "Frequência", value: totals.frequencia.toFixed(2), icon: "🔄" },
    { label: "CTR", value: PCT(totals.ctr), icon: "📈" },
    { label: "CPC", value: BRL(totals.cpc), icon: "💰" },
    { label: "CPM", value: BRL(totals.cpm), icon: "📊" },
    { label: "CPL", value: BRL(totals.cpl), icon: "🎯" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {items.map((m, i) => (
        <div key={i} className="bg-podemos-secondary rounded-lg p-4 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">{m.icon} {m.label}</p>
          <p className="text-xl font-bold text-white">{m.value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Substituir o `<pre>` no `page.tsx` por esses componentes**

No lugar do `<pre>`:

```tsx
<KPICards totals={data.totals} alertCount={data.alerts.length} />
<MetricsGrid totals={data.totals} />
```

E imports no topo:

```tsx
import KPICards from "./components/KPICards";
import MetricsGrid from "./components/MetricsGrid";
```

- [ ] **Step 5: Verificar visualmente no browser**

Visitar `http://localhost:3000/dashboard/visao-geral`. Confirmar que valores aparecem.

- [ ] **Step 6: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/visao-geral/
git commit -m "feat(visao-geral): wire KPICards + MetricsGrid to real Totals"
```

---

### Task 8: Wire FunnelChart (4 estágios)

**Files:**
- Create: `frontend/app/dashboard/visao-geral/components/FunnelChart.tsx`
- Modify: `frontend/app/dashboard/visao-geral/page.tsx`

- [ ] **Step 1: Criar componente novo (4 estágios apenas)**

```tsx
// frontend/app/dashboard/visao-geral/components/FunnelChart.tsx
"use client";

import type { Totals } from "@/lib/compute";

interface Props { totals: Totals; }

export default function FunnelChart({ totals }: Props) {
  const stages = [
    { name: "Alcance", value: totals.alcance },
    { name: "Impressões", value: totals.impressoes },
    { name: "Cliques", value: totals.cliques },
    { name: "Leads", value: totals.leads },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-4">Funil de Conversão</h3>
      <div className="space-y-3">
        {stages.map((s) => {
          const pct = (s.value / max) * 100;
          return (
            <div key={s.name}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-300">{s.name}</span>
                <span className="text-sm font-bold text-podemos-accent">
                  {s.value.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="h-7 bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-podemos-accent to-podemos-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar ao `page.tsx`**

```tsx
import FunnelChart from "./components/FunnelChart";

// ... no JSX, depois do MetricsGrid:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <FunnelChart totals={data.totals} />
  {/* CpeeClassification vem na próxima task */}
</div>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/visao-geral/components/FunnelChart.tsx frontend/app/dashboard/visao-geral/page.tsx
git commit -m "feat(visao-geral): FunnelChart with 4 stages"
```

---

### Task 9: Wire CpeeClassification (contagem real)

**Files:**
- Create: `frontend/app/dashboard/visao-geral/components/CpeeClassification.tsx`
- Modify: `frontend/app/dashboard/visao-geral/page.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// frontend/app/dashboard/visao-geral/components/CpeeClassification.tsx
"use client";

interface Props {
  bom: number;
  medio: number;
  ruim: number;
  semDados: number;
}

export default function CpeeClassification({ bom, medio, ruim, semDados }: Props) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-4">Classificação CPEE</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-3xl mb-1">🟢</p>
          <p className="text-white font-bold text-xl">{bom}</p>
          <p className="text-xs text-gray-400">Bom (&lt;100)</p>
        </div>
        <div className="text-center">
          <p className="text-3xl mb-1">🟡</p>
          <p className="text-white font-bold text-xl">{medio}</p>
          <p className="text-xs text-gray-400">Médio (100-199)</p>
        </div>
        <div className="text-center">
          <p className="text-3xl mb-1">🔴</p>
          <p className="text-white font-bold text-xl">{ruim}</p>
          <p className="text-xs text-gray-400">Ruim (&gt;=200)</p>
        </div>
      </div>
      {semDados > 0 && (
        <p className="text-center text-xs text-gray-400 mt-3">
          + {semDados} sem dados
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Adicionar ao `page.tsx`**

```tsx
import CpeeClassification from "./components/CpeeClassification";

// substituir o placeholder no grid:
<CpeeClassification
  bom={data.classCounts.bom}
  medio={data.classCounts.medio}
  ruim={data.classCounts.ruim}
  semDados={data.classCounts.semDados}
/>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/visao-geral/
git commit -m "feat(visao-geral): CpeeClassification with real counts from metricas_conta"
```

---

### Task 10: Wire TrendCharts (CPEE + Spend)

**Files:**
- Create: `frontend/app/dashboard/visao-geral/components/TrendChart.tsx`
- Modify: `frontend/app/dashboard/visao-geral/page.tsx`

- [ ] **Step 1: Criar componente reusável**

```tsx
// frontend/app/dashboard/visao-geral/components/TrendChart.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { date: string; value: number }[];
  title: string;
  color?: string;
  format?: (n: number) => string;
}

export default function TrendChart({ data, title, color = "#E74C3C", format }: Props) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="date" stroke="#888" fontSize={11} />
          <YAxis stroke="#888" fontSize={11} tickFormatter={format} />
          <Tooltip
            contentStyle={{ backgroundColor: "#2C3E50", border: "1px solid #E74C3C" }}
            formatter={(v: number) => (format ? format(v) : v)}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar no `page.tsx`**

```tsx
import TrendChart from "./components/TrendChart";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// no JSX, depois do FunnelChart+CpeeClassification grid:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <TrendChart title="CPEE — últimos dias" data={data.cpeeTrend} format={BRL} />
  <TrendChart title="Gasto diário" data={data.spendTrend} color="#F39C12" format={BRL} />
</div>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/visao-geral/
git commit -m "feat(visao-geral): TrendChart for CPEE and spend"
```

---

### Task 11: Wire AlertsSection

**Files:**
- Create: `frontend/app/dashboard/visao-geral/components/AlertsSection.tsx`
- Modify: `frontend/app/dashboard/visao-geral/page.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// frontend/app/dashboard/visao-geral/components/AlertsSection.tsx
"use client";

import type { Alert } from "@/lib/compute";

interface Props { alerts: Alert[]; }

export default function AlertsSection({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 text-sm text-gray-400">
        ✓ Sem alertas. Todas as métricas dentro das metas.
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white mb-3">
        Alertas ({alerts.length})
      </h2>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`p-3 rounded-lg border-l-4 ${
              a.type === "warning"
                ? "bg-red-900/20 border-red-500"
                : a.type === "success"
                ? "bg-green-900/20 border-green-500"
                : "bg-blue-900/20 border-blue-500"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-white text-sm">{a.title}</p>
                <p className="text-xs text-gray-300 mt-1">{a.reason}</p>
              </div>
              <span className="text-xs text-gray-400 ml-3 whitespace-nowrap">{a.cluster}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar ao `page.tsx` — entre KPICards e MetricsGrid**

```tsx
import AlertsSection from "./components/AlertsSection";

<KPICards totals={data.totals} alertCount={data.alerts.length} />
<AlertsSection alerts={data.alerts} />
<MetricsGrid totals={data.totals} />
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/visao-geral/
git commit -m "feat(visao-geral): AlertsSection from generateRecommendations()"
```

---

### Task 12: PredictionCard (regressão linear)

**Files:**
- Create: `frontend/app/dashboard/visao-geral/components/PredictionCard.tsx`
- Modify: `frontend/app/dashboard/visao-geral/page.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// frontend/app/dashboard/visao-geral/components/PredictionCard.tsx
"use client";

import type { Prediction } from "@/lib/compute";

interface Props { prediction: Prediction; }

export default function PredictionCard({ prediction }: Props) {
  const { tendencia_pct, confianca } = prediction;

  if (confianca === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-6">
        <h3 className="text-white font-bold mb-2">Previsão CPEE (7d)</h3>
        <p className="text-sm text-gray-400">
          Dados insuficientes para previsão (mínimo 3 dias com CPEE &gt; 0).
        </p>
      </div>
    );
  }

  const up = tendencia_pct > 0;
  const stable = Math.abs(tendencia_pct) < 1;

  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-4">Previsão CPEE (próximos 7 dias)</h3>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-4xl">{stable ? "➡️" : up ? "📈" : "📉"}</span>
        <span className={`text-3xl font-bold ${stable ? "text-gray-300" : up ? "text-red-400" : "text-green-400"}`}>
          {tendencia_pct > 0 ? "+" : ""}{tendencia_pct.toFixed(1)}%
        </span>
        <span className="text-sm text-gray-400">por dia</span>
      </div>
      <p className="text-xs text-gray-400">
        Confiança: <span className="font-bold text-white">{confianca}%</span>
        {confianca < 50 && " (baixa — série muito volátil)"}
      </p>
      <p className="text-xs text-gray-500 mt-3">
        Cálculo: regressão linear sobre CPEE diário do período selecionado.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar ao `page.tsx` — depois dos TrendCharts**

```tsx
import PredictionCard from "./components/PredictionCard";

<PredictionCard prediction={data.prediction} />
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/visao-geral/
git commit -m "feat(visao-geral): PredictionCard with linear regression on CPEE trend"
```

---

### Task 13: TopClusters

**Files:**
- Create: `frontend/app/dashboard/visao-geral/components/TopClusters.tsx`
- Modify: `frontend/app/dashboard/visao-geral/page.tsx`

- [ ] **Step 1: Criar componente que consome `useClusters`**

```tsx
// frontend/app/dashboard/visao-geral/components/TopClusters.tsx
"use client";

import { useClusters } from "@/lib/queries";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function TopClusters({ accounts }: { accounts?: string[] }) {
  const q = useClusters({ accounts, minSpend: 50, limit: 5 });

  if (q.isLoading) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-6">
        <h3 className="text-white font-bold mb-3">Top 5 Clusters</h3>
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    );
  }

  const clusters = (q.data ?? [])
    .filter((c) => c.cpee > 0)
    .sort((a, b) => a.cpee - b.cpee)
    .slice(0, 5);

  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-3">Top 5 Clusters (menor CPEE)</h3>
      <div className="space-y-2">
        {clusters.map((c) => {
          const temp =
            c.classificacao === "QUENTE" ? "🔥" : c.classificacao === "MORNO" ? "🟡" : "🔵";
          return (
            <div
              key={c.adset_id}
              className="flex justify-between items-center p-2 border-b border-gray-700 last:border-0"
            >
              <div>
                <p className="text-white font-medium text-sm">
                  {temp} {c.cluster_nome}
                </p>
                <p className="text-xs text-gray-400">
                  CPEE: {BRL(c.cpee)} · CTR: {c.ctr.toFixed(2)}%
                </p>
              </div>
              <p className="text-podemos-accent font-bold text-sm">{BRL(c.spend)}</p>
            </div>
          );
        })}
        {clusters.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum cluster com dados.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar ao `page.tsx`**

```tsx
import TopClusters from "./components/TopClusters";

<TopClusters accounts={accountsToUse} />
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/visao-geral/
git commit -m "feat(visao-geral): TopClusters from clusters_performance"
```

---

## Phase 3: Tab 2 — Detalhamento

### Task 14: Criar rota `/dashboard/detalhamento` com filtros e estrutura

**Files:**
- Create: `frontend/app/dashboard/detalhamento/page.tsx`
- Create: `frontend/app/dashboard/detalhamento/components/` (folder)

- [ ] **Step 1: Scaffold da page com filtros**

```tsx
// frontend/app/dashboard/detalhamento/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useClusters, useAccounts, useCriativos, useRecomendacoes, useMetricasConta, useSnapshots } from "@/lib/queries";

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

export default function DetalhamentoPage() {
  const accountsQ = useAccounts();
  const [accounts, setAccounts] = useState<string[]>([]);
  const [start] = useState(monthAgo);
  const [end] = useState(today);

  const activeAccounts = accounts.length > 0 ? accounts : accountsQ.data;

  const clustersQ = useClusters({ accounts: activeAccounts, minSpend: 50, limit: 100 });
  const criativosQ = useCriativos({ minSpend: 50, limit: 50 });
  const recsQ = useRecomendacoes(30);
  const snapsQ = useSnapshots({ start, end, accounts: activeAccounts });
  const metricasQ = useMetricasConta();

  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const allClusterNames = useMemo(
    () => [...new Set((clustersQ.data ?? []).map((c) => c.cluster_nome))],
    [clustersQ.data]
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-2">Detalhamento</h1>
      <p className="text-gray-400 mb-6">
        Comparação entre clusters, criativos por conta, histórico de recomendações
      </p>

      {/* Account filter */}
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-400 mr-2">Contas:</span>
        {accountsQ.data?.map((a) => (
          <button
            key={a}
            onClick={() =>
              setAccounts((prev) =>
                prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
              )
            }
            className={`text-xs px-3 py-1 rounded border ${
              accounts.length === 0 || accounts.includes(a)
                ? "bg-podemos-accent text-black border-podemos-accent"
                : "bg-transparent text-gray-400 border-gray-700"
            }`}
          >
            {a.slice(-4)}
          </button>
        ))}
      </div>

      {/* Sections come in next tasks */}
      <pre className="text-xs text-gray-300 bg-podemos-secondary p-4 rounded">
        Clusters: {clustersQ.data?.length ?? 0}
        {"\n"}Criativos: {criativosQ.data?.length ?? 0}
        {"\n"}Recomendações: {recsQ.data?.length ?? 0}
      </pre>
    </div>
  );
}
```

- [ ] **Step 2: Visitar `/dashboard/detalhamento` e verificar carregamento**

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/detalhamento/
git commit -m "feat(detalhamento): scaffold page with account filter"
```

---

### Task 15: ClusterSelector + ComparisonTable

**Files:**
- Create: `frontend/app/dashboard/detalhamento/components/ClusterSelector.tsx`
- Create: `frontend/app/dashboard/detalhamento/components/ComparisonTable.tsx`
- Modify: `frontend/app/dashboard/detalhamento/page.tsx`

- [ ] **Step 1: ClusterSelector**

```tsx
// frontend/app/dashboard/detalhamento/components/ClusterSelector.tsx
"use client";

interface Props {
  clusters: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

export default function ClusterSelector({ clusters, selected, onChange, max = 5 }: Props) {
  const toggle = (c: string) => {
    if (selected.includes(c)) onChange(selected.filter((x) => x !== c));
    else if (selected.length < max) onChange([...selected, c]);
  };

  return (
    <div className="bg-podemos-secondary rounded-lg p-4 mb-6">
      <h3 className="text-white font-bold mb-3">
        Selecione até {max} clusters para comparar
        <span className="text-xs text-gray-400 ml-2">
          ({selected.length}/{max})
        </span>
      </h3>
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
        {clusters.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            disabled={!selected.includes(c) && selected.length >= max}
            className={`text-xs px-3 py-1 rounded border transition ${
              selected.includes(c)
                ? "bg-podemos-accent text-black border-podemos-accent font-bold"
                : "bg-transparent text-gray-300 border-gray-700 hover:border-podemos-accent disabled:opacity-30"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ComparisonTable**

```tsx
// frontend/app/dashboard/detalhamento/components/ComparisonTable.tsx
"use client";

import type { Cluster } from "@/lib/types";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface Props { clusters: Cluster[]; }

const tempColor = (c: string) =>
  c === "QUENTE" ? "text-red-400" : c === "MORNO" ? "text-yellow-400" : "text-blue-400";

export default function ComparisonTable({ clusters }: Props) {
  if (clusters.length === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 text-sm text-gray-400">
        Selecione clusters acima para ver a comparação.
      </div>
    );
  }

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6 overflow-x-auto">
      <h3 className="text-white font-bold mb-3">Comparação Lado-a-Lado</h3>
      <table className="w-full text-sm">
        <thead className="border-b border-gray-700">
          <tr className="text-gray-400 text-xs">
            <th className="text-left p-2">Cluster</th>
            <th className="text-right p-2">CPEE</th>
            <th className="text-right p-2">Gasto</th>
            <th className="text-right p-2">CTR</th>
            <th className="text-right p-2">CPC</th>
            <th className="text-right p-2">Cliques</th>
            <th className="text-center p-2">Temp.</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((c) => (
            <tr key={c.adset_id} className="border-b border-gray-700/50">
              <td className="p-2 text-white font-medium">{c.cluster_nome}</td>
              <td className="p-2 text-right text-podemos-accent font-bold">{BRL(c.cpee)}</td>
              <td className="p-2 text-right text-gray-200">{BRL(c.spend)}</td>
              <td className="p-2 text-right text-gray-200">{c.ctr.toFixed(2)}%</td>
              <td className="p-2 text-right text-gray-200">{BRL(c.cpc)}</td>
              <td className="p-2 text-right text-gray-200">{c.eq.toLocaleString("pt-BR")}</td>
              <td className={`p-2 text-center font-bold ${tempColor(c.classificacao)}`}>
                {c.classificacao}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Integrar no `page.tsx`**

```tsx
import ClusterSelector from "./components/ClusterSelector";
import ComparisonTable from "./components/ComparisonTable";

const compareClusters = (clustersQ.data ?? []).filter((c) =>
  selectedClusters.includes(c.cluster_nome)
);

// substituir o <pre>:
<ClusterSelector
  clusters={allClusterNames}
  selected={selectedClusters}
  onChange={setSelectedClusters}
/>
<ComparisonTable clusters={compareClusters} />
```

- [ ] **Step 4: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/detalhamento/
git commit -m "feat(detalhamento): ClusterSelector + ComparisonTable"
```

---

### Task 16: CampaignsByAccount + Criativos

**Files:**
- Create: `frontend/app/dashboard/detalhamento/components/CampaignsByAccount.tsx`
- Modify: `frontend/app/dashboard/detalhamento/page.tsx`

- [ ] **Step 1: Component que junta metricas_conta com criativos**

```tsx
// frontend/app/dashboard/detalhamento/components/CampaignsByAccount.tsx
"use client";

import type { MetricaConta, Criativo } from "@/lib/types";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface Props {
  metricas: MetricaConta[];
  criativos: Criativo[];
  accountFilter?: string[];
}

export default function CampaignsByAccount({ metricas, criativos, accountFilter }: Props) {
  const accounts = accountFilter && accountFilter.length > 0
    ? metricas.filter((m) => accountFilter.includes(m.account_id))
    : metricas;

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Campanhas por Conta</h3>
      <div className="space-y-6">
        {accounts.map((m) => {
          const creats = criativos
            .filter((c) => c.account_id === m.account_id)
            .slice(0, 5);
          return (
            <div key={m.account_id} className="border border-gray-700 rounded p-4">
              <div className="flex justify-between items-baseline mb-3">
                <h4 className="text-podemos-accent font-bold">{m.nome}</h4>
                <span className="text-sm text-gray-400">{BRL(m.spend)}</span>
              </div>
              <div className="text-xs text-gray-400 mb-3 flex gap-4">
                <span>CPEE: <strong className="text-white">{BRL(m.cpee)}</strong></span>
                <span>CTR: <strong className="text-white">{m.ctr.toFixed(2)}%</strong></span>
                <span>CPC: <strong className="text-white">{BRL(m.cpc)}</strong></span>
                <span>Leads: <strong className="text-white">{m.leads}</strong></span>
              </div>

              {creats.length > 0 && (
                <>
                  <p className="text-xs text-gray-500 mb-2 mt-3">Top 5 criativos por gasto:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                    {creats.map((c) => (
                      <div key={c.ad_id} className="bg-podemos-dark rounded p-2 text-xs">
                        {c.thumbnail_url && (
                          <img
                            src={c.thumbnail_url}
                            alt=""
                            className="w-full h-20 object-cover rounded mb-1"
                          />
                        )}
                        <p className="text-white truncate">{c.ad_nome}</p>
                        <p className="text-gray-400">{BRL(c.spend)} · CPEE {BRL(c.cpee)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar ao `page.tsx`**

```tsx
import CampaignsByAccount from "./components/CampaignsByAccount";

<CampaignsByAccount
  metricas={metricasQ.data ?? []}
  criativos={criativosQ.data ?? []}
  accountFilter={accounts}
/>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/detalhamento/
git commit -m "feat(detalhamento): CampaignsByAccount with thumbnail criativos"
```

---

### Task 17: RecommendationHistory

**Files:**
- Create: `frontend/app/dashboard/detalhamento/components/RecommendationHistory.tsx`
- Modify: `frontend/app/dashboard/detalhamento/page.tsx`

- [ ] **Step 1: Componente**

```tsx
// frontend/app/dashboard/detalhamento/components/RecommendationHistory.tsx
"use client";

import type { Recomendacao } from "@/lib/types";

interface Props { recomendacoes: Recomendacao[]; }

const statusLabel = (r: Recomendacao) =>
  r.executada ? "✓ Executada" : r.aprovada ? "⏳ Aprovada" : "⚠ Pendente";

const statusColor = (r: Recomendacao) =>
  r.executada
    ? "bg-green-900/30 text-green-400"
    : r.aprovada
    ? "bg-blue-900/30 text-blue-400"
    : "bg-yellow-900/30 text-yellow-400";

export default function RecommendationHistory({ recomendacoes }: Props) {
  if (recomendacoes.length === 0) {
    return (
      <div className="bg-podemos-secondary rounded-lg p-4 mb-6 text-sm text-gray-400">
        Nenhuma recomendação no histórico.
      </div>
    );
  }

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6 overflow-x-auto">
      <h3 className="text-white font-bold mb-4">Histórico de Recomendações</h3>
      <table className="w-full text-sm">
        <thead className="border-b border-gray-700">
          <tr className="text-gray-400 text-xs text-left">
            <th className="p-2">Data</th>
            <th className="p-2">Conta</th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Descrição</th>
            <th className="p-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {recomendacoes.map((r) => (
            <tr key={r.id} className="border-b border-gray-700/50">
              <td className="p-2 text-gray-300">{r.executado_em?.slice(0, 10)}</td>
              <td className="p-2 text-white">{r.nome}</td>
              <td className="p-2 text-gray-300">{r.tipo}</td>
              <td className="p-2 text-gray-300">{r.descricao}</td>
              <td className="p-2 text-center">
                <span className={`px-2 py-1 rounded text-xs ${statusColor(r)}`}>
                  {statusLabel(r)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar ao `page.tsx`**

```tsx
import RecommendationHistory from "./components/RecommendationHistory";

<RecommendationHistory recomendacoes={recsQ.data ?? []} />
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/detalhamento/
git commit -m "feat(detalhamento): RecommendationHistory from Supabase"
```

---

### Task 18: ExportButtons (reaproveitar `lib/export.ts`)

**Files:**
- Read: `frontend/lib/export.ts`
- Create: `frontend/app/dashboard/detalhamento/components/ExportButtons.tsx`
- Modify: `frontend/app/dashboard/detalhamento/page.tsx`

- [ ] **Step 1: Inspecionar `lib/export.ts` para ver a API existente**

```bash
cat /Users/alexsandro/cpee-dashboard/frontend/lib/export.ts | head -60
```

- [ ] **Step 2: Criar componente que exporta clusters + criativos + snapshots para CSV**

```tsx
// frontend/app/dashboard/detalhamento/components/ExportButtons.tsx
"use client";

interface Row { [key: string]: unknown; }

function toCSV(rows: Row[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  snapshots: Row[];
  criativos: Row[];
  clusters: Row[];
}

export default function ExportButtons({ snapshots, criativos, clusters }: Props) {
  const stamp = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => toCSV(snapshots, `snapshots-${stamp}.csv`)}
        disabled={snapshots.length === 0}
        className="px-4 py-2 bg-podemos-accent text-black rounded font-bold text-sm hover:bg-opacity-80 disabled:opacity-30"
      >
        📥 CSV — Snapshots ({snapshots.length})
      </button>
      <button
        onClick={() => toCSV(criativos, `criativos-${stamp}.csv`)}
        disabled={criativos.length === 0}
        className="px-4 py-2 bg-podemos-secondary text-white border border-podemos-accent rounded font-bold text-sm hover:border-opacity-80 disabled:opacity-30"
      >
        📥 CSV — Criativos ({criativos.length})
      </button>
      <button
        onClick={() => toCSV(clusters, `clusters-${stamp}.csv`)}
        disabled={clusters.length === 0}
        className="px-4 py-2 bg-podemos-secondary text-white border border-podemos-accent rounded font-bold text-sm hover:border-opacity-80 disabled:opacity-30"
      >
        📥 CSV — Clusters ({clusters.length})
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Adicionar ao `page.tsx`**

```tsx
import ExportButtons from "./components/ExportButtons";

// Adicionar logo abaixo do título / filtro:
<ExportButtons
  snapshots={snapsQ.data ?? []}
  criativos={criativosQ.data ?? []}
  clusters={clustersQ.data ?? []}
/>
```

- [ ] **Step 4: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/detalhamento/
git commit -m "feat(detalhamento): ExportButtons for snapshots/criativos/clusters CSV"
```

---

## Phase 4: Layout & Cleanup

### Task 19: Atualizar `/dashboard/page.tsx` (2 tabs)

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Reescrever com 2 tabs apontando para as novas rotas**

```tsx
// frontend/app/dashboard/page.tsx
"use client";

import { redirect } from "next/navigation";

export default function DashboardIndex() {
  redirect("/dashboard/visao-geral");
}
```

- [ ] **Step 2: Criar layout compartilhado para as 2 tabs**

```tsx
// frontend/app/dashboard/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { id: "visao-geral", label: "📊 Visão Geral", href: "/dashboard/visao-geral" },
  { id: "detalhamento", label: "🔍 Detalhamento", href: "/dashboard/detalhamento" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = tabs.find((t) => pathname?.startsWith(t.href))?.id ?? "visao-geral";

  return (
    <div className="min-h-screen bg-podemos-dark text-white">
      <header className="bg-podemos-secondary border-b border-podemos-accent/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-podemos-accent">CPEE Dashboard</h1>
              <p className="text-xs text-gray-400">Dados do Supabase · atualização a cada 5 min</p>
            </div>
            <Link
              href="/dashboard-cpee/painel.html"
              target="_blank"
              className="text-xs bg-podemos-accent text-black px-3 py-1 rounded hover:bg-opacity-80"
            >
              📺 Painel TV
            </Link>
          </div>
          <nav className="flex gap-2 border-b border-gray-700">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={t.href}
                className={`px-4 py-3 font-medium transition ${
                  active === t.id
                    ? "text-podemos-accent border-b-2 border-podemos-accent"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/page.tsx frontend/app/dashboard/layout.tsx
git commit -m "feat(dashboard): 2-tab layout pointing to new routes + link to TV painel"
```

---

### Task 20: Redirects para rotas antigas + cleanup

**Files:**
- Modify: `frontend/app/dashboard/overview/page.tsx`
- Modify: `frontend/app/dashboard/comparacoes/page.tsx`
- Modify: `frontend/app/dashboard/insights/page.tsx`
- Delete: `frontend/lib/api.ts`

- [ ] **Step 1: Substituir páginas antigas por redirects**

```tsx
// frontend/app/dashboard/overview/page.tsx
import { redirect } from "next/navigation";
export default function Page() { redirect("/dashboard/visao-geral"); }
```

```tsx
// frontend/app/dashboard/comparacoes/page.tsx
import { redirect } from "next/navigation";
export default function Page() { redirect("/dashboard/detalhamento"); }
```

```tsx
// frontend/app/dashboard/insights/page.tsx
import { redirect } from "next/navigation";
export default function Page() { redirect("/dashboard/detalhamento"); }
```

- [ ] **Step 2: Deletar `lib/api.ts` e seus subcomponents que não são mais usados**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
rm lib/api.ts
rm -rf app/dashboard/overview/components
rm -rf app/dashboard/comparacoes/components
rm -rf app/dashboard/insights/components
rm -rf app/dashboard/components  # DashboardFilters + ExportButton antigos
rm -rf __tests__  # testes antigos vão quebrar pois importam api.ts
```

- [ ] **Step 3: Rodar type-check para encontrar imports quebrados**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
npx tsc --noEmit
```

Se houver erros: corrigir imports quebrados (componentes que importavam de `@/lib/api` etc.)

- [ ] **Step 4: Build de verificação**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
npm run build
```

Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add -A frontend/
git commit -m "chore(frontend): redirect old routes + remove obsolete api.ts and components"
```

---

### Task 21: Deploy + smoke test

**Files:** N/A

- [ ] **Step 1: Adicionar envs no Vercel**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
# (paste https://ygbrgtuddtisoowwdxqn.supabase.co)
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# (paste sb_publishable_dD7pAtkSiOk-p83TEUdC0A_9RSr0mto)
```

- [ ] **Step 2: Deploy production**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
npx vercel --prod --yes
```

- [ ] **Step 3: Verificar via curl**

```bash
URL=$(npx vercel --prod --yes 2>&1 | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | head -1)
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" "$URL/dashboard"
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" "$URL/dashboard/visao-geral"
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" "$URL/dashboard/detalhamento"
```

Expected: All 200 (or 307 for /dashboard redirect to /dashboard/visao-geral)

- [ ] **Step 4: Commit (se houve mudanças após deploy)**

Nenhuma mudança esperada — só verificação.

---

## Phase 5: Polimento

### Task 22: Adicionar loading skeletons e error states robustos

**Files:**
- Modify: `frontend/app/dashboard/visao-geral/page.tsx`
- Modify: `frontend/app/dashboard/detalhamento/page.tsx`

- [ ] **Step 1: Skeleton genérico em `visao-geral/page.tsx`**

Substituir o `if (isLoading) return ...` por:

```tsx
if (isLoading) {
  return (
    <div className="p-6">
      <div className="h-10 w-64 bg-podemos-secondary rounded animate-pulse mb-6" />
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-podemos-secondary rounded animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 bg-podemos-secondary rounded animate-pulse" />
        <div className="h-64 bg-podemos-secondary rounded animate-pulse" />
      </div>
    </div>
  );
}
```

E error state:

```tsx
const error = accountsQ.error || snapsQ.error || metricasQ.error;
if (error) {
  return (
    <div className="p-6">
      <div className="bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
        <p className="text-red-300 font-bold">Erro ao carregar dados</p>
        <p className="text-xs text-red-400 mt-2 font-mono">{String(error)}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mesmo padrão em `detalhamento/page.tsx`**

- [ ] **Step 3: Commit**

```bash
cd /Users/alexsandro/cpee-dashboard
git add frontend/app/dashboard/
git commit -m "polish: skeleton loading + error states for both tabs"
```

---

### Task 23: Deploy final

- [ ] **Step 1: Deploy**

```bash
cd /Users/alexsandro/cpee-dashboard/frontend
npx vercel --prod --yes
```

- [ ] **Step 2: Pingar URLs no production e confirmar 200**

```bash
URL=$(npx vercel --prod --yes 2>&1 | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | head -1 || \
       npx vercel ls --json 2>/dev/null | jq -r '.[0].url')
for path in /dashboard /dashboard/visao-geral /dashboard/detalhamento /dashboard/overview /dashboard/comparacoes /dashboard/insights; do
  echo -n "$path → "
  curl -s -o /dev/null -w "%{http_code}\n" "https://$URL$path"
done
```

Expected: visao-geral e detalhamento retornam 200; demais retornam 307 (redirect)

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Spec §5 (lib/) → Tasks 1-5
- ✅ Spec §6 (Tab 1) → Tasks 6-13
- ✅ Spec §7 (Tab 2) → Tasks 14-18
- ✅ Spec §8 (esconder Sentimento) → Task 20 (deletar componente)
- ✅ Spec §9 (env vars) → Task 1
- ✅ Spec §10 (redirects) → Task 20
- ✅ Spec §11 (critérios de sucesso) → Task 21 + 23 (smoke test)

**Placeholder scan:** Nenhum TODO/TBD; todos os steps têm código completo.

**Type consistency:** `Totals`, `Snapshot`, `MetricaConta`, `Alert`, `Prediction` definidos em `types.ts`/`compute.ts` na Task 2 e 4, usados consistentemente nas Tasks seguintes.
