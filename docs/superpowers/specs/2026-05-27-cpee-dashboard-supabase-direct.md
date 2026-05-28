# CPEE Dashboard — Migração para Supabase Direto

**Data:** 2026-05-27
**Versão:** 1.0
**Status:** Aprovado para implementação
**Substitui parcialmente:** `2026-05-09-cpee-dashboard-redesign.md` (Fases 1 e parte da 3)

---

## 1. Contexto

O Next.js dashboard de 3 tabs em `frontend/app/dashboard/` já está implementado em componentes mas **não funciona** — aponta para um backend FastAPI (`localhost:8000`) que lê de SQLite, enquanto os dados reais vivem em Supabase (alimentado pelo `daily_report.py` e `populate_criativos_clusters.py`).

O painel war-room (`/painel`) já demonstrou que consultar Supabase direto do frontend funciona bem para esse caso de uso. Esta spec descreve como portar o mesmo padrão para o dashboard interativo, eliminando a dependência do FastAPI.

## 2. Objetivo

Conectar o dashboard interativo aos dados reais do Supabase **sem deployar nenhum backend novo**, consolidando em 2 tabs focados e adicionando uma camada simples de previsões client-side.

## 3. Decisões de Design

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Backend | Sem FastAPI; Supabase REST direto | Mesmo padrão do painel.html, zero infra extra |
| Estrutura | 2 tabs (Visão Geral, Detalhamento) | Sem sentimento real, o 3º tab fica anêmico |
| Sentimento | Esconder | Requer pipeline NLP separado; placeholder fake prejudica credibilidade |
| Previsões | Regressão linear client-side sobre últimos 14d de CPEE | Útil, ~30 linhas de TS, sem nova infra |
| Funil | 4 estágios (Alcance → Impressões → Cliques → Leads) | EQ = leads no nosso pipeline; sem redundância |
| ThruPlay | Card de métrica, não estágio do funil | Só aplica a vídeo |

## 4. Arquitetura

```
┌──────────────────────────────────────────┐
│ Meta Ads API                              │
└────────────────┬─────────────────────────┘
                 │ daily_report.py (cron)
                 │ populate_criativos_clusters.py
                 ▼
┌──────────────────────────────────────────┐
│ Supabase (ygbrgtuddtisoowwdxqn)           │
│  - snapshots_diarios                      │
│  - metricas_conta                         │
│  - criativos_performance                  │
│  - clusters_performance                   │
│  - recomendacoes                          │
└────────────────┬─────────────────────────┘
                 │ REST API (anon key)
                 ▼
┌──────────────────────────────────────────┐
│ Next.js (Vercel)                          │
│  lib/                                     │
│   ├─ supabase.ts  (cliente)               │
│   ├─ queries.ts   (TanStack Query hooks)  │
│   └─ compute.ts   (agregação + previsões) │
│  app/dashboard/                           │
│   ├─ visao-geral/                         │
│   └─ detalhamento/                        │
└──────────────────────────────────────────┘
```

## 5. Camada `lib/`

### `lib/supabase.ts`
Cliente único reutilizável.

```ts
export const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const HDR = { apikey: KEY, Authorization: `Bearer ${KEY}` };

export async function sb<T = any>(path: string): Promise<T> {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: HDR });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}
```

### `lib/queries.ts`
TanStack Query hooks por tabela. Cada hook retorna `{ data, isLoading, error }`.

- `useAccounts()` — DISTINCT `account_id` de `metricas_conta`
- `useSnapshots({ start, end, accounts? })` — `snapshots_diarios` filtrado
- `useMetricasConta()` — estado atual de cada conta
- `useCriativos({ minSpend?, limit? })` — `criativos_performance` ordenado por CPEE
- `useClusters({ accounts? })` — `clusters_performance`
- `useRecomendacoes({ limit? })` — `recomendacoes` ordenado por `executado_em` DESC

Todos com `refetchInterval: 1000 * 60 * 5` (5min, sem realtime — já há `lib/realtime.ts` se quisermos ativar depois).

### `lib/compute.ts`
Funções puras. Sem side effects, fáceis de testar.

