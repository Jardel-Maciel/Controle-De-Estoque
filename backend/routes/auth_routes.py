from flask import Blueprint, request, jsonify
from database.database import conectar
import bcrypt

from utils.jwt import gerar_token

auth_bp = Blueprint("auth", __name__)

# =========================
# LOGIN REAL (JWT + SQLITE)
# =========================
@auth_bp.route("/login", methods=["POST", "OPTIONS"])
def login():

    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        dados = request.get_json(force=True)

        email = dados.get("email")
        senha = dados.get("senha")

        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM users WHERE email = ?
        """, (email,))

        usuario = cursor.fetchone()

        conn.close()

        if not usuario:
            return jsonify({"erro": "Usuário não encontrado"}), 404

        # =========================
        # PRIMEIRO ACESSO
        # =========================
        if usuario["senha"] is None:
            return jsonify({"erro": "primeiro_acesso"}), 403

        # =========================
        # VALIDAR SENHA (bcrypt correto)
        # =========================
        senha_db = usuario["senha"]

        if isinstance(senha_db, str):
            senha_db = senha_db.encode()

        if not bcrypt.checkpw(senha.encode(), senha_db):
            return jsonify({"erro": "Senha inválida"}), 401

        # =========================
        # GERAR JWT
        # =========================
        token = gerar_token(usuario)

        return jsonify({
            "token": token,
            "user": {
                "id": usuario["id"],
                "email": usuario["email"],
                "role": usuario["role"],
                "tenant_id": usuario["tenant_id"]
            }
        })

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================
# DEFINIR SENHA (1º ACESSO)
# =========================
@auth_bp.route("/definir-senha", methods=["POST"])
def definir_senha():

    try:
        dados = request.json

        email = dados.get("email")
        senha = dados.get("senha")

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
        """, (senha_hash, email))

        conn.commit()
        conn.close()

        return jsonify({"ok": True})

    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    
    # =========================
# CRIAR ADMIN TEMPORÁRIO
# =========================
@auth_bp.route("/criar-admin")
def criar_admin():

    try:

        conn = conectar()
        cursor = conn.cursor()

        # tenant
        cursor.execute("""
            INSERT INTO tenants (
                nome,
                codigo
            )
            VALUES (?, ?)
        """, (
            "Empresa Teste",
            "empresa_teste"
        ))

        tenant_id = cursor.lastrowid

        senha = "123456"

        senha_hash = bcrypt.hashpw(
            senha.encode(),
            bcrypt.gensalt()
        )

        cursor.execute("""
            INSERT INTO users (
                nome,
                email,
                senha,
                role,
                tenant_id
            )
            VALUES (?, ?, ?, ?, ?)
        """, (
            "Administrador",
            "admin@teste.com",
            senha_hash,
            "admin",
            tenant_id
        ))

        conn.commit()
        conn.close()

        return jsonify({
            "msg": "Admin criado",
            "email": "admin@teste.com",
            "senha": "123456"
        })

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500