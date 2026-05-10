from flask import Blueprint, request, jsonify
from database.database import conectar
import bcrypt

from utils.jwt import gerar_token

auth_bp = Blueprint("auth", __name__)

# =========================
# LOGIN
# =========================
@auth_bp.route("/login", methods=["POST", "OPTIONS"])
def login():

    # CORS PRE-FLIGHT
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:

        # =========================
        # VALIDAR JSON
        # =========================
        if not request.is_json:

            return jsonify({
                "erro": "Content-Type deve ser application/json"
            }), 400

        dados = request.get_json()

        if not dados:

            return jsonify({
                "erro": "JSON inválido"
            }), 400

        email = str(
            dados.get("email", "")
        ).strip().lower()

        senha = str(
            dados.get("senha", "")
        ).strip()

        # =========================
        # CAMPOS OBRIGATÓRIOS
        # =========================
        if not email or not senha:

            return jsonify({
                "erro": "Email e senha obrigatórios"
            }), 400

        # =========================
        # BANCO
        # =========================
        conn = conectar()

        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM users
            WHERE email = ?
            LIMIT 1
        """, (email,))

        usuario = cursor.fetchone()

        conn.close()

        # =========================
        # USUÁRIO NÃO ENCONTRADO
        # =========================
        if not usuario:

            return jsonify({
                "erro": "Usuário não encontrado"
            }), 404

        # =========================
        # USUÁRIO INATIVO
        # =========================
        if usuario["ativo"] == 0:

            return jsonify({
                "erro": "Usuário desativado"
            }), 403

        # =========================
        # PRIMEIRO ACESSO
        # =========================
        if usuario["senha"] is None:

            return jsonify({
                "erro": "primeiro_acesso"
            }), 403

        # =========================
        # SENHA HASH
        # =========================
        senha_db = usuario["senha"]

        if isinstance(senha_db, str):
            senha_db = senha_db.encode()

        # =========================
        # VALIDAR SENHA
        # =========================
        senha_ok = bcrypt.checkpw(
            senha.encode(),
            senha_db
        )

        if not senha_ok:

            return jsonify({
                "erro": "Senha inválida"
            }), 401

        # =========================
        # GERAR JWT
        # =========================
        token = gerar_token(usuario)

        # =========================
        # SUCESSO
        # =========================
        return jsonify({

            "token": token,

            "user": {

                "id": usuario["id"],

                "nome": usuario["nome"],

                "email": usuario["email"],

                "role": usuario["role"],

                "tenant_id": usuario["tenant_id"]
            }
        }), 200

    except Exception as e:

        print("ERRO LOGIN:", str(e))

        return jsonify({
            "erro": str(e)
        }), 500


# =========================
# DEFINIR SENHA
# =========================
@auth_bp.route("/definir-senha", methods=["POST", "OPTIONS"])
def definir_senha():

    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:

        if not request.is_json:

            return jsonify({
                "erro": "Content-Type deve ser application/json"
            }), 400

        dados = request.get_json()

        email = str(
            dados.get("email", "")
        ).strip().lower()

        senha = str(
            dados.get("senha", "")
        ).strip()

        if not email or not senha:

            return jsonify({
                "erro": "Email e senha obrigatórios"
            }), 400

        senha_hash = bcrypt.hashpw(
            senha.encode(),
            bcrypt.gensalt()
        )

        conn = conectar()

        cursor = conn.cursor()

        cursor.execute("""
            UPDATE users
            SET senha = ?
            WHERE email = ?
        """, (
            senha_hash,
            email
        ))

        conn.commit()

        atualizado = cursor.rowcount

        conn.close()

        if atualizado == 0:

            return jsonify({
                "erro": "Usuário não encontrado"
            }), 404

        return jsonify({
            "msg": "Senha definida com sucesso"
        })

    except Exception as e:

        print("ERRO DEFINIR SENHA:", str(e))

        return jsonify({
            "erro": str(e)
        }), 500