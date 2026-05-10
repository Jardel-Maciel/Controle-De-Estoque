import jwt

from datetime import datetime, timedelta

# =========================
# CHAVE SECRETA
# =========================
SECRET_KEY = "super_secret_key_123"

# =========================
# GERAR TOKEN
# =========================
def gerar_token(usuario):

    payload = {

        "id": usuario["id"],

        "email": usuario["email"],

        "role": usuario.get("role", "admin"),

        "tenant_id": usuario.get("tenant_id", 1),

        # TOKEN VÁLIDO POR 30 DIAS
        "exp": datetime.utcnow() + timedelta(days=30)
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