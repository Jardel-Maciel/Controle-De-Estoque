import jwt

SECRET_KEY = "estoque_2026_super_seguro_v2"

# =========================
# GERAR TOKEN (sem expiração)
# =========================
def gerar_token(usuario):

    payload = {
        "id": usuario["id"],
        "email": usuario["email"],
        "role": usuario.get("role", "admin"),
        "tenant_id": usuario.get("tenant_id", 1)
    }

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


# =========================
# VERIFICAR TOKEN
# =========================
def verificar_token(token):

    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

    except jwt.InvalidTokenError:
        return None