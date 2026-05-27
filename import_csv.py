#!/usr/bin/env python3
"""
Importa CSV do Meta Ads Manager (com breakdown diário) para snapshots_diarios.
Uso: python3 import_csv.py caminho/para/arquivo.csv
"""

import os
import sys
import csv
import logging
from collections import defaultdict
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

ACCOUNT_ID = "act_4085311614896655"
ACCOUNT_NAME = "CA - Pré- Campanha 2026"

LEAD_TYPES = {"Leads", "Leads (form)", "lead"}


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
            logger.error(f"Upsert falhou: {r.status_code} {r.text[:300]}")
            return False
        return True


def parse_float(val):
    try:
        return float(str(val).replace(",", ".").strip()) if val and str(val).strip() else 0.0
    except:
        return 0.0


def parse_int(val):
    try:
        return int(parse_float(val))
    except:
        return 0


def aggregate_by_day(csv_path):
    days = defaultdict(lambda: {
        "spend": 0.0,
        "impressoes": 0,
        "alcance": 0,
        "cliques": 0,
        "leads": 0,
    })

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            day = (row.get("Day") or row.get("Reporting starts", "")).strip()
            if not day:
                continue

            spend = parse_float(row.get("Amount spent (BRL)", 0))
            impressions = parse_int(row.get("Impressions", 0))
            reach = parse_int(row.get("Reach", 0))
            # Prefer "Link clicks" (engagements), fall back to "Clicks (all)"
            clicks = parse_int(
                row.get("Link clicks") or row.get("Clicks (all)") or 0
            )
            result_type = row.get("Result type", "").strip()
            results = parse_int(row.get("Results", 0))

            days[day]["spend"] += spend
            days[day]["impressoes"] += impressions
            days[day]["alcance"] += reach
            days[day]["cliques"] += clicks

            if result_type in LEAD_TYPES:
                days[day]["leads"] += results

    return days


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 import_csv.py <caminho_do_csv>")
        sys.exit(1)

    csv_path = sys.argv[1]
    if not os.path.exists(csv_path):
        logger.error(f"Arquivo não encontrado: {csv_path}")
        sys.exit(1)

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    if not supabase_url or not service_key:
        logger.error("SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados")
        sys.exit(1)

    db = SupabaseClient(supabase_url, service_key)
    days = aggregate_by_day(csv_path)

    logger.info(f"Dias encontrados no CSV: {len(days)}")

    inserted = 0
    skipped = 0

    for date_str in sorted(days.keys()):
        m = days[date_str]
        spend = round(m["spend"], 2)
        cliques = m["cliques"]
        leads = m["leads"]
        impressoes = m["impressoes"]
        alcance = m["alcance"]

        # CPEE = spend / clicks. Fall back to leads if no clicks column in CSV.
        eq = cliques if cliques > 0 else leads
        cpee = round(spend / eq, 2) if eq > 0 else 0.0
        ctr = round(cliques / impressoes * 100, 4) if impressoes > 0 and cliques > 0 else 0.0
        cpc = round(spend / cliques, 2) if cliques > 0 else 0.0

        snapshot = {
            "data": date_str,
            "account_id": ACCOUNT_ID,
            "nome": ACCOUNT_NAME,
            "papel": None,
            "cpee": cpee,
            "eq": eq,
            "spend": spend,
            "leads": leads,
            "impressoes": impressoes,
            "alcance": alcance,
            "cliques": cliques,
            "ctr": ctr,
            "cpc": cpc,
            "budget_diario": None,
            "classificacao": classify_cpee(cpee),
        }

        if db.upsert("snapshots_diarios", snapshot):
            logger.info(f"  {date_str}: spend={spend} cliques={cliques} leads={leads} cpee={cpee} → {classify_cpee(cpee)}")
            inserted += 1
        else:
            skipped += 1

    logger.info(f"\nConcluído: {inserted} dias importados | {skipped} falhas")


if __name__ == "__main__":
    main()