- `classifyCPEE(cpee: number): 'BOM' | 'MEDIO' | 'RUIM' | 'SEM_DADOS'`
- `aggregateSnapshots(rows: Snapshot[]): Totals` — soma spend/leads/impressões/alcance/cliques/thruplay; calcula CPEE/CTR/CPC consolidados
- `buildCpeeTrend(snapshots, days): { date, value }[]` — série temporal agrupada por dia
- `buildSpendTrend(snapshots, days): { date, value }[]`
- `predictCpeeNextDays(snapshots, days = 7): { tendencia_pct, confianca, slope }` — regressão linear simples
- `generateRecommendations(metricas: MetricasConta[]): Alert[]` — mesmas regras do `daily_report.py` (CPC>150, CTR<0.5%, CPEE>200) mas rodando client-side sobre dados frescos

## 6. Tab 1 — Visão Geral (`/dashboard/visao-geral`)

**Layout (top-down):**
1. Header com filtros (período + contas) e botão de export
2. `KPICards` — 5 cards principais (CPEE, Gasto, Leads, EQ, Alertas pendentes)
3. `AlertsSection` — alertas gerados por `generateRecommendations()`
4. `MetricsGrid` — segunda linha de KPIs (Impressões, Alcance, ThruPlay, CTR, CPL)
5. Grid 2 colunas: `FunnelChart` (4 estágios) + `CpeeClassification` (contagem real)
6. Grid 2 colunas: `TrendChart` CPEE 7d + `TrendChart` Gasto 7d
7. `PredictionCard` — Previsão de CPEE para próximos 7 dias
8. `TopClusters` — Top 5 clusters por CPEE

## 7. Tab 2 — Detalhamento (`/dashboard/detalhamento`)

**Layout (top-down):**
1. `ClusterSelector` — multi-select dos clusters disponíveis
2. `ComparisonTable` — tabela lado-a-lado dos clusters selecionados
3. `HeatmapChart` — calor por CPEE (sem sentimento por enquanto)
4. `TrendChartComparacao` — multi-line com cluster por linha (14 dias)
5. `CampaignsByAccount` — accordion por conta com criativos
6. `RecommendationHistory` — tabela de recomendações de `recomendacoes`
7. `ExportButtons` — CSV/PDF via `lib/export.ts` existente

## 8. Componentes Removidos/Escondidos

- `SentimentAnalysis` — comentado, não exportado pelo page
- `PredictionsCard` (versão original mockada) — substituído por `PredictionCard` novo baseado em `predictCpeeNextDays()`

## 9. Configuração

**Novas env vars no `frontend/.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://ygbrgtuddtisoowwdxqn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key da .env raiz>
```

**Remover:** `NEXT_PUBLIC_API_URL=http://localhost:8000`

**Vercel:** adicionar essas duas envs no dashboard do projeto.

## 10. Rota antiga `/dashboard/overview`, `/dashboard/comparacoes`, `/dashboard/insights`

Redirecionar:
- `/dashboard/overview` → `/dashboard/visao-geral`
- `/dashboard/comparacoes` → `/dashboard/detalhamento`
- `/dashboard/insights` → `/dashboard/detalhamento` (consolidado)

Deletar as pastas antigas após confirmação do redirect funcionando.

## 11. Critérios de Sucesso

- ✅ `/dashboard` carrega sem erro
- ✅ KPIs mostram valores não-zero quando há dados em `snapshots_diarios`
- ✅ Filtro de período altera os números visíveis
- ✅ Alertas aparecem quando alguma conta tem CPC>150 ou CPEE>200
- ✅ Previsão mostra tendência (% e confiança) calculada client-side
- ✅ Comparação entre 2+ clusters renderiza tabela e gráfico
- ✅ Export CSV baixa arquivo com dados do período selecionado
- ✅ Zero requisições para `localhost:8000` ou outro backend
- ✅ Deploy em produção responde idêntico ao local

## 12. Fora de Escopo

- Implementação real de análise de sentimento (pipeline NLP, ingestão de comentários)
- Migração ou remoção do código FastAPI em `backend/` (fica como dead code até decisão futura)
- Real-time via Supabase channels (a infra existe em `lib/realtime.ts`, mas vamos manter polling 5min nessa primeira versão)
- Testes E2E automatizados (escopo de outro spec)

## 13. Risco e Mitigação

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Anon key exposta no frontend permite leitura de qualquer tabela | Média | RLS já está configurado no Supabase para essas tabelas; revisar policies como parte da implementação |
| Cálculos pesados client-side travam UI | Baixa | Volumes atuais (centenas de snapshots, 200 criativos) são pequenos; usar `useMemo` |
| Mudança no schema do Supabase quebra queries silenciosamente | Média | Types TypeScript baseados em `mcp__supabase__generate_typescript_types` como Task opcional |
