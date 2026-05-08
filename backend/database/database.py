import sqlite3

# =========================
# CONEXÃO
# =========================
def conectar():

    conn = sqlite3.connect("banco.db")

    conn.row_factory = sqlite3.Row

    return conn


# =========================
# TABELAS
# =========================
def criar_tabelas():

    conn = conectar()

    cursor = conn.cursor()

    # PRODUTOS
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT UNIQUE,
            quantidade INTEGER DEFAULT 0,
            valor REAL DEFAULT 0
        )
    """)

    # MOVIMENTAÇÕES
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimentacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT,
            tipo TEXT,
            quantidade INTEGER,
            comentario TEXT,
            responsavel TEXT,
            data TEXT
        )
    """)

    conn.commit()

    conn.close()