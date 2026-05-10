from flask import Blueprint, jsonify
from database.database import conectar
from utils.auth_middleware import auth_required

dashboard_bp = Blueprint("dashboard", __name__)

# =========================
# DASHBOARD
# =========================
@dashboard_bp.route("/dashboard", methods=["GET"])
@auth_required
def dashboard(usuario):

    try:

        conn = conectar()
        cursor = conn.cursor()

        tenant_id = usuario["tenant_id"]

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
            SELECT SUM(
                quantidade * valor
            ) as total
            FROM produtos
            WHERE tenant_id = ?
        """, (tenant_id,))

        valor_estoque = cursor.fetchone()["total"] or 0

        conn.close()

        return jsonify({

            "total_produtos": total_produtos,

            "total_estoque": total_estoque,

            "valor_estoque": valor_estoque
        })

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500