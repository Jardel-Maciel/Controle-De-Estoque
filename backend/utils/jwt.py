import jwt
import datetime
import os

# =========================
# CHAVE LIDA DO AMBIENTE
# =========================
def _get_secret():
    secret = os.environ.get("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError(
            "Variável de ambiente JWT_SECRET_KEY não definida. "
            "Crie um arquivo .env com JWT_SECRET_KEY=<chave-forte>"
        )
    return secret


# =========================
# GERAR TOKEN (expira em 24h)
# =========================
def gerar_token(usuario):

    payload = {
        "id":        usuario["id"],
        "email":     usuario["email"],
        "role":      usuario.get("role", "admin"),
        "tenant_id": usuario.get("tenant_id", 1),
        "exp":       datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }

    return jwt.encode(payload, _get_secret(), algorithm="HS256")


# =========================
# VERIFICAR TOKEN
# =========================
def verificar_token(token):

    try:
        return jwt.decode(token, _get_secret(), algorithms=["HS256"])

    except jwt.ExpiredSignatureError:
        return None  # token expirado

    except jwt.InvalidTokenError:
        return None  # token inválido ou adulterado