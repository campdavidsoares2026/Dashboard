from datetime import datetime
from database import (
    get_conn, get_municipios, get_ultimo_resultado,
    salvar_resultado, get_resultados_recentes
)

# ── Pesos de intenção de voto ─────────────────────────────────────────────────
PESOS = {
    "comentarios":        3.0,
    "saves":              2.5,
    "compartilhamentos":  2.0,
    "cliques_link":       1.5,
    "video_views_50":     1.2,
    "likes":              0.5,
    "impressoes":         0.1,
}

# ── Limiares de temperatura ───────────────────────────────────────────────────
TEMP_QUENTE = 2.0
TEMP_MORNO  = 0.8


def classificar_temperatura(eem: float) -> str:
    if eem >= TEMP_QUENTE:
        return "quente"
    if eem >= TEMP_MORNO:
        return "morno"
    return "frio"


def calcular_eng_ponderado(metricas: dict) -> tuple[int, float]:
    """Retorna (engajamento_bruto, engajamento_ponderado)."""
    bruto = sum(
        metricas.get(k, 0)
        for k in ["comentarios", "saves", "compartilhamentos",
                  "cliques_link", "video_views_50", "likes", "impressoes"]
    )
    ponderado = sum(
        metricas.get(k, 0) * peso
        for k, peso in PESOS.items()
    )
    return bruto, round(ponderado, 2)


def calcular_cpee(gasto: float, eng_bruto: int, eng_ponderado: float) -> tuple[float, float]:
    """Retorna (cpee_bruto, cpee_ponderado). Retorna 0 se divisão por zero."""
    cpee_bruto     = round(gasto / eng_bruto, 4)     if eng_bruto     > 0 else 0.0
    cpee_ponderado = round(gasto / eng_ponderado, 4) if eng_ponderado > 0 else 0.0
    return cpee_bruto, cpee_ponderado


def calcular_eem(eng_ponderado: float, gasto: float, eleitores: int) -> float:
    """
    EEM — Eficiência Eleitoral por Município
    EEM = (eng_pond / gasto) × (eng_pond / eleitores) × 1000
    Quanto maior, mais eficiente o investimento naquele município.
    """
    if gasto <= 0 or eleitores <= 0:
        return 0.0
    eem = (eng_ponderado / gasto) * (eng_ponderado / eleitores) * 1000
    return round(eem, 4)


def agregar_metricas_recentes(cidade: str, uf: str) -> dict | None:
    """
    Busca a coleta mais recente do banco para a cidade e retorna as métricas.
    """
    conn = get_conn()
    row = conn.execute("""
        SELECT * FROM metricas_raw
        WHERE cidade = ? AND uf = ?
        ORDER BY data_coleta DESC LIMIT 1
    """, (cidade, uf)).fetchone()
    conn.close()
    return dict(row) if row else None


def processar_cidade(cidade: str, uf: str, eleitores: int) -> dict | None:
    """
    Processa uma cidade: lê métricas, calcula CPEE/EEM, salva resultado.
    Retorna o dict de resultado ou None se não houver dados.
    """
    metricas = agregar_metricas_recentes(cidade, uf)
    if not metricas:
        print(f"[Engine] Sem dados para {cidade}/{uf} — pulando.")
        return None

    gasto = metricas.get("gasto", 0)
    eng_bruto, eng_ponderado = calcular_eng_ponderado(metricas)
    cpee_bruto, cpee_ponderado = calcular_cpee(gasto, eng_bruto, eng_ponderado)
    eem = calcular_eem(eng_ponderado, gasto, eleitores)
    temperatura = classificar_temperatura(eem)

    # Verifica temperatura anterior para detectar mudança (trigger de alerta)
    anterior = get_ultimo_resultado(cidade, uf)
    temp_anterior = anterior["temperatura"] if anterior else temperatura

    resultado = {
        "cidade":               cidade,
        "uf":                   uf,
        "data_calculo":         datetime.now().isoformat(),
        "eleitores":            eleitores,
        "gasto":                round(gasto, 2),
        "eng_bruto":            eng_bruto,
        "eng_ponderado":        eng_ponderado,
        "cpee_bruto":           cpee_bruto,
        "cpee_ponderado":       cpee_ponderado,
        "eem":                  eem,
        "temperatura":          temperatura,
        "temperatura_anterior": temp_anterior,
    }

    salvar_resultado(resultado)
    mudou = temp_anterior != temperatura
    sinal = "↑" if temperatura == "quente" else ("→" if temperatura == "morno" else "↓")
    print(f"[Engine] {cidade}/{uf}: EEM={eem:.3f} | {temperatura} {sinal if mudou else ''}")
    return resultado


def rodar_engine() -> list[dict]:
    """
    Processa todos os municípios cadastrados.
    Retorna lista de resultados com flag de mudança de temperatura.
    """
    municipios = get_municipios()
    if not municipios:
        print("[Engine] Nenhum município cadastrado. Importe o CSV do TSE primeiro.")
        return []

    print(f"[Engine] Processando {len(municipios)} municípios...")
    resultados = []
    mudancas = []

    for m in municipios:
        r = processar_cidade(m["cidade"], m["uf"], m["eleitores"])
        if r:
            resultados.append(r)
            if r["temperatura"] != r["temperatura_anterior"]:
                mudancas.append(r)

    print(f"[Engine] Concluído. {len(resultados)} cidades processadas, {len(mudancas)} mudanças de temperatura.")
    return resultados


def ranking_atual() -> list[dict]:
    """Retorna ranking de cidades ordenado por EEM decrescente."""
    return get_resultados_recentes()


def resumo_campanha() -> dict:
    """Retorna totais e médias para o card de sumário do dashboard."""
    dados = get_resultados_recentes()
    if not dados:
        return {}

    total_gasto      = sum(d["gasto"] for d in dados)
    total_eleitores  = sum(d["eleitores"] for d in dados)
    total_eng_pond   = sum(d["eng_ponderado"] for d in dados)
    cpee_medio       = round(total_gasto / total_eng_pond, 2) if total_eng_pond > 0 else 0

    quentes = [d for d in dados if d["temperatura"] == "quente"]
    mornos  = [d for d in dados if d["temperatura"] == "morno"]
    frios   = [d for d in dados if d["temperatura"] == "frio"]

    return {
        "total_cidades":    len(dados),
        "total_gasto":      round(total_gasto, 2),
        "total_eleitores":  total_eleitores,
        "total_eng_pond":   round(total_eng_pond, 2),
        "cpee_medio":       cpee_medio,
        "quentes":          len(quentes),
        "mornos":           len(mornos),
        "frios":            len(frios),
    }


if __name__ == "__main__":
    rodar_engine()
