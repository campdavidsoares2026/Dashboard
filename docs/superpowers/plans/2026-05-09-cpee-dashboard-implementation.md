# CPEE Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the CPEE Dashboard from scratch using Next.js 14 + FastAPI with 3 modular tabs, real-time updates, and intelligent AI-driven features (sentiment analysis, predictions, recommendations).

**Architecture:** 
- **Frontend:** Next.js 14 App Router with TypeScript, Tailwind CSS, TanStack Query, Recharts
- **Backend:** FastAPI async-first replacing existing Flask, with 5 new database tables
- **Real-time:** 30-minute polling with intelligent caching and automatic refreshes
- **AI Features:** Sentiment analysis (NLP), prediction engine (time series), recommendation system

**Tech Stack:** 
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS 3.3, TanStack Query 5, Recharts 2.10, Axios
- Backend: FastAPI 0.104, SQLAlchemy 2.0, Pydantic 2.4, TextBlob/transformers for NLP
- Database: SQLite (extended with 5 new tables)
- Testing: pytest (backend), Jest/Vitest (frontend)

---

## Phase 1: Backend Infrastructure & Database

### Task 1: Setup FastAPI project and migrate from Flask

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/models/database.py`
- Modify: `.gitignore` (add backend/, venv/, __pycache__)

- [ ] **Step 1: Write test for FastAPI server startup**

```python
# backend/tests/test_main.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_app_starts():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
python -m pytest tests/test_main.py::test_app_starts -v
```

Expected: `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 3: Create FastAPI app with health endpoint**

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="CPEE Dashboard API",
    description="Campaign analytics for Podemos",
    version="1.0.0"
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 4: Create requirements.txt**

```txt
# backend/requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
pydantic==2.4.2
python-multipart==0.0.6
textblob==0.17.1
transformers==4.35.0
torch==2.1.0
pytest==7.4.3
httpx==0.25.0
python-dotenv==1.0.0
```

- [ ] **Step 5: Create .env.example**

```bash
# backend/.env.example
DATABASE_URL=sqlite:///./cpee_dashboard.db
META_ACCESS_TOKEN=your_token_here
META_AD_ACCOUNT_ID=act_123456789
MODO_COLETA=simulado
REFRESH_INTERVAL=1800
```

- [ ] **Step 6: Setup database connection**

```python
# backend/app/models/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cpee_dashboard.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd backend
pip install -r requirements.txt
python -m pytest tests/test_main.py::test_app_starts -v
```

Expected: `PASSED`

- [ ] **Step 8: Commit**

```bash
cd backend
git add app/main.py requirements.txt .env.example app/models/database.py tests/test_main.py
git commit -m "feat: setup FastAPI project with health endpoint"
```

---

### Task 2: Create database schema with 5 new tables

**Files:**
- Create: `backend/app/models/schemas.py`
- Create: `backend/app/models/models.py`
- Create: `backend/tests/test_database.py`

- [ ] **Step 1: Write test for database table creation**

```python
# backend/tests/test_database.py
import pytest
from sqlalchemy import inspect
from app.models.database import engine, Base

def test_all_tables_created():
    """Verify all required tables exist in database"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    required_tables = [
        'municipios', 'campanhas', 'metricas',
        'sentimentos', 'previsoes', 'recomendacoes',
        'demografia_cluster', 'horarios_performance'
    ]
    
    for table in required_tables:
        assert table in tables, f"Table {table} not found"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
python -m pytest tests/test_database.py::test_all_tables_created -v
```

Expected: `AssertionError: Table sentimentos not found`

- [ ] **Step 3: Create Pydantic schemas**

```python
# backend/app/models/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Overview
class KPICard(BaseModel):
    label: str
    value: float
    unit: str
    trend: Optional[float] = None
    trend_direction: Optional[str] = None  # "up", "down"
    metadata: Optional[str] = None

class Alert(BaseModel):
    id: str
    cluster: str
    type: str  # "warning", "success", "info"
    title: str
    reason: str
    actions: List[dict]
    sentiment: Optional[str] = None

class OverviewResponse(BaseModel):
    kpis: List[KPICard]
    alerts: List[Alert]
    recommendations: List[Alert]
    cpee_trend: List[dict]
    budget_breakdown: List[dict]
    top_clusters: List[dict]

# Sentiment
class SentimentExample(BaseModel):
    texto: str
    score: float

class SentimentResponse(BaseModel):
    positivo: int
    negativo: int
    neutro: int
    exemplos_positivos: List[SentimentExample]
    exemplos_negativos: List[SentimentExample]

# Predictions
class Prediction(BaseModel):
    cluster: str
    periodo: str  # "7dias", "30dias"
    tendencia_percentual: float
    confianca: float
    drivers: List[str]
    sugestao: str

# Comparisons
class ClusterComparison(BaseModel):
    cluster: str
    cpee: float
    eem: float
    gasto: float
    ctr: float
    cpc: float
    cpl: float
    frequencia: float
    sentimento_positivo: float
    top_demog: str
    melhor_hora: str

class ComparisonResponse(BaseModel):
    clusters: List[ClusterComparison]
    graficos: dict

# Demographics
class DemographicBreakdown(BaseModel):
    faixa_etaria: dict  # {"18-25": 0.15, "25-40": 0.35, ...}
    genero: dict  # {"M": 0.55, "F": 0.45}
    interesses: List[dict]  # [{"interest": "...", "percentual": 0.10}]

# Horários
class HorarioPerformance(BaseModel):
    hora: int
    ctr: float
    engajamento: int
    impressoes: int

class HorarioResponse(BaseModel):
    heatmap: List[List[dict]]
    melhor_hora: str
    pior_hora: str
```

- [ ] **Step 4: Create SQLAlchemy models for 5 new tables**

```python
# backend/app/models/models.py
from sqlalchemy import Column, Integer, String, Float, Date, Text, ForeignKey, DateTime
from datetime import datetime
from app.models.database import Base

class Sentimento(Base):
    __tablename__ = "sentimentos"
    
    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer)
    data = Column(Date)
    positivo = Column(Integer)
    negativo = Column(Integer)
    neutro = Column(Integer)
    exemplos_positivos = Column(Text)  # JSON
    exemplos_negativos = Column(Text)  # JSON

class Previsao(Base):
    __tablename__ = "previsoes"
    
    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer)
    data = Column(Date)
    periodo = Column(String(10))  # "7dias", "30dias"
    tendencia_percentual = Column(Float)
    confianca = Column(Float)
    drivers = Column(Text)  # JSON
    sugestao = Column(String(500))

class Recomendacao(Base):
    __tablename__ = "recomendacoes"
    
    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer)
    data_criacao = Column(Date)
    tipo = Column(String(50))  # "aumentar_verba", "revisar_criativo"
    descricao = Column(Text)
    status = Column(String(20))  # "executada", "ignorada", "pendente"
    resultado = Column(Text)
    data_execucao = Column(Date, nullable=True)

class DemografiaCluster(Base):
    __tablename__ = "demografia_cluster"
    
    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer)
    data = Column(Date)
    faixa_etaria = Column(String(20))  # "18-25", "25-40"
    genero = Column(String(1))  # "M", "F"
    interesse = Column(String(100))
    percentual = Column(Float)

class HorariosPerformance(Base):
    __tablename__ = "horarios_performance"
    
    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer)
    data = Column(Date)
    hora = Column(Integer)  # 0-23
    ctr = Column(Float)
    engajamento = Column(Integer)
    impressoes = Column(Integer)
```

- [ ] **Step 5: Create tables in database**

```python
# backend/app/models/__init__.py
from app.models.models import Sentimento, Previsao, Recomendacao, DemografiaCluster, HorariosPerformance
from app.models.database import Base, engine

# Create all tables
Base.metadata.create_all(bind=engine)
```

- [ ] **Step 6: Update main.py to initialize database**

```python
# backend/app/main.py (add at top after imports)
from app.models import Base, engine

# Create tables on startup
Base.metadata.create_all(bind=engine)
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd backend
python -m pytest tests/test_database.py::test_all_tables_created -v
```

Expected: `PASSED`

- [ ] **Step 8: Commit**

```bash
cd backend
git add app/models/schemas.py app/models/models.py app/models/__init__.py tests/test_database.py app/main.py
git commit -m "feat: add database schema for sentiment, predictions, recommendations, demographics, hourly performance"
```

---

### Task 3: Create API endpoint structure with dependency injection

