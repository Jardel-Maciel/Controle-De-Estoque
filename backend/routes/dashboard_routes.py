from flask import Blueprint, jsonify, request
from utils.auth_middleware import auth_required
from database.database import conectar

dashboard_bp = Blueprint("dashboard", __name__)

# =========================
# DASHBOARD MULTI-TENANT
# =========================
@dashboard_bp.route("/dashboard", methods=["GET", "OPTIONS"])
@auth_required
def dashboard():

    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        tenant_id = request.user["tenant_id"]

        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM produtos
            WHERE tenant_id = ?
            ORDER BY quantidade DESC
        """, (tenant_id,))

        produtos = cursor.fetchall()

        total_produtos = len(produtos)

        total_itens = sum(p["quantidade"] for p in produtos)

        baixo_estoque = len([p for p in produtos if p["quantidade"] <= 5])

        valor_total = sum(p["quantidade"] * p["valor"] for p in produtos)

        lista_produtos = []

        for p in produtos:

            lista_produtos.append({
                "id": p["id"],
                "produto": p["produto"],
                "quantidade": p["quantidade"],
                "valor": p["valor"],
                "valor_total": round(p["quantidade"] * p["valor"], 2),
                "status": "BAIXO" if p["quantidade"] <= 5 else "OK"
            })

        conn.close()

        return jsonify({
            "total_produtos": total_produtos,
            "total_itens": total_itens,
            "baixo_estoque": baixo_estoque,
            "valor_total": round(valor_total, 2),
            "produtos": lista_produtos
        })

    except Exception as e:
        return jsonify({"erro": str(e)}), 500