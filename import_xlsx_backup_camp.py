#!/usr/bin/env python3
"""
Importa Excel da conta CA - BACKUP CAMP. DAVID 2026
e atualiza snapshots_diarios no Supabase.

Ajuste COLS_* conforme o layout do relatório exportado do Meta Ads.
Para descobrir os índices: abra o arquivo no Excel e conte as colunas
a partir de 0 (coluna A = 0, B = 1, C = 2 ...).
"""

import os
import logging
from collections import defaultdict
import openpyxl
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ACCOUNT_ID   = "act_2360668901089815"
ACCOUNT_NAME = "CA - BACKUP CAMP. DAVID 2026"

# ── Caminho do arquivo ──────────────────────────────────────────────────
ARQUIVO = "/Users/alexsandro/Downloads/Backup.xlsx"

# ── Índices de coluna ────────────────────────────────────────────────────
COLS = {
    "campanha":   0,   # Nome da campanha (pula linha de totais quando vazio)
    "dia":        2,   # Dia
    "alcance":    5,   # Alcance
    "impressoes": 6,   # Impressões
    "spend":     11,   # Valor usado (BRL)
    "cliques":   18,   # Cliques no link
}


def f(v):
    try:
        return float(v or 0)
    except Exception:
        return 0.0


def aggregate(path):
    days = defaultdict(lambda: dict(spend=0.0, impressoes=0, alcance=0, cliques=0))
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row[COLS["campanha"]] or not row[COLS["dia"]]:
            continue
        date = str(row[COLS["dia"]])[:10]
        days[date]["spend"]      += f(row[COLS["spend"]])
        days[date]["impressoes"] += int(f(row[COLS["impressoes"]]))
        days[date]["alcance"]    += int(f(row[COLS["alcance"]]))
        days[date]["cliques"]    += int(f(row[COLS["cliques"]]))
    return days


class SupabaseClient:
    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1"
        self.h = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def upsert(self, table, data):
        r = requests.post(
            f"{self.base}/{table}",
            headers={**self.h, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=data, timeout=15,
        )
        if r.status_code not in (200, 201):
            logger.error(f"Upsert falhou: {r.status_code} {r.text[:300]}")
            return False
        return True


def main():
    supabase_url = os.getenv("SUPABASE_URL")
    service_key  = os.getenv("SUPABASE_SERVICE_KEY")
    if not supabase_url or not service_key:
        logger.error("SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados")
        return

    if not os.path.exists(ARQUIVO):
        logger.error(f"Arquivo não encontrado: {ARQUIVO}")
        logger.error("Atualize a variável ARQUIVO no topo do script com o caminho correto.")
        return

    logger.info(f"Lendo {ARQUIVO}…")
    data = aggregate(ARQUIVO)
    logger.info(f"  {len(data)} dias encontrados")

    total_spend = sum(v["spend"] for v in data.values())
    logger.info(f"  Spend total: R$ {total_spend:,.2f}")

    db = SupabaseClient(supabase_url, service_key)
    inserted = 0

    for date in sorted(data.keys()):
        m = data[date]
        spend      = round(m["spend"], 2)
        cliques    = m["cliques"]
        impressoes = m["impressoes"]
        alcance    = m["alcance"]
        leads      = 0

        eq   = cliques if cliques > 0 else 0
        cpee = round(spend / eq, 4) if eq > 0 else 0.0
        ctr  = round(cliques / impressoes * 100, 4) if impressoes > 0 and cliques > 0 else 0.0
        cpc  = round(spend / cliques, 2) if cliques > 0 else 0.0

        row = {
            "data":       date,
            "account_id": ACCOUNT_ID,
            "nome":       ACCOUNT_NAME,
            "spend":      spend,
            "impressoes": impressoes,
            "alcance":    alcance,
            "cliques":    cliques,
            "eq":         eq,
            "leads":      leads,
            "cpee":       cpee,
            "ctr":        ctr,
            "cpc":        cpc,
        }

        if db.upsert("snapshots_diarios", row):
            logger.info(f"  {date}: spend=R${spend:,.2f} cliques={cliques} cpee={cpee}")
            inserted += 1

    logger.info(f"\nFinalizado: {inserted} dias atualizados")


if __name__ == "__main__":
    main()
