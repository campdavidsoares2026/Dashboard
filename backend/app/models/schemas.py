from pydantic import BaseModel, field_validator
from datetime import datetime, date
from typing import Optional, List, Any
import json


# ============ Overview ============

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


# ============ Sentiment ============

class SentimentExample(BaseModel):
    texto: str
    score: float


class SentimentResponse(BaseModel):
    positivo: int
    negativo: int
    neutro: int
    exemplos_positivos: List[SentimentExample] = []
    exemplos_negativos: List[SentimentExample] = []

    @field_validator('exemplos_positivos', 'exemplos_negativos', mode='before')
    @classmethod
    def parse_json_lists(cls, v: Any) -> List[dict]:
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v) if v else []
            except json.JSONDecodeError:
                return []
        if isinstance(v, list):
            return v
        return []


# ============ Predictions ============

class Prediction(BaseModel):
    cluster: str
    periodo: str  # "7dias", "30dias"
    tendencia_percentual: float
    confianca: float
    drivers: List[str] = []
    sugestao: str

    @field_validator('drivers', mode='before')
    @classmethod
    def parse_drivers_json(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v) if v else []
            except json.JSONDecodeError:
                return []
        if isinstance(v, dict):
            return list(v.values()) if isinstance(list(v.values())[0], str) else []
        if isinstance(v, list):
            return v
        return []


# ============ Recommendations ============

class RecommendationResponse(BaseModel):
    id: int
    cluster: str
    tipo: str
    descricao: str
    status: str
    resultado: Optional[dict] = None
    data_criacao: date
    data_execucao: Optional[date] = None

    @field_validator('resultado', mode='before')
    @classmethod
    def parse_resultado_json(cls, v: Any) -> Optional[dict]:
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v) if v else None
            except json.JSONDecodeError:
                return None
        if isinstance(v, dict):
            return v
        return None


# ============ Comparisons ============

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


# ============ Demographics ============

class DemographicBreakdown(BaseModel):
    faixa_etaria: dict  # {"18-25": 0.15, "25-40": 0.35, ...}
    genero: dict  # {"M": 0.55, "F": 0.45}
    interesses: List[dict]  # [{"interest": "...", "percentual": 0.10}]


# ============ Horários ============

class HorarioPerformance(BaseModel):
    hora: int
    ctr: float
    engajamento: int
    impressoes: int


class HorarioResponse(BaseModel):
    heatmap: List[List[dict]]
    melhor_hora: str
    pior_hora: str
