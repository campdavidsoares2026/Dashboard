import os
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class MetaAdsService:
    """Service to fetch real data from Meta Ads API"""

    BASE_URL = "https://graph.facebook.com/v18.0"

    def __init__(self):
        self.token = os.getenv("META_ACCESS_TOKEN")
        self.account_ids = os.getenv("META_AD_ACCOUNT_IDS", "").split(",")
        self.account_ids = [id.strip() for id in self.account_ids if id.strip()]

        if not self.token:
            raise ValueError("META_ACCESS_TOKEN not configured")
        if not self.account_ids:
            raise ValueError("META_AD_ACCOUNT_IDS not configured")

    def get_account_data(self, account_id: str, date_start: str, date_stop: str) -> Dict[str, Any]:
        """Fetch campaign insights for an account"""
        try:
            url = f"{self.BASE_URL}/{account_id}/insights"
            params = {
                "access_token": self.token,
                "date_start": date_start,
                "date_stop": date_stop,
                "fields": "campaign_id,campaign_name,impressions,clicks,spend,frequency",
                "level": "campaign"
            }

            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            try:
                error_body = e.response.text if hasattr(e, 'response') and e.response else str(e)
                logger.error(f"Error fetching account data for {account_id}: {error_body}")
            except:
                logger.error(f"Error fetching account data for {account_id}: {str(e)}")
            return {"data": []}

    def get_ad_creative_data(self, account_id: str) -> List[Dict[str, Any]]:
        """Fetch creative insights for targeting information"""
        try:
            url = f"{self.BASE_URL}/{account_id}/adcreatives"
            params = {
                "access_token": self.token,
                "fields": "id,name,body,image_url,video_data",
                "limit": 100
            }

            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json().get("data", [])
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching creative data for {account_id}: {str(e)}")
            return []

    def get_audience_demographics(self, account_id: str, date_start: str, date_stop: str) -> Dict[str, Any]:
        """Fetch demographic breakdown of audience"""
        try:
            url = f"{self.BASE_URL}/{account_id}/insights"
            params = {
                "access_token": self.token,
                "date_start": date_start,
                "date_stop": date_stop,
                "fields": "age,gender,impression_device,platform_position",
                "breakdowns": "age,gender"
            }

            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching demographic data for {account_id}: {str(e)}")
            return {"data": []}

    def fetch_all_accounts_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """Fetch data from all configured accounts"""
        all_data = {}
        date_stop = datetime.now().date()
        date_start = date_stop - timedelta(days=30)

        date_start_str = date_start.isoformat()
        date_stop_str = date_stop.isoformat()

        for account_id in self.account_ids:
            logger.info(f"Fetching data for account {account_id}")
            account_insights = self.get_account_data(account_id, date_start_str, date_stop_str)
            all_data[account_id] = account_insights.get("data", [])

        return all_data

    def parse_campaign_data(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parse raw Meta API data into normalized format"""
        parsed = []

        for campaign in raw_data:
            try:
                spend = float(campaign.get("spend", 0))
                impressions = int(campaign.get("impressions", 0))
                clicks = int(campaign.get("clicks", 0))

                # Calculate CPEE (Cost per Lead Equivalent)
                # In this case, we'll use cost per click as a proxy
                cpee = (spend / clicks * 100) if clicks > 0 else 0

                # Extract lead actions if available
                actions = campaign.get("actions", [])
                leads = 0
                for action in actions:
                    if action.get("action_type") == "lead":
                        leads = int(action.get("value", 0))
                        break

                parsed_item = {
                    "campaign_id": campaign.get("campaign_id"),
                    "campaign_name": campaign.get("campaign_name", "Unknown"),
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
                logger.warning(f"Error parsing campaign data: {str(e)}")
                continue

        return parsed
