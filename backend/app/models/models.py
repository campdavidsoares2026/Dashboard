from sqlalchemy import Column, Integer, String, Float, Date, Text, DateTime, ForeignKey, JSON, Enum
from datetime import datetime
from enum import Enum as PyEnum
from app.models.database import Base


# ============ Enums ============

class PeriodoEnum(PyEnum):
    SETE_DIAS = "7dias"
    TRINTA_DIAS = "30dias"


class TipoRecomendacaoEnum(PyEnum):
    AUMENTAR_VERBA = "aumentar_verba"
    REVISAR_CRIATIVO = "revisar_criativo"
    TESTAR_NOVO_CRIATIVO = "testar_novo_criativo"


class StatusRecomendacaoEnum(PyEnum):
    PENDENTE = "pendente"
    EXECUTADA = "executada"
    IGNORADA = "ignorada"


# ============ Base Tables ============

class Municipio(Base):
    __tablename__ = "municipios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), unique=True, nullable=False)
    uf = Column(String(2), nullable=False)
    eleitores = Column(Integer, nullable=False)
    regiao = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)


class Campanha(Base):
    __tablename__ = "campanhas"

    id = Column(Integer, primary_key=True, index=True)
    municipio_id = Column(Integer, ForeignKey("municipios.id"), nullable=False)
    nome = Column(String(255), nullable=False)
    data_inicio = Column(Date, nullable=False)
    data_fim = Column(Date, nullable=False)
    orcamento = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Metrica(Base):
    __tablename__ = "metricas"

    id = Column(Integer, primary_key=True, index=True)
    campanha_id = Column(Integer, ForeignKey("campanhas.id"), nullable=False)
    data = Column(Date, nullable=False)
    impressoes = Column(Integer, default=0)
    engajamento = Column(Integer, default=0)
    gasto = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


# ============ Analytics Models ============


class Sentimento(Base):
    __tablename__ = "sentimentos"

    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer, ForeignKey("municipios.id"), nullable=False)
    data = Column(Date)
    positivo = Column(Integer)
    negativo = Column(Integer)
    neutro = Column(Integer)
    exemplos_positivos = Column(JSON, default=list)
    exemplos_negativos = Column(JSON, default=list)


class Previsao(Base):
    __tablename__ = "previsoes"

    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer, ForeignKey("municipios.id"), nullable=False)
    data = Column(Date)
    periodo = Column(Enum(PeriodoEnum, native_enum=False), nullable=False)
    tendencia_percentual = Column(Float)
    confianca = Column(Float)
    drivers = Column(JSON, default=dict)
    sugestao = Column(String(500))


class Recomendacao(Base):
    __tablename__ = "recomendacoes"

    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer, ForeignKey("municipios.id"), nullable=False)
    data_criacao = Column(Date)
    tipo = Column(Enum(TipoRecomendacaoEnum, native_enum=False), nullable=False)
    descricao = Column(Text)
    status = Column(
        Enum(StatusRecomendacaoEnum, native_enum=False),
        nullable=False,
        default=StatusRecomendacaoEnum.PENDENTE.value
    )
    resultado = Column(JSON, nullable=True)
    data_execucao = Column(Date, nullable=True)


class DemografiaCluster(Base):
    __tablename__ = "demografia_cluster"

    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer, ForeignKey("municipios.id"), nullable=False)
    data = Column(Date)
    faixa_etaria = Column(String(20))  # "18-25", "25-40"
    genero = Column(String(1))  # "M", "F"
    interesse = Column(String(100))
    percentual = Column(Float)


class HorariosPerformance(Base):
    __tablename__ = "horarios_performance"

    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer, ForeignKey("municipios.id"), nullable=False)
    data = Column(Date)
    hora = Column(Integer)  # 0-23
    ctr = Column(Float)
    engajamento = Column(Integer)
    impressoes = Column(Integer)


class CampaignData(Base):
    __tablename__ = "campaign_data"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String(50), nullable=False)
    campaign_id = Column(String(100), unique=True, nullable=False)
    campaign_name = Column(String(255), nullable=False)
    uf = Column(String(2), default='SP', nullable=False)
    cpee = Column(Float, default=0.0)
    spend = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    leads = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)
    cpc = Column(Float, default=0.0)
    frequency = Column(Float, default=0.0)
    date_fetched = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
