from flask import Blueprint, request, jsonify
from database.database import conectar
import bcrypt
from utils.jwt import gerar_token

auth_bp = Blueprint("auth", __name__)

# =========================
# EMAIL DO DONO DO SISTEMA
# =========================
SUPERADMIN_EMAIL = "jardel.maciel22@gmail.com"


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
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"erro": "Usuário não encontrado"}), 404

        usuario = dict(row)

        if not usuario.get("senha"):
            return jsonify({"erro": "primeiro_acesso"}), 403

        senha_db = usuario["senha"]
        if isinstance(senha_db, str):
            senha_db = senha_db.encode()

        if not bcrypt.checkpw(senha.encode(), senha_db):
            return jsonify({"erro": "Senha inválida"}), 401

        if not usuario.get("ativo", 1):
            return jsonify({"erro": "Usuário inativo"}), 403

        token = gerar_token(usuario)

        return jsonify({
            "token": token,
            "user": {
                "id":        usuario["id"],
                "nome":      usuario["nome"],
                "email":     usuario["email"],
                "role":      usuario.get("role", "admin"),
                "tenant_id": usuario.get("tenant_id", 1),
                # superadmin só se for o dono
                "superadmin": email == SUPERADMIN_EMAIL
            }
        }), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@auth_bp.route("/criar-admin", methods=["GET"])
def criar_admin():

    try:
        conn = conectar()
        cursor = conn.cursor()

        # =========================
        # VERIFICA SE JÁ EXISTE
        # =========================
        cursor.execute("SELECT id FROM users WHERE email = ?", (SUPERADMIN_EMAIL,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"msg": "Superadmin já existe"}), 200

        # =========================
        # GARANTE TENANT
        # =========================
        cursor.execute("SELECT id FROM tenants WHERE codigo = ?", ("superadmin",))
        tenant = cursor.fetchone()

        if tenant:
            tenant_id = tenant["id"]
        else:
            cursor.execute("""
                INSERT INTO tenants (nome, codigo, ativo)
                VALUES (?, ?, 1)
            """, ("Sistema", "superadmin"))
            tenant_id = cursor.lastrowid

        # =========================
        # CRIA SUPERADMIN
        # =========================
        senha_hash = "$2b$12$uWS8Po4Z1NtuixpYTsl5P.2C9cdk2nAKBjprEHG0KF.mpbPJv1TcW"

        cursor.execute("""
            INSERT INTO users (nome, email, senha, role, tenant_id, ativo)
            VALUES (?, ?, ?, ?, ?, 1)
        """, ("Jardel", SUPERADMIN_EMAIL, senha_hash, "admin", tenant_id))

        conn.commit()
        conn.close()

        return jsonify({"msg": "Superadmin criado com sucesso"}), 201

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================
# VERIFICAR EMAIL (reset)
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
        cursor.execute("SELECT id FROM users WHERE email = ? AND ativo = 1", (email,))
        user = cursor.fetchone()
        conn.close()

        if not user:
            return jsonify({"erro": "Email não encontrado ou conta inativa"}), 404

        return jsonify({"msg": "Email verificado"}), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================
# REDEFINIR SENHA (reset)
# =========================
@auth_bp.route("/auth/redefinir-senha", methods=["POST"])
def redefinir_senha():
    try:
        dados = request.get_json()
        email     = dados.get("email", "").strip().lower()
        nova_senha = dados.get("nova_senha", "").strip()

        if not email or not nova_senha:
            return jsonify({"erro": "Email e nova senha obrigatórios"}), 400

        if len(nova_senha) < 6:
            return jsonify({"erro": "Senha deve ter pelo menos 6 caracteres"}), 400

        conn = conectar()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ? AND ativo = 1", (email,))
        user = cursor.fetchone()

        if not user:
            conn.close()
            return jsonify({"erro": "Email não encontrado"}), 404

        senha_hash = bcrypt.hashpw(nova_senha.encode(), bcrypt.gensalt()).decode("utf-8")
        cursor.execute("UPDATE users SET senha = ? WHERE email = ?", (senha_hash, email))
        conn.commit()
        conn.close()

        return jsonify({"msg": "Senha redefinida com sucesso"}), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500