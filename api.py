import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from database import init_db, get_resultados_recentes, get_historico_cidade, get_municipios, limpar_coleta_anterior
from cpee_engine import resumo_campanha, rodar_engine
from data_collector import coletar_e_salvar, coletar_simulado
from alertas import verificar_e_alertar

load_dotenv()

app = Flask(__name__, static_folder="dashboard")
CORS(app)

PORT = int(os.getenv("DASHBOARD_PORT", 5000))


# ── Static ──────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory("dashboard", "index.html")


@app.route("/static/<path:path>")
def static_files(path):
    return send_from_directory("dashboard/static", path)


# ── API: Resumo geral ────────────────────────────────────────────────────────
@app.route("/api/resumo")
def api_resumo():
    return jsonify(resumo_campanha())


# ── API: Ranking de cidades ──────────────────────────────────────────────────
@app.route("/api/ranking")
def api_ranking():
    temperatura = request.args.get("temperatura")   # quente | morno | frio
    dados = get_resultados_recentes()
    if temperatura:
        dados = [d for d in dados if d["temperatura"] == temperatura]
    return jsonify(dados)


# ── API: Histórico de uma cidade ─────────────────────────────────────────────
@app.route("/api/historico/<uf>/<cidade>")
def api_historico(uf, cidade):
    dias = int(request.args.get("dias", 30))
    dados = get_historico_cidade(cidade, uf.upper(), dias)
    return jsonify(dados)


# ── API: Lista de municípios cadastrados ─────────────────────────────────────
@app.route("/api/municipios")
def api_municipios():
    return jsonify(get_municipios())


# ── API: Dispara coleta + cálculo manualmente ─────────────────────────────────
@app.route("/api/coletar", methods=["POST"])
def api_coletar():
    modo = request.json.get("modo", "real") if request.is_json else "real"
    try:
        limpar_coleta_anterior()
        if modo == "simulado":
            coletar_simulado()
        else:
            periodo = request.json.get("periodo", "last_7d") if request.is_json else "last_7d"
            coletar_e_salvar(periodo)
        resultados = rodar_engine()
        verificar_e_alertar(resultados)
        return jsonify({"ok": True, "cidades": len(resultados)})
    except Exception as e:
        return jsonify({"ok": False, "erro": str(e)}), 500


# ── API: Distribuição de temperaturas ────────────────────────────────────────
@app.route("/api/distribuicao")
def api_distribuicao():
    dados = get_resultados_recentes()
    dist = {"quente": 0, "morno": 0, "frio": 0}
    for d in dados:
        dist[d["temperatura"]] = dist.get(d["temperatura"], 0) + 1
    return jsonify(dist)


# ── API: Top N cidades por EEM ────────────────────────────────────────────────
@app.route("/api/top")
def api_top():
    n = int(request.args.get("n", 5))
    dados = get_resultados_recentes()
    return jsonify(dados[:n])


if __name__ == "__main__":
    init_db()
    print(f"[API] Dashboard disponível em http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
