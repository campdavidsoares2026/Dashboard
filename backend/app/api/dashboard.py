"""
Dashboard unified data endpoint
Maps SQLite schema to Supabase-compatible format
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models import engine
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def get_db():
    with engine.connect() as conn:
        yield conn


@router.get("/data")
async def get_dashboard_data(db: Session = Depends(get_db)):
    """
    Return all dashboard data in Supabase-compatible format
    Maps: campaign_data → metricas_conta (unique accounts)
          campaign_data → snapshots_diarios (aggregated by date)
          recomendacoes → recomendacoes (recommendations)
          campaign_data → criativos_performance (by campaign)
    """
    try:
        # ─── metricas_conta (unique accounts from campaign_data) ─────
        accounts_query = """
        SELECT DISTINCT
            account_id,
            'Brasil' as nome,
            uf as regiao,
            0 as meta_mensal,
            0 as budget_diario,
            (SELECT COUNT(DISTINCT campaign_id) FROM campaign_data cd WHERE cd.account_id = campaign_data.account_id) as campanhas_ativas
        FROM campaign_data
        ORDER BY account_id
        """
        accounts = [dict(row._mapping) for row in db.execute(text(accounts_query)).fetchall()]

        # ─── snapshots_diarios (from campaign_data aggregated by date) ─
        daily_query = """
        SELECT
            DATE(date_fetched) as data,
            account_id,
            uf as regiao,
            sum(COALESCE(spend, 0)) as spend,
            sum(COALESCE(impressions, 0)) as impressoes,
            0 as alcance,
            sum(COALESCE(clicks, 0)) as cliques,
            0 as eq,
            sum(COALESCE(leads, 0)) as leads,
            CASE WHEN sum(COALESCE(impressions, 0)) > 0 THEN cast(sum(COALESCE(clicks, 0)) as float) / sum(COALESCE(impressions, 0)) ELSE 0 END as ctr,
            CASE WHEN sum(COALESCE(clicks, 0)) > 0 THEN sum(COALESCE(spend, 0)) / sum(COALESCE(clicks, 0)) ELSE 0 END as cpc,
            CASE WHEN sum(COALESCE(impressions, 0)) > 0 THEN (sum(COALESCE(spend, 0)) * 1000) / sum(COALESCE(impressions, 0)) ELSE 0 END as cpm,
            CASE WHEN sum(COALESCE(leads, 0)) > 0 THEN sum(COALESCE(spend, 0)) / sum(COALESCE(leads, 0)) ELSE 0 END as cpl,
            avg(COALESCE(cpee, 0)) as cpee
        FROM campaign_data
        WHERE date_fetched IS NOT NULL
        GROUP BY DATE(date_fetched), account_id, uf
        ORDER BY data DESC
        LIMIT 90
        """
        daily = [dict(row._mapping) for row in db.execute(text(daily_query)).fetchall()]

        # ─── recomendacoes (from recomendacoes table, or empty if none) ─
        recs_query = """
        SELECT
            id,
            CASE
                WHEN tipo = 'QUENTE' THEN 'alta'
                WHEN tipo = 'MORNO' THEN 'media'
                WHEN tipo = 'FRIO' THEN 'baixa'
                ELSE 'media'
            END as severidade,
            'BR' as account_id,
            tipo as titulo,
            descricao,
            'Performance' as impacto_estimado,
            0.8 as confianca,
            data_criacao as criado_em
        FROM recomendacoes
        WHERE status != 'completada'
        ORDER BY data_criacao DESC
        LIMIT 20
        """
        try:
            recs = [dict(row._mapping) for row in db.execute(text(recs_query)).fetchall()]
        except Exception:
            recs = []  # Table may have stale schema; return empty until migration runs

        # ─── criativos_performance (from campaign_data per campaign) ────
        creatives_query = """
        SELECT
            campaign_id as id,
            campaign_name as nome,
            account_id,
            'static' as thumb,
            sum(COALESCE(spend, 0)) as spend,
            sum(COALESCE(leads, 0)) as leads,
            avg(COALESCE(cpee, 0)) as cpee,
            avg(COALESCE(ctr, 0)) as ctr,
            'stable' as status,
            NULL as image_url
        FROM campaign_data
        GROUP BY campaign_id, campaign_name, account_id
        ORDER BY spend DESC
        LIMIT 20
        """
        creatives = [dict(row._mapping) for row in db.execute(text(creatives_query)).fetchall()]

        # ─── clusters_performance (from campaign_data aggregated by UF) ──
        clusters_query = """
        SELECT
            ROW_NUMBER() OVER (ORDER BY uf) as id,
            uf as nome,
            'MORNO' as tipo,
            account_id,
            uf as regiao,
            avg(COALESCE(cpee, 0)) as cpee,
            sum(COALESCE(spend, 0)) as spend,
            0 as eq,
            sum(COALESCE(leads, 0)) as leads,
            avg(COALESCE(ctr, 0)) as ctr,
            sum(COALESCE(impressions, 0)) as alcance,
            'stable' as tendencia
        FROM campaign_data
        GROUP BY account_id, uf
        ORDER BY spend DESC
        LIMIT 20
        """
        clusters = [dict(row._mapping) for row in db.execute(text(clusters_query)).fetchall()]

        return {
            "accounts": accounts,
            "daily": daily,
            "recs": recs,
            "creatives": creatives,
            "clusters": clusters,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
