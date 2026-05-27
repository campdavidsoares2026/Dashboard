import os
import re
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
from database import salvar_metricas, get_municipios

load_dotenv()

META_TOKEN = os.getenv("META_ACCESS_TOKEN")
AD_ACCOUNT = os.getenv("META_AD_ACCOUNT_ID")
API_VERSION = "v21.0"
BASE_URL = f"https://graph.facebook.com/{API_VERSION}"


# ── Mapeamento de action_type da Meta → nossas métricas ──────────────────────
ACTION_MAP = {
    "post_reaction":             "likes",
    "like":                      "likes",
    "comment":                   "comentarios",
    "post":                      "comentarios",
    "onsite_conversion.post_save": "saves",
    "link_click":                "cliques_link",
    "video_view":                "video_views_50",
    "share":                     "compartilhamentos",
}

# ── Mapeamento region da Meta → UF ───────────────────────────────────────────
REGION_UF = {
    "acre (state)": "AC", "alagoas": "AL", "amapá": "AP", "amazonas": "AM",
    "bahia": "BA", "ceará": "CE", "espírito santo": "ES",
    "federal district": "DF", "goiás": "GO", "maranhão": "MA",
    "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
    "pará": "PA", "paraíba": "PB", "paraná": "PR", "pernambuco": "PE",
    "piauí": "PI", "rio de janeiro (state)": "RJ", "rio grande do norte": "RN",
    "rio grande do sul": "RS", "rondônia": "RO", "roraima": "RR",
    "santa catarina": "SC", "são paulo (state)": "SP", "sergipe": "SE",
    "tocantins": "TO",
}

# ── Apelidos de cidades nos nomes de campanha ────────────────────────────────
APELIDOS_CIDADE = {
    "GRU": "Guarulhos",
    "RP": "Ribeirão Preto",
    "SP": None,            # genérica, não é uma cidade específica
    "CLUSTERS": None,
    "CLUSTER": None,
    "PROJETOS": None,
    "QUEM": None,
    "INTERIOR": None,
    "POLOS": None,
}


def _parse_actions(actions_list: list) -> dict:
    result = {
        "likes": 0,
        "comentarios": 0,
        "saves": 0,
        "cliques_link": 0,
        "video_views_50": 0,
        "compartilhamentos": 0,
    }
    if not actions_list:
        return result
    for a in actions_list:
        key = ACTION_MAP.get(a.get("action_type", ""))
        if key:
            result[key] += int(a.get("value", 0))
    return result


def _extrair_cidade_campanha(campaign_name: str, municipios_index: dict) -> str | None:
    """
    Tenta extrair o nome de uma cidade a partir do nome da campanha.
    Retorna o nome normalizado como está no banco, ou None.
    """
    # Pega a primeira parte antes de _ ou espaço
    nome = campaign_name.strip()
    primeira_parte = re.split(r"[_\s]", nome)[0].strip().upper()

    # Verifica apelidos conhecidos
    if primeira_parte in APELIDOS_CIDADE:
        apelido = APELIDOS_CIDADE[primeira_parte]
        if apelido and apelido.upper() in municipios_index:
            return municipios_index[apelido.upper()]
        return None

    # Tenta casar nome inteiro da campanha (para nomes com espaço tipo "BRAGANÇA PAULISTA")
    # Primeiro tenta o nome completo sem a parte de data/tipo
    partes_campanha = re.split(r"_(TOPO|MEIO|FUNDO|FORMS|LP|VIDEO|IMG|RECONHECIMENTO|ENGAJAMENTO|ALCANCE|LEADS|TRAFEGO)", nome)
    candidato = partes_campanha[0].replace("_", " ").strip().upper()

    if candidato in municipios_index:
        return municipios_index[candidato]

    # Tenta a primeira parte
    if primeira_parte in municipios_index:
        return municipios_index[primeira_parte]

    return None


def _build_municipios_index() -> dict:
    """
    Constrói índice NOME_UPPER → nome_original para casamento rápido.
    """
    municipios = get_municipios()
    index = {}
    for m in municipios:
        key = m["cidade"].upper()
        index[key] = m["cidade"]
        # Também sem acento comum
        key_sem_acento = (key
            .replace("Ã", "A").replace("Õ", "O").replace("Ç", "C")
            .replace("Á", "A").replace("É", "E").replace("Í", "I")
            .replace("Ó", "O").replace("Ú", "U")
            .replace("Â", "A").replace("Ê", "E").replace("Ô", "O"))
        index[key_sem_acento] = m["cidade"]
    return index


def buscar_insights(date_preset: str = "last_7d") -> list[dict]:
    """
    Consulta a Meta Ads API com breakdown por region.
    Suporta presets da Meta + last_90d e maximum via time_range.
    """
    url = f"{BASE_URL}/{AD_ACCOUNT}/insights"
    all_data = []

    params = {
        "access_token": META_TOKEN,
        "fields": "campaign_name,impressions,spend,actions,video_p50_watched_actions",
        "breakdowns": "region",
        "level": "campaign",
        "limit": 500,
    }

    # Presets não nativos da Meta → converter para time_range
    if date_preset == "last_90d":
        since = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        until = datetime.now().strftime("%Y-%m-%d")
        params["time_range"] = f'{{"since":"{since}","until":"{until}"}}'
    elif date_preset == "maximum":
        since = "2020-01-01"
        until = datetime.now().strftime("%Y-%m-%d")
        params["time_range"] = f'{{"since":"{since}","until":"{until}"}}'
    else:
        params["date_preset"] = date_preset

    print(f"[Collector] Buscando insights Meta Ads ({date_preset})...")

    while True:
        response = requests.get(url, params=params, timeout=30)
        if response.status_code != 200:
            print(f"[Collector] ERRO Meta API: {response.status_code} — {response.text[:500]}")
            return all_data

        json_resp = response.json()
        data = json_resp.get("data", [])
        all_data.extend(data)

        # Paginação
        paging = json_resp.get("paging", {})
        next_url = paging.get("next")
        if next_url:
            url = next_url
            params = {}  # next_url já tem os params
        else:
            break

    print(f"[Collector] {len(all_data)} registros recebidos da API")
    return all_data


