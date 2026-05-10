from functools import wraps
from flask import request, jsonify
from utils.jwt import verificar_token

def auth_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization")

        print("AUTH HEADER:", auth_header)  # DEBUG

        if not auth_header:
            return jsonify({"erro": "Token não enviado"}), 401

        token = auth_header.replace("Bearer", "").strip()

        print("TOKEN LIMPO:", token)  # DEBUG

        usuario = verificar_token(token)

        print("USUARIO DECODADO:", usuario)  # DEBUG

        if not usuario:
            return jsonify({"erro": "Sessão expirada"}), 401

        request.usuario = usuario

        return f(*args, **kwargs)

    return decorated