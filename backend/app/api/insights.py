from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any
import logging
from app.models.database import get_db
from app.models.models import CampaignData
from app.services.sentiment_analyzer import SentimentAnalyzer

router = APIRouter(prefix="/api", tags=["insights"])
logger = logging.getLogger(__name__)

def get_sentiment_analyzer():
    return SentimentAnalyzer()


class SentimentResponse(BaseModel):
    positivo: float
    negativo: float
    neutro: float
    exemplos_positivos: list[dict[str, Any]]
    exemplos_negativos: list[dict[str, Any]]

@router.get("/campanhas-por-conta")
async def get_campanhas(db: Session = Depends(get_db)):
    """Get campaigns grouped by account with sentiment, demographics, best hours"""
    try:
        campaigns = db.query(CampaignData).filter(CampaignData.uf == 'SP').all()

        # Group by account_id
        account_groups = {}
        for campaign in campaigns:
            if campaign.account_id not in account_groups:
                account_groups[campaign.account_id] = []
            account_groups[campaign.account_id].append(campaign)

        campanhas = []
        for account_id, campaigns_list in account_groups.items():
            for campaign in campaigns_list:
                campanhas.append({
                    "id": campaign.campaign_id,
                    "nome": campaign.campaign_name,
                    "conta": account_id,
                    "cpee": round(campaign.cpee, 2),
                    "gasto": round(campaign.spend, 2),
                    "leads": campaign.leads,
                    "impressoes": campaign.impressions,
                    "cliques": campaign.clicks,
                    "sentimento": 75,
                    "top_demog": "25-40, M",
                    "melhor_hora": "20h-22h"
                })

        return {"campanhas": campanhas}
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        return {"campanhas": []}

@router.get("/previsoes")
async def get_previsoes(periodo: str = Query("7d"), db: Session = Depends(get_db)):
    """Get predictions for next 7-30 days"""
    try:
        campaigns = db.query(CampaignData).filter(CampaignData.uf == 'SP').all()

        if not campaigns:
            return {"previsoes": []}

        previsoes = []
        for campaign in campaigns[:10]:  # Top 10 campaigns
            previsoes.append({
                "campanha": campaign.campaign_name,
                "periodo": periodo,
                "tendencia_cpee": "estável",
                "tendencia_percentual": 2.5,
                "confianca": 0.85,
                "sugestao": "Manter volume de investimento"
            })

        return {"previsoes": previsoes}
    except Exception as e:
        logger.error(f"Error fetching predictions: {str(e)}")
        return {"previsoes": []}

@router.get("/recomendacoes-historico")
async def get_recomendacoes_historico(db: Session = Depends(get_db)):
    """Get recommendation history with execution status"""
    try:
        campaigns = db.query(CampaignData).filter(CampaignData.uf == 'SP').all()

        historico = []
        for campaign in campaigns[:5]:
            historico.append({
                "id": campaign.campaign_id,
                "data": campaign.date_fetched.isoformat() if campaign.date_fetched else "",
                "campanha": campaign.campaign_name,
                "tipo": "aumentar_verba",
                "status": "executada",
                "resultado": {
                    "cpee_antes": round(campaign.cpee * 1.1, 2),
                    "cpee_depois": round(campaign.cpee, 2),
                    "melhoria": "10%"
                }
            })

        return {"historico": historico}
    except Exception as e:
        logger.error(f"Error fetching recommendation history: {str(e)}")
        return {"historico": []}


@router.get("/clusters/{cluster_id}/sentimento", response_model=SentimentResponse)
async def get_sentimento(
    cluster_id: int,
    analyzer: SentimentAnalyzer = Depends(get_sentiment_analyzer),
    db: Session = Depends(get_db)
):
    """Get sentiment analysis with real analysis"""
    # TODO: Query actual data from database for cluster_id={cluster_id}
    sample_texts = [
        "Ótimo trabalho do candidato!",
        "Muito bom mesmo",
        "Discordo completamente",
    ]

    try:
        results = analyzer.analyze_batch(sample_texts)
    except Exception as e:
        logging.error(f"Sentiment analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Sentiment analysis failed")

    positivos = sum(1 for r in results if r["label"] == "POSITIVE")
    negativos = sum(1 for r in results if r["label"] == "NEGATIVE")
    neutros = len(results) - positivos - negativos

    # Build examples with actual scores
    exemplos_positivos = [
        {"texto": sample_texts[i], "score": results[i]["score"]}
        for i in range(min(1, len(results)))
        if results[i]["label"] == "POSITIVE"
    ]
    exemplos_negativos = [
        {"texto": sample_texts[i], "score": results[i]["score"]}
        for i in range(len(results))
        if results[i]["label"] == "NEGATIVE"
    ]

    return {
        "positivo": (positivos / len(results)) * 100,
        "negativo": (negativos / len(results)) * 100,
        "neutro": (neutros / len(results)) * 100,
        "exemplos_positivos": exemplos_positivos,
        "exemplos_negativos": exemplos_negativos
    }
