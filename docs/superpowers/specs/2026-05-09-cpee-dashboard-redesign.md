# CPEE Dashboard Redesign — Especificação

**Data:** 2026-05-09  
**Versão:** 1.0  
**Status:** Pronto para aprovação

---

## 1. Visão Geral

Reconstruir o CPEE Dashboard do zero com **Next.js + FastAPI**, mantendo a **Abordagem 2 (Modular com Tabs)**, integrando:
- Análise demográfica + horários
- Análise de sentimento de comentários/menções
- Previsões automáticas + recomendações inteligentes

**Tech Stack:**
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, TanStack Query, Recharts
- **Backend:** FastAPI (substituir Flask), async-first
- **Banco:** SQLite existente (estender com novas tabelas para sentimento + previsões)
- **Real-time:** Polling a cada 30 minutos

**Equipe:** 2 media buyers + assessores (máximo detalhe)  
**Estratégia:** Unificada, orçamento geral

---

## 2. Arquitetura

```
Meta Ads API (coleta a cada 30min)
    ↓
Data Collector → SQLite
    ├─ tabela: municipios (existente)
    ├─ tabela: campanhas (existente)
    ├─ tabela: metricas (existente)
    ├─ tabela: sentimentos (NOVA)
    └─ tabela: previsoes (NOVA)
    ↓
FastAPI Backend
    ├─ GET /api/overview (resumo executivo)
    ├─ GET /api/clusters/{id}/comparacao (comparações)
    ├─ GET /api/clusters/{id}/demografia (breakdown demográfico)
    ├─ GET /api/clusters/{id}/sentimento (análise sentimento)
    ├─ GET /api/clusters/{id}/horarios (heatmap horários)
    ├─ GET /api/previsoes (próximos 7-30 dias)
    ├─ GET /api/recomendacoes (alertas + sugestões)
    └─ ... (outros endpoints)
    ↓
Next.js Frontend
    ├─ TAB 1: Overview (KPIs + Recomendações automáticas)
    ├─ TAB 2: Comparações & Clusters (análise detalhada)
    └─ TAB 3: Insights Profundos (assessores)
    ↓
Usuário (2 media buyers + assessores)
```

---

## 3. TAB 1 — Overview Executivo

**Objetivo:** Visão em 5 minutos para media buyers decidirem ações do dia.

**Componentes:**

### 3.1 Seção Superior
- **Info da Campanha:** Nome, fase, website
- **Gasto Pré-Campanha (14 dias):** Card com valor R$X, % do teto, progress bar
- **Orçamento Geral:** Consumido em reais, % do mês, expected vs. real, progress bar

### 3.2 Filtros
- **Período:** 7 dias, 14 dias, 30 dias, 60 dias, 90 dias, personalizado
- **Temperatura:** Todas, 🔥 Quente, 🟡 Morno, 🔵 Frio

### 3.3 Alertas Inteligentes + Recomendações
Cards com sugestões automáticas:
- 🔥 "[Cluster X]: Tendência de aquecimento → Aumentar R$ 5k?"
- ⚠️ "[Cluster Y]: CPEE subiu 25% → Revisar criativo"
- ✓ "[Cluster Z]: Recuperação → Manter estratégia"

Cada card mostra: **Razão**, botões de ação ([Aumentar], [Pausar], [Analisar]), metadata (sentimento, demog top).

### 3.4 Grid de Métricas (2 linhas × 5 colunas)
**Linha 1:**
- CPEE Consolidado (com classificação Hot/Warm/Cold)
- Gasto Hoje (com % vs. 24h anterior)
- EQ Total (Engajamento Qualificado)
- Budget Diário (soma de N contas)
- Alertas Pendentes (número de recomendações não executadas)

**Linha 2:**
- Impressões (com icon 👁️)
- Alcance (com icon 👥)
- Frequência (com icon 🔄)
- CTR Médio (com icon 🖱️)
- Leads (com CPL)

Cada card mostra: **Ícone**, **Número grande**, **Subtitle**, **Metadata adicional**.

### 3.5 Classificação CPEE
Card mostrando:
- 🔥 **X Quentes** (HOT)
- 🟡 **Y Mornos** (WARM)
- 🔵 **Z Frios** (COLD)

