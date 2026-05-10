from flask import Blueprint, jsonify, request
from database.database import conectar
from utils.auth_middleware import auth_required
from utils.jwt import verificar_token

dashboard_bp = Blueprint("dashboard", __name__)

# =========================
# DASHBOARD
# =========================
@dashboard_bp.route("/dashboard", methods=["GET"])
@auth_required
def dashboard():

    try:

        # =========================
        # TOKEN
        # =========================
        token = request.headers.get("Authorization")

        if not token:

            return jsonify({
                "erro": "Token não enviado"
            }), 401

        usuario = verificar_token(token)

        if not usuario:

            return jsonify({
                "erro": "Token inválido"
            }), 401

        tenant_id = usuario.get("tenant_id", 1)

        # =========================
        # BANCO
        # =========================
        conn = conectar()

        cursor = conn.cursor()

        # =========================
        # TOTAL PRODUTOS
        # =========================
        cursor.execute("""
            SELECT COUNT(*) as total
            FROM produtos
            WHERE tenant_id = ?
        """, (tenant_id,))

        total_produtos = cursor.fetchone()["total"]

        # =========================
        # TOTAL ESTOQUE
        # =========================
        cursor.execute("""
            SELECT SUM(quantidade) as total
            FROM produtos
            WHERE tenant_id = ?
        """, (tenant_id,))

        total_estoque = cursor.fetchone()["total"] or 0

        # =========================
        # VALOR ESTOQUE
        # =========================
        cursor.execute("""
            SELECT SUM(quantidade * valor) as total
            FROM produtos
            WHERE tenant_id = ?
        """, (tenant_id,))

        valor_estoque = cursor.fetchone()["total"] or 0

        conn.close()

        return jsonify({

            "total_produtos": total_produtos,

            "total_estoque": total_estoque,

            "valor_estoque": valor_estoque

        }), 200

    except Exception as e:

        print("ERRO DASHBOARD:", str(e))

        return jsonify({
            "erro": str(e)
        }), 500