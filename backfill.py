#!/usr/bin/env python3
"""
Backfill histórico: busca dados reais por dia do Meta Ads (time_increment=1)
e popula snapshots_diarios com valores corretos dia a dia.
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, List
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

META_BASE = "https://graph.facebook.com/v18.0"


def classify_cpee(cpee):
    if cpee <= 0: return "SEM_DADOS"
    if cpee < 100: return "BOM"
    if cpee < 200: return "MEDIO"
    return "RUIM"


class SupabaseClient:
    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def upsert(self, table, data):
        r = requests.post(
            f"{self.base}/{table}",
            headers={**self.headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=data,
            timeout=15
        )
        if r.status_code not in (200, 201):
            logger.error(f"Upsert {table} falhou: {r.status_code} {r.text[:200]}")
            return False
        return True

    def delete_range(self, table, account_id, date_start, date_stop):
        """Remove snapshots existentes no intervalo para forçar reescrita correta."""
        r = requests.delete(
            f"{self.base}/{table}",
            headers=self.headers,
            params={
                "account_id": f"eq.{account_id}",
                "data": f"gte.{date_start}",
                "and": f"(data.lte.{date_stop})",
            },
            timeout=15
        )
        return r.status_code in (200, 204)


def fetch_account_name(token, account_id):
    try:
        r = requests.get(f"{META_BASE}/{account_id}",
                         params={"access_token": token, "fields": "name"}, timeout=15)
        r.raise_for_status()
        return r.json().get("name", account_id)
    except:
        return account_id


def fetch_daily_insights(token, account_id, date_start, date_stop) -> List[Dict]:
    """
    Busca métricas diárias usando time_increment=1.
    Retorna uma lista de dicts, um por dia com dados reais.
    """
    all_rows = []
    url = f"{META_BASE}/{account_id}/insights"
    params = {
        "access_token": token,
        "date_start": date_start,
        "date_stop": date_stop,
        "fields": "date_start,impressions,reach,clicks,spend,frequency,actions",
        "level": "account",
        "time_increment": 1,          # <- chave: 1 linha por dia
        "limit": 500,
    }

    while url:
        r = requests.get(url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        all_rows.extend(data.get("data", []))
        # Paginação
        url = data.get("paging", {}).get("next")
        params = {}  # próxima página já tem tudo na URL

    return all_rows


def parse_row(row) -> Dict:
    spend = float(row.get("spend", 0))
    impressions = int(row.get("impressions", 0))
    reach = int(row.get("reach", 0))
    clicks = int(row.get("clicks", 0))
    leads = sum(
        int(a.get("value", 0))
        for a in row.get("actions", [])
        if a.get("action_type") == "lead"
    )
    freq = float(row.get("frequency", 0))

    ctr = round(clicks / impressions * 100 if impressions else 0, 4)
    cpc = round(spend / clicks if clicks else 0, 2)
    cpl = round(spend / leads if leads else 0, 2)

    return {
        "date": row.get("date_start", ""),
        "spend": round(spend, 2),
        "impressoes": impressions,
        "alcance": reach,
        "cliques": clicks,
        "leads": leads,
        "frequencia": freq,
        "ctr": ctr,
        "cpc": cpc,
        "cpl": cpl,
        "cpee": cpl,
        "eq": leads,
    }


def main():
    token = os.getenv("META_ACCESS_TOKEN")
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    account_ids_raw = os.getenv("META_AD_ACCOUNT_IDS", "")

    if not all([token, supabase_url, service_key, account_ids_raw]):
        logger.error("Faltam variáveis de ambiente")
        sys.exit(1)

    account_ids = [i.strip() for i in account_ids_raw.split(",") if i.strip()]
    db = SupabaseClient(supabase_url, service_key)

    days = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    today = datetime.now().date()
    date_stop = (today - timedelta(days=1)).isoformat()   # ontem
    date_start = (today - timedelta(days=days)).isoformat()

    logger.info(f"Backfill {date_start} → {date_stop} ({days} dias) | {len(account_ids)} contas")

    total_inserted = 0
    total_zero = 0

    for account_id in account_ids:
        nome = fetch_account_name(token, account_id)
        logger.info(f"\n{'─'*50}")
        logger.info(f"Conta: {nome} ({account_id})")

        try:
            rows = fetch_daily_insights(token, account_id, date_start, date_stop)
        except Exception as e:
            logger.error(f"  Erro ao buscar insights: {e}")
            continue

        logger.info(f"  {len(rows)} dias com dados da API")

        for row in rows:
            m = parse_row(row)
            date_str = m["date"]
            if not date_str:
                continue

            cpee = m["cpee"]
            snapshot = {
                "data": date_str,
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
                "ctr": m["ctr"],
                "cpc": m["cpc"],
                "budget_diario": None,
                "classificacao": classify_cpee(cpee),
            }

            if db.upsert("snapshots_diarios", snapshot):
                if m["spend"] > 0:
                    logger.info(f"  {date_str}: spend={m['spend']} leads={m['leads']} cpee={cpee} ctr={m['ctr']}%")
                    total_inserted += 1
                else:
                    total_zero += 1  # dia sem gasto, normal
            else:
                logger.error(f"  {date_str}: falha ao inserir")

    logger.info(f"\n{'='*50}")
    logger.info(f"Concluído: {total_inserted} dias com spend | {total_zero} dias sem gasto")


if __name__ == "__main__":
    main()