def agregar_por_cidade(raw_data: list) -> dict:
    """
    Agrega registros por cidade.
    Estratégia:
      1. Tenta extrair cidade do nome da campanha
      2. Se não encontrar, agrupa pela região (UF) como fallback
    """
    municipios_index = _build_municipios_index()
    agregado = {}

    sem_cidade = 0
    for row in raw_data:
        region = row.get("region", "").strip()
        uf = REGION_UF.get(region.lower(), "")
        campaign_name = row.get("campaign_name", "")

        # Tenta extrair cidade do nome da campanha
        cidade = _extrair_cidade_campanha(campaign_name, municipios_index)

        if not cidade:
            # Fallback: usa o nome da campanha como está (primeira parte)
            # Se não for casável, agrupa como "Geral" da UF
            if uf:
                cidade = f"[Geral {uf}]"
            else:
                sem_cidade += 1
                continue

        if not uf:
            uf = "SP"  # default para campanhas sem região identificada

        chave = (cidade, uf)
        if chave not in agregado:
            agregado[chave] = {
                "gasto": 0,
                "impressoes": 0,
                "likes": 0,
                "comentarios": 0,
                "saves": 0,
                "cliques_link": 0,
                "video_views_50": 0,
                "compartilhamentos": 0,
            }

        agregado[chave]["gasto"] += float(row.get("spend", 0))
        agregado[chave]["impressoes"] += int(row.get("impressions", 0))

        acoes = _parse_actions(row.get("actions", []))
        for k, v in acoes.items():
            agregado[chave][k] += v

        for vv in row.get("video_p50_watched_actions", []):
            if vv.get("action_type") == "video_view":
                agregado[chave]["video_views_50"] += int(vv.get("value", 0))

    if sem_cidade:
        print(f"[Collector] {sem_cidade} registros sem cidade/região identificada (ignorados)")

    return agregado


def coletar_e_salvar(date_preset: str = "last_7d"):
    """
    Pipeline completo: busca → agrega → salva no banco.
    Retorna quantidade de cidades processadas.
    """
    now = datetime.now()
    periodo_fim = now.strftime("%Y-%m-%d")
    PRESET_DIAS = {
        "last_7d": 7, "last_14d": 14, "last_28d": 28,
        "last_30d": 30, "last_90d": 90, "maximum": 365 * 5,
        "this_month": datetime.now().day,
        "last_month": 30,
    }
    dias = PRESET_DIAS.get(date_preset, 7)
    periodo_inicio = (now - timedelta(days=dias)).strftime("%Y-%m-%d")

    raw = buscar_insights(date_preset)
    if not raw:
        print("[Collector] Nenhum dado retornado. Verifique o token e o ad_account_id.")
        return 0

    agregado = agregar_por_cidade(raw)

    count = 0
    for (cidade, uf), metricas in agregado.items():
        registro = {
            "cidade":             cidade,
            "uf":                 uf,
            "data_coleta":        now.isoformat(),
            "periodo_inicio":     periodo_inicio,
            "periodo_fim":        periodo_fim,
            **metricas,
        }
        salvar_metricas(registro)
        count += 1

    print(f"[Collector] {count} cidades salvas no banco.")
    return count


# ── Modo de simulação para testes sem token real ──────────────────────────────
def coletar_simulado():
    """
    Gera dados fictícios para você testar sem precisar de token da Meta.
    """
    from random import randint, uniform
    from database import get_municipios

    municipios = get_municipios()
    if not municipios:
        print("[Collector] Nenhum município cadastrado. Rode seed_municipios.py primeiro.")
        return 0

    now = datetime.now()
    count = 0
    for m in municipios:
        eleitores = m["eleitores"]
        base = max(eleitores // 200, 10)

        registro = {
            "cidade":             m["cidade"],
            "uf":                 m["uf"],
            "data_coleta":        now.isoformat(),
            "periodo_inicio":     (now - timedelta(days=7)).strftime("%Y-%m-%d"),
            "periodo_fim":        now.strftime("%Y-%m-%d"),
            "gasto":              round(uniform(500, 8000), 2),
            "impressoes":         randint(base * 50, base * 300),
            "likes":              randint(base * 5, base * 40),
            "comentarios":        randint(base // 2, base * 5),
            "compartilhamentos":  randint(base // 3, base * 3),
            "saves":              randint(base // 4, base * 2),
            "cliques_link":       randint(base * 2, base * 20),
            "video_views_50":     randint(base * 3, base * 25),
        }
        salvar_metricas(registro)
        count += 1

    print(f"[Collector] Simulação: {count} cidades geradas.")
    return count


if __name__ == "__main__":
    import sys
    modo = sys.argv[1] if len(sys.argv) > 1 else "real"
    if modo == "simulado":
        coletar_simulado()
    else:
        coletar_e_salvar("last_7d")
