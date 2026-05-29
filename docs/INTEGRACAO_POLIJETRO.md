# Integração Polijetro × CPEE Dashboard

**Para:** Dev da Polijetro
**De:** Alex Sandro / Minha Catarse
**Data:** 2026-05-28
**Contexto:** Definir como a Polijetro vai consumir métricas de Meta Ads do Dep. Federal David Soares (2026)

---

## 1. O que esse sistema faz

Esse repositório (`cpee-dashboard`) coleta, processa e exibe métricas de campanhas Meta Ads para a campanha pré-eleitoral do Dep. Federal David Soares (Podemos / SP). Dois produtos finais:

1. **Painel TV / war-room** (HTML estático full-screen pra escritório): [paineltv-david.vercel.app/dashboard-cpee/painel.html](https://paineltv-david.vercel.app/dashboard-cpee/painel.html)
2. **Dashboard interativo** (Next.js, dia-a-dia dos media buyers): [paineltv-david.vercel.app/dashboard/visao-geral](https://paineltv-david.vercel.app/dashboard/visao-geral)

A "métrica-mãe" é o **CPEE** (Custo Por Engajamento Eficaz) = `spend / EQ`, onde **EQ** ≈ leads de qualidade ou clique-no-link dependendo do contexto.

---

## 2. Arquitetura atual

```
┌───────────────────────────────────────────────────┐
│ Meta Marketing API v18.0                          │
│ - 2 ad accounts: act_4085311614896655             │
│                  act_213545982080883              │
│ - Long-lived token (renova ~2026-05-30)           │
└────────────────────┬──────────────────────────────┘
                     │
                     │ daily_report.py (cron 9h)
                     │ populate_criativos_clusters.py (cron 9h)
                     ▼
┌───────────────────────────────────────────────────┐
│ Python (servidor local + cron)                    │
│ - Agrega por campaign, adset, ad                  │
│ - Calcula CPEE, CTR, CPC, CPL, classificação      │
│ - Gera recomendações automáticas                  │
│ - Faz upsert via Supabase REST API                │
└────────────────────┬──────────────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────────────┐
│ Supabase (Postgres + REST + RLS)                  │
│ Projeto: ygbrgtuddtisoowwdxqn                     │
│                                                   │
│ Tabelas:                                          │
│  - snapshots_diarios     (1 row por conta/dia)    │
│  - metricas_conta        (estado atual)           │
│  - criativos_performance (top ads, c/ thumbnail)  │
│  - clusters_performance  (top ad sets)            │
│  - recomendacoes         (alertas históricos)     │
│  - execucoes             (log do cron)            │
└────────────────────┬──────────────────────────────┘
                     │
                     │ HTTPS · anon key
                     ▼
┌───────────────────────────────────────────────────┐
│ Frontends (Vercel, atualizam de 5 em 5min)        │
│  - painel.html (war-room TV)                      │
│  - Next.js dashboard (2 tabs)                     │
└───────────────────────────────────────────────────┘
```

---

## 3. Duas opções de integração para a Polijetro

### Opção A — Consumir nosso **Supabase** (recomendada)

Polijetro lê direto das tabelas via REST API do Supabase. Os dados já vêm:
- ✅ Agregados (não precisa juntar campaign-level)
- ✅ Com classificações calculadas (BOM/MEDIO/RUIM, QUENTE/MORNO/FRIO)
- ✅ Com thumbnails de criativos resolvidos
- ✅ Consistentes com o que o cliente vê no nosso dashboard
- ✅ Sem custo de rate limit (Meta tem limites; Supabase é generoso)
- ✅ Sem precisar gerenciar token Meta (que expira)

**Como conectar:**
- Endpoint base: `https://ygbrgtuddtisoowwdxqn.supabase.co/rest/v1/`
- Auth: header `apikey: <KEY>` e `Authorization: Bearer <KEY>`
- Anon key (read-only via RLS): solicitar comigo
- Documentação PostgREST: filtros `?col=eq.X`, `?col=gte.X`, `select=*`, `order=col.desc`, etc.

**Exemplos:**
```bash
# Todas as snapshots de Maio
curl "https://ygbrgtuddtisoowwdxqn.supabase.co/rest/v1/snapshots_diarios?select=*&data=gte.2026-05-01&order=data.asc" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"

# Estado atual de cada conta
curl "https://ygbrgtuddtisoowwdxqn.supabase.co/rest/v1/metricas_conta?select=*&order=executado_em.desc"

# Top 10 criativos com gasto >= R$50
curl "https://ygbrgtuddtisoowwdxqn.supabase.co/rest/v1/criativos_performance?select=ad_nome,thumbnail_url,cpee,ctr,spend,classificacao&spend=gte.50&order=cpee.asc&limit=10"

# Health-check do banco (Polijetro pode usar como ping)
curl "https://ygbrgtuddtisoowwdxqn.supabase.co/rest/v1/execucoes?select=id,periodo&order=executado_em.desc&limit=1"
```

### Opção B — Consumir **Meta Marketing API direto**

A Polijetro autentica com a Meta direto e processa do zero.

**Vantagens:**
- ✅ Independência total
- ✅ Acesso a campos que ainda não puxamos (demografia, horários, breakdowns)
- ✅ Granularidade ajustável (campaign / adset / ad / hour)

**Custos:**
- ❌ Precisa gerenciar token de longa duração (o nosso expira a cada ~60 dias; precisa renovar)
- ❌ Rate limits — Meta limita por app + por conta; queries pesadas podem dar 17/613 errors
- ❌ Precisa replicar nossa lógica de:
  - Agregação por período (Meta retorna por campaign; somar manualmente)
  - Cálculo de CPEE (spend / EQ) — não é nativo do Meta
  - Resolução de thumbnails (Meta retorna 64×64 expirável)
  - Classificações (QUENTE/MORNO/FRIO por percentil)
- ❌ Risco de divergência: cliente pode ver número X no nosso painel e número Y na Polijetro
- ❌ Cobertura de 1 ano de histórico exige backfill (28 dias é o padrão sem `time_range` explícito)

**Como conectar (se for por aqui):**
- Endpoint base: `https://graph.facebook.com/v18.0/`
- Token: precisa gerar **System User token** ou usar **long-lived user token**
- Account IDs (clientes adicionam o app na BM e a Polijetro pede acesso):
  - `act_4085311614896655` — CA - Pré-Campanha Principal
  - `act_213545982080883` — CA - Pré-Campanha Backup
- Endpoints mais usados pelo nosso pipeline:
  - `GET /{account_id}/insights?fields=campaign_id,campaign_name,impressions,reach,clicks,spend,frequency,actions&level=campaign&time_range={...}`
  - `GET /{account_id}/insights?level=ad&fields=ad_id,ad_name,adset_id,...`
  - `GET ?ids={ad_ids}&fields=id,creative{thumbnail_url}` (resolver thumbnails em batch de 50)

**Atenção sobre `time_range`:** se você passar `date_start` + `date_stop` como params soltos a Meta **ignora silenciosamente** e devolve o agregado de 28 dias. Tem que mandar `time_range={"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}` JSON-encoded. Já caímos nessa.

---

## 4. Recomendação técnica

| Cenário Polijetro | Recomendo |
|-------------------|-----------|
| Só precisa **mostrar** os números (cards, gráficos, listas) | **Opção A** (Supabase) — pronto em 1h, 0 manutenção |
| Quer **cruzar** com dados próprios (CRM, eventos) que vivem no banco da Polijetro | **Opção A** (Supabase) — você lê e enriquece |
| Quer **transformar** ou ter regras de cálculo diferentes (ex: CPEE com outra fórmula) | **Opção B** (Meta direto) — você controla 100% |
| Vai criar/ativar/pausar **campanhas** | **Opção B** + escopo `ads_management` (a anon key do Supabase é read-only) |
| Precisa de **breakdowns** (demografia, horários, dispositivo) | **Opção B** — não puxamos hoje |

**Pra esse projeto especificamente** acho a Opção A mais segura, porque garante que a Polijetro mostre o mesmo número que o cliente vê no nosso painel. Mas se o dev preferir a Opção B (como ele mencionou), tudo bem — funciona, só vai dar mais trabalho e tem o risco de divergência.

---

## 5. Schema das tabelas Supabase

### `snapshots_diarios` (1 row por conta/dia)
```
data              date     -- YYYY-MM-DD
account_id        text     -- act_XXXX
nome              text     -- nome da conta no Meta
papel             text     -- "PRINCIPAL" | "BACKUP" (manual)
cpee              numeric  -- spend / leads (ou 0)
eq                int      -- engajamentos (= leads pra esses tipos de campanha)
spend             numeric  -- valor em BRL
leads             int      -- soma de action_type "lead"
impressoes        int
alcance           int
cliques           int
thruplay          int      -- soma de "video_thruplay_watched"
frequencia        numeric
ctr               numeric  -- %
cpc               numeric  -- BRL
cpm               numeric  -- BRL
budget_diario     numeric  -- nullable
classificacao     text     -- "BOM" | "MEDIO" | "RUIM" | "SEM_DADOS"
```

### `metricas_conta` (estado atual — só 1 row por conta)
Mesmos campos de `snapshots_diarios` + `execucao_id`, `executado_em`, `cpl`, `budget_atual`, `budget_recomendado`, `acao_recomendada`, `fase_warmup`.

### `criativos_performance` (top ads, refresh diário)
```
ad_id, ad_nome, account_id, conta_nome, adset_id, campaign_id
pauta             text     -- "VID" | "EST" | "CAR" (vídeo/estática/carrossel)
thumbnail_url     text     -- URL pra imagem (FB CDN, requer referrerpolicy=no-referrer)
cpee, eq, spend, impressoes, alcance, ctr, cpc, leads, cpl
cpee_7d, eq_7d, spend_7d
cpee_30d, eq_30d, spend_30d
classificacao        text  -- "QUENTE" | "MORNO" | "FRIO" (relativo à média)
classificacao_p33    text  -- mesma classificação mas via percentil P33/P66
periodo, data, objetivo
```

### `clusters_performance` (top ad sets, mesma estrutura)
+ `adset_id`, `cluster_nome`, `cluster_num` (extraído de nomes como `CL28_BAIXADA_SANTISTA_AD` → 28).

### `recomendacoes`
```
id, execucao_id, account_id, nome
tipo              -- "CPC_ELEVADO" | "CTR_BAIXO" | "CPEE_ELEVADO"
severidade        -- "alta" | "media" | "baixa"
titulo, descricao, motivo, impacto_estimado, confianca
budget_atual, budget_proposto
aprovada, executada, executado_em
```

### `execucoes` (log do cron)
```
id, periodo, total_spend, total_eq, cpee_consolidado, budget_mensal
```

---

## 6. Cadência de atualização

- **Cron diário às 9h (BRT)** → roda `daily_report.py` e `populate_criativos_clusters.py`
- Cada execução roda em ~30s para 2 contas (~16-20 campanhas)
- Os frontends fazem polling a cada **5 min** (TanStack Query no Next.js / setInterval no painel TV)
- Backfill manual disponível via `python3 backfill_may.py` se precisar reprocessar histórico

---

## 7. URLs estáveis

- Painel TV: `https://paineltv-david.vercel.app/dashboard-cpee/painel.html`
- Dashboard Visão Geral: `https://paineltv-david.vercel.app/dashboard/visao-geral`
- Dashboard Detalhamento: `https://paineltv-david.vercel.app/dashboard/detalhamento`
- Supabase REST API: `https://ygbrgtuddtisoowwdxqn.supabase.co/rest/v1/`
- VPS de coleta: `187.77.203.55` (porta 8000)

---

## 8. O que eu preciso de você (Polijetro)

Se for Opção A (Supabase):
- [ ] Confirmação do escopo: só leitura ou também escrita?
- [ ] Lista de tabelas que vão querer consumir (pra eu garantir as policies RLS)
- [ ] IP/região do servidor da Polijetro (opcional, pra whitelisting se virar necessário)

Se for Opção B (Meta direto):
- [ ] App ID / Business Manager da Polijetro pra adicionar como Partner nas 2 contas
- [ ] Confirmação de qual System User vai gerar o token
- [ ] Lista de escopos necessários (`ads_read` mínimo; `ads_management` se for criar/pausar)

---

## 9. Contato

Qualquer dúvida me chama. Posso fazer um call de 15 min pra alinhar.

— Alex
