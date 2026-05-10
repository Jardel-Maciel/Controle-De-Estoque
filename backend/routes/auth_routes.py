from flask import Blueprint, request, jsonify
from database.database import conectar
import bcrypt
from utils.jwt import gerar_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():

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
    usuario = cursor.fetchone()

    conn.close()

    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404

    if usuario["senha"] is None:
        return jsonify({"erro": "primeiro_acesso"}), 403

    senha_db = usuario["senha"]

    if isinstance(senha_db, str):
        senha_db = senha_db.encode()

    if not bcrypt.checkpw(senha.encode(), senha_db):
        return jsonify({"erro": "Senha inválida"}), 401

    token = gerar_token(usuario)

    return jsonify({
        "token": token,
        "user": {
            "id": usuario["id"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "role": usuario.get("role", "admin"),
            "tenant_id": usuario.get("tenant_id", 1)
        }
    }), 200


@auth_bp.route("/criar-admin", methods=["GET"])
def criar_admin():

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", ("admin@teste.com",))

    if cursor.fetchone():
        conn.close()
        return jsonify({"msg": "Admin já existe"}), 200

    senha = bcrypt.hashpw("123456".encode(), bcrypt.gensalt())

    cursor.execute("""
        INSERT INTO users (nome, email, senha, role, tenant_id, ativo)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ("Admin", "admin@teste.com", senha, "admin", 1, 1))

    conn.commit()
    conn.close()

    return jsonify({"msg": "Admin criado"}), 201