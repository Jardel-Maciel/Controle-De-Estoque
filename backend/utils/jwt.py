import jwt
from datetime import datetime, timedelta

# =========================
# CHAVE JWT
# =========================
SECRET_KEY = "super_secret_key_123"

# =========================
# GERAR TOKEN
# =========================
def gerar_token(usuario):

    payload = {

        "id": usuario.get("id"),

        "email": usuario.get("email"),

        "role": usuario.get("role", "admin"),

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

    except jwt.ExpiredSignatureError:

        return None

    except jwt.InvalidTokenError:

        return None