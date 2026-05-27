from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.schemas import OverviewResponse, KPICard, Alert
from app.models.models import CampaignData
from app.services.recommendation_engine import RecommendationEngine
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["overview"])


@router.get("/accounts")
async def get_accounts(db: Session = Depends(get_db)):
    """
    Get list of all available account IDs
    """
    try:
        accounts = db.query(CampaignData.account_id).distinct().order_by(CampaignData.account_id).all()
        account_list = [acc[0] for acc in accounts if acc[0]]
        return {"accounts": account_list}
    except Exception as e:
        logger.error(f"Error fetching accounts: {str(e)}")
        return {"accounts": []}


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    accounts: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get overview dashboard data from real campaign data:
    - KPI cards (CPEE, gasto, leads, etc.)
    - Intelligent alerts and recommendations
    - CPEE trend (7 days)
    - Budget breakdown
    - Top 5 clusters

    Query parameters:
    - accounts: comma-separated list of account IDs to filter (optional)
    - start_date: filter data from this date (YYYY-MM-DD format)
    - end_date: filter data until this date (YYYY-MM-DD format)
    """
    try:
        # Parse filter parameters
        account_list = [acc.strip() for acc in accounts.split(",")] if accounts else []

        # Parse dates - default to 7 days if not provided
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        else:
            end_dt = datetime.now()

        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        else:
            start_dt = end_dt - timedelta(days=7)

        # Build query with filters
        query = db.query(CampaignData).filter(CampaignData.uf == 'SP')

        if account_list:
            query = query.filter(CampaignData.account_id.in_(account_list))

        if start_date and end_date:
            query = query.filter(CampaignData.date_fetched >= start_dt).filter(CampaignData.date_fetched <= end_dt)

        campaigns = query.all()

        if not campaigns:
            return {
                "kpis": [],
                "alerts": [],
                "recommendations": [],
                "cpee_trend": [],
                "budget_breakdown": [],
                "top_clusters": []
            }

        # Calculate aggregated metrics
        total_spend = sum(c.spend for c in campaigns)
        total_impressions = sum(c.impressions for c in campaigns)
        total_clicks = sum(c.clicks for c in campaigns)
        total_leads = sum(c.leads for c in campaigns)

        # Calculate average CPEE
        avg_cpee = (total_spend / total_leads) if total_leads > 0 else 0

        # Group by campaign name (treating as "cluster")
        campaign_groups = {}
        for campaign in campaigns:
            name = campaign.campaign_name
            if name not in campaign_groups:
                campaign_groups[name] = []
            campaign_groups[name].append(campaign)

        # Create KPI cards
        kpis = [
            {
                "label": "CPEE Consolidado",
                "value": round(avg_cpee, 2),
                "unit": "R$",
                "trend": 0,
                "trend_direction": "down",
                "metadata": f"{len(campaigns)} campanhas"
            },
            {
                "label": "Gasto Total",
                "value": round(total_spend, 2),
                "unit": "R$",
                "trend": 0,
                "trend_direction": "up",
                "metadata": "30 dias"
            },
            {
                "label": "Leads Gerados",
                "value": total_leads,
                "unit": "leads",
                "trend": 0,
                "trend_direction": "up",
                "metadata": "30 dias"
            },
            {
                "label": "CTR Médio",
                "value": round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2),
                "unit": "%",
                "trend": 0,
                "trend_direction": "up",
                "metadata": "Taxa de clique"
            },
            {
                "label": "Impressões",
                "value": total_impressions,
                "unit": "impressões",
                "trend": 0,
                "trend_direction": "up",
                "metadata": "Alcance total"
            }
        ]

        # Create trend data (using available data)
        cpee_trend = [
            {
                "date": datetime.now().isoformat().split('T')[0],
                "value": round(avg_cpee, 2)
            }
        ]

        # Create budget breakdown
        budget_breakdown = []
        for campaign_name, campaigns_list in list(campaign_groups.items())[:7]:
            total = sum(c.spend for c in campaigns_list)
            budget_breakdown.append({
                "name": campaign_name[:30],  # Truncate long names
                "value": round(total, 2)
            })

        # Create top clusters (campaigns)
        top_clusters = []
        for campaign in sorted(campaigns, key=lambda c: c.cpee)[:5]:
            top_clusters.append({
                "cluster": campaign.campaign_name,
                "eem": round(campaign.frequency, 2),
                "cpee": round(campaign.cpee, 2),
                "gasto": round(campaign.spend, 2)
            })

        # Generate alerts and recommendations
        alerts = []
        recommendations = []

        rec_engine = RecommendationEngine()
        for campaign_name, campaigns_list in campaign_groups.items():
            cluster_spend = sum(c.spend for c in campaigns_list)
            cluster_leads = sum(c.leads for c in campaigns_list)
            cluster_cpee = (cluster_spend / cluster_leads) if cluster_leads > 0 else 0

            cluster_data = {
                "cluster": campaign_name,
                "cpee_change_percent": 0,
                "sentimento": 75,
                "eem": sum(c.frequency for c in campaigns_list) / len(campaigns_list),
                "gasto": cluster_spend,
                "leads": cluster_leads
            }

            recs = rec_engine.generate(cluster_data)
            for rec in recs:
                recommendations.append({
                    "id": str(uuid.uuid4()),
                    "cluster": campaign_name,
                    "type": rec.get("type", "info"),
                    "title": rec.get("title", ""),
                    "reason": rec.get("reason", ""),
                    "actions": rec.get("actions", []),
                    "sentiment": "75%"
                })

        return {
            "kpis": kpis,
            "alerts": alerts,
            "recommendations": recommendations[:5],  # Top 5 recommendations
            "cpee_trend": cpee_trend,
            "budget_breakdown": budget_breakdown,
            "top_clusters": top_clusters
        }

    except Exception as e:
        logger.error(f"Error fetching overview data: {str(e)}")
        return {
            "kpis": [],
            "alerts": [],
            "recommendations": [],
            "cpee_trend": [],
            "budget_breakdown": [],
            "top_clusters": []
        }


@router.get("/dashboard/export")
async def dashboard_export(
    accounts: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get dashboard data formatted for export (CSV, PDF, JSON)

    Returns snapshots, creatives, and clusters data for export functionality
    """
    try:
        # Parse filter parameters
        account_list = [acc.strip() for acc in accounts.split(",")] if accounts else []

        # Parse dates - default to 7 days if not provided
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        else:
            end_dt = datetime.now()

        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        else:
            start_dt = end_dt - timedelta(days=7)

        # Build base query
        base_query = db.query(CampaignData).filter(CampaignData.uf == 'SP')

        if account_list:
            base_query = base_query.filter(CampaignData.account_id.in_(account_list))

        if start_date and end_date:
            base_query = base_query.filter(CampaignData.date_fetched >= start_dt).filter(CampaignData.date_fetched <= end_dt)

        campaigns = base_query.all()

        if not campaigns:
            return {
                "accounts": account_list if account_list else [],
                "snapshots": [],
                "creatives": [],
                "clusters": []
            }

        # Prepare snapshots (daily aggregated data)
        snapshots_dict = {}
        for campaign in campaigns:
            date_key = campaign.date_fetched.strftime("%Y-%m-%d") if campaign.date_fetched else datetime.now().strftime("%Y-%m-%d")
            account_key = f"{date_key}_{campaign.account_id}"

            if account_key not in snapshots_dict:
                snapshots_dict[account_key] = {
                    "data": date_key,
                    "account_id": campaign.account_id,
                    "spend": 0,
                    "impressoes": 0,
                    "cliques": 0,
                    "leads": 0,
                    "cpee": 0,
                    "ctr": 0,
                    "cpc": 0,
                    "cpm": 0,
                    "cpl": 0,
                    "_count": 0,
                    "_lead_count": 0
                }

            snap = snapshots_dict[account_key]
            snap["spend"] += campaign.spend or 0
            snap["impressoes"] += campaign.impressions or 0
            snap["cliques"] += campaign.clicks or 0
            snap["leads"] += campaign.leads or 0
            snap["cpee"] += campaign.cpee or 0
            snap["_count"] += 1
            snap["_lead_count"] += campaign.leads or 0

        # Calculate averages and derived metrics
        snapshots = []
        for snap in snapshots_dict.values():
            if snap["_count"] > 0:
                snap["cpee"] = round(snap["cpee"] / snap["_count"], 2)
            if snap["impressoes"] > 0:
                snap["ctr"] = round((snap["cliques"] / snap["impressoes"]) * 100, 2)
                snap["cpm"] = round((snap["spend"] * 1000) / snap["impressoes"], 2)
            if snap["cliques"] > 0:
                snap["cpc"] = round(snap["spend"] / snap["cliques"], 2)
            if snap["_lead_count"] > 0:
                snap["cpl"] = round(snap["spend"] / snap["_lead_count"], 2)

            # Remove temporary fields
            del snap["_count"]
            del snap["_lead_count"]

            snapshots.append(snap)

        # Sort by date descending
        snapshots = sorted(snapshots, key=lambda x: x["data"], reverse=True)

        # Prepare creatives (by campaign)
        creatives_dict = {}
        for campaign in campaigns:
            camp_key = campaign.campaign_id or "unknown"
            if camp_key not in creatives_dict:
                creatives_dict[camp_key] = {
                    "id": campaign.campaign_id,
                    "nome": campaign.campaign_name,
                    "account_id": campaign.account_id,
                    "spend": 0,
                    "leads": 0,
                    "cpee": 0,
                    "ctr": 0,
                    "_count": 0
                }

            creative = creatives_dict[camp_key]
            creative["spend"] += campaign.spend or 0
            creative["leads"] += campaign.leads or 0
            creative["cpee"] += campaign.cpee or 0
            creative["ctr"] += campaign.ctr or 0
            creative["_count"] += 1

        # Calculate averages for creatives
        creatives = []
        for creative in creatives_dict.values():
            if creative["_count"] > 0:
                creative["cpee"] = round(creative["cpee"] / creative["_count"], 2)
                creative["ctr"] = round(creative["ctr"] / creative["_count"], 2)
            del creative["_count"]
            creatives.append(creative)

        # Prepare clusters (by state/region)
        clusters_dict = {}
        for campaign in campaigns:
            uf_key = campaign.uf or "BR"
            if uf_key not in clusters_dict:
                clusters_dict[uf_key] = {
                    "id": uf_key,
                    "nome": uf_key,
                    "account_id": campaign.account_id,
                    "spend": 0,
                    "leads": 0,
                    "cpee": 0,
                    "_count": 0
                }

            cluster = clusters_dict[uf_key]
            cluster["spend"] += campaign.spend or 0
            cluster["leads"] += campaign.leads or 0
            cluster["cpee"] += campaign.cpee or 0
            cluster["_count"] += 1

        # Calculate averages for clusters
        clusters = []
        for cluster in clusters_dict.values():
            if cluster["_count"] > 0:
                cluster["cpee"] = round(cluster["cpee"] / cluster["_count"], 2)
            del cluster["_count"]
            clusters.append(cluster)

        return {
            "accounts": account_list if account_list else [camp.account_id for camp in campaigns],
            "snapshots": snapshots,
            "creatives": creatives,
            "clusters": clusters
        }

    except Exception as e:
        logger.error(f"Error fetching dashboard export data: {str(e)}")
        return {
            "accounts": [],
            "snapshots": [],
            "creatives": [],
            "clusters": []
        }
