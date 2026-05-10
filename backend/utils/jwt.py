import jwt
import datetime

SECRET_KEY = "sua_chave_super_secreta_muito_forte"

# =========================
# GERAR TOKEN
# =========================
def gerar_token(usuario):

    payload = {
        "user_id": usuario["id"],
        "email": usuario["email"],
        "tipo": usuario["tipo"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

    return token


# =========================
# VALIDAR TOKEN
# =========================
def verificar_token(token):

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded

    except jwt.ExpiredSignatureError:
        return None

    except jwt.InvalidTokenError:
        return None