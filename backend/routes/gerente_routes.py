from flask import Blueprint, jsonify, request, g
import bcrypt
from database.database import conectar
from utils.auth_middleware import auth_required

gerente_bp = Blueprint("gerente", __name__, url_prefix="/gerente")


def apenas_gerente(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        role = g.usuario.get("role", "")
        if role not in ("gerente", "admin"):
            return jsonify({"erro": "Acesso negado"}), 403
        return f(*args, **kwargs)
    return decorated


# =========================
# DASHBOARD DA EQUIPE
# =========================
@gerente_bp.route("/dashboard", methods=["GET"])
@auth_required
@apenas_gerente
def dashboard_equipe():
    try:
        tenant_id = g.usuario["tenant_id"]

        with conectar() as conn:
            cursor = conn.cursor()

            # Total de usuários ativos no prédio
            cursor.execute("""
                SELECT COUNT(*) AS total FROM users
                WHERE tenant_id = %s AND ativo = 1 AND role != 'gerente'
            """, (tenant_id,))
            total_usuarios = cursor.fetchone()["total"]

            # Movimentações pendentes de aprovação
            cursor.execute("""
                SELECT COUNT(*) AS total FROM movimentacoes
                WHERE tenant_id = %s AND status = 'pendente'
            """, (tenant_id,))
            pendentes = cursor.fetchone()["total"]

            # Movimentações do mês atual
            cursor.execute("""
                SELECT COUNT(*) AS total FROM movimentacoes
                WHERE tenant_id = %s
                AND data >= date_trunc('month', CURRENT_DATE)::text
            """, (tenant_id,))
            mov_mes = cursor.fetchone()["total"]

            # Movimentações por responsável (top 5)
            cursor.execute("""
                SELECT responsavel, COUNT(*) AS total
                FROM movimentacoes
                WHERE tenant_id = %s AND responsavel IS NOT NULL AND responsavel != ''
                GROUP BY responsavel
                ORDER BY total DESC
                LIMIT 5
            """, (tenant_id,))
            por_responsavel = [dict(r) for r in cursor.fetchall()]

            # Últimas 10 movimentações da equipe
            cursor.execute("""
                SELECT m.*, u.nome as usuario_nome
                FROM movimentacoes m
                LEFT JOIN users u ON u.nome = m.responsavel AND u.tenant_id = m.tenant_id
                WHERE m.tenant_id = %s
                ORDER BY m.id DESC
                LIMIT 10
            """, (tenant_id,))
            recentes = [dict(r) for r in cursor.fetchall()]

        return jsonify({
            "total_usuarios":   total_usuarios,
            "pendentes":        pendentes,
            "mov_mes":          mov_mes,
            "por_responsavel":  por_responsavel,
            "recentes":         recentes,
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


# =========================
# LISTAR USUÁRIOS DO PRÉDIO
# =========================
@gerente_bp.route("/usuarios", methods=["GET"])
@auth_required
@apenas_gerente
def listar_usuarios():
    try:
        tenant_id = g.usuario["tenant_id"]

        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, nome, email, role, ativo, criado_em
                FROM users
                WHERE tenant_id = %s
                ORDER BY role, nome
            """, (tenant_id,))
            usuarios = [dict(u) for u in cursor.fetchall()]

        return jsonify(usuarios)

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================
# CRIAR USUÁRIO NO PRÉDIO
# =========================
@gerente_bp.route("/usuarios", methods=["POST"])
@auth_required
@apenas_gerente
def criar_usuario():
    try:
        tenant_id = g.usuario["tenant_id"]
        dados = request.get_json()

        nome  = dados.get("nome", "").strip()
        email = dados.get("email", "").strip().lower()
        senha = dados.get("senha", "").strip()
        role  = dados.get("role", "cliente")

        if not nome or not email or not senha:
            return jsonify({"erro": "Nome, email e senha são obrigatórios"}), 400

        # Gerente não pode criar outro gerente
        if role == "gerente" and g.usuario.get("role") != "admin":
            return jsonify({"erro": "Apenas o admin pode criar gerentes"}), 403

        with conectar() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                return jsonify({"erro": "Email já cadastrado"}), 400

            senha_hash = bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode("utf-8")
            cursor.execute("""
                INSERT INTO users (nome, email, senha, role, tenant_id, ativo)
                VALUES (%s, %s, %s, %s, %s, 1)
            """, (nome, email, senha_hash, role, tenant_id))
            conn.commit()

        return jsonify({"msg": "Usuário criado com sucesso"}), 201

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================
# ATIVAR / DESATIVAR USUÁRIO DO PRÉDIO
# =========================
@gerente_bp.route("/usuarios/<int:user_id>/toggle", methods=["PATCH"])
@auth_required
@apenas_gerente
def toggle_usuario(user_id):
    try:
        tenant_id = g.usuario["tenant_id"]

        with conectar() as conn:
            cursor = conn.cursor()

            # Só pode alterar usuários do próprio tenant
            cursor.execute("""
                SELECT id, ativo, role FROM users
                WHERE id = %s AND tenant_id = %s
            """, (user_id, tenant_id))
            user = cursor.fetchone()

            if not user:
                return jsonify({"erro": "Usuário não encontrado"}), 404

            # Gerente não pode desativar outro gerente
            if user["role"] == "gerente" and g.usuario.get("role") != "admin":
                return jsonify({"erro": "Sem permissão para alterar outro gerente"}), 403

            novo = 0 if user["ativo"] else 1
            cursor.execute("UPDATE users SET ativo = %s WHERE id = %s", (novo, user_id))
            conn.commit()

        return jsonify({"msg": "Status atualizado", "ativo": novo})

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================
# MOVIMENTAÇÕES PENDENTES
# =========================
@gerente_bp.route("/pendentes", methods=["GET"])
@auth_required
@apenas_gerente
def listar_pendentes():
    try:
        tenant_id = g.usuario["tenant_id"]

        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM movimentacoes
                WHERE tenant_id = %s AND status = 'pendente'
                ORDER BY id DESC
            """, (tenant_id,))
            dados = [dict(d) for d in cursor.fetchall()]

        return jsonify(dados)

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================
# APROVAR MOVIMENTAÇÃO
# =========================
@gerente_bp.route("/aprovar/<int:mov_id>", methods=["PATCH"])
@auth_required
@apenas_gerente
def aprovar_movimentacao(mov_id):
    try:
        tenant_id   = g.usuario["tenant_id"]
        aprovador   = g.usuario.get("nome", "Gerente")

        with conectar() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT * FROM movimentacoes
                WHERE id = %s AND tenant_id = %s AND status = 'pendente'
            """, (mov_id, tenant_id))
            mov = cursor.fetchone()

            if not mov:
                return jsonify({"erro": "Movimentação não encontrada ou já processada"}), 404

            # Aplica o efeito no estoque agora que foi aprovado
            cursor.execute("""
                SELECT id, quantidade, valor FROM produtos
                WHERE produto = %s AND tenant_id = %s
                LIMIT 1
            """, (mov["produto"], tenant_id))
            produto = cursor.fetchone()

            if produto:
                estoque_atual = produto["quantidade"]
                valor_atual   = float(produto["valor"] or 0)
                qtd           = float(mov["quantidade"])

                if mov["tipo"] == "saida" and qtd > estoque_atual:
                    return jsonify({"erro": "Estoque insuficiente para aprovar a saída"}), 400

                if mov["tipo"] == "entrada":
                    nova_qtd = estoque_atual + qtd
                    cursor.execute(
                        "UPDATE produtos SET quantidade = %s WHERE id = %s AND tenant_id = %s",
                        (nova_qtd, produto["id"], tenant_id)
                    )
                else:
                    nova_qtd = estoque_atual - qtd
                    cursor.execute(
                        "UPDATE produtos SET quantidade = %s WHERE id = %s AND tenant_id = %s",
                        (nova_qtd, produto["id"], tenant_id)
                    )

            cursor.execute("""
                UPDATE movimentacoes
                SET status = 'aprovado', aprovado_por = %s
                WHERE id = %s
            """, (aprovador, mov_id))
            conn.commit()

        return jsonify({"msg": "Movimentação aprovada"})

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


# =========================
# REPROVAR MOVIMENTAÇÃO
# =========================
@gerente_bp.route("/reprovar/<int:mov_id>", methods=["PATCH"])
@auth_required
@apenas_gerente
def reprovar_movimentacao(mov_id):
    try:
        tenant_id = g.usuario["tenant_id"]
        aprovador = g.usuario.get("nome", "Gerente")
        dados     = request.get_json() or {}
        motivo    = dados.get("motivo", "")

        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE movimentacoes
                SET status = 'reprovado', aprovado_por = %s, comentario = COALESCE(comentario,'') || %s
                WHERE id = %s AND tenant_id = %s AND status = 'pendente'
            """, (aprovador, f" [Reprovado: {motivo}]" if motivo else " [Reprovado]", mov_id, tenant_id))
            conn.commit()

        return jsonify({"msg": "Movimentação reprovada"})

    except Exception as e:
        return jsonify({"erro": str(e)}), 500