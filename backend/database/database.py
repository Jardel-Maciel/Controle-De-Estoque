import psycopg2
import psycopg2.extras
import os

# =========================
# CONEXÃO
# =========================
def conectar():
    conn = psycopg2.connect(
        os.environ["DATABASE_URL"],
        cursor_factory=psycopg2.extras.RealDictCursor
    )
    return conn


# =========================
# CRIAR TABELAS
# =========================
def criar_tabelas():

    conn = conectar()
    cursor = conn.cursor()

    # TENANTS
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tenants (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            codigo TEXT UNIQUE NOT NULL,
            ativo INTEGER DEFAULT 1,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # USERS
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT,
            role TEXT DEFAULT 'cliente',
            tenant_id INTEGER REFERENCES tenants(id),
            ativo INTEGER DEFAULT 1,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # PRODUTOS
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER REFERENCES tenants(id),
            produto TEXT,
            quantidade FLOAT DEFAULT 0,
            valor FLOAT DEFAULT 0,
            fornecedor TEXT,
            contato TEXT,
            cnpj TEXT,
            numero_nota TEXT,
            serie TEXT,
            chave_nfe TEXT,
            data_emissao TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(tenant_id)
    """)

    # MOVIMENTAÇÕES
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimentacoes (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER REFERENCES tenants(id),
            produto TEXT,
            tipo TEXT,
            quantidade FLOAT,
            comentario TEXT,
            responsavel TEXT,
            data TEXT
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_mov_tenant ON movimentacoes(tenant_id)
    """)

    # NOTAS FISCAIS
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notas_fiscais (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER REFERENCES tenants(id),
            numero_nota TEXT,
            serie TEXT,
            chave_nfe TEXT UNIQUE,
            fornecedor TEXT,
            cnpj TEXT,
            data_emissao TEXT,
            valor_total FLOAT,
            xml_original TEXT
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_nf_tenant ON notas_fiscais(tenant_id)
    """)

    conn.commit()

    # =========================
    # SUPERADMIN AUTOMÁTICO
    # =========================
    SUPERADMIN_EMAIL = "jardel.maciel22@gmail.com"
    SUPERADMIN_SENHA = "$2b$12$uWS8Po4Z1NtuixpYTsl5P.2C9cdk2nAKBjprEHG0KF.mpbPJv1TcW"

    # Cria tenant se não existir
    cursor.execute("SELECT id FROM tenants WHERE codigo = %s", ("superadmin",))
    tenant = cursor.fetchone()

    if not tenant:
        cursor.execute("""
            INSERT INTO tenants (nome, codigo, ativo)
            VALUES (%s, %s, 1)
            RETURNING id
        """, ("Sistema", "superadmin"))
        tenant_id = cursor.fetchone()["id"]
    else:
        tenant_id = tenant["id"]

    # Cria superadmin se não existir
    cursor.execute("SELECT id FROM users WHERE email = %s", (SUPERADMIN_EMAIL,))
    if not cursor.fetchone():
        cursor.execute("""
            INSERT INTO users (nome, email, senha, role, tenant_id, ativo)
            VALUES (%s, %s, %s, %s, %s, 1)
        """, ("Jardel", SUPERADMIN_EMAIL, SUPERADMIN_SENHA, "admin", tenant_id))

    conn.commit()
    conn.close()

    print("✅ Tabelas criadas e superadmin verificado.")
