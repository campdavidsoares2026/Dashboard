#!/usr/bin/env python3
"""
Daily report: fetches Meta Ads data and syncs to Supabase via REST API (HTTPS).
Runs daily at 9 AM via cron job.
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import requests
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/alexsandro/cpee-dashboard/daily_report.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


def classify_cpee(cpee: float) -> str:
    if cpee <= 0:
        return "SEM_DADOS"
    if cpee < 100:
        return "BOM"
    if cpee < 200:
        return "MEDIO"
    return "RUIM"


class SupabaseClient:
    def __init__(self, url: str, key: str):
        self.base = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def insert(self, table: str, data: Dict, return_id: bool = False) -> Optional[Dict]:
        prefer = "return=representation" if return_id else "return=minimal"
        headers = {**self.headers, "Prefer": prefer}
        r = requests.post(f"{self.base}/{table}", headers=headers, json=data, timeout=15)
        if r.status_code not in (200, 201):
            logger.error(f"Supabase insert {table} failed: {r.status_code} {r.text[:300]}")
            return None
        if return_id and r.text and r.text != "[]":
            rows = r.json()
            return rows[0] if rows else None
        return {}

    def delete(self, table: str, filters: Dict[str, str]) -> bool:
        params = {k: f"eq.{v}" for k, v in filters.items()}
        r = requests.delete(f"{self.base}/{table}", headers=self.headers, params=params, timeout=15)
        return r.status_code in (200, 204)


class MetaAdsDataSync:

    META_BASE = "https://graph.facebook.com/v18.0"

    def __init__(self):
        self.meta_token = os.getenv("META_ACCESS_TOKEN")
        self.account_ids = self._get_account_ids()

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY not configured")
        if not self.meta_token:
            raise ValueError("META_ACCESS_TOKEN not configured")
        if not self.account_ids:
            raise ValueError("No Meta Ad accounts configured")

        self.db = SupabaseClient(supabase_url, supabase_key)
        logger.info(f"Initialized with {len(self.account_ids)} Meta Ad accounts")

    def _get_account_ids(self) -> List[str]:
        ids = os.getenv("META_AD_ACCOUNT_IDS", "").strip()
        if ids:
            return [i.strip() for i in ids.split(",") if i.strip()]
        single = os.getenv("META_AD_ACCOUNT_ID", "").strip()
        return [single] if single else []

    def _meta_get(self, path: str, params: Dict) -> Dict:
        params["access_token"] = self.meta_token
        r = requests.get(f"{self.META_BASE}/{path}", params=params, timeout=30)
        r.raise_for_status()
        return r.json()

    def fetch_account_name(self, account_id: str) -> str:
        try:
            return self._meta_get(account_id, {"fields": "name"}).get("name", account_id)
        except Exception as e:
            logger.warning(f"Could not fetch name for {account_id}: {e}")
            return account_id

    def fetch_account_insights(self, account_id: str, date_start: str, date_stop: str) -> List[Dict]:
        try:
            # Meta Ads API expects time_range as JSON, NOT date_start/date_stop (those are ignored
            # silently and Meta returns the default 28-day lifetime aggregate). Bug fix: 2026-05-27.
            import json as _json
            data = self._meta_get(f"{account_id}/insights", {
                "time_range": _json.dumps({"since": date_start, "until": date_stop}),
                "fields": "campaign_id,campaign_name,impressions,reach,clicks,spend,frequency,actions",
                "level": "campaign",
                "limit": 1000,
            })
            return data.get("data", [])
        except Exception as e:
            logger.error(f"Error fetching insights for {account_id}: {e}")
            return []

    def _aggregate(self, campaigns: List[Dict]) -> Dict:
        spend = sum(float(c.get("spend", 0)) for c in campaigns)
        impressions = sum(int(c.get("impressions", 0)) for c in campaigns)
        reach = sum(int(c.get("reach", 0)) for c in campaigns)
        clicks = sum(int(c.get("clicks", 0)) for c in campaigns)
        leads = sum(
            int(a.get("value", 0))
            for c in campaigns
            for a in c.get("actions", [])
            if a.get("action_type") == "lead"
        )
        thruplay = sum(
            int(a.get("value", 0))
            for c in campaigns
            for a in c.get("actions", [])
            if a.get("action_type") == "video_thruplay_watched"
        )
        freqs = [float(c["frequency"]) for c in campaigns if c.get("frequency")]
        freq_avg = round(sum(freqs) / len(freqs), 2) if freqs else 0

        ctr = round(clicks / impressions * 100 if impressions else 0, 4)
        cpc = round(spend / clicks if clicks else 0, 2)
        cpl = round(spend / leads if leads else 0, 2)

        return {
            "spend": round(spend, 2),
            "impressoes": impressions,
            "alcance": reach,
            "cliques": clicks,
            "leads": leads,
            "thruplay": thruplay,
            "frequencia": freq_avg,
            "ctr": ctr,
            "cpc": cpc,
            "cpl": cpl,
            "cpee": cpl,
            "eq": leads,
        }

    def create_execucao(self, date_start: str, date_stop: str, accounts_metrics: List[Dict]) -> Optional[str]:
        total_spend = sum(m["spend"] for m in accounts_metrics)
        total_eq = sum(m["eq"] for m in accounts_metrics)
        total_leads = sum(m["leads"] for m in accounts_metrics)
        cpee_consolidado = round(total_spend / total_leads if total_leads else 0, 2)

        row = {
            "periodo": f"{date_start}/{date_stop}",
            "total_spend": round(total_spend, 2),
            "total_eq": round(total_eq, 2),
            "cpee_consolidado": cpee_consolidado,
            "budget_mensal": None,
        }
        result = self.db.insert("execucoes", row, return_id=True)
        if result and "id" in result:
            logger.info(f"Created execucao: {result['id']}")
            return result["id"]
        logger.error("Failed to create execucao record")
        return None

    def sync_metricas_conta(self, account_id: str, nome: str, m: Dict, execucao_id: str) -> bool:
        # metricas_conta is "current state" — delete previous rows for this account
        # before inserting the new one (prevents row accumulation across daily runs).
        self.db.delete("metricas_conta", {"account_id": account_id})
        cpee = m["cpee"]
        row = {
            "execucao_id": execucao_id,
            "executado_em": datetime.now().isoformat(),
            "account_id": account_id,
            "nome": nome,
            "papel": None,
            "cpee": cpee,
            "eq": m["eq"],
            "classificacao_cpee": classify_cpee(cpee),
            "spend": m["spend"],
            "impressoes": m["impressoes"],
            "alcance": m["alcance"],
            "frequencia": m["frequencia"],
            "ctr": m["ctr"],
            "cpc": m["cpc"],
            "leads": m["leads"],
            "cpl": m["cpl"],
            "budget_atual": None,
            "budget_recomendado": None,
            "acao_recomendada": None,
            "fase_warmup": None,
        }
        ok = self.db.insert("metricas_conta", row)
        if ok is not None:
            logger.info(f"Inserted metricas_conta for {account_id}")
            return True
        return False

    def sync_snapshots_diarios(self, account_id: str, nome: str, m: Dict, date: str) -> bool:
        cpee = m["cpee"]
        self.db.delete("snapshots_diarios", {"data": date, "account_id": account_id})
        row = {
            "data": date,
            "account_id": account_id,
            "nome": nome,
            "papel": None,
            "cpee": cpee,
            "eq": m["cliques"],
            "spend": m["spend"],
            "leads": m["leads"],
            "impressoes": m["impressoes"],
            "alcance": m["alcance"],
            "cliques": m["cliques"],
            "thruplay": m.get("thruplay", 0),
            "frequencia": m.get("frequencia", 0),
            "ctr": m["ctr"],
            "cpc": m["cpc"],
            "budget_diario": None,
            "classificacao": classify_cpee(cpee),
        }
        ok = self.db.insert("snapshots_diarios", row)
        if ok is not None:
            logger.info(f"Inserted snapshots_diarios for {account_id} on {date}")
            return True
        return False

    def sync_recomendacoes(self, account_id: str, nome: str, m: Dict, execucao_id: str) -> bool:
        now = datetime.now().isoformat()
        recs = []

        if m["spend"] > 0 and m["cpc"] > 150:
            recs.append({
                "execucao_id": execucao_id,
                "account_id": account_id,
                "nome": nome,
                "tipo": "CPC_ELEVADO",
                "severidade": "alta",
                "titulo": "CPC Elevado",
                "descricao": f"CPC R$ {m['cpc']:.2f} acima da meta R$ 100",
                "impacto_estimado": "Redução de eficiência",
                "confianca": 0.95,
                "motivo": f"CPC R$ {m['cpc']:.2f} acima da meta R$ 100",
                "budget_atual": None,
                "budget_proposto": None,
                "aprovada": False,
                "executada": False,
                "executado_em": now,
            })
        if 0 < m["ctr"] < 0.5:
            recs.append({
                "execucao_id": execucao_id,
                "account_id": account_id,
                "nome": nome,
                "tipo": "CTR_BAIXO",
                "severidade": "media",
                "titulo": "CTR Baixo",
                "descricao": f"CTR {m['ctr']:.2f}% abaixo do esperado",
                "impacto_estimado": "Menor engajamento",
                "confianca": 0.85,
                "motivo": f"CTR {m['ctr']:.2f}% abaixo do esperado",
                "budget_atual": None,
                "budget_proposto": None,
                "aprovada": False,
                "executada": False,
                "executado_em": now,
            })
        if m["cpee"] > 200:
            recs.append({
                "execucao_id": execucao_id,
                "account_id": account_id,
                "nome": nome,
                "tipo": "CPEE_ELEVADO",
                "severidade": "alta",
                "titulo": "CPEE Elevado",
                "descricao": f"CPEE R$ {m['cpee']:.2f} acima da meta R$ 100",
                "impacto_estimado": "Redução da rentabilidade",
                "confianca": 0.90,
                "motivo": f"CPEE R$ {m['cpee']:.2f} acima da meta R$ 100",
                "budget_atual": None,
                "budget_proposto": None,
                "aprovada": False,
                "executada": False,
                "executado_em": now,
            })

        for rec in recs:
            self.db.insert("recomendacoes", rec)

        if recs:
            logger.info(f"Inserted {len(recs)} recommendations for {account_id}")
        return True

    def run(self):
        logger.info("=" * 80)
        logger.info("Starting daily Meta Ads report sync")
        logger.info("=" * 80)

        # Meta's `until` is inclusive — to sync "yesterday" we use yesterday for both since/until.
        # Optional CLI arg: a YYYY-MM-DD date to sync that specific day (used by backfill).
        if len(sys.argv) >= 2 and len(sys.argv[1]) == 10 and sys.argv[1].count("-") == 2:
            target = datetime.fromisoformat(sys.argv[1]).date()
        else:
            target = datetime.now().date() - timedelta(days=1)
        date_start_str = target.isoformat()
        date_stop_str = target.isoformat()

        logger.info(f"Period: {date_start_str} → {date_stop_str} (single day)")

        # Collect all account data first (needed to create execucao summary)
        accounts_data = []
        for account_id in self.account_ids:
            logger.info(f"Fetching: {account_id}")
            nome = self.fetch_account_name(account_id)
            campaigns = self.fetch_account_insights(account_id, date_start_str, date_stop_str)
            if not campaigns:
                logger.warning(f"No campaign data for {account_id}")
                continue
            m = self._aggregate(campaigns)
            logger.info(f"{nome}: spend={m['spend']} leads={m['leads']} cpee={m['cpee']} ctr={m['ctr']}%")
            accounts_data.append({"account_id": account_id, "nome": nome, "metrics": m, "campaigns": len(campaigns)})

        if not accounts_data:
            logger.warning("No data fetched for any account")
            return False

        # Create execucao record and get its ID
        all_metrics = [a["metrics"] for a in accounts_data]
        execucao_id = self.create_execucao(date_start_str, date_stop_str, all_metrics)
        if not execucao_id:
            logger.error("Cannot proceed without execucao_id")
            return False

        # Sync each account
        total_campaigns = 0
        for a in accounts_data:
            self.sync_metricas_conta(a["account_id"], a["nome"], a["metrics"], execucao_id)
            self.sync_snapshots_diarios(a["account_id"], a["nome"], a["metrics"], date_start_str)
            self.sync_recomendacoes(a["account_id"], a["nome"], a["metrics"], execucao_id)
            total_campaigns += a["campaigns"]

        logger.info("=" * 80)
        logger.info(f"Sync completed. Accounts: {len(accounts_data)} | Campaigns: {total_campaigns}")
        logger.info("=" * 80)
        return True


def main():
    try:
        sync = MetaAdsDataSync()
        success = sync.run()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Failed to initialize sync: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
