import sqlite3

# =========================
# CONEXÃO
# =========================
def conectar():
    conn = sqlite3.connect("banco.db")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# =========================
# MIGRAÇÃO SEGURA
# =========================
def adicionar_coluna_se_nao_existe(cursor, tabela, coluna, tipo):
    try:
        cursor.execute(f"ALTER TABLE {tabela} ADD COLUMN {coluna} {tipo}")
    except:
        pass


# =========================
# CRIAR TABELAS
# =========================
def criar_tabelas():

    conn = conectar()
    cursor = conn.cursor()

    # =========================
    # TENANTS
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tenants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            codigo TEXT UNIQUE NOT NULL,
            ativo INTEGER DEFAULT 1,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # =========================
    # USERS
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT,
            role TEXT DEFAULT 'cliente',
            tenant_id INTEGER,
            ativo INTEGER DEFAULT 1,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
    """)

    # =========================
    # PRODUTOS
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER,
            produto TEXT,
            quantidade INTEGER DEFAULT 0,
            valor REAL DEFAULT 0,
            fornecedor TEXT,
            contato TEXT,
            cnpj TEXT,
            numero_nota TEXT,
            serie TEXT,
            chave_nfe TEXT,
            data_emissao TEXT,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
    """)

    adicionar_coluna_se_nao_existe(cursor, "produtos", "tenant_id", "INTEGER")

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_produtos_tenant
        ON produtos(tenant_id)
    """)

    # =========================
    # MOVIMENTAÇÕES
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimentacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER,
            produto TEXT,
            tipo TEXT,
            quantidade INTEGER,
            comentario TEXT,
            responsavel TEXT,
            data TEXT,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
    """)

    adicionar_coluna_se_nao_existe(cursor, "movimentacoes", "tenant_id", "INTEGER")

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_mov_tenant
        ON movimentacoes(tenant_id)
    """)

    # =========================
    # NOTAS FISCAIS
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notas_fiscais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER,
            numero_nota TEXT,
            serie TEXT,
            chave_nfe TEXT UNIQUE,
            fornecedor TEXT,
            cnpj TEXT,
            data_emissao TEXT,
            valor_total REAL,
            xml_original TEXT,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
    """)

    adicionar_coluna_se_nao_existe(cursor, "notas_fiscais", "tenant_id", "INTEGER")

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_nf_tenant
        ON notas_fiscais(tenant_id)
    """)
    # =========================
    # MIGRAÇÕES
    # =========================

    try:
        cursor.execute("""
            ALTER TABLE users
            ADD COLUMN ativo INTEGER DEFAULT 1
        """)
    except:
        pass

    try:
        cursor.execute("""
            ALTER TABLE users
            ADD COLUMN criado_em DATETIME
        """)
    except:
        pass

    conn.commit()
    conn.close()