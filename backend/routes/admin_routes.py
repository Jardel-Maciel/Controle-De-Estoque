from flask import Blueprint, request, jsonify, g
import bcrypt
import os
from database.database import conectar
from utils.auth_middleware import auth_required

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def _get_superadmin_email():
    return os.environ.get("SUPERADMIN_EMAIL", "").strip().lower()


def apenas_superadmin(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if g.usuario.get("email") != _get_superadmin_email():
            return jsonify({"erro": "Acesso negado"}), 403
        return f(*args, **kwargs)
    return decorated


@admin_bp.route("/usuarios", methods=["GET"])
@auth_required
@apenas_superadmin
def listar_usuarios():
    try:
        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT u.id, u.nome, u.email, u.role, u.ativo, u.criado_em,
                       t.nome as tenant_nome, t.codigo as tenant_codigo
                FROM users u
                LEFT JOIN tenants t ON u.tenant_id = t.id
                ORDER BY u.id DESC
            """)
            usuarios = [dict(row) for row in cursor.fetchall()]
        return jsonify(usuarios)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@admin_bp.route("/usuarios", methods=["POST"])
@auth_required
@apenas_superadmin
def criar_usuario():
    try:
        dados = request.get_json()
        nome    = dados.get("nome", "").strip()
        email   = dados.get("email", "").strip().lower()
        senha   = dados.get("senha", "").strip()
        role    = dados.get("role", "admin")
        empresa = dados.get("empresa", nome).strip()
        codigo  = dados.get("codigo", email.split("@")[0]).strip()

        if not nome or not email or not senha:
            return jsonify({"erro": "Nome, email e senha são obrigatórios"}), 400

        with conectar() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                return jsonify({"erro": "Email já cadastrado"}), 400

            cursor.execute("SELECT id FROM tenants WHERE codigo = %s", (codigo,))
            tenant = cursor.fetchone()
            if tenant:
                tenant_id = tenant["id"]
            else:
                cursor.execute("""
                    INSERT INTO tenants (nome, codigo, ativo) VALUES (%s, %s, 1) RETURNING id
                """, (empresa, codigo))
                tenant_id = cursor.fetchone()["id"]

            senha_hash = bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode("utf-8")
            cursor.execute("""
                INSERT INTO users (nome, email, senha, role, tenant_id, ativo)
                VALUES (%s, %s, %s, %s, %s, 1)
            """, (nome, email, senha_hash, role, tenant_id))
            conn.commit()

        return jsonify({"msg": "Usuário criado com sucesso"}), 201

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


@admin_bp.route("/usuarios/<int:user_id>/toggle", methods=["PATCH"])
@auth_required
@apenas_superadmin
def toggle_usuario(user_id):
    try:
        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, ativo, email FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"erro": "Usuário não encontrado"}), 404
            if user["email"] == _get_superadmin_email():
                return jsonify({"erro": "Não é possível desativar o superadmin"}), 403
            novo = 0 if user["ativo"] else 1
            cursor.execute("UPDATE users SET ativo = %s WHERE id = %s", (novo, user_id))
            conn.commit()
        return jsonify({"msg": "Status atualizado", "ativo": novo})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@admin_bp.route("/usuarios/<int:user_id>/senha", methods=["PATCH"])
@auth_required
@apenas_superadmin
def resetar_senha(user_id):
    try:
        dados = request.get_json()
        nova_senha = dados.get("senha", "").strip()
        if not nova_senha or len(nova_senha) < 4:
            return jsonify({"erro": "Senha muito curta (mínimo 4 caracteres)"}), 400
        senha_hash = bcrypt.hashpw(nova_senha.encode(), bcrypt.gensalt()).decode("utf-8")
        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET senha = %s WHERE id = %s", (senha_hash, user_id))
            conn.commit()
        return jsonify({"msg": "Senha atualizada com sucesso"})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@admin_bp.route("/usuarios/<int:user_id>", methods=["DELETE"])
@auth_required
@apenas_superadmin
def excluir_usuario(user_id):
    try:
        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT email FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"erro": "Usuário não encontrado"}), 404
            if user["email"] == _get_superadmin_email():
                return jsonify({"erro": "Não é possível excluir o superadmin"}), 403
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
        return jsonify({"msg": "Usuário excluído com sucesso"})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@admin_bp.route("/tenants", methods=["GET"])
@auth_required
@apenas_superadmin
def listar_tenants():
    try:
        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT t.id, t.nome, t.codigo, t.ativo,
                       COUNT(u.id) as total_usuarios
                FROM tenants t
                LEFT JOIN users u ON u.tenant_id = t.id
                GROUP BY t.id
                ORDER BY t.id DESC
            """)
            tenants = [dict(row) for row in cursor.fetchall()]
        return jsonify(tenants)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500