import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "cpee.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS municipios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            uf TEXT NOT NULL,
            populacao INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS gastos_meta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            municipio_id INTEGER NOT NULL,
            data TEXT NOT NULL,
            valor REAL NOT NULL DEFAULT 0,
            impressoes INTEGER NOT NULL DEFAULT 0,
            cliques INTEGER NOT NULL DEFAULT 0,
            campanha TEXT,
            coletado_em TEXT NOT NULL,
            FOREIGN KEY (municipio_id) REFERENCES municipios(id)
        );

        CREATE INDEX IF NOT EXISTS idx_gastos_data ON gastos_meta(data);
        CREATE INDEX IF NOT EXISTS idx_gastos_municipio ON gastos_meta(municipio_id);
    """)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("Banco de dados inicializado com sucesso.")
