from functools import wraps
from flask import request, jsonify, g
from utils.jwt import verificar_token


def auth_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"erro": "Token não enviado"}), 401

        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"erro": "Token inválido"}), 401

        token = parts[1].strip()

        usuario = verificar_token(token)

        if not usuario:
            return jsonify({"erro": "Sessão expirada"}), 401

        g.usuario = usuario

        return f(*args, **kwargs)

    return decorated