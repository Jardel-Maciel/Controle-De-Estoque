from flask import Blueprint, request, jsonify
import uuid

from utils.auth import usuarios

auth_bp = Blueprint("auth", __name__)

# =========================
# LOGIN
# =========================
@auth_bp.route("/login", methods=["POST", "OPTIONS"])
def login():

    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:

        dados = request.get_json(force=True)

        email = dados.get("email")
        senha = dados.get("senha")

        for usuario in usuarios:

            if (
                usuario["email"] == email
                and usuario["senha"] == senha
            ):

                return jsonify({
                    "token": str(uuid.uuid4())
                })

        return jsonify({
            "erro": "Credenciais inválidas"
        }), 401

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500