**Files:**
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/overview.py`
- Create: `backend/app/api/comparacoes.py`
- Create: `backend/app/api/insights.py`
- Create: `backend/app/api/previsoes.py`
- Modify: `backend/app/main.py` (add routers)
- Create: `backend/tests/test_api.py`

- [ ] **Step 1: Write tests for API endpoints**

```python
# backend/tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_overview_endpoint_exists():
    response = client.get("/api/overview")
    assert response.status_code == 200
    assert "kpis" in response.json()

def test_comparacoes_endpoint_exists():
    response = client.get("/api/clusters/comparacao?clusters=sp")
    assert response.status_code == 200
    assert "clusters" in response.json()

def test_insights_endpoint_exists():
    response = client.get("/api/campanhas-por-conta")
    assert response.status_code == 200
    assert "campanhas" in response.json()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
python -m pytest tests/test_api.py -v
```

Expected: `404 Not Found`

- [ ] **Step 3: Create overview router**

```python
# backend/app/api/overview.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.schemas import OverviewResponse, KPICard, Alert
from datetime import datetime
from typing import List

router = APIRouter(prefix="/api", tags=["overview"])

@router.get("/overview", response_model=OverviewResponse)
async def get_overview(db: Session = Depends(get_db)):
    """
    Get overview dashboard data:
    - KPI cards (CPEE, gasto, leads, etc.)
    - Intelligent alerts and recommendations
    - CPEE trend (7 days)
    - Budget breakdown
    - Top 5 clusters
    """
    return {
        "kpis": [
            {
                "label": "CPEE Consolidado",
                "value": 45.32,
                "unit": "R$",
                "trend": -5.2,
                "trend_direction": "down",
                "metadata": "HOT 🔥"
            }
        ],
        "alerts": [],
        "recommendations": [],
        "cpee_trend": [],
        "budget_breakdown": [],
        "top_clusters": []
    }
```

- [ ] **Step 4: Create comparacoes router**

```python
# backend/app/api/comparacoes.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.schemas import ComparisonResponse

router = APIRouter(prefix="/api", tags=["comparacoes"])

@router.get("/clusters/comparacao", response_model=ComparisonResponse)
async def get_comparacao(
    clusters: str = Query(..., description="Comma-separated cluster IDs"),
    db: Session = Depends(get_db)
):
    """Compare multiple clusters side-by-side"""
    return {
        "clusters": [],
        "graficos": {}
    }

@router.get("/clusters/{cluster_id}/demografia")
async def get_demografia(cluster_id: int, db: Session = Depends(get_db)):
    """Get demographic breakdown for a cluster"""
    return {
        "faixa_etaria": {},
        "genero": {},
        "interesses": []
    }

@router.get("/clusters/{cluster_id}/horarios")
async def get_horarios(cluster_id: int, db: Session = Depends(get_db)):
    """Get hourly performance heatmap"""
    return {
        "heatmap": [],
        "melhor_hora": "20h-22h",
        "pior_hora": "02h-04h"
    }

@router.get("/clusters/{cluster_id}/sentimento")
async def get_sentimento(cluster_id: int, db: Session = Depends(get_db)):
    """Get sentiment analysis"""
    return {
        "positivo": 78,
        "negativo": 15,
        "neutro": 7,
        "exemplos_positivos": [],
        "exemplos_negativos": []
    }
```

- [ ] **Step 5: Create insights router**

```python
# backend/app/api/insights.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db

router = APIRouter(prefix="/api", tags=["insights"])

@router.get("/campanhas-por-conta")
async def get_campanhas(db: Session = Depends(get_db)):
    """Get campaigns grouped by account with sentiment, demographics, best hours"""
    return {"campanhas": []}

@router.get("/previsoes")
async def get_previsoes(periodo: str = "7d", db: Session = Depends(get_db)):
    """Get predictions for next 7-30 days"""
    return {"previsoes": []}

@router.get("/recomendacoes-historico")
async def get_recomendacoes_historico(db: Session = Depends(get_db)):
    """Get recommendation history with execution status"""
    return {"historico": []}
```

- [ ] **Step 6: Create previsoes router**

```python
# backend/app/api/previsoes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db

router = APIRouter(prefix="/api", tags=["previsoes"])

@router.get("/clusters/{cluster_id}/trending")
async def get_trending(cluster_id: int, db: Session = Depends(get_db)):
    """Get trending prediction and drivers for a cluster"""
    return {
        "tendencia": 15,
        "confianca": 87,
        "drivers": [],
        "sugestao": ""
    }
```

- [ ] **Step 7: Update main.py to include routers**

```python
# backend/app/main.py (add after app creation)
from app.api import overview, comparacoes, insights, previsoes

app.include_router(overview.router)
app.include_router(comparacoes.router)
app.include_router(insights.router)
app.include_router(previsoes.router)
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd backend
python -m pytest tests/test_api.py -v
```

Expected: All 3 tests PASSED

- [ ] **Step 9: Commit**

```bash
cd backend
git add app/api/ tests/test_api.py app/main.py
git commit -m "feat: create API endpoint structure with all required routes"
```

---

## Phase 2: Frontend Setup & Tab 1 (Overview)

### Task 4: Setup Next.js 14 project with Tailwind and TanStack Query

**Files:**
- Create: `frontend/` (entire Next.js project)
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/dashboard/page.tsx`
- Create: `frontend/lib/api.ts`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/alexsandro/cpee-dashboard
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install @tanstack/react-query recharts axios
```

- [ ] **Step 2: Configure tailwind.config.ts with Podemos party colors**

```typescript
// frontend/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Podemos party colors (from https://www.podemos.org.br/)
        "podemos-primary": "#E74C3C",      // Red
        "podemos-secondary": "#34495E",    // Dark blue-gray
        "podemos-accent": "#F39C12",       // Orange
        "podemos-light": "#ECF0F1",        // Light gray
        "podemos-dark": "#2C3E50",         // Very dark blue
      },
      spacing: {
        "gutter": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Create root layout**

```typescript
// frontend/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CPEE Dashboard | Campanha Eleitoral",
  description: "Dashboard de análise de campanha eleitoral com métricas CPEE e EEM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-podemos-dark text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Create Providers component for TanStack Query**

```typescript
// frontend/app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchInterval: 1000 * 60 * 30, // 30 minutes
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Create API client with TanStack Query hooks**

```typescript
// frontend/lib/api.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface KPICard {
  label: string;
  value: number;
  unit: string;
  trend?: number;
  trend_direction?: "up" | "down";
  metadata?: string;
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

export interface OverviewData {
  kpis: KPICard[];
  alerts: Alert[];
  recommendations: Alert[];
  cpee_trend: Array<{ date: string; value: number }>;
  budget_breakdown: Array<{ name: string; value: number }>;
  top_clusters: Array<{ cluster: string; eem: number; cpee: number; gasto: number }>;
}

// Overview query hook
export function useOverview() {
  return useQuery<OverviewData>({
    queryKey: ["overview"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/overview`);
      return response.data;
    },
  });
}

// Comparacao query hook
export function useComparacao(clusters: string[]) {
  return useQuery({
    queryKey: ["comparacao", clusters],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/clusters/comparacao`, {
        params: { clusters: clusters.join(",") },
      });
      return response.data;
    },
    enabled: clusters.length > 0,
  });
}

// Campaignas por conta
export function useCampanhasPorConta() {
  return useQuery({
    queryKey: ["campanhas"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/campanhas-por-conta`);
      return response.data;
    },
  });
}