Com "+ N em aguardo/warmup".

### 3.6 Funil de Conversão
Mostrando drop-off:
```
Alcance → Impressões → Engajamento (EQ) → Cliques → Leads
4.6M    → 6.2M       → 4.7M              → 125k   → 876
```

### 3.7 Gráficos Mini
- **CPEE Trend (7 dias):** Linha chart, últimos 7 dias
- **Gasto Diário (7 dias):** Stacked bar chart por campaign

### 3.8 Mini Ranking
Top 5 clusters mais quentes com cores (🔥🟡🔵), EEM, CPEE, Gasto, Sentimento resumido.

---

## 4. TAB 2 — Comparações & Análise Profunda

**Objetivo:** Comparar 2-5 clusters em detalhes (15-20 min de análise).

### 4.1 Seletor de Clusters
Multi-select dropdown: escolher quais clusters comparar (máx 5).

### 4.2 Filtros Breakdowns
Checkboxes: [ Idade ] [ Gênero ] [ Interesse ] [ Horário Ótimo ] [ Sentimento ]

### 4.3 Comparação Lado-a-Lado (Tabela)
Colunas: Cluster, CPEE, EEM, Gasto, CTR, CPC, CPL, Freq., **Sentimento (% pos/neg/neu)**, **Top Demog (idade/gênero)**, **Melhor Hora**.

Cores: Verde (bom) / Amarelo (intermediário) / Vermelho (ruim).

### 4.4 Gráficos Comparativos
- **Linha Trend CPEE (14 dias):** 4-5 linhas coloridas, uma por cluster
- **Heatmap Horários:** Qual hora tem melhor CTR/EQ por cluster (grid horário vs. cluster)
- **Sentimento Timeline (7 dias):** Evolução de % positivo/negativo por cluster (área chart)
- **Demográfico Breakdown:** Pie/Bar chart mostrando % por idade/gênero/interesse

### 4.5 Mapa de Calor (Clusters)
Grid mostrando:
- **Cor = CPEE invertido + Sentimento** (mais verde = melhor, mais vermelho = pior)
- **Cada célula:** Nome cluster, CPEE R$X, % sentimento positivo
- **Ordenação:** Top (melhor) até bottom (pior)

### 4.6 Análise de Engagement Breakdown
Mostrar qual tipo de engajamento (comentário pró-candidato, share, clique, curtida, etc.) tem maior peso em cada cluster.

---

## 5. TAB 3 — Insights Profundos (Assessores)

**Objetivo:** Máximo detalhe, análises granulares, exportar.

### 5.1 Campanhas por Conta
Cards mostrando (como seu print):
```
Principal Campanha                    R$ 54
  ├─ CL27_BACKUP02_AD       CTR 0.76% | CPL R$ 0
  │  └─ Sentimento: 78% positivo
  │     Demog: H 25-40 (56%), M 35-50 (32%)
  │     Melhor hora: 20h-22h (+40% CTR)
  │     [Analisar] [Pausar] [Escalar]
```

Cada criativo mostra: **Nome**, **CTR**, **CPL**, **Gasto**, **Sentimento**, **Demog top**, **Melhor hora**, **Ações**.

### 5.2 Análise de Sentimento Detalhada
Seção mostrando:
- **% Positivo / Negativo / Neutro** (últimos 30 dias)
- **Exemplos de comentários positivos** (2-3 reais com score)
- **Exemplos de comentários negativos** (2-3 reais com pain points)
- **Insights:** "Mensagem muito genérica, falta planos específicos"

### 5.3 Previsões (7-30 dias)
Para cada cluster/campanha:
- **Tendência:** 📈 +X% ou 📉 -X% (com confiança %)
- **Drivers:** "Sentimento positivo, demog ativo" ou "Mensagem fraca"
- **Sugestão:** "Aumentar agora" ou "Revisar criativo antes de escalar"

### 5.4 Histórico de Recomendações
Tabela mostrando:
- **Data**, **Recomendação**, **Status (Executada/Não executada)**, **Resultado**
- Exemplo: "05/05 - Aumentar SP em R$5k → ✓ EXECUTADA → CPEE melhorou 5%"

