#!/usr/bin/env python3
"""
Popula criativos_performance e clusters_performance no Supabase.
Busca insights no nível de anúncio (criativos) e ad set (clusters).

Uso: python3 populate_criativos_clusters.py [dias]
"""

import os
import sys
import logging
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
DATE_START_30 = (TODAY - timedelta(days=30)).isoformat()
DATE_START_7 = (TODAY - timedelta(days=7)).isoformat()
DATE_START = (TODAY - timedelta(days=DAYS)).isoformat()


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
            logger.error(f"Upsert {table} falhou: {r.status_code} {r.text[:200]}")
            return False
        return True

    def delete_all(self, table):
        r = requests.delete(
            f"{self.base}/{table}",
            headers=self.h,
            params={"id": "neq.00000000-0000-0000-0000-000000000000"},
            timeout=15,
        )
        return r.status_code in (200, 204)


def meta_insights(token, account_id, level, fields, date_start, date_stop):
    """Busca insights paginados no nível especificado."""
    rows = []
    url = f"{META_BASE}/{account_id}/insights"
    params = {
        "access_token": token,
        "fields": fields,
        "level": level,
        "date_start": date_start,
        "date_stop": date_stop,
        "limit": 500,
    }
    while url:
        r = requests.get(url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        rows.extend(data.get("data", []))
        url = data.get("paging", {}).get("next")
        params = {}
    return rows


def parse_metrics(row):
    spend = float(row.get("spend", 0))
    clicks = int(row.get("clicks", 0))
    impressoes = int(row.get("impressions", 0))
    alcance = int(row.get("reach", 0))
    leads = sum(
        int(a.get("value", 0))
        for a in row.get("actions", [])
        if a.get("action_type") == "lead"
    )
    ctr = round(float(row.get("ctr", 0)), 4)
    cpc = round(spend / clicks, 2) if clicks > 0 else 0.0
    cpl = round(spend / leads, 2) if leads > 0 else 0.0
    cpee = round(spend / clicks, 4) if clicks > 0 else 0.0
    eq = clicks
    return dict(spend=round(spend, 2), clicks=clicks, impressoes=impressoes,
                alcance=alcance, leads=leads, ctr=ctr, cpc=cpc, cpl=cpl, cpee=cpee, eq=eq)


def get_thumbnails(token, ad_ids):
    """Busca thumbnail_url para uma lista de ad_ids (em batches de 50)."""
    result = {}
    for i in range(0, len(ad_ids), 50):
        batch = ad_ids[i:i+50]
        r = requests.get(
            f"{META_BASE}/",
            params={
                "access_token": token,
                "ids": ",".join(batch),
                "fields": "id,creative{object_type,thumbnail_url}",
            },
            timeout=30,
        )
        if r.status_code == 200:
            for ad_id, ad_data in r.json().items():
                creative = ad_data.get("creative", {})
                result[ad_id] = {
                    "thumbnail_url": creative.get("thumbnail_url"),
                    "object_type": (creative.get("object_type") or "STATIC").upper(),
                }
    return result


def classify_relative(cpee, avg_cpee, mode="cpee"):
    """Classifica relativo à média: quente=abaixo, frio=acima."""
    if avg_cpee <= 0 or cpee <= 0:
        return "MORNO"
    if cpee <= avg_cpee * 0.85:
        return "QUENTE"
    if cpee <= avg_cpee * 1.15:
        return "MORNO"
    return "FRIO"


def classify_p33(cpee, sorted_cpees):
    """Classifica por percentil P33/P66."""
    if not sorted_cpees or cpee <= 0:
        return "MORNO"
    n = len(sorted_cpees)
    p33 = sorted_cpees[int(n * 0.33)]
    p66 = sorted_cpees[int(n * 0.66)]
    if cpee <= p33:
        return "QUENTE"
    if cpee <= p66:
        return "MORNO"
    return "FRIO"


def main():
    token = os.getenv("META_ACCESS_TOKEN")
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    account_ids_raw = os.getenv("META_AD_ACCOUNT_IDS", "")

    if not all([token, supabase_url, service_key]):
        logger.error("Faltam variáveis de ambiente")
        sys.exit(1)

    account_ids = [i.strip() for i in account_ids_raw.split(",") if i.strip()]
    db = SupabaseClient(supabase_url, service_key)

    AD_FIELDS = "ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend,clicks,impressions,reach,ctr,actions"
    ADSET_FIELDS = "adset_id,adset_name,campaign_id,campaign_name,spend,clicks,impressions,reach,ctr,actions"

    # ─── Criativos ──────────────────────────────────────────────────
    logger.info(f"\n── Criativos (últimos {DAYS} dias) ──")

    all_ad_rows_30 = {}
    all_ad_rows_7 = {}
    account_names = {}

    for account_id in account_ids:
        logger.info(f"  {account_id}")
        try:
            name_r = requests.get(f"{META_BASE}/{account_id}",
                params={"access_token": token, "fields": "name"}, timeout=10)
            account_names[account_id] = name_r.json().get("name", account_id)
        except Exception:
            account_names[account_id] = account_id

        rows_30 = meta_insights(token, account_id, "ad", AD_FIELDS, DATE_START_30, DATE_STOP)
        rows_7 = meta_insights(token, account_id, "ad", AD_FIELDS, DATE_START_7, DATE_STOP)

        for row in rows_30:
            if float(row.get("spend", 0)) > 0:
                all_ad_rows_30[row["ad_id"]] = {"account_id": account_id, "row": row}
        for row in rows_7:
            if float(row.get("spend", 0)) > 0:
                all_ad_rows_7[row["ad_id"]] = row

    logger.info(f"  {len(all_ad_rows_30)} anúncios com spend (30d)")

    if all_ad_rows_30:
        # Fetch thumbnails for ads with spend
        thumbs = get_thumbnails(token, list(all_ad_rows_30.keys()))

        # Build criativo rows
        criativos = []
        for ad_id, entry in all_ad_rows_30.items():
            m30 = parse_metrics(entry["row"])
            m7 = parse_metrics(all_ad_rows_7[ad_id]) if ad_id in all_ad_rows_7 else {}
            thumb_info = thumbs.get(ad_id, {})
            obj_type = thumb_info.get("object_type", "STATIC")
            pauta = "VID" if "VIDEO" in obj_type else "CAR" if "CAROUSEL" in obj_type else "EST"
            row = entry["row"]
            criativos.append({
                "ad_id": ad_id,
                "account_id": entry["account_id"],
                "conta_nome": account_names[entry["account_id"]],
                "adset_id": row.get("adset_id"),
                "campaign_id": row.get("campaign_id"),
                "ad_nome": row.get("ad_name", ad_id),
                "pauta": pauta,
                "thumbnail_url": thumb_info.get("thumbnail_url"),
                "cpee": m30["cpee"],
                "eq": m30["eq"],
                "spend": m30["spend"],
                "impressoes": m30["impressoes"],
                "alcance": m30["alcance"],
                "ctr": m30["ctr"],
                "cpc": m30["cpc"],
                "leads": m30["leads"],
                "cpl": m30["cpl"],
                "cpee_30d": m30["cpee"],
                "eq_30d": m30["eq"],
                "spend_30d": m30["spend"],
                "cpee_7d": m7.get("cpee", 0),
                "eq_7d": m7.get("eq", 0),
                "spend_7d": m7.get("spend", 0),
                "periodo": "30d",
                "data": DATE_STOP,
                "objetivo": row.get("campaign_name", "")[:50],
            })

        # Relative classification
        cpees = sorted(c["cpee"] for c in criativos if c["cpee"] > 0)
        avg_cpee = sum(cpees) / len(cpees) if cpees else 0

        db.delete_all("criativos_performance")
        inserted = 0
        for c in sorted(criativos, key=lambda x: x["spend"], reverse=True):
            c["classificacao"] = classify_relative(c["cpee"], avg_cpee)
            c["classificacao_p33"] = classify_p33(c["cpee"], cpees)
            if db.upsert("criativos_performance", c):
                logger.info(f"    {c['ad_nome'][:40]}: spend={c['spend']} cpee={c['cpee']} → {c['classificacao']}")
                inserted += 1
        logger.info(f"  {inserted} criativos inseridos | CPEE médio R$ {avg_cpee:.4f}")

    # ─── Clusters (ad sets) ─────────────────────────────────────────
    logger.info(f"\n── Clusters / Ad Sets (últimos {DAYS} dias) ──")

    all_adset_30 = {}
    all_adset_7 = {}

    for account_id in account_ids:
        logger.info(f"  {account_id}")
        rows_30 = meta_insights(token, account_id, "adset", ADSET_FIELDS, DATE_START_30, DATE_STOP)
        rows_7 = meta_insights(token, account_id, "adset", ADSET_FIELDS, DATE_START_7, DATE_STOP)

        for row in rows_30:
            if float(row.get("spend", 0)) > 0:
                all_adset_30[row["adset_id"]] = {"account_id": account_id, "row": row}
        for row in rows_7:
            if float(row.get("spend", 0)) > 0:
                all_adset_7[row["adset_id"]] = row

    logger.info(f"  {len(all_adset_30)} ad sets com spend (30d)")

    if all_adset_30:
        clusters = []
        for adset_id, entry in all_adset_30.items():
            m30 = parse_metrics(entry["row"])
            m7 = parse_metrics(all_adset_7[adset_id]) if adset_id in all_adset_7 else {}
            row = entry["row"]
            adset_name = row.get("adset_name", adset_id)
            # Extract cluster number from name like "CL28_BAIXADA_..." → 28
            import re
            cl_match = re.search(r'CL(\d+)', adset_name, re.IGNORECASE)
            cluster_num = int(cl_match.group(1)) if cl_match else 0
            clusters.append({
                "adset_id": adset_id,
                "account_id": entry["account_id"],
                "conta_nome": account_names[entry["account_id"]],
                "cluster_nome": adset_name[:60],
                "cluster_num": cluster_num,
                "pauta": row.get("campaign_name", "")[:50],
                "cpee": m30["cpee"],
                "eq": m30["eq"],
                "spend": m30["spend"],
                "impressoes": m30["impressoes"],
                "alcance": m30["alcance"],
                "ctr": m30["ctr"],
                "cpc": m30["cpc"],
                "leads": m30["leads"],
                "cpl": m30["cpl"],
                "cpee_30d": m30["cpee"],
                "eq_30d": m30["eq"],
                "spend_30d": m30["spend"],
                "cpee_7d": m7.get("cpee", 0),
                "eq_7d": m7.get("eq", 0),
                "spend_7d": m7.get("spend", 0),
                "periodo": "30d",
                "data": DATE_STOP,
                "objetivo": row.get("campaign_name", "")[:50],
            })

        cpees_cl = sorted(c["cpee"] for c in clusters if c["cpee"] > 0)
        avg_cpee_cl = sum(cpees_cl) / len(cpees_cl) if cpees_cl else 0

        db.delete_all("clusters_performance")
        inserted = 0
        for c in sorted(clusters, key=lambda x: x["spend"], reverse=True):
            c["classificacao"] = classify_relative(c["cpee"], avg_cpee_cl)
            c["classificacao_p33"] = classify_p33(c["cpee"], cpees_cl)
            if db.upsert("clusters_performance", c):
                logger.info(f"    {c['cluster_nome'][:40]}: spend={c['spend']} cpee={c['cpee']} → {c['classificacao']}")
                inserted += 1
        logger.info(f"  {inserted} clusters inseridos | CPEE médio R$ {avg_cpee_cl:.4f}")


if __name__ == "__main__":
    main()
