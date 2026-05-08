from flask import Blueprint, jsonify, request

from database.database import conectar
from utils.auth import autenticar

dashboard_bp = Blueprint("dashboard", __name__)

# =========================
# DASHBOARD
# =========================
@dashboard_bp.route("/dashboard", methods=["GET", "OPTIONS"])
def dashboard():

    if request.method == "OPTIONS":
        return jsonify({}), 200

    if not autenticar():
        return jsonify({
            "erro": "Não autorizado"
        }), 401

    try:

        conn = conectar()

        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM produtos
            ORDER BY quantidade DESC
        """)

        produtos = cursor.fetchall()

        total_produtos = len(produtos)

        total_itens = sum(
            p["quantidade"]
            for p in produtos
        )

        baixo_estoque = len([
            p for p in produtos
            if p["quantidade"] <= 5
        ])

        valor_total = sum(
            p["quantidade"] * p["valor"]
            for p in produtos
        )

        grafico_quantidade = []

        grafico_valor = []

        lista_produtos = []

        for p in produtos:

            grafico_quantidade.append({
                "produto": p["produto"],
                "quantidade": p["quantidade"]
            })

            grafico_valor.append({
                "produto": p["produto"],
                "valor_total": round(
                    p["quantidade"] * p["valor"],
                    2
                )
            })

            status = (
                "BAIXO"
                if p["quantidade"] <= 5
                else "CONFORTÁVEL"
            )

            lista_produtos.append({
                "id": p["id"],
                "produto": p["produto"],
                "quantidade": p["quantidade"],
                "valor": p["valor"],
                "valor_total": round(
                    p["quantidade"] * p["valor"],
                    2
                ),
                "status": status
            })

        conn.close()

        return jsonify({
            "total_produtos": total_produtos,
            "total_itens": total_itens,
            "baixo_estoque": baixo_estoque,
            "valor_total": round(valor_total, 2),
            "grafico_quantidade": grafico_quantidade,
            "grafico_valor": grafico_valor,
            "produtos": lista_produtos
        })

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500