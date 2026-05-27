"""
Importa o arquivo de eleitores por município do TSE.

Uso:
    python seed_municipios.py                  # usa dados embutidos (Vale do Paraíba)
    python seed_municipios.py eleitorado.csv   # importa CSV real do TSE

Download do CSV:
    https://dadosabertos.tse.jus.br/dataset/eleitorado-2024
    Arquivo: "perfil_eleitorado_2024.csv"
    Colunas esperadas: NM_MUNICIPIO, SG_UF, QT_ELEITORES_PERFIL
"""

import sys
import csv
from database import init_db, upsert_municipio

# ── Dados embutidos: municípios do Vale do Paraíba/SP para começar ────────────
MUNICIPIOS_DEFAULT = [
    ("São José dos Campos", "SP", 520000),
    ("Jacareí",             "SP", 180000),
    ("Taubaté",             "SP", 240000),
    ("Guaratinguetá",       "SP",  95000),
    ("Lorena",              "SP",  72000),
    ("Pindamonhangaba",     "SP", 110000),
    ("Cruzeiro",            "SP",  62000),
    ("Caçapava",            "SP",  71000),
    ("Caraguatatuba",       "SP",  90000),
    ("Ubatuba",             "SP",  65000),
    ("São Sebastião",       "SP",  62000),
    ("Aparecida",           "SP",  28000),
    ("Potim",               "SP",  16000),
    ("Cunha",               "SP",  18000),
    ("Lagoinha",            "SP",   5000),
]


def seed_default():
    print("[Seed] Carregando municípios padrão (Vale do Paraíba / SP)...")
    for cidade, uf, eleitores in MUNICIPIOS_DEFAULT:
        upsert_municipio(cidade, uf, eleitores)
        print(f"  ✓ {cidade}/{uf} — {eleitores:,} eleitores")
    print(f"[Seed] {len(MUNICIPIOS_DEFAULT)} municípios cadastrados.")


def seed_csv(caminho: str):
    """
    Importa CSV do TSE. Colunas esperadas:
    NM_MUNICIPIO | SG_UF | QT_ELEITORES_PERFIL
    Separador: ; (ponto e vírgula)
    """
    print(f"[Seed] Importando CSV: {caminho}")
    count = 0
    with open(caminho, encoding="latin-1") as f:
        reader = csv.DictReader(f, delimiter=";")
        totais = {}  # agrega múltiplas linhas por cidade (perfis diferentes)
        for row in reader:
            cidade = row.get("NM_MUNICIPIO", "").strip().title()
            uf     = row.get("SG_UF", "").strip().upper()
            qt_str = row.get("QT_ELEITORES_PERFIL", "0").replace(".", "").replace(",", "")
            qt     = int(qt_str) if qt_str.isdigit() else 0
            if cidade and uf:
                chave = (cidade, uf)
                totais[chave] = totais.get(chave, 0) + qt

    for (cidade, uf), eleitores in totais.items():
        upsert_municipio(cidade, uf, eleitores)
        count += 1

    print(f"[Seed] {count} municípios importados do CSV.")


if __name__ == "__main__":
    init_db()
    if len(sys.argv) > 1:
        seed_csv(sys.argv[1])
    else:
        seed_default()
