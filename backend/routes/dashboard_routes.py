from flask import Blueprint, jsonify, g
from utils.auth_middleware import auth_required
from database.database import conectar

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard", methods=["GET"])
@auth_required
def dashboard():

    try:
        usuario = g.usuario
        tenant_id = usuario["tenant_id"]

        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM produtos WHERE tenant_id = ?", (tenant_id,))
        total_produtos = cursor.fetchone()[0]

        cursor.execute("SELECT COALESCE(SUM(quantidade), 0) FROM produtos WHERE tenant_id = ?", (tenant_id,))
        total_itens = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM produtos WHERE tenant_id = ? AND quantidade <= 5", (tenant_id,))
        baixo_estoque = cursor.fetchone()[0]

        cursor.execute("SELECT COALESCE(SUM(valor * quantidade), 0) FROM produtos WHERE tenant_id = ?", (tenant_id,))
        valor_total = cursor.fetchone()[0]

        cursor.execute("SELECT produto, quantidade, valor FROM produtos WHERE tenant_id = ?", (tenant_id,))
        produtos = cursor.fetchall()

        conn.close()

        return jsonify({
            "total_produtos": total_produtos,
            "total_itens": total_itens,
            "baixo_estoque": baixo_estoque,
            "valor_total": valor_total,
            "produtos": [dict(p) for p in produtos]
        }), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500