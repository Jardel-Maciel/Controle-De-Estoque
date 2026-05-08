from flask import Blueprint, jsonify, request
import datetime

from database.database import conectar
from utils.auth import autenticar

movimentacoes_bp = Blueprint("movimentacoes", __name__)

# =========================
# LISTAR
# =========================
@movimentacoes_bp.route("/movimentacoes", methods=["GET", "OPTIONS"])
def listar_movimentacoes():

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
            FROM movimentacoes
            ORDER BY id DESC
        """)

        dados = cursor.fetchall()

        conn.close()

        return jsonify([
            {
                "produto": item["produto"],
                "tipo": item["tipo"],
                "quantidade": item["quantidade"],
                "comentario": item["comentario"],
                "responsavel": item["responsavel"],
                "data": item["data"]
            }
            for item in dados
        ])

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500


# =========================
# CRIAR
# =========================
@movimentacoes_bp.route("/movimentacoes", methods=["POST", "OPTIONS"])
def criar_movimentacao():

    if request.method == "OPTIONS":
        return jsonify({}), 200

    if not autenticar():
        return jsonify({
            "erro": "Não autorizado"
        }), 401

    try:

        dados = request.get_json(force=True)

        produto_id = dados.get("produto_id")

        tipo = str(
            dados.get("tipo", "")
        ).lower().strip()

        quantidade = int(
            dados.get("quantidade", 0)
        )

        comentario = dados.get("comentario", "")

        responsavel = dados.get(
            "responsavel",
            "Sistema"
        )

        data = datetime.datetime.now().isoformat()

        conn = conectar()

        cursor = conn.cursor()

        cursor.execute("""
            SELECT produto, quantidade
            FROM produtos
            WHERE id = ?
        """, (produto_id,))

        row = cursor.fetchone()

        if not row:

            conn.close()

            return jsonify({
                "erro": "Produto não encontrado"
            }), 404

        produto = row["produto"]

        estoque_atual = row["quantidade"]

        if (
            tipo == "saida"
            and quantidade > estoque_atual
        ):

            conn.close()

            return jsonify({
                "erro": "Estoque insuficiente"
            }), 400

        if tipo == "entrada":
            novo_estoque = estoque_atual + quantidade
        else:
            novo_estoque = estoque_atual - quantidade

        cursor.execute("""
            UPDATE produtos
            SET quantidade = ?
            WHERE id = ?
        """, (
            novo_estoque,
            produto_id
        ))

        cursor.execute("""
            INSERT INTO movimentacoes (
                produto,
                tipo,
                quantidade,
                comentario,
                responsavel,
                data
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            produto,
            tipo,
            quantidade,
            comentario,
            responsavel,
            data
        ))

        conn.commit()

        conn.close()

        return jsonify({
            "msg": "Movimentação registrada com sucesso"
        })

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500