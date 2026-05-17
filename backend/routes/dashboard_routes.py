from flask import Blueprint, jsonify, g
from utils.auth_middleware import auth_required
from database.database import conectar

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard", methods=["GET"])
@auth_required
def dashboard():
    try:
        tenant_id = g.usuario["tenant_id"]

        with conectar() as conn:
            cursor = conn.cursor()

            cursor.execute(
                "SELECT COUNT(*) AS total FROM produtos WHERE tenant_id = %s",
                (tenant_id,)
            )
            total_produtos = cursor.fetchone()["total"]

            cursor.execute(
                "SELECT COUNT(*) AS total FROM produtos WHERE tenant_id = %s AND quantidade <= 5",
                (tenant_id,)
            )
            baixo_estoque = cursor.fetchone()["total"]

            cursor.execute("""
                SELECT
                    COALESCE(SUM(quantidade), 0)         AS total_qtd,
                    COALESCE(SUM(valor * quantidade), 0) AS total_custo
                FROM produtos
                WHERE tenant_id = %s
            """, (tenant_id,))
            row         = cursor.fetchone()
            total_itens = float(row["total_qtd"])
            valor_total = float(row["total_custo"])
            valor_medio_geral = round(valor_total / total_itens, 2) if total_itens > 0 else 0

            cursor.execute(
                "SELECT produto, quantidade, valor FROM produtos WHERE tenant_id = %s",
                (tenant_id,)
            )
            produtos = cursor.fetchall()

        return jsonify({
            "total_produtos":    total_produtos,
            "total_itens":       total_itens,
            "baixo_estoque":     baixo_estoque,
            "valor_total":       valor_total,
            "valor_medio_geral": valor_medio_geral,
            "produtos":          [dict(p) for p in produtos]
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500