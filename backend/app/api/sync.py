from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.database import get_db
from app.services.meta_ads_service import MetaAdsService
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["sync"])

def get_simulated_campaigns():
    """Return simulated campaign data for testing"""
    return {
        "act_4085311614896655": [
            {
                "campaign_id": "120192774832610001",
                "campaign_name": "Reforma Cozinha - Agosto",
                "spend": "2500.50",
                "impressions": 45000,
                "clicks": 1200,
                "actions": [{"action_type": "lead", "value": "45"}],
                "frequency": "2.5"
            },
            {
                "campaign_id": "120192774832610002",
                "campaign_name": "Reforma Banheiro - Premium",
                "spend": "1850.75",
                "impressions": 32000,
                "clicks": 850,
                "actions": [{"action_type": "lead", "value": "32"}],
                "frequency": "2.1"
            }
        ],
        "act_1601727050926069": [
            {
                "campaign_id": "120192774832610003",
                "campaign_name": "Deck e Varanda",
                "spend": "3200.00",
                "impressions": 58000,
                "clicks": 1450,
                "actions": [{"action_type": "lead", "value": "55"}],
                "frequency": "2.3"
            }
        ],
        "act_2360668901089815": [
            {
                "campaign_id": "120192774832610004",
                "campaign_name": "Paisagismo - Residencial",
                "spend": "1500.25",
                "impressions": 28000,
                "clicks": 650,
                "actions": [{"action_type": "lead", "value": "24"}],
                "frequency": "1.9"
            }
        ]
    }


def parse_simulated_campaigns(raw_data):
    """Parse simulated campaign data into normalized format"""
    parsed = []
    for campaign in raw_data:
        try:
            spend = float(campaign.get("spend", 0))
            impressions = int(campaign.get("impressions", 0))
            clicks = int(campaign.get("clicks", 0))
            cpee = (spend / clicks * 100) if clicks > 0 else 0

            actions = campaign.get("actions", [])
            leads = 0
            for action in actions:
                if action.get("action_type") == "lead":
                    leads = int(action.get("value", 0))
                    break

            parsed_item = {
                "campaign_id": campaign.get("campaign_id"),
                "campaign_name": campaign.get("campaign_name", "Unknown"),
                "uf": campaign.get("uf", "SP"),  # Default to SP (São Paulo)
                "cpee": round(cpee, 2),
                "spend": round(spend, 2),
                "impressions": impressions,
                "clicks": clicks,
                "leads": leads,
                "ctr": round((clicks / impressions * 100) if impressions > 0 else 0, 2),
                "cpc": round((spend / clicks) if clicks > 0 else 0, 2),
                "frequency": float(campaign.get("frequency", 0)),
                "date_fetched": datetime.now().isoformat()
            }
            parsed.append(parsed_item)
        except (KeyError, ValueError) as e:
            logger.warning(f"Error parsing simulated campaign: {str(e)}")
            continue

    return parsed


@router.post("/sync/meta-ads")
async def sync_meta_ads_data(db: Session = Depends(get_db)):
    """
    Sync data from Meta Ads API to local database.
    Called manually or by background jobs.
    """
    try:
        modo = os.getenv("MODO_COLETA", "simulado").lower()

        if modo == "simulado":
            logger.info("Using simulated campaign data")
            all_accounts_data = get_simulated_campaigns()
        else:
            service = MetaAdsService()
            # Fetch raw data from all accounts
            all_accounts_data = service.fetch_all_accounts_data()

        # Parse and aggregate data
        all_campaigns = []
        for account_id, campaigns_data in all_accounts_data.items():
            if modo == "simulado":
                parsed = parse_simulated_campaigns(campaigns_data)
            else:
                parsed = service.parse_campaign_data(campaigns_data)
            for campaign in parsed:
                campaign["account_id"] = account_id
            all_campaigns.extend(parsed)

        if not all_campaigns:
            raise HTTPException(
                status_code=400,
                detail="No campaign data fetched from Meta Ads API. Check credentials and account IDs."
            )

        # Import models here to avoid circular imports
        from app.models.models import CampaignData

        # Clear old data (keep last 30 days)
        thirty_days_ago = datetime.now().timestamp() - (30 * 24 * 60 * 60)

        # Insert/update new data
        for campaign in all_campaigns:
            # Convert date_fetched to datetime object if it's a string
            if isinstance(campaign.get("date_fetched"), str):
                campaign["date_fetched"] = datetime.fromisoformat(campaign["date_fetched"])

            existing = db.query(CampaignData).filter(
                CampaignData.campaign_id == campaign["campaign_id"]
            ).first()

            if existing:
                for key, value in campaign.items():
                    setattr(existing, key, value)
            else:
                new_campaign = CampaignData(**campaign)
                db.add(new_campaign)

        db.commit()

        return {
            "status": "success",
            "campaigns_synced": len(all_campaigns),
            "timestamp": datetime.now().isoformat(),
            "accounts": list(all_accounts_data.keys())
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing Meta Ads data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Sync failed: {str(e)}"
        )


@router.get("/sync/status")
async def get_sync_status(db: Session = Depends(get_db)):
    """Get last sync status"""
    try:
        from app.models.models import CampaignData

        last_campaign = db.query(CampaignData).order_by(
            CampaignData.id.desc()
        ).first()

        if not last_campaign:
            return {
                "status": "no_data",
                "message": "No campaign data synced yet. Run POST /api/sync/meta-ads first."
            }

        return {
            "status": "synced",
            "last_sync": last_campaign.date_fetched,
            "total_campaigns": db.query(CampaignData).count(),
            "accounts": len(set(
                c.account_id for c in db.query(CampaignData.account_id).distinct()
            ))
        }
    except Exception as e:
        logger.error(f"Error getting sync status: {str(e)}")
        return {"status": "error", "message": str(e)}