### 5.5 Ranking de Campanhas
Tabela completa com todas as métricas: Campanha, Conta, Gasto, CTR, Leads, CPL, CPEE, EEM, Sentimento, etc.

Ordenável por qualquer coluna, exportável.

### 5.6 Redes Sociais (Breakdown)
Dados desagregados por Instagram, Facebook, WhatsApp (se aplicável):
- Seguidores/Alcance por rede
- Engajamento por rede
- Sentimento por rede
- Horário ótimo por rede

### 5.7 Botões de Exportação
- [📊 Exportar Relatório PDF]
- [📥 CSV Completo]
- [📋 Compartilhar com Time] (gera link shareable)

---

## 6. Features Técnicas

### 6.1 Real-time Updates
- Polling a cada 30 minutos
- Badge "Última atualização: há X minutos" no header
- Indicador visual (spinner) enquanto atualiza

### 6.2 Responsivo
- Desktop (1920x1080): Layout completo
- Tablet (768x1024): Ajustes de grid
- Mobile (375x812): Stack vertical simplificado

### 6.3 Performance
- TanStack Query para caching + refetch inteligente
- Lazy loading de gráficos
- Paginação em tabelas grandes (50+ rows)

### 6.4 Acessibilidade
- WCAG 2.1 AA
- Alt text em todos os gráficos
- Keyboard navigation (tabs, enter, setas)
- Contrast ratio 4.5:1 mínimo

---

## 7. Banco de Dados (Extensões)

**Novas tabelas:**

```sql
-- Tabela de sentimentos (inserida a cada coleta)
CREATE TABLE sentimentos (
    id INTEGER PRIMARY KEY,
    cluster_id INTEGER,
    data DATE,
    positivo INTEGER,    -- contagem
    negativo INTEGER,
    neutro INTEGER,
    exemplos_positivos TEXT,  -- JSON array
    exemplos_negativos TEXT
);

-- Tabela de previsões (gerada diariamente)
CREATE TABLE previsoes (
    id INTEGER PRIMARY KEY,
    cluster_id INTEGER,
    data DATE,
    periodo VARCHAR(10),  -- "7dias", "30dias"
    tendencia_percentual FLOAT,
    confianca FLOAT,
    drivers TEXT,  -- JSON
    sugestao VARCHAR(500)
);

-- Tabela de recomendações (histórico)
CREATE TABLE recomendacoes (
    id INTEGER PRIMARY KEY,
    cluster_id INTEGER,
    data_criacao DATE,
    tipo VARCHAR(50),  -- "aumentar_verba", "revisar_criativo", etc.
    descricao TEXT,
    status VARCHAR(20),  -- "executada", "ignorada", "pendente"
    resultado TEXT,
    data_execucao DATE
);

-- Tabela de demografia (agregada)
CREATE TABLE demografia_cluster (
    id INTEGER PRIMARY KEY,
    cluster_id INTEGER,
    data DATE,
    faixa_etaria VARCHAR(20),  -- "18-25", "25-40", etc.
    genero VARCHAR(1),  -- "M", "F"
    interesse VARCHAR(100),
    percentual FLOAT
);

-- Tabela de horários (heatmap)
CREATE TABLE horarios_performance (
    id INTEGER PRIMARY KEY,
    cluster_id INTEGER,
    data DATE,
    hora INTEGER,  -- 0-23
    ctr FLOAT,
    engajamento INTEGER,
    impressoes INTEGER
);
```

---

## 8. API Endpoints (FastAPI)

```python
# Overview
GET /api/overview
  → {kpis: {...}, alertas: [...], recomendacoes: [...], previsoes_7d: [...]}

# Comparações
GET /api/clusters/comparacao?clusters=sp,rj,ba
  → {clusters: [{...}, {...}], graficos: {...}}

GET /api/clusters/{id}/demografia
  → {faixas_etarias: {...}, generos: {...}, interesses: {...}}

GET /api/clusters/{id}/horarios
  → {heatmap: [[...]], melhor_hora: "20h-22h"}

GET /api/clusters/{id}/sentimento
  → {positivo: 78, negativo: 15, neutro: 7, exemplos: {...}}

GET /api/clusters/{id}/trending
  → {tendencia: +15, confianca: 87, drivers: [...], sugestao: "..."}

# Insights
GET /api/campanhas-por-conta
  → {campanhas: [{...}]}

GET /api/previsoes?periodo=7d
  → {previsoes: [...]}

GET /api/recomendacoes-historico
  → {historico: [{...}]}

GET /api/exportar?formato=pdf
  → PDF binary download
```

---

## 9. Estrutura de Pastas (Next.js)

```
cpee-dashboard/
├── frontend/  (Next.js)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx (layout com tabs)
│   │   │   ├── overview/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── KPICards.tsx
│   │   │   │   │   ├── AlertsSection.tsx
│   │   │   │   │   ├── MetricsGrid.tsx
│   │   │   │   │   └── FunnelChart.tsx
│   │   │   ├── comparacoes/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── ClusterSelector.tsx
│   │   │   │   │   ├── ComparisonTable.tsx
│   │   │   │   │   ├── HeatmapChart.tsx
│   │   │   │   │   └── TrendChart.tsx
│   │   │   ├── insights/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── CampaignsByAccount.tsx
│   │   │   │   │   ├── SentimentAnalysis.tsx
│   │   │   │   │   ├── PredictionsCard.tsx
│   │   │   │   │   └── ExportButtons.tsx
│   ├── lib/
│   │   ├── api.ts (TanStack Query hooks)
│   │   ├── types.ts (TypeScript interfaces)
│   │   └── utils.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/  (FastAPI)
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── overview.py
│   │   │   ├── comparacoes.py
│   │   │   ├── insights.py
│   │   │   └── previsoes.py
│   │   ├── models/
│   │   │   ├── schemas.py (Pydantic models)
│   │   │   └── database.py
│   │   ├── services/
│   │   │   ├── sentiment_analyzer.py
│   │   │   ├── prediction_engine.py
│   │   │   └── recommendation_engine.py
│   │   └── utils/
│   └── requirements.txt
│
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-09-cpee-dashboard-redesign.md (este arquivo)
│
├── docker-compose.yml (opcional, para dev)
└── .env.example
```

---

## 10. Dependências Principais

**Frontend:**
```
next@14.0.0
react@18.2.0
typescript@5.3.0
tailwindcss@3.3.0
@tanstack/react-query@5.0.0
recharts@2.10.0
axios@1.6.0
```

**Backend:**
```
fastapi@0.104.0
uvicorn@0.24.0
sqlalchemy@2.0.0
pydantic@2.4.0
python-multipart@0.0.6
textblob (ou transformers para sentimento melhor)
```

---

## 11. Timeline (Estimado)

- **Semana 1:** Setup Next.js + FastAPI, banco de dados estendido
- **Semana 2:** TAB 1 (Overview) completo + API
- **Semana 3:** TAB 2 (Comparações) completo + gráficos
- **Semana 4:** TAB 3 (Insights) completo + exportação
- **Semana 5:** Features inteligentes (sentimento, previsões, recomendações)
- **Semana 6:** Testes, polimento, deploy
- **Semana 7:** Buffer / Otimizações

---

## 12. Critérios de Sucesso

✅ Dashboard roda em 30 min refresh  
✅ 2 media buyers conseguem tomar decisões em <5 min (TAB 1)  
✅ Assessores têm acesso a máximo detalhe (TAB 3)  
✅ Sentimento é calculado com >80% acurácia  
✅ Previsões acertam tendência em >75% dos casos  
✅ Recomendações automáticas economizam >10 horas/semana de análise manual  
✅ Time consegue exportar e compartilhar dados em <2 min  

---

## 13. Notas

- **Sentimento:** Usar transformer (distilbert-pt) ou TextBlob como fallback
- **Previsões:** Usar regressão linear simples ou Prophet para tendências
- **Demografia:** Dados vêm de Meta Ads API (audience insights)
- **Alertas:** Disparados se mudança >20% vs. 24h anterior, ou trend significativa (R²>0.8)
