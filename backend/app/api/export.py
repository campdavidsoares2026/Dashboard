from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from collections import defaultdict
from datetime import datetime, timedelta
from app.models.database import get_db
from app.models.models import CampaignData
from app.dependencies.auth import verify_api_key
from app.dependencies.rate_limit import rate_limit
import logging

_PERIODO_DAYS = {"7d": 7, "14d": 14, "30d": 30, "60d": 60, "90d": 90}

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/export", tags=["export"])


def _temperatura(cpee: float, median: float) -> str:
    if cpee < median * 0.9:
        return "quente"
    if cpee > median * 1.1:
        return "frio"
    return "morno"


@router.get("/municipios-cpee")
async def get_municipios_cpee(
    request: Request,
    periodo: str = Query("30d", pattern="^(7d|14d|30d|60d|90d)$"),
    cluster_id: int = Query(None),
    uf: str = Query(None),
    db: Session = Depends(get_db),
    _auth=Depends(verify_api_key),
    _rate=Depends(rate_limit),
):
    # Data model limitations (no account→municipality mapping table yet):
    # - 'municipio' field uses account_id as proxy (no geo mapping)
    # - 'uf' and 'cluster_id' query params are not filterable in DB
    # - 'eleitores' and 'eq' default to 0 (no electoral data linked)
    # These will be resolved when a mapping table is added.
    days = _PERIODO_DAYS[periodo]
    cutoff = datetime.now() - timedelta(days=days)
    campaigns = db.query(CampaignData).filter(
        CampaignData.date_fetched >= cutoff,
        CampaignData.uf == 'SP'
    ).all()

    groups: dict = defaultdict(list)
    for c in campaigns:
        groups[c.account_id].append(c)

    municipios = []
    for account_id, camp_list in groups.items():
        total_spend = sum(c.spend for c in camp_list)
        total_clicks = sum(c.clicks for c in camp_list)
        total_impressions = sum(c.impressions for c in camp_list)
        total_leads = sum(c.leads for c in camp_list)
        avg_freq = sum(c.frequency for c in camp_list) / len(camp_list)

        cpee = round(total_spend / total_clicks, 2) if total_clicks > 0 else 0.0
        ctr = round(total_clicks / total_impressions * 100, 2) if total_impressions > 0 else 0.0
        top_campaign = max(camp_list, key=lambda c: c.spend)

        municipios.append({
            "municipio": account_id,
            "uf": "SP",
            "eleitores": 0,
            "cluster_id": cluster_id or 0,
            "cluster_nome": "Padrão",
            "cluster_cpee": cpee,
            "cluster_temperatura": "morno",
            "cpee": cpee,
            "engaj": total_clicks,
            "eq": 0,
            "spend": round(total_spend, 2),
            "clicks": total_clicks,
            "impressions": total_impressions,
            "leads": total_leads,
            "ctr": ctr,
            "cpc": cpee,  # same formula as cpee (spend/clicks) in this model
            "frequency": round(avg_freq, 2),
            "top_campanha": top_campaign.campaign_name,
            "contas_ads": [account_id],
        })

    all_cpees = [m["cpee"] for m in municipios if m["cpee"] > 0]
    if all_cpees:
        sorted_cpees = sorted(all_cpees)
        mid = len(sorted_cpees) // 2
        if len(sorted_cpees) % 2 == 0:
            median = (sorted_cpees[mid - 1] + sorted_cpees[mid]) / 2
        else:
            median = sorted_cpees[mid]
        for m in municipios:
            m["cluster_temperatura"] = _temperatura(m["cpee"], median)
            m["cluster_cpee"] = round(median, 2)

    logger.info("Export request: periodo=%s, total=%d", periodo, len(municipios))
    return {
        "periodo": periodo,
        "data_atualizacao": datetime.now().isoformat(),
        "total_municipios": len(municipios),
        "municipios": municipios,
    }