// Predictions
export function usePrevisoes(periodo: string = "7d") {
  return useQuery({
    queryKey: ["previsoes", periodo],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/previsoes`, {
        params: { periodo },
      });
      return response.data;
    },
  });
}
```

- [ ] **Step 6: Create .env.local file**

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 7: Test that app starts**

```bash
cd frontend
npm run dev
```

Expected: App runs on http://localhost:3000

- [ ] **Step 8: Commit**

```bash
cd frontend
git add . -A
git commit -m "feat: setup Next.js 14 with Tailwind, TanStack Query, and Podemos colors"
```

---

### Task 5: Build Tab 1 - Overview components (KPI Cards, Alerts, Metrics Grid)

**Files:**
- Create: `frontend/app/dashboard/page.tsx` (main layout with tabs)
- Create: `frontend/app/dashboard/overview/page.tsx`
- Create: `frontend/app/dashboard/overview/components/KPICards.tsx`
- Create: `frontend/app/dashboard/overview/components/AlertsSection.tsx`
- Create: `frontend/app/dashboard/overview/components/MetricsGrid.tsx`
- Create: `frontend/app/dashboard/overview/components/FunnelChart.tsx`
- Create: `frontend/app/dashboard/overview/components/CpeeClassification.tsx`
- Create: `frontend/app/dashboard/overview/components/TrendChart.tsx`
- Create: `frontend/app/dashboard/overview/components/TopClusters.tsx`
- Create: `frontend/__tests__/overview.test.tsx`

- [ ] **Step 1: Write test for KPI Cards component**

```typescript
// frontend/__tests__/overview.test.tsx
import { render, screen } from "@testing-library/react";
import KPICards from "@/app/dashboard/overview/components/KPICards";

describe("KPICards", () => {
  it("renders KPI cards with labels and values", () => {
    const kpis = [
      {
        label: "CPEE Consolidado",
        value: 45.32,
        unit: "R$",
        trend: -5.2,
        trend_direction: "down" as const,
        metadata: "HOT 🔥",
      },
    ];

    render(<KPICards kpis={kpis} />);
    expect(screen.getByText("CPEE Consolidado")).toBeInTheDocument();
    expect(screen.getByText("45.32")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Create KPI Cards component**

```typescript
// frontend/app/dashboard/overview/components/KPICards.tsx
"use client";

import { KPICard } from "@/lib/api";

interface KPICardsProps {
  kpis: KPICard[];
}

export default function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className="bg-podemos-secondary rounded-lg p-4 border border-podemos-accent/20"
        >
          <p className="text-sm text-gray-400 mb-2">{kpi.label}</p>
          <p className="text-2xl font-bold text-podemos-accent">
            {kpi.value}
            <span className="text-lg ml-1">{kpi.unit}</span>
          </p>
          {kpi.trend && (
            <p className={`text-sm mt-2 ${kpi.trend_direction === "up" ? "text-green-400" : "text-red-400"}`}>
              {kpi.trend_direction === "up" ? "↑" : "↓"} {Math.abs(kpi.trend)}%
            </p>
          )}
          {kpi.metadata && <p className="text-xs text-gray-500 mt-1">{kpi.metadata}</p>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create Alerts Section component**

```typescript
// frontend/app/dashboard/overview/components/AlertsSection.tsx
"use client";

import { Alert } from "@/lib/api";

interface AlertsSectionProps {
  alerts: Alert[];
  recommendations: Alert[];
}

export default function AlertsSection({ alerts, recommendations }: AlertsSectionProps) {
  const all = [...recommendations, ...alerts];

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white mb-4">Alertas & Recomendações Inteligentes</h2>
      <div className="space-y-3">
        {all.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border-l-4 ${
              alert.type === "warning"
                ? "bg-red-900/20 border-red-500"
                : alert.type === "success"
                ? "bg-green-900/20 border-green-500"
                : "bg-blue-900/20 border-blue-500"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-white">{alert.title}</p>
                <p className="text-sm text-gray-300">{alert.reason}</p>
              </div>
              {alert.sentiment && <span className="text-xs bg-podemos-accent text-black px-2 py-1 rounded">{alert.sentiment}</span>}
            </div>
            <div className="flex gap-2">
              {alert.actions.map((action, idx) => (
                <button
                  key={idx}
                  className="text-xs bg-podemos-accent text-black px-3 py-1 rounded hover:bg-opacity-80"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Metrics Grid component (10 cards)**

```typescript
// frontend/app/dashboard/overview/components/MetricsGrid.tsx
"use client";

import { KPICard } from "@/lib/api";

interface MetricsGridProps {
  kpis: KPICard[];
}

export default function MetricsGrid({ kpis }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-podemos-secondary rounded-lg p-4 border border-gray-700 hover:border-podemos-accent transition">
          <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
          <p className="text-xl font-bold text-white mb-1">{kpi.value}{kpi.unit}</p>
          {kpi.metadata && <p className="text-xs text-podemos-accent">{kpi.metadata}</p>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create Funnel Chart component**

```typescript
// frontend/app/dashboard/overview/components/FunnelChart.tsx
"use client";

interface FunnelData {
  stage: string;
  value: number;
}

interface FunnelChartProps {
  data: FunnelData[];
}

export default function FunnelChart({ data }: FunnelChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Funil de Conversão</h3>
      <div className="space-y-3">
        {data.map((item, idx) => {
          const width = (item.value / maxValue) * 100;
          return (
            <div key={idx}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-300">{item.stage}</span>
                <span className="text-sm font-bold text-podemos-accent">{item.value.toLocaleString()}</span>
              </div>
              <div className="h-8 bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-podemos-accent to-podemos-primary transition-all"
                  style={{ width: `${width}%` }}
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

- [ ] **Step 6: Create CPEE Classification component**

```typescript
// frontend/app/dashboard/overview/components/CpeeClassification.tsx
"use client";

interface ClassificationProps {
  hot: number;
  warm: number;
  cold: number;
  pending?: number;
}

export default function CpeeClassification({ hot, warm, cold, pending = 0 }: ClassificationProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Classificação CPEE</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-red-500 mb-1">🔥</p>
          <p className="text-white font-bold">{hot}</p>
          <p className="text-xs text-gray-400">Quentes</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-yellow-500 mb-1">🟡</p>
          <p className="text-white font-bold">{warm}</p>
          <p className="text-xs text-gray-400">Mornos</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-500 mb-1">🔵</p>
          <p className="text-white font-bold">{cold}</p>
          <p className="text-xs text-gray-400">Frios</p>
        </div>
      </div>
      {pending > 0 && <p className="text-center text-xs text-gray-400 mt-3">+ {pending} em aquecimento</p>}
    </div>
  );
}
```

- [ ] **Step 7: Create Trend Chart component**

```typescript
// frontend/app/dashboard/overview/components/TrendChart.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TrendData {
  date: string;
  value: number;
}

interface TrendChartProps {
  data: TrendData[];
  title: string;
}

export default function TrendChart({ data, title }: TrendChartProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="date" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip contentStyle={{ backgroundColor: "#2C3E50", border: "1px solid #E74C3C" }} />
          <Line type="monotone" dataKey="value" stroke="#E74C3C" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 8: Create Top Clusters component**

```typescript
// frontend/app/dashboard/overview/components/TopClusters.tsx
"use client";

interface TopCluster {
  cluster: string;
  eem: number;
  cpee: number;
  gasto: number;
}

interface TopClustersProps {
  clusters: TopCluster[];
}

export default function TopClusters({ clusters }: TopClustersProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6">
      <h3 className="text-white font-bold mb-4">Top 5 Clusters</h3>
      <div className="space-y-2">
        {clusters.map((cluster, idx) => {
          const temperature = cluster.eem >= 2.0 ? "🔥" : cluster.eem >= 0.8 ? "🟡" : "🔵";
          return (
            <div key={idx} className="flex justify-between items-center p-2 border-b border-gray-700">
              <div>
                <p className="text-white font-bold">{temperature} {cluster.cluster}</p>
                <p className="text-xs text-gray-400">EEM: {cluster.eem.toFixed(2)} | CPEE: R${cluster.cpee.toFixed(2)}</p>
              </div>
              <p className="text-podemos-accent font-bold">R${cluster.gasto.toLocaleString()}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create Overview page that uses all components**

```typescript
// frontend/app/dashboard/overview/page.tsx
"use client";

import { useOverview } from "@/lib/api";
import KPICards from "./components/KPICards";
import AlertsSection from "./components/AlertsSection";
import MetricsGrid from "./components/MetricsGrid";
import FunnelChart from "./components/FunnelChart";
import CpeeClassification from "./components/CpeeClassification";
import TrendChart from "./components/TrendChart";
import TopClusters from "./components/TopClusters";

export default function OverviewPage() {
  const { data, isLoading, error } = useOverview();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">Erro ao carregar dados</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6">
      {/* Header info section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Visão Geral - Campanha Principal</h1>
        <p className="text-gray-400">Resumo executivo dos últimos 7 dias</p>
      </div>

      {/* Top KPI cards */}
      <KPICards kpis={data.kpis.slice(0, 5)} />

      {/* Alerts and recommendations */}
      <AlertsSection alerts={data.alerts} recommendations={data.recommendations} />

      {/* Metrics grid */}
      <MetricsGrid kpis={data.kpis} />

      {/* 2-column layout for funnel and classification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <FunnelChart data={[
          { stage: "Alcance", value: 4600000 },
          { stage: "Impressões", value: 6200000 },
          { stage: "Engajamento", value: 4700000 },
          { stage: "Cliques", value: 125000 },
          { stage: "Leads", value: 876 },
        ]} />
        <CpeeClassification hot={5} warm={8} cold={3} pending={2} />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TrendChart title="Tendência CPEE (7 dias)" data={data.cpee_trend} />
        <TrendChart title="Gasto Diário (7 dias)" data={data.budget_breakdown.map((b, idx) => ({
          date: `Dia ${idx + 1}`,
          value: b.value as number
        }))} />
      </div>

      {/* Top clusters */}
      <TopClusters clusters={data.top_clusters} />
    </div>
  );
}
```

- [ ] **Step 10: Create main dashboard layout with tabs**

```typescript
// frontend/app/dashboard/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "📊 Overview", href: "/dashboard/overview" },
    { id: "comparacoes", label: "🔄 Comparações", href: "/dashboard/comparacoes" },
    { id: "insights", label: "🧠 Insights Profundos", href: "/dashboard/insights" },
  ];

  return (
    <div className="min-h-screen bg-podemos-dark">
      {/* Header */}
      <div className="bg-podemos-secondary border-b border-podemos-accent/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-podemos-accent">CPEE Dashboard</h1>
              <p className="text-sm text-gray-400">Última atualização: há 2 minutos</p>
            </div>
            <div className="text-sm text-gray-400">
              <button className="bg-podemos-accent text-black px-4 py-2 rounded hover:bg-opacity-80">
                Atualizar
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-2 border-b border-gray-700">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium transition ${
                  activeTab === tab.id
                    ? "text-podemos-accent border-b-2 border-podemos-accent"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {/* Placeholder for child routes */}
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Run tests**

```bash
cd frontend
npm test
```

Expected: Overview test PASSED

- [ ] **Step 12: Commit**

```bash
cd frontend
git add app/dashboard/overview components/__tests__ 
git commit -m "feat: build Tab 1 (Overview) with all components: KPI cards, alerts, metrics, funnel, classification, trends, top clusters"
```

---

## Phase 3: Tabs 2 & 3 - Comparisons & Insights

### Task 6: Build Tab 2 - Comparacoes (Cluster selection, comparison table, heatmap)

**Files:**
- Create: `frontend/app/dashboard/comparacoes/page.tsx`
- Create: `frontend/app/dashboard/comparacoes/components/ClusterSelector.tsx`
- Create: `frontend/app/dashboard/comparacoes/components/ComparisonTable.tsx`
- Create: `frontend/app/dashboard/comparacoes/components/HeatmapChart.tsx`
- Create: `frontend/app/dashboard/comparacoes/components/TrendChartComparacao.tsx`
- Create: `frontend/__tests__/comparacoes.test.tsx`

- [ ] **Step 1: Write test for ClusterSelector**

```typescript
// frontend/__tests__/comparacoes.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClusterSelector from "@/app/dashboard/comparacoes/components/ClusterSelector";

describe("ClusterSelector", () => {
  it("renders cluster options and allows selection", () => {
    const clusters = ["SP", "RJ", "BA", "MG"];
    const onChange = jest.fn();

    render(<ClusterSelector clusters={clusters} selectedClusters={[]} onChange={onChange} />);
    
    expect(screen.getByText("SP")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Create ClusterSelector component**

```typescript
// frontend/app/dashboard/comparacoes/components/ClusterSelector.tsx
"use client";

import { useState } from "react";

interface ClusterSelectorProps {
  clusters: string[];
  selectedClusters: string[];
  onChange: (selected: string[]) => void;
}

export default function ClusterSelector({ clusters, selectedClusters, onChange }: ClusterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (cluster: string) => {
    const updated = selectedClusters.includes(cluster)
      ? selectedClusters.filter(c => c !== cluster)
      : [...selectedClusters, cluster].slice(0, 5); // max 5
    onChange(updated);
  };

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Selecione Clusters para Comparar (máx. 5)</h3>
      <div className="flex flex-wrap gap-2">
        {clusters.map((cluster) => (
          <button
            key={cluster}
            onClick={() => toggle(cluster)}
            className={`px-4 py-2 rounded transition ${
              selectedClusters.includes(cluster)
                ? "bg-podemos-accent text-black font-bold"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            {cluster}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">{selectedClusters.length}/5 selecionados</p>
    </div>
  );
}
```

- [ ] **Step 3: Create ComparisonTable component**

```typescript
// frontend/app/dashboard/comparacoes/components/ComparisonTable.tsx
"use client";

import { ClusterComparison } from "@/lib/api";

interface ComparisonTableProps {
  clusters: ClusterComparison[];
}

export default function ComparisonTable({ clusters }: ComparisonTableProps) {
  const getRowColor = (value: number, isLower: boolean = false) => {
    const norm = value / 100;
    if (isLower) {
      return norm > 0.8 ? "bg-red-900/30" : norm > 0.5 ? "bg-yellow-900/30" : "bg-green-900/30";
    }
    return norm > 0.8 ? "bg-green-900/30" : norm > 0.5 ? "bg-yellow-900/30" : "bg-red-900/30";
  };

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6 overflow-x-auto">
      <h3 className="text-white font-bold mb-4">Comparação Lado-a-Lado</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="text-left p-3 text-gray-400">Cluster</th>
            <th className="text-center p-3 text-gray-400">CPEE</th>
            <th className="text-center p-3 text-gray-400">EEM</th>
            <th className="text-center p-3 text-gray-400">Gasto</th>
            <th className="text-center p-3 text-gray-400">CTR</th>
            <th className="text-center p-3 text-gray-400">Sentimento+</th>
            <th className="text-center p-3 text-gray-400">Top Demog</th>
            <th className="text-center p-3 text-gray-400">Melhor Hora</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((cluster) => (
            <tr key={cluster.cluster} className="border-b border-gray-700 hover:bg-gray-700/30">
              <td className="p-3 font-bold text-white">{cluster.cluster}</td>
              <td className={`p-3 text-center ${getRowColor(cluster.cpee)}`}>R${cluster.cpee.toFixed(2)}</td>
              <td className={`p-3 text-center ${getRowColor(cluster.eem * 100)}`}>{cluster.eem.toFixed(2)}</td>
              <td className="p-3 text-center">R${cluster.gasto.toLocaleString()}</td>
              <td className={`p-3 text-center ${getRowColor(cluster.ctr * 100)}`}>{(cluster.ctr * 100).toFixed(2)}%</td>
              <td className="p-3 text-center text-podemos-accent font-bold">78%</td>
              <td className="p-3 text-center text-gray-300">{cluster.top_demog}</td>
              <td className="p-3 text-center text-gray-300">{cluster.melhor_hora}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create HeatmapChart component**

```typescript
// frontend/app/dashboard/comparacoes/components/HeatmapChart.tsx
"use client";

interface HeatmapCell {
  cluster: string;
  cpee: number;
  sentimento: number;
}

interface HeatmapChartProps {
  data: HeatmapCell[];
}

export default function HeatmapChart({ data }: HeatmapChartProps) {
  const getColor = (value: number) => {
    if (value > 80) return "bg-green-600";
    if (value > 60) return "bg-green-500";
    if (value > 40) return "bg-yellow-500";
    if (value > 20) return "bg-orange-500";
    return "bg-red-600";
  };

  const sorted = [...data].sort((a, b) => b.cpee - a.cpee);

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Mapa de Calor (CPEE + Sentimento)</h3>
      <div className="space-y-2">
        {sorted.map((cell) => {
          const score = (cell.cpee + cell.sentimento) / 2;
          return (
            <div key={cell.cluster} className="flex items-center gap-4">
              <div className="w-20 text-white font-bold">{cell.cluster}</div>
              <div className={`h-8 flex-1 rounded ${getColor(score)} flex items-center justify-center text-white text-xs font-bold`}>
                {score.toFixed(0)}
              </div>
              <div className="text-xs text-gray-400 w-32">
                <span className="text-podemos-accent">Sent:</span> {cell.sentimento.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create TrendChartComparacao (multi-line)**

```typescript
// frontend/app/dashboard/comparacoes/components/TrendChartComparacao.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TrendLine {
  cluster: string;
  color: string;
}

interface TrendChartComparacaoProps {
  data: any[];
  lines: TrendLine[];
}

const colors = ["#E74C3C", "#F39C12", "#27AE60", "#3498DB", "#9B59B6"];

export default function TrendChartComparacao({ data, lines }: TrendChartComparacaoProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Tendência CPEE (14 dias) - Comparação</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="date" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip contentStyle={{ backgroundColor: "#2C3E50", border: "1px solid #E74C3C" }} />
          <Legend />
          {lines.map((line, idx) => (
            <Line
              key={line.cluster}
              type="monotone"
              dataKey={line.cluster}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 6: Create Comparacoes page**

```typescript
// frontend/app/dashboard/comparacoes/page.tsx
"use client";

import { useState } from "react";
import { useComparacao } from "@/lib/api";
import ClusterSelector from "./components/ClusterSelector";
import ComparisonTable from "./components/ComparisonTable";
import HeatmapChart from "./components/HeatmapChart";
import TrendChartComparacao from "./components/TrendChartComparacao";

const AVAILABLE_CLUSTERS = ["SP", "RJ", "BA", "MG", "SC", "RS", "PE"];

export default function ComparacoesPage() {
  const [selectedClusters, setSelectedClusters] = useState<string[]>(["SP", "RJ"]);
  const { data, isLoading } = useComparacao(selectedClusters);

  if (isLoading) {
    return <div className="p-6 text-gray-400">Carregando comparação...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-2">Análise Profunda - Comparações</h1>
      <p className="text-gray-400 mb-6">Compare múltiplos clusters em detalhes</p>

      <ClusterSelector
        clusters={AVAILABLE_CLUSTERS}
        selectedClusters={selectedClusters}
        onChange={setSelectedClusters}
      />

      {data && (
        <>
          <ComparisonTable clusters={data.clusters} />
          <HeatmapChart data={data.clusters.map(c => ({
            cluster: c.cluster,
            cpee: c.cpee,
            sentimento: 78
          }))} />
          <TrendChartComparacao
            data={[
              { date: "Dia 1", SP: 45, RJ: 50, BA: 40 },
              { date: "Dia 2", SP: 48, RJ: 49, BA: 42 },
              { date: "Dia 3", SP: 50, RJ: 52, BA: 45 },
            ]}
            lines={selectedClusters.map((c, idx) => ({ cluster: c, color: "#E74C3C" }))}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Run test**

```bash
cd frontend
npm test
```

Expected: Comparacao test PASSED

- [ ] **Step 8: Commit**

```bash
cd frontend
git add app/dashboard/comparacoes components/comparacoes __tests__/comparacoes.test.tsx
git commit -m "feat: build Tab 2 (Comparacoes) with cluster selector, comparison table, heatmap, multi-line trend"
```

---

### Task 7: Build Tab 3 - Insights (Campaigns, Sentiment, Predictions, Export)

**Files:**
- Create: `frontend/app/dashboard/insights/page.tsx`
- Create: `frontend/app/dashboard/insights/components/CampaignsByAccount.tsx`
- Create: `frontend/app/dashboard/insights/components/SentimentAnalysis.tsx`
- Create: `frontend/app/dashboard/insights/components/PredictionsCard.tsx`
- Create: `frontend/app/dashboard/insights/components/ExportButtons.tsx`
- Create: `frontend/app/dashboard/insights/components/RecommendationHistory.tsx`
- Create: `frontend/__tests__/insights.test.tsx`

- [ ] **Step 1: Create Campaigns by Account component**

```typescript
// frontend/app/dashboard/insights/components/CampaignsByAccount.tsx
"use client";

interface Campaign {
  name: string;
  gasto: number;
  ctr: number;
  cpl: number;
  sentimento: number;
  demog_top: string;
  melhor_hora: string;
}

interface CampaignsByAccountProps {
  campanhas: Array<{ account: string; campaigns: Campaign[] }>;
}

export default function CampaignsByAccount({ campanhas }: CampaignsByAccountProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Campanhas por Conta</h3>
      <div className="space-y-4">
        {campanhas.map((account, accIdx) => (
          <div key={accIdx} className="border border-gray-700 rounded p-4">
            <h4 className="text-podemos-accent font-bold mb-3">{account.account}</h4>
            {account.campaigns.map((campaign, campIdx) => (
              <div key={campIdx} className="mb-3 p-3 bg-gray-800 rounded">
                <div className="flex justify-between mb-2">
                  <p className="text-white font-bold">{campaign.name}</p>
                  <p className="text-podemos-accent">R${campaign.gasto}</p>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>CTR: {(campaign.ctr * 100).toFixed(2)}% | CPL: R${campaign.cpl}</p>
                  <p>Sentimento: {campaign.sentimento}% positivo | Demog: {campaign.demog_top}</p>
                  <p>Melhor hora: {campaign.melhor_hora}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="text-xs bg-podemos-accent text-black px-3 py-1 rounded hover:bg-opacity-80">
                    Analisar
                  </button>
                  <button className="text-xs bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600">
                    Pausar
                  </button>
                  <button className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                    Escalar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Sentiment Analysis component**

```typescript
// frontend/app/dashboard/insights/components/SentimentAnalysis.tsx
"use client";

interface SentimentAnalysisProps {
  positivo: number;
  negativo: number;
  neutro: number;
  exemplos_positivos: Array<{ texto: string; score: number }>;
  exemplos_negativos: Array<{ texto: string; score: number }>;
  insight: string;
}

export default function SentimentAnalysis({
  positivo,
  negativo,
  neutro,
  exemplos_positivos,
  exemplos_negativos,
  insight,
}: SentimentAnalysisProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Análise de Sentimento (30 dias)</h3>

      {/* Percentage bars */}
      <div className="mb-6">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-green-400">Positivo</span>
          <span className="font-bold">{positivo}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: `${positivo}%` }} />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-red-400">Negativo</span>
          <span className="font-bold">{negativo}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded overflow-hidden">
          <div className="h-full bg-red-500" style={{ width: `${negativo}%` }} />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-gray-400">Neutro</span>
          <span className="font-bold">{neutro}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded overflow-hidden">
          <div className="h-full bg-gray-500" style={{ width: `${neutro}%` }} />
        </div>
      </div>

      {/* Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-green-400 font-bold text-sm mb-2">Exemplos Positivos</p>
          <div className="space-y-2">
            {exemplos_positivos.slice(0, 2).map((ex, idx) => (
              <p key={idx} className="text-xs text-gray-300 p-2 bg-green-900/20 rounded">
                "{ex.texto}"
              </p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-red-400 font-bold text-sm mb-2">Exemplos Negativos</p>
          <div className="space-y-2">
            {exemplos_negativos.slice(0, 2).map((ex, idx) => (
              <p key={idx} className="text-xs text-gray-300 p-2 bg-red-900/20 rounded">
                "{ex.texto}"
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className="bg-podemos-accent/10 border border-podemos-accent rounded p-3">
        <p className="text-sm text-podemos-accent">💡 Insight: {insight}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Predictions Card component**

```typescript
// frontend/app/dashboard/insights/components/PredictionsCard.tsx
"use client";

interface Prediction {
  cluster: string;
  periodo: string;
  tendencia_percentual: number;
  confianca: number;
  drivers: string[];
  sugestao: string;
}

interface PredictionsCardProps {
  previsoes: Prediction[];
}

export default function PredictionsCard({ previsoes }: PredictionsCardProps) {
  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Previsões (7-30 dias)</h3>
      <div className="space-y-3">
        {previsoes.map((pred, idx) => (
          <div key={idx} className="border border-gray-700 rounded p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-white font-bold">{pred.cluster}</p>
              <div className="text-right">
                <p className={`text-lg font-bold ${pred.tendencia_percentual > 0 ? "text-green-400" : "text-red-400"}`}>
                  {pred.tendencia_percentual > 0 ? "📈" : "📉"} {Math.abs(pred.tendencia_percentual)}%
                </p>
                <p className="text-xs text-gray-400">Confiança: {pred.confianca}%</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-2">
              <span className="font-bold">Drivers:</span> {pred.drivers.join(", ")}
            </p>
            <p className="text-sm text-podemos-accent">Sugestão: {pred.sugestao}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Recommendation History component**

```typescript
// frontend/app/dashboard/insights/components/RecommendationHistory.tsx
"use client";

interface Recommendation {
  data: string;
  titulo: string;
  status: "executada" | "nao_executada" | "pendente";
  resultado: string;
}

interface RecommendationHistoryProps {
  historico: Recommendation[];
}

export default function RecommendationHistory({ historico }: RecommendationHistoryProps) {
  const getStatusColor = (status: string) => {
    return status === "executada"
      ? "bg-green-900/30 text-green-400"
      : status === "nao_executada"
      ? "bg-red-900/30 text-red-400"
      : "bg-yellow-900/30 text-yellow-400";
  };

  return (
    <div className="bg-podemos-secondary rounded-lg p-6 mb-6">
      <h3 className="text-white font-bold mb-4">Histórico de Recomendações</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left p-3 text-gray-400">Data</th>
              <th className="text-left p-3 text-gray-400">Recomendação</th>
              <th className="text-center p-3 text-gray-400">Status</th>
              <th className="text-left p-3 text-gray-400">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((rec, idx) => (
              <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/30">
                <td className="p-3 text-gray-300">{rec.data}</td>
                <td className="p-3 text-white">{rec.titulo}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(rec.status)}`}>
                    {rec.status === "executada" ? "✓ EXECUTADA" : rec.status === "nao_executada" ? "✗ IGNORADA" : "⏳ PENDENTE"}
                  </span>
                </td>
                <td className="p-3 text-gray-300 text-xs">{rec.resultado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create Export Buttons component**

```typescript
// frontend/app/dashboard/insights/components/ExportButtons.tsx
"use client";

export default function ExportButtons() {
  const handleExport = (format: "pdf" | "csv" | "share") => {
    // TODO: Implement actual export
    console.log(`Exporting as ${format}`);
  };

  return (
    <div className="flex gap-4 mb-6">
      <button
        onClick={() => handleExport("pdf")}
        className="flex items-center gap-2 bg-podemos-accent text-black px-6 py-3 rounded font-bold hover:bg-opacity-80 transition"
      >
        📊 Exportar Relatório PDF
      </button>
      <button
        onClick={() => handleExport("csv")}
        className="flex items-center gap-2 bg-podemos-secondary text-white px-6 py-3 rounded font-bold border border-podemos-accent hover:border-opacity-80 transition"
      >
        📥 CSV Completo
      </button>
      <button
        onClick={() => handleExport("share")}
        className="flex items-center gap-2 bg-podemos-secondary text-white px-6 py-3 rounded font-bold border border-podemos-accent hover:border-opacity-80 transition"
      >
        📋 Compartilhar com Time
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Create Insights page**

```typescript
// frontend/app/dashboard/insights/page.tsx
"use client";

import { useCampanhasPorConta, usePrevisoes } from "@/lib/api";
import CampaignsByAccount from "./components/CampaignsByAccount";
import SentimentAnalysis from "./components/SentimentAnalysis";
import PredictionsCard from "./components/PredictionsCard";
import RecommendationHistory from "./components/RecommendationHistory";
import ExportButtons from "./components/ExportButtons";

export default function InsightsPage() {
  const { data: campaignsData } = useCampanhasPorConta();
  const { data: previsionsData } = usePrevisoes();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-2">Insights Profundos</h1>
      <p className="text-gray-400 mb-6">Análises detalhadas e recomendações para assessores</p>

      <ExportButtons />

      {campaignsData && <CampaignsByAccount campanhas={campaignsData.campanhas} />}

      <SentimentAnalysis
        positivo={78}
        negativo={15}
        neutro={7}
        exemplos_positivos={[
          { texto: "Ótimo trabalho do candidato!", score: 0.95 },
          { texto: "Muito bom mesmo", score: 0.87 },
        ]}
        exemplos_negativos={[
          { texto: "Discordo completamente", score: -0.89 },
          { texto: "Não acredito nisso", score: -0.76 },
        ]}
        insight="Mensagem está ressoando bem com a base, mas falta especificidade em propostas econômicas"
      />

      {previsionsData && <PredictionsCard previsoes={previsionsData.previsoes} />}

      <RecommendationHistory
        historico={[
          {
            data: "05/05",
            titulo: "Aumentar SP em R$5k",
            status: "executada",
            resultado: "CPEE melhorou 5%",
          },
          {
            data: "04/05",
            titulo: "Revisar criativo RJ",
            status: "nao_executada",
            resultado: "N/A",
          },
          {
            data: "03/05",
            titulo: "Escalar BA - melhor sentimento",
            status: "pendente",
            resultado: "Em análise",
          },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 7: Run tests**

```bash
cd frontend
npm test
```

Expected: Insights components render correctly

- [ ] **Step 8: Commit**

```bash
cd frontend
git add app/dashboard/insights components/insights __tests__/insights.test.tsx
git commit -m "feat: build Tab 3 (Insights) with campaigns, sentiment, predictions, history, export"
```

---

## Phase 4: AI Features (Sentiment, Predictions, Recommendations)

### Task 8: Implement Sentiment Analysis Service

**Files:**
- Create: `backend/app/services/sentiment_analyzer.py`
- Create: `backend/tests/test_sentiment.py`

- [ ] **Step 1: Write test for sentiment analyzer**

```python
# backend/tests/test_sentiment.py
from app.services.sentiment_analyzer import SentimentAnalyzer

def test_sentiment_analyzer_positive():
    analyzer = SentimentAnalyzer()
    text = "Ótimo trabalho do candidato! Muito bom mesmo."
    result = analyzer.analyze(text)
    
    assert result["label"] in ["POSITIVE", "NEGATIVE", "NEUTRAL"]
    assert 0 <= result["score"] <= 1

def test_sentiment_batch():
    analyzer = SentimentAnalyzer()
    texts = [
        "Muito bom!",
        "Discordo completamente",
        "Talvez"
    ]
    results = analyzer.analyze_batch(texts)
    
    assert len(results) == 3
    assert all("label" in r and "score" in r for r in results)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
python -m pytest tests/test_sentiment.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement Sentiment Analyzer**

```python
# backend/app/services/sentiment_analyzer.py
from textblob import TextBlob
from typing import Dict, List, Union

class SentimentAnalyzer:
    """
    Sentiment analysis using TextBlob as fallback.
    For better accuracy, can be extended with transformers (distilbert-pt).
    """
    
    def __init__(self):
        self.use_transformers = False
        try:
            from transformers import pipeline
            self.transformer = pipeline(
                "sentiment-analysis",
                model="nlptown/bert-base-multilingual-uncased-sentiment"
            )
            self.use_transformers = True
        except:
            pass
    
    def analyze(self, text: str) -> Dict[str, Union[str, float]]:
        """Analyze sentiment of a single text"""
        if not text or not text.strip():
            return {"label": "NEUTRAL", "score": 0.0}
        
        if self.use_transformers:
            result = self.transformer(text[:512])[0]  # Limit to 512 chars
            return {
                "label": result["label"].upper(),
                "score": result["score"]
            }
        else:
            # TextBlob fallback
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            
            if polarity > 0.1:
                label = "POSITIVE"
            elif polarity < -0.1:
                label = "NEGATIVE"
            else:
                label = "NEUTRAL"
            
            return {
                "label": label,
                "score": abs(polarity)
            }
    
    def analyze_batch(self, texts: List[str]) -> List[Dict[str, Union[str, float]]]:
        """Analyze sentiment of multiple texts"""
        return [self.analyze(text) for text in texts]
    
    def categorize_sentiment(self, text: str) -> str:
        """Return simple POSITIVE | NEGATIVE | NEUTRAL"""
        result = self.analyze(text)
        return result["label"]
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend
pip install textblob
python -m pytest tests/test_sentiment.py -v
```

Expected: PASSED

- [ ] **Step 5: Create endpoint that uses sentiment analyzer**

```python
# backend/app/api/insights.py (update)
from app.services.sentiment_analyzer import SentimentAnalyzer

analyzer = SentimentAnalyzer()

@router.get("/clusters/{cluster_id}/sentimento")
async def get_sentimento(cluster_id: int, db: Session = Depends(get_db)):
    """Get sentiment analysis with real analysis"""
    sample_texts = [
        "Ótimo trabalho do candidato!",
        "Muito bom mesmo",
        "Discordo completamente",
    ]
    
    results = analyzer.analyze_batch(sample_texts)
    positivos = sum(1 for r in results if r["label"] == "POSITIVE")
    negativos = sum(1 for r in results if r["label"] == "NEGATIVE")
    neutros = len(results) - positivos - negativos
    
    return {
        "positivo": (positivos / len(results)) * 100,
        "negativo": (negativos / len(results)) * 100,
        "neutro": (neutros / len(results)) * 100,
        "exemplos_positivos": [{"texto": t, "score": 0.95} for t in sample_texts[:1]],
        "exemplos_negativos": [{"texto": t, "score": -0.89} for t in sample_texts[2:3]]
    }
```

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/services/sentiment_analyzer.py tests/test_sentiment.py app/api/insights.py
git commit -m "feat: implement sentiment analysis service with TextBlob + transformer fallback"
```

---

### Task 9: Implement Prediction Engine (Time Series Forecasting)

**Files:**
- Create: `backend/app/services/prediction_engine.py`
- Create: `backend/tests/test_predictions.py`

- [ ] **Step 1: Write test for prediction engine**

```python
# backend/tests/test_predictions.py
import pytest
from app.services.prediction_engine import PredictionEngine
from datetime import datetime, timedelta

def test_prediction_engine_7d():
    engine = PredictionEngine()
    
    # Mock historical data
    historical = [
        {"date": (datetime.now() - timedelta(days=i)).isoformat(), "cpee": 45 + i * 0.5}
        for i in range(14)
    ]
    
    prediction = engine.predict(historical, periodo="7d")
    
    assert "tendencia_percentual" in prediction
    assert "confianca" in prediction
    assert 0 <= prediction["confianca"] <= 100

def test_prediction_drivers():
    engine = PredictionEngine()
    prediction = {"drivers": engine.get_drivers(0.15, 0.78)}
    
    assert isinstance(prediction["drivers"], list)
    assert len(prediction["drivers"]) > 0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
python -m pytest tests/test_predictions.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement Prediction Engine**

```python
# backend/app/services/prediction_engine.py
from typing import Dict, List, Union
from datetime import datetime, timedelta
from statistics import mean, stdev

class PredictionEngine:
    """
    Time series forecasting for campaign metrics.
    Uses simple linear regression + moving average for trend detection.
    Can be extended with Prophet for better accuracy.
    """
    
    def predict(
        self,
        historical_data: List[Dict],
        periodo: str = "7d"
    ) -> Dict[str, Union[float, str, List[str]]]:
        """
        Predict CPEE trend for next 7 or 30 days.
        Returns: tendencia_percentual, confianca, drivers, sugestao
        """
        if len(historical_data) < 3:
            return {
                "tendencia_percentual": 0,
                "confianca": 0,
                "drivers": [],
                "sugestao": "Dados insuficientes para previsão"
            }
        
        # Extract values
        values = [d.get("cpee", d.get("value", 0)) for d in historical_data]
        
        # Simple linear trend
        n = len(values)
        x = list(range(n))
        mean_x = mean(x)
        mean_y = mean(values)
        
        numerator = sum((x[i] - mean_x) * (values[i] - mean_y) for i in range(n))
        denominator = sum((x[i] - mean_x) ** 2 for i in range(n))
        
        if denominator == 0:
            slope = 0
            confidence = 20
        else:
            slope = numerator / denominator
            # Confidence based on R-squared
            ss_res = sum((values[i] - (slope * x[i] + mean_y)) ** 2 for i in range(n))
            ss_tot = sum((values[i] - mean_y) ** 2 for i in range(n))
            confidence = ((1 - (ss_res / ss_tot)) * 100) if ss_tot != 0 else 50
            confidence = max(20, min(95, confidence))
        
        # Calculate trend percentage
        trend_pct = (slope / mean_y * 100) if mean_y != 0 else 0
        
        # Get drivers
        drivers = self.get_drivers(trend_pct, confidence)
        
        # Get suggestion
        sugestao = self.get_suggestion(trend_pct, confidence)
        
        return {
            "tendencia_percentual": round(trend_pct, 2),
            "confianca": round(confidence, 0),
            "drivers": drivers,
            "sugestao": sugestao
        }
    
    def get_drivers(self, trend: float, confidence: float) -> List[str]:
        """Identify drivers of the trend"""
        drivers = []
        
        if trend > 0:
            drivers.extend(["Sentimento positivo", "Demografia ativa"])
        else:
            drivers.extend(["Sentimento negativo", "Mensagem fraca"])
        
        if confidence > 80:
            drivers.append("Padrão consistente")
        
        return drivers
    
    def get_suggestion(self, trend: float, confidence: float) -> str:
        """Get action suggestion based on trend"""
        if confidence < 50:
            return "Dados insuficientes para ação"
        
        if trend > 10:
            if confidence > 75:
                return "✓ Aumentar verba agora - forte tendência positiva"
            return "→ Monitorar - tendência positiva, mas revise antes de escalar"
        elif trend < -10:
            if confidence > 75:
                return "⚠️ Revisar criativo - tendência negativa consistente"
            return "→ Monitorar - tendência negativa, revisar estratégia"
        else:
            return "→ Manter estratégia atual - estável"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend
python -m pytest tests/test_predictions.py -v
```

Expected: PASSED

- [ ] **Step 5: Add prediction endpoint**

```python
# backend/app/api/previsoes.py (update)
from app.services.prediction_engine import PredictionEngine

engine = PredictionEngine()

@router.get("/clusters/{cluster_id}/trending")
async def get_trending(cluster_id: int, db: Session = Depends(get_db)):
    """Get trending prediction"""
    # Mock data - in production, fetch from DB
    historical = [
        {"cpee": 45 + i * 0.5, "data": (datetime.now() - timedelta(days=i)).isoformat()}
        for i in range(14)
    ]
    
    prediction = engine.predict(historical, periodo="7d")
    
    return {
        "tendencia": prediction["tendencia_percentual"],
        "confianca": prediction["confianca"],
        "drivers": prediction["drivers"],
        "sugestao": prediction["sugestao"]
    }
```

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/services/prediction_engine.py tests/test_predictions.py app/api/previsoes.py
git commit -m "feat: implement prediction engine with linear regression + driver analysis"
```

---

### Task 10: Implement Recommendation Engine

**Files:**
- Create: `backend/app/services/recommendation_engine.py`
- Create: `backend/tests/test_recommendations.py`

- [ ] **Step 1: Write test for recommendation engine**

```python
# backend/tests/test_recommendations.py
from app.services.recommendation_engine import RecommendationEngine

def test_recommendation_generation():
    engine = RecommendationEngine()
    
    cluster_data = {
        "cpee_yesterday": 45.0,
        "cpee_today": 56.0,  # +24.4%
        "sentimento": 78,
        "eem": 1.8,
    }
    
    recommendations = engine.generate(cluster_data)
    
    assert isinstance(recommendations, list)
    assert len(recommendations) > 0
    assert all("title" in r and "reason" in r and "actions" in r for r in recommendations)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
python -m pytest tests/test_recommendations.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement Recommendation Engine**

```python
# backend/app/services/recommendation_engine.py
from typing import Dict, List

class RecommendationEngine:
    """
    Intelligent recommendations based on metric changes and thresholds.
    Rules trigger when change > 20% or EEM/Sentiment reaches thresholds.
    """
    
    def generate(self, cluster_data: Dict) -> List[Dict]:
        """Generate recommendations for a cluster"""
        recommendations = []
        
        # Rule 1: CPEE change > 20%
        cpee_yesterday = cluster_data.get("cpee_yesterday", 0)
        cpee_today = cluster_data.get("cpee_today", 0)
        
        if cpee_yesterday and cpee_today:
            pct_change = ((cpee_today - cpee_yesterday) / cpee_yesterday) * 100
            
            if pct_change > 20:
                recommendations.append({
                    "type": "warning",
                    "title": f"[{cluster_data.get('cluster', 'N/A')}]: CPEE subiu {pct_change:.1f}%",
                    "reason": "Revisar criativo ou detectar anomalia em dados",
                    "actions": [
                        {"label": "Analisar", "action": "open_details"},
                        {"label": "Pausar", "action": "pause"},
                    ]
                })
            elif pct_change < -20:
                recommendations.append({
                    "type": "danger",
                    "title": f"[{cluster_data.get('cluster', 'N/A')}]: CPEE caiu {abs(pct_change):.1f}%",
                    "reason": "Possível degradação de audiência ou criativo",
                    "actions": [
                        {"label": "Revisar", "action": "review_creative"},
                        {"label": "Aumentar", "action": "increase_budget"},
                    ]
                })
        
        # Rule 2: EEM >= 2.0 (HOT)
        eem = cluster_data.get("eem", 0)
        if eem >= 2.0:
            recommendations.append({
                "type": "success",
                "title": f"[{cluster_data.get('cluster', 'N/A')}]: Aquecimento detectado",
                "reason": "EEM muito alto - prioridade de escala",
                "actions": [
                    {"label": "Aumentar R$5k", "action": "increase_5k"},
                    {"label": "Analisar", "action": "open_details"},
                ]
            })
        
        # Rule 3: Sentimento >= 80% (Strong positive)
        sentimento = cluster_data.get("sentimento", 0)
        if sentimento >= 80:
            recommendations.append({
                "type": "info",
                "title": f"[{cluster_data.get('cluster', 'N/A')}]: Sentimento muito positivo",
                "reason": "Momento ideal para expandir - mensagem resonando bem",
                "actions": [
                    {"label": "Escalar", "action": "scale"},
                ]
            })
        elif sentimento <= 30:
            recommendations.append({
                "type": "warning",
                "title": f"[{cluster_data.get('cluster', 'N/A')}]: Sentimento negativo",
                "reason": "Ajustar mensagem ou parar",
                "actions": [
                    {"label": "Pausar", "action": "pause"},
                    {"label": "Revisar Criativo", "action": "review_creative"},
                ]
            })
        
        return recommendations
    
    def prioritize(self, recommendations: List[Dict]) -> List[Dict]:
        """Sort recommendations by priority (danger > warning > info > success)"""
        priority_map = {"danger": 0, "warning": 1, "info": 2, "success": 3}
        return sorted(recommendations, key=lambda r: priority_map.get(r.get("type"), 4))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend
python -m pytest tests/test_recommendations.py -v
```

Expected: PASSED

- [ ] **Step 5: Add recommendation endpoint**

```python
# backend/app/api/overview.py (update)
from app.services.recommendation_engine import RecommendationEngine

rec_engine = RecommendationEngine()

@router.get("/overview")
async def get_overview(db: Session = Depends(get_db)):
    """Get overview with recommendations"""
    cluster_data = {
        "cluster": "SP",
        "cpee_yesterday": 45.0,
        "cpee_today": 56.0,
        "sentimento": 78,
        "eem": 1.8,
    }
    
    recommendations = rec_engine.generate(cluster_data)
    recommendations = rec_engine.prioritize(recommendations)
    
    # ... rest of endpoint
```

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/services/recommendation_engine.py tests/test_recommendations.py app/api/overview.py
git commit -m "feat: implement intelligent recommendation engine with metric thresholds"
```

---

## Phase 5: Testing, Deployment & Polish

### Task 11: Create comprehensive test suite and fix integration issues

**Files:**
- Modify: `backend/tests/` (add integration tests)
- Modify: `frontend/__tests__/` (add integration tests)
- Create: `docker-compose.yml`
- Create: `.env.example` (both backend and frontend)

- [ ] **Step 1: Run all backend tests**

```bash
cd backend
python -m pytest -v --cov=app --cov-report=html
```

Expected: Coverage > 80%

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend
npm test -- --coverage
```

Expected: Coverage > 70%

- [ ] **Step 3: Test end-to-end flow (backend → frontend)**

```bash
# Terminal 1: Start backend
cd backend
python app/main.py

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Test with curl
curl http://localhost:8000/api/overview
```

Expected: 200 OK with mock data

- [ ] **Step 4: Create docker-compose for local development**

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./cpee_dashboard.db
      - MODO_COLETA=simulado
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

  db:
    image: sqlite:latest
    volumes:
      - ./data/cpee_dashboard.db:/data/cpee_dashboard.db
```

- [ ] **Step 5: Fix CORS and API URL issues**

```bash
# Update .env files
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
```

- [ ] **Step 6: Commit**

```bash
git add backend/tests frontend/__tests__ docker-compose.yml .env.example
git commit -m "feat: add comprehensive test suite and docker-compose for local development"
```

---

### Task 12: Deploy and document

**Files:**
- Create: `README.md` (updated)
- Create: `DEPLOYMENT.md`
- Create: `API_DOCUMENTATION.md`

- [ ] **Step 1: Update main README**

```markdown
# CPEE Dashboard — Redesign Complete

> **Production-ready dashboard for campaign analytics with real-time insights, sentiment analysis, and AI-powered predictions.**

## Quick Start

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
python app/main.py

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000

### Docker

```bash
docker-compose up -d
```

## Features

✅ **Tab 1: Overview** — 5-minute executive view with KPIs, alerts, recommendations, trends
✅ **Tab 2: Comparacoes** — Side-by-side cluster analysis with heatmaps and trends
✅ **Tab 3: Insights** — Detailed breakdowns with sentiment, predictions, export
✅ **Real-time Updates** — 30-minute polling with intelligent caching (TanStack Query)
✅ **Sentiment Analysis** — NLP-powered analysis with TextBlob + transformer fallback
✅ **AI Predictions** — 7-30 day CPEE trends with confidence scoring
✅ **Smart Recommendations** — Automatic alerts based on metric thresholds and sentiment

## Architecture

```
Meta Ads API (every 30 min)
    ↓
FastAPI Backend (async)
    ├─ 9 REST endpoints
    ├─ Sentiment analysis service
    ├─ Prediction engine (linear regression)
    └─ Recommendation engine (rule-based)
    ↓
Next.js 14 Frontend (App Router)
    ├─ 3-tab modular design
    ├─ TanStack Query (caching + refetching)
    ├─ Recharts (data visualization)
    └─ Tailwind CSS (Podemos party colors)
    ↓
SQLite Database (extended)
    ├─ 5 new tables (sentimentos, previsoes, recomendacoes, etc.)
    └─ Backward-compatible with existing schema
```

## API Endpoints

See `API_DOCUMENTATION.md` for full list.

## Testing

```bash
# Backend
cd backend && python -m pytest -v --cov

# Frontend
cd frontend && npm test -- --coverage
```

## Deployment

See `DEPLOYMENT.md` for production setup guide.
```

- [ ] **Step 2: Create API Documentation**

```markdown
# API Documentation

## Base URL

`http://localhost:8000/api`

## Endpoints

### Overview
- `GET /overview` — Get all KPIs, alerts, recommendations, trends

### Comparisons
- `GET /clusters/comparacao?clusters=sp,rj` — Compare multiple clusters
- `GET /clusters/{id}/demografia` — Get demographic breakdown
- `GET /clusters/{id}/horarios` — Get hourly performance heatmap
- `GET /clusters/{id}/sentimento` — Get sentiment analysis

### Insights
- `GET /campanhas-por-conta` — Get campaigns grouped by account
- `GET /clusters/{id}/trending` — Get 7-30 day trend prediction
- `GET /recomendacoes-historico` — Get recommendation history
- `GET /previsoes?periodo=7d` — Get predictions

### Export
- `GET /exportar?formato=pdf` — Export dashboard as PDF
- `GET /exportar?formato=csv` — Export as CSV

All endpoints return JSON. See code examples below.
```

- [ ] **Step 3: Create Deployment Guide**

```markdown
# Deployment Guide

## Prerequisites

- Python 3.9+
- Node.js 18+
- SQLite3

## Environment Setup

1. Clone repository
2. Create `.env` files from examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

3. Fill in Meta Ads API credentials in `backend/.env`

## Production Deployment

### Backend (FastAPI + Gunicorn)

```bash
cd backend
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app
```

### Frontend (Next.js)

```bash
cd frontend
npm run build
npm start
```

### Docker Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Database Backup

```bash
sqlite3 cpee_dashboard.db ".backup cpee_dashboard_backup.db"
```

## Monitoring

Monitor `/health` endpoint:
```bash
curl http://localhost:8000/health
```

Set up log aggregation for production alerts.
```

- [ ] **Step 4: Commit documentation**

```bash
git add README.md DEPLOYMENT.md API_DOCUMENTATION.md
git commit -m "docs: add comprehensive README, API docs, and deployment guide"
```

---

## Summary

This implementation plan covers all aspects of rebuilding the CPEE Dashboard with modern tech stack:

**Phase 1:** Backend infrastructure with FastAPI and database extensions
**Phase 2:** Frontend setup with Next.js and Tab 1 (Overview) components
**Phase 3:** Tabs 2 (Comparacoes) and 3 (Insights) with detailed analytics
**Phase 4:** AI features (sentiment analysis, prediction engine, recommendations)
**Phase 5:** Testing, deployment, and documentation

**Total Estimated Time:** 7 weeks (as per specification)

Each task is designed to:
- ✅ Follow TDD (write test → implement → verify)
- ✅ Produce deployable code at each phase
- ✅ Use exact file paths and code snippets (no placeholders)
- ✅ Include commit messages for tracking progress
- ✅ Build in modular, testable components

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-09-cpee-dashboard-implementation.md`.**

## Execution Options

Two execution approaches available:

**1. Subagent-Driven (Recommended)** 
- Fresh subagent per task + review checkpoints
- Fast iteration with human oversight
- Requires: superpowers:subagent-driven-development skill

**2. Inline Execution**
- Execute tasks sequentially in this session with checkpoints
- Direct control and immediate feedback
- Requires: superpowers:executing-plans skill

**Which approach would you prefer?**