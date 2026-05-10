from functools import wraps
from flask import request, jsonify

from utils.jwt import verificar_token

# =========================
# AUTH MIDDLEWARE
# =========================
def auth_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization")

        if not auth_header:

            return jsonify({
                "erro": "Token não enviado"
            }), 401

        try:

            token = auth_header.split(" ")[1]

        except:

            return jsonify({
                "erro": "Token inválido"
            }), 401

        usuario = verificar_token(token)

        if not usuario:

            return jsonify({
                "erro": "Sessão expirada"
            }), 401

        request.usuario = usuario

        return f(*args, **kwargs)

    return decorated