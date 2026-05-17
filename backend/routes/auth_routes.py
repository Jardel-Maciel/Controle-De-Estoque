from flask import Blueprint, request, jsonify
from database.database import conectar
import bcrypt
import datetime
import jwt
import os

from utils.jwt import gerar_token, verificar_token

auth_bp = Blueprint("auth", __name__)

SUPERADMIN_EMAIL = "jardel.maciel22@gmail.com"


def _get_secret():
    return os.environ.get("JWT_SECRET_KEY", "fallback-nao-use-em-producao")


# =========================
# GERAR REFRESH TOKEN (expira em 30 dias)
# =========================
def gerar_refresh_token(usuario_id):
    payload = {
        "sub":  usuario_id,
        "tipo": "refresh",
        "exp":  datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }
    return jwt.encode(payload, _get_secret(), algorithm="HS256")


# =========================
# LOGIN
# =========================
@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        if not request.is_json:
            return jsonify({"erro": "Content-Type deve ser application/json"}), 400

        dados = request.get_json()
        email = dados.get("email", "").strip().lower()
        senha = dados.get("senha", "").strip()

        if not email or not senha:
            return jsonify({"erro": "Email e senha obrigatórios"}), 400

        conn = conectar()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        usuario = cursor.fetchone()
        conn.close()

        if not usuario:
            return jsonify({"erro": "Usuário não encontrado"}), 404

        if not usuario.get("senha"):
            return jsonify({"erro": "primeiro_acesso"}), 403

        if not usuario.get("ativo", 1):
            return jsonify({"erro": "Usuário inativo"}), 403

        senha_db = usuario["senha"]
        if isinstance(senha_db, str):
            senha_db = senha_db.encode()

        if not bcrypt.checkpw(senha.encode(), senha_db):
            return jsonify({"erro": "Senha inválida"}), 401

        token         = gerar_token(dict(usuario))
        refresh_token = gerar_refresh_token(usuario["id"])

        return jsonify({
            "token":         token,
            "refresh_token": refresh_token,
            "user": {
                "id":        usuario["id"],
                "nome":      usuario["nome"],
                "email":     usuario["email"],
                "role":      usuario.get("role", "admin"),
                "tenant_id": usuario.get("tenant_id", 1),
                "superadmin": email == SUPERADMIN_EMAIL
            }
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


# =========================
# RENOVAR TOKEN (refresh)
# =========================
@auth_bp.route("/auth/refresh", methods=["POST"])
def refresh():
    try:
        dados = request.get_json()
        refresh_token = dados.get("refresh_token", "").strip()

        if not refresh_token:
            return jsonify({"erro": "refresh_token obrigatório"}), 400

        try:
            payload = jwt.decode(refresh_token, _get_secret(), algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"erro": "Sessão expirada, faça login novamente"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"erro": "Token inválido"}), 401

        if payload.get("tipo") != "refresh":
            return jsonify({"erro": "Token inválido"}), 401

        usuario_id = payload.get("sub")

        conn = conectar()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = %s AND ativo = 1", (usuario_id,))
        usuario = cursor.fetchone()
        conn.close()

        if not usuario:
            return jsonify({"erro": "Usuário não encontrado"}), 404

        novo_token    = gerar_token(dict(usuario))
        novo_refresh  = gerar_refresh_token(usuario["id"])

        return jsonify({
            "token":         novo_token,
            "refresh_token": novo_refresh
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


# =========================
# VERIFICAR EMAIL (reset senha)
# =========================
@auth_bp.route("/auth/verificar-email", methods=["POST"])
def verificar_email():
    try:
        dados = request.get_json()
        email = dados.get("email", "").strip().lower()

        if not email:
            return jsonify({"erro": "Email obrigatório"}), 400

        conn = conectar()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s AND ativo = 1", (email,))
        user = cursor.fetchone()
        conn.close()

        if not user:
            return jsonify({"erro": "Email não encontrado ou conta inativa"}), 404

        return jsonify({"msg": "Email verificado"}), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================
# REDEFINIR SENHA
# =========================
@auth_bp.route("/auth/redefinir-senha", methods=["POST"])
def redefinir_senha():
    try:
        dados = request.get_json()
        email      = dados.get("email", "").strip().lower()
        nova_senha = dados.get("nova_senha", "").strip()

        if not email or not nova_senha:
            return jsonify({"erro": "Email e nova senha obrigatórios"}), 400

        if len(nova_senha) < 6:
            return jsonify({"erro": "Senha deve ter pelo menos 6 caracteres"}), 400

        conn = conectar()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s AND ativo = 1", (email,))
        user = cursor.fetchone()

        if not user:
            conn.close()
            return jsonify({"erro": "Email não encontrado"}), 404

        senha_hash = bcrypt.hashpw(nova_senha.encode(), bcrypt.gensalt()).decode("utf-8")
        cursor.execute("UPDATE users SET senha = %s WHERE email = %s", (senha_hash, email))
        conn.commit()
        conn.close()

        return jsonify({"msg": "Senha redefinida com sucesso"}), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500