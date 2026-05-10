import jwt
import datetime

SECRET_KEY = "segredo_super_sistema"

def gerar_token(usuario):

    payload = {

        "id": usuario["id"],

        "email": usuario["email"],

        "role": usuario.get("role", "admin"),

        "tenant_id": usuario.get("tenant_id", 1),

        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm="HS256"
    )

    return token