#!/usr/bin/env python3
"""
Popula demografia_performance e horarios_performance no Supabase.

Cada execução:
  1. Pra cada conta, busca insights com breakdowns=age,gender (últimos 30d)
  2. Pra cada conta, busca insights com breakdowns=hourly_stats (últimos 30d)
  3. Faz upsert nas duas tabelas (substitui rows do mesmo periodo)

Uso: python3 populate_demografia_horarios.py [dias]
     dias padrão = 30
"""

import os
import sys
import json
import logging
import re
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

META_BASE = "https://graph.facebook.com/v18.0"
DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 30

TODAY = datetime.now().date()
DATE_STOP = (TODAY - timedelta(days=1)).isoformat()
DATE_START = (TODAY - timedelta(days=DAYS)).isoformat()
PERIODO_LABEL = f"{DAYS}d"


class SupabaseClient:
    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1"
        self.h = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def upsert(self, table, data, on_conflict):
        r = requests.post(
            f"{self.base}/{table}",
            headers={
                **self.h,
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            params={"on_conflict": on_conflict},
            json=data,
            timeout=15,
        )
        if r.status_code not in (200, 201):
            logger.error(f"Upsert {table} falhou: {r.status_code} {r.text[:300]}")
            return False
        return True

    def delete_period(self, table, periodo):
        """Limpa rows do periodo selecionado (cron substitui em vez de acumular)."""
        r = requests.delete(
            f"{self.base}/{table}",
            headers=self.h,
            params={"periodo": f"eq.{periodo}"},
            timeout=15,
        )
        return r.status_code in (200, 204)


def meta_breakdown(token, account_id, breakdowns, fields, date_start, date_stop):
    """Busca insights com breakdown — sem paginação (volumes baixos)."""
    params = {
        "access_token": token,
        "fields": fields,
        "level": "account",
        "breakdowns": breakdowns,
        # CRITICAL: time_range JSON, não date_start/date_stop direto
        # (esses são ignorados silenciosamente e Meta retorna o padrão de 28d)
        "time_range": json.dumps({"since": date_start, "until": date_stop}),
        "limit": 500,
    }
    r = requests.get(
        f"{META_BASE}/{account_id}/insights", params=params, timeout=30
    )
    r.raise_for_status()
    return r.json().get("data", [])


def parse_actions(row, action_type):
    """Extrai valor de uma ação específica (ex: 'lead', 'link_click')."""
    for a in row.get("actions", []):
        if a.get("action_type") == action_type:
            return int(a.get("value", 0))
    return 0


def common_metrics(row):
    """Métricas comuns + cálculos derivados."""
    spend = float(row.get("spend", 0))
    clicks = int(row.get("clicks", 0))
    impressoes = int(row.get("impressions", 0))
    alcance = int(row.get("reach", 0))
    leads = parse_actions(row, "lead")
    eq = clicks  # mesma convenção do daily_report.py
    return {
        "spend": round(spend, 2),
        "cliques": clicks,
        "impressoes": impressoes,
        "alcance": alcance,
        "leads": leads,
        "eq": eq,
        "ctr": round(float(row.get("ctr", 0)), 4),
        "cpc": round(spend / clicks, 2) if clicks > 0 else 0,
        "cpee": round(spend / eq, 4) if eq > 0 else 0,
    }


def get_account_name(token, account_id):
    try:
        r = requests.get(
            f"{META_BASE}/{account_id}",
            params={"access_token": token, "fields": "name"},
            timeout=10,
        )
        return r.json().get("name", account_id)
    except Exception:
        return account_id


# Regex pra extrair hora-inteira de "00:00:00 - 00:59:59"
_HOUR_RE = re.compile(r"^(\d{1,2}):")


def main():
    token = os.getenv("META_ACCESS_TOKEN")
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    account_ids_raw = os.getenv("META_AD_ACCOUNT_IDS", "")

    if not all([token, supabase_url, service_key]):
        logger.error("Faltam variáveis de ambiente")
        sys.exit(1)

    account_ids = [a.strip() for a in account_ids_raw.split(",") if a.strip()]
    db = SupabaseClient(supabase_url, service_key)

    FIELDS = "spend,clicks,impressions,reach,ctr,actions"

    logger.info(f"\n── Demografia + Horários · período {PERIODO_LABEL} ({DATE_START} → {DATE_STOP}) ──")

    # ─── Substituir rows do mesmo periodo ───
    db.delete_period("demografia_performance", PERIODO_LABEL)
    db.delete_period("horarios_performance", PERIODO_LABEL)

    total_demo = 0
    total_horario = 0

    for account_id in account_ids:
        nome = get_account_name(token, account_id)
        logger.info(f"\n  📊 {account_id} · {nome}")

        # === DEMOGRAFIA (age × gender) ===
        try:
            demo_rows = meta_breakdown(
                token, account_id, "age,gender", FIELDS, DATE_START, DATE_STOP
            )
            inserted = 0
            for row in demo_rows:
                m = common_metrics(row)
                if m["spend"] <= 0:
                    continue  # skip combos sem investimento
                payload = {
                    "account_id": account_id,
                    "conta_nome": nome,
                    "age": row.get("age", "?"),
                    "gender": row.get("gender", "unknown"),
                    "periodo": PERIODO_LABEL,
                    "data_inicio": DATE_START,
                    "data_fim": DATE_STOP,
                    **m,
                }
                if db.upsert(
                    "demografia_performance",
                    payload,
                    on_conflict="account_id,age,gender,periodo",
                ):
                    inserted += 1
            logger.info(f"    Demografia: {inserted} células inseridas")
            total_demo += inserted
        except Exception as e:
            logger.error(f"    Demografia falhou: {e}")

        # === HORÁRIOS (hour of day, fuso do advertiser) ===
        try:
            hora_rows = meta_breakdown(
                token,
                account_id,
                "hourly_stats_aggregated_by_advertiser_time_zone",
                FIELDS,
                DATE_START,
                DATE_STOP,
            )
            inserted = 0
            for row in hora_rows:
                hora_str = row.get("hourly_stats_aggregated_by_advertiser_time_zone", "")
                match = _HOUR_RE.match(hora_str)
                if not match:
                    continue
                m = common_metrics(row)
                payload = {
                    "account_id": account_id,
                    "conta_nome": nome,
                    "hora": hora_str,
                    "hora_int": int(match.group(1)),
                    "periodo": PERIODO_LABEL,
                    "data_inicio": DATE_START,
                    "data_fim": DATE_STOP,
                    **m,
                }
                if db.upsert(
                    "horarios_performance",
                    payload,
                    on_conflict="account_id,hora_int,periodo",
                ):
                    inserted += 1
            logger.info(f"    Horários: {inserted} horas inseridas")
            total_horario += inserted
        except Exception as e:
            logger.error(f"    Horários falhou: {e}")

    logger.info(
        f"\n✅ Total: {total_demo} células demografia + {total_horario} horas"
    )


if __name__ == "__main__":
    main()
