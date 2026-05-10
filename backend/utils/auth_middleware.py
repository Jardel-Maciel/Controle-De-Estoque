from functools import wraps
from flask import request, jsonify
from utils.jwt import verificar_token

# =========================
# MIDDLEWARE DE AUTENTICAÇÃO
# =========================
def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"erro": "Token não enviado"}), 401

        # remove "Bearer "
        if "Bearer " in token:
            token = token.replace("Bearer ", "")

        payload = verificar_token(token)

        if not payload:
            return jsonify({"erro": "Token inválido ou expirado"}), 401

        # injeta usuário na rota
        request.user = payload

        return f(*args, **kwargs)

    return decorated