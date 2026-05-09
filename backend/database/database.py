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

    # =========================
    # PRODUTOS
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            produto TEXT UNIQUE,

            quantidade INTEGER DEFAULT 0,

            valor REAL DEFAULT 0,

            fornecedor TEXT,

            contato TEXT,

            cnpj TEXT,

            numero_nota TEXT,

            serie TEXT,

            chave_nfe TEXT,

            data_emissao TEXT
        )
    """)

    # =========================
    # MOVIMENTAÇÕES
    # =========================
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

    # =========================
    # NOTAS FISCAIS
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notas_fiscais (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            numero_nota TEXT,

            serie TEXT,

            chave_nfe TEXT UNIQUE,

            fornecedor TEXT,

            cnpj TEXT,

            data_emissao TEXT,

            valor_total REAL,

            xml_original TEXT
        )
    """)

    # =========================
    # GARANTIR COLUNAS
    # =========================

    colunas = [

        ("fornecedor", "TEXT"),

        ("contato", "TEXT"),

        ("cnpj", "TEXT"),

        ("numero_nota", "TEXT"),

        ("serie", "TEXT"),

        ("chave_nfe", "TEXT"),

        ("data_emissao", "TEXT")
    ]

    for coluna, tipo in colunas:

        try:

            cursor.execute(f"""
                ALTER TABLE produtos
                ADD COLUMN {coluna} {tipo}
            """)

        except:
            pass

    conn.commit()

    conn.close()