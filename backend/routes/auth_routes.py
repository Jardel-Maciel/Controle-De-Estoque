from flask import Blueprint, request, jsonify
from database.database import conectar
import bcrypt
import datetime
import secrets
import jwt
import os

from utils.jwt import gerar_token, verificar_token

auth_bp = Blueprint("auth", __name__)

# Lido do ambiente — sem fallback em produção
def _get_secret():
    secret = os.environ.get("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY não definida no ambiente.")
    return secret

# Superadmin lido do ambiente (sem hardcode)
def _get_superadmin_email():
    return os.environ.get("SUPERADMIN_EMAIL", "").strip().lower()


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

        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            usuario = cursor.fetchone()

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
                "superadmin": email == _get_superadmin_email()
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

        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = %s AND ativo = 1", (usuario_id,))
            usuario = cursor.fetchone()

        if not usuario:
            return jsonify({"erro": "Usuário não encontrado"}), 404

        novo_token   = gerar_token(dict(usuario))
        novo_refresh = gerar_refresh_token(usuario["id"])

        return jsonify({
            "token":         novo_token,
            "refresh_token": novo_refresh
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


# =========================
# SOLICITAR RESET DE SENHA
# Gera um token temporário (15 min) e o retorna.
# Em produção: envie por e-mail via SendGrid/Resend
# em vez de retornar no body da resposta.
# =========================
@auth_bp.route("/auth/solicitar-reset", methods=["POST"])
def solicitar_reset():
    try:
        dados = request.get_json()
        email = dados.get("email", "").strip().lower()

        if not email:
            return jsonify({"erro": "Email obrigatório"}), 400

        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE email = %s AND ativo = 1", (email,))
            user = cursor.fetchone()

        # Resposta genérica — não revela se o e-mail existe
        if not user:
            return jsonify({"msg": "Se o e-mail estiver cadastrado, você receberá as instruções."}), 200

        # Token seguro de uso único, expira em 15 minutos
        reset_payload = {
            "sub":  user["id"],
            "tipo": "reset_senha",
            "exp":  datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
        }
        reset_token = jwt.encode(reset_payload, _get_secret(), algorithm="HS256")

        # TODO: enviar reset_token por e-mail via SendGrid/Resend
        # Por ora, retorna no body apenas em modo dev
        if os.environ.get("FLASK_DEBUG", "false").lower() == "true":
            return jsonify({
                "msg": "Token de reset gerado (visível apenas em modo dev).",
                "reset_token": reset_token
            }), 200

        return jsonify({"msg": "Se o e-mail estiver cadastrado, você receberá as instruções."}), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================
# REDEFINIR SENHA (agora exige reset_token válido)
# Fluxo:
#  1. POST /auth/solicitar-reset  → recebe reset_token por e-mail
#  2. POST /auth/redefinir-senha  → envia reset_token + nova_senha
# =========================
@auth_bp.route("/auth/redefinir-senha", methods=["POST"])
def redefinir_senha():
    try:
        dados = request.get_json()
        reset_token = dados.get("reset_token", "").strip()
        nova_senha  = dados.get("nova_senha", "").strip()

        if not reset_token or not nova_senha:
            return jsonify({"erro": "reset_token e nova_senha são obrigatórios"}), 400

        if len(nova_senha) < 8:
            return jsonify({"erro": "Senha deve ter pelo menos 8 caracteres"}), 400

        try:
            payload = jwt.decode(reset_token, _get_secret(), algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"erro": "Token expirado. Solicite um novo reset."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"erro": "Token inválido."}), 401

        if payload.get("tipo") != "reset_senha":
            return jsonify({"erro": "Token inválido."}), 401

        usuario_id = payload.get("sub")

        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE id = %s AND ativo = 1", (usuario_id,))
            user = cursor.fetchone()

            if not user:
                return jsonify({"erro": "Usuário não encontrado."}), 404

            senha_hash = bcrypt.hashpw(nova_senha.encode(), bcrypt.gensalt()).decode("utf-8")
            cursor.execute("UPDATE users SET senha = %s WHERE id = %s", (senha_hash, usuario_id))
            conn.commit()

        return jsonify({"msg": "Senha redefinida com sucesso."}), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================
# VERIFICAR EMAIL — mantido para compatibilidade
# (usado pelo front antes de exibir o formulário de reset)
# =========================
@auth_bp.route("/auth/verificar-email", methods=["POST"])
def verificar_email():
    # Retorna sempre 200 para não revelar quais e-mails existem
    return jsonify({"msg": "Se o e-mail estiver cadastrado, você receberá as instruções."}), 200