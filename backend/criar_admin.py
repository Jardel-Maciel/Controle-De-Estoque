from database.database import conectar
import bcrypt

conn = conectar()
cursor = conn.cursor()

# =========================
# CRIAR TENANT
# =========================
cursor.execute("""
    INSERT INTO tenants (
        nome,
        codigo
    )
    VALUES (?, ?)
""", (
    "Empresa Teste",
    "empresa_teste"
))

tenant_id = cursor.lastrowid

# =========================
# SENHA HASH
# =========================
senha = "123456"

senha_hash = bcrypt.hashpw(
    senha.encode(),
    bcrypt.gensalt()
)

# =========================
# CRIAR ADMIN
# =========================
cursor.execute("""
    INSERT INTO users (
        nome,
        email,
        senha,
        role,
        tenant_id
    )
    VALUES (?, ?, ?, ?, ?)
""", (
    "Administrador",
    "admin@teste.com",
    senha_hash,
    "admin",
    tenant_id
))

conn.commit()
conn.close()

print("ADMIN CRIADO COM SUCESSO")
print("EMAIL: admin@teste.com")
print("SENHA: 123456")