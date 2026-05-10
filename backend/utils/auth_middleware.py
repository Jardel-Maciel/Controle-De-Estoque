from functools import wraps
from flask import request, jsonify
from utils.jwt import verificar_token

def auth_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"erro": "Token não enviado"}), 401

        # =========================
        # EXTRAÇÃO SEGURA DO TOKEN
        # =========================
        parts = auth_header.split()

        if len(parts) != 2:
            return jsonify({"erro": "Token inválido"}), 401

        prefix, token = parts

        if prefix.lower() != "bearer":
            return jsonify({"erro": "Token inválido"}), 401

        usuario = verificar_token(token)

        if not usuario:
            return jsonify({"erro": "Sessão expirada"}), 401

        request.usuario = usuario

        return f(*args, **kwargs)

    return decorated