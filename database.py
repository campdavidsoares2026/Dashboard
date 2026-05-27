import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()
DB_PATH = os.getenv("DB_PATH", "cpee.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS municipios (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            cidade      TEXT NOT NULL,
            uf          TEXT NOT NULL,
            eleitores   INTEGER NOT NULL DEFAULT 0,
            UNIQUE(cidade, uf)
        );

        CREATE TABLE IF NOT EXISTS metricas_raw (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            cidade          TEXT NOT NULL,
            uf              TEXT NOT NULL,
            data_coleta     TEXT NOT NULL,
            periodo_inicio  TEXT,
            periodo_fim     TEXT,
            gasto           REAL DEFAULT 0,
            impressoes      INTEGER DEFAULT 0,
            likes           INTEGER DEFAULT 0,
            comentarios     INTEGER DEFAULT 0,
            compartilhamentos INTEGER DEFAULT 0,
            saves           INTEGER DEFAULT 0,
            cliques_link    INTEGER DEFAULT 0,
            video_views_50  INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS resultados_cpee (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            cidade          TEXT NOT NULL,
            uf              TEXT NOT NULL,
            data_calculo    TEXT NOT NULL,
            eleitores       INTEGER DEFAULT 0,
            gasto           REAL DEFAULT 0,
            eng_bruto       INTEGER DEFAULT 0,
            eng_ponderado   REAL DEFAULT 0,
            cpee_bruto      REAL DEFAULT 0,
            cpee_ponderado  REAL DEFAULT 0,
            eem             REAL DEFAULT 0,
            temperatura     TEXT DEFAULT 'frio',
            temperatura_anterior TEXT DEFAULT 'frio'
        );

        CREATE TABLE IF NOT EXISTS alertas_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            cidade      TEXT NOT NULL,
            uf          TEXT NOT NULL,
            de          TEXT,
            para        TEXT,
            canal       TEXT,
            enviado_em  TEXT
        );
    """)

    conn.commit()
    conn.close()
    print(f"[DB] Banco inicializado em: {DB_PATH}")


def upsert_municipio(cidade: str, uf: str, eleitores: int):
    conn = get_conn()
    conn.execute("""
        INSERT INTO municipios (cidade, uf, eleitores)
        VALUES (?, ?, ?)
        ON CONFLICT(cidade, uf) DO UPDATE SET eleitores = excluded.eleitores
    """, (cidade, uf, eleitores))
    conn.commit()
    conn.close()


def get_municipios():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM municipios ORDER BY cidade").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def salvar_metricas(dados: dict):
    conn = get_conn()
    conn.execute("""
        INSERT INTO metricas_raw
            (cidade, uf, data_coleta, periodo_inicio, periodo_fim,
             gasto, impressoes, likes, comentarios, compartilhamentos,
             saves, cliques_link, video_views_50)
        VALUES
            (:cidade, :uf, :data_coleta, :periodo_inicio, :periodo_fim,
             :gasto, :impressoes, :likes, :comentarios, :compartilhamentos,
             :saves, :cliques_link, :video_views_50)
    """, dados)
    conn.commit()
    conn.close()


def salvar_resultado(r: dict):
    conn = get_conn()
    conn.execute("""
        INSERT INTO resultados_cpee
            (cidade, uf, data_calculo, eleitores, gasto,
             eng_bruto, eng_ponderado, cpee_bruto, cpee_ponderado,
             eem, temperatura, temperatura_anterior)
        VALUES
            (:cidade, :uf, :data_calculo, :eleitores, :gasto,
             :eng_bruto, :eng_ponderado, :cpee_bruto, :cpee_ponderado,
             :eem, :temperatura, :temperatura_anterior)
    """, r)
    conn.commit()
    conn.close()


def get_ultimo_resultado(cidade: str, uf: str):
    conn = get_conn()
    row = conn.execute("""
        SELECT * FROM resultados_cpee
        WHERE cidade = ? AND uf = ?
        ORDER BY data_calculo DESC LIMIT 1
    """, (cidade, uf)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_resultados_recentes():
    conn = get_conn()
    rows = conn.execute("""
        SELECT r.*
        FROM resultados_cpee r
        INNER JOIN (
            SELECT cidade, uf, MAX(data_calculo) AS ultima
            FROM resultados_cpee
            GROUP BY cidade, uf
        ) sub ON r.cidade = sub.cidade AND r.uf = sub.uf AND r.data_calculo = sub.ultima
        ORDER BY r.eem DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_historico_cidade(cidade: str, uf: str, dias: int = 30):
    conn = get_conn()
    rows = conn.execute("""
        SELECT * FROM resultados_cpee
        WHERE cidade = ? AND uf = ?
        ORDER BY data_calculo DESC
        LIMIT ?
    """, (cidade, uf, dias)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def limpar_coleta_anterior():
    """Remove métricas e resultados antigos para nova coleta limpa."""
    conn = get_conn()
    conn.execute("DELETE FROM metricas_raw")
    conn.execute("DELETE FROM resultados_cpee")
    conn.commit()
    conn.close()
    print("[DB] Dados anteriores limpos para nova coleta.")


def registrar_alerta(cidade, uf, de, para, canal):
    from datetime import datetime
    conn = get_conn()
    conn.execute("""
        INSERT INTO alertas_log (cidade, uf, de, para, canal, enviado_em)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (cidade, uf, de, para, canal, datetime.now().isoformat()))
    conn.commit()
    conn.close()
