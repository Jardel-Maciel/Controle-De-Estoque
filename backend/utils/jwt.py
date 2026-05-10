import jwt
from datetime import datetime, timedelta

# =========================
# CHAVE SECRETA
# =========================
SECRET_KEY = "segredo_super_saas"

# =========================
# GERAR TOKEN
# =========================
def gerar_token(usuario):

    payload = {

        "id": usuario["id"],

        "email": usuario["email"],

        "role": usuario.get("role", "cliente"),

        "tenant_id": usuario.get("tenant_id", 1),

        "exp": datetime.utcnow() + timedelta(days=7)
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm="HS256"
    )

    return token


# =========================
# VERIFICAR TOKEN
# =========================
def verificar_token(token):

    try:

        dados = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256"]
        )

        return dados

    except Exception:

        return None