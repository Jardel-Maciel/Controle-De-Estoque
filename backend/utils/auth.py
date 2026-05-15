import jwt
import datetime

SECRET = "SUA_CHAVE_SUPER_FORTE_AQUI"

# =========================
# GERAR TOKEN JWT
# =========================
def gerar_token(usuario):

    payload = {
        "id": usuario["id"],
        "email": usuario["email"],
        "role": usuario["role"],
        "tenant_id": usuario["tenant_id"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }

    return jwt.encode(payload, SECRET, algorithm="HS256")


# =========================
# VALIDAR TOKEN
# =========================
def validar_token(token):

    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except:
        return None