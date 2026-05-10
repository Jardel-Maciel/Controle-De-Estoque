import jwt
from datetime import datetime, timedelta

SECRET_KEY = "super_secret_key_123"

def gerar_token(usuario):

    payload = {
        "id": usuario["id"],
        "email": usuario["email"],
        "role": usuario.get("role", "admin"),
        "tenant_id": usuario.get("tenant_id", 1),
        "exp": datetime.utcnow() + timedelta(days=7)
    }

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def verificar_token(token):

    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

    except jwt.ExpiredSignatureError:
        return None

    except jwt.InvalidTokenError:
        return None