# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Create a new project:
   - **Project name**: cpee-dashboard
   - **Database password**: (save securely)
   - **Region**: Brazil (São Paulo) or nearest region
   - **Pricing plan**: Free tier to start

## Step 2: Create Database Tables

After project creation, go to SQL Editor and execute:

```sql
-- metricas_conta table
CREATE TABLE metricas_conta (
  account_id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  regiao TEXT,
  meta_mensal NUMERIC DEFAULT 0,
  budget_diario NUMERIC DEFAULT 0,
  campanhas_ativas INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- snapshots_diarios table
CREATE TABLE snapshots_diarios (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL,
  account_id TEXT NOT NULL,
  regiao TEXT,
  spend NUMERIC DEFAULT 0,
  impressoes INTEGER DEFAULT 0,
  alcance INTEGER DEFAULT 0,
  cliques INTEGER DEFAULT 0,
  eq INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  cpl NUMERIC DEFAULT 0,
  cpee NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data, account_id)
);

-- recomendacoes table
CREATE TABLE recomendacoes (
  id BIGSERIAL PRIMARY KEY,
  severidade TEXT DEFAULT 'media',
  account_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  impacto_estimado TEXT,
  confianca NUMERIC DEFAULT 0.7,
  criado_em TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pendente'
);

-- criativos_performance table
CREATE TABLE criativos_performance (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  account_id TEXT NOT NULL,
  thumb TEXT DEFAULT 'static',
  spend NUMERIC DEFAULT 0,
  leads INTEGER DEFAULT 0,
  cpee NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'stable',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- clusters_performance table
CREATE TABLE clusters_performance (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT,
  account_id TEXT NOT NULL,
  regiao TEXT,
  cpee NUMERIC DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  eq INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  alcance INTEGER DEFAULT 0,
  tendencia TEXT DEFAULT 'stable',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_snapshots_data ON snapshots_diarios(data DESC);
CREATE INDEX idx_snapshots_account ON snapshots_diarios(account_id);
CREATE INDEX idx_creatives_account ON criativos_performance(account_id);
CREATE INDEX idx_clusters_account ON clusters_performance(account_id);
CREATE INDEX idx_recomendacoes_account ON recomendacoes(account_id);
```

## Step 3: Set Row Level Security (RLS)

Enable RLS on all tables and set public SELECT access:

```sql
-- Enable RLS
ALTER TABLE metricas_conta ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE recomendacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE criativos_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters_performance ENABLE ROW LEVEL SECURITY;

-- Create policies for anon users (read-only)
CREATE POLICY "Allow public read on metricas_conta" 
  ON metricas_conta FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read on snapshots_diarios" 
  ON snapshots_diarios FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read on recomendacoes" 
  ON recomendacoes FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read on criativos_performance" 
  ON criativos_performance FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read on clusters_performance" 
  ON clusters_performance FOR SELECT 
  USING (true);
```

## Step 4: Get API Keys

1. Go to **Settings > API**
2. Copy:
   - **Project URL**: `https://[project-id].supabase.co`
   - **Anon key**: (public key, safe to share)

## Step 5: Update Frontend

In the dashboard, click **Configurações** (gear icon) → **Conectar ao Supabase**

Fill in:
- **Project URL**: Your Supabase URL
- **Anon public key**: Your Supabase anon key

## Step 6: Seed Initial Data

Run this script to populate Supabase with data from SQLite:

```bash
python scripts/sync_to_supabase.py
```

## Backend Changes (Optional)

To use Supabase as primary database, update backend:

1. Update `requirements.txt`:
```
supabase==2.4.0
```

2. Update `app/main.py` to use Supabase client:
```python
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
```

3. Update `CORS_ORIGIN` environment variable to include your Supabase URL
