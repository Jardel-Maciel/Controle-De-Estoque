from flask import Blueprint, jsonify, request, g
import datetime
from utils.auth_middleware import auth_required
from database.database import conectar

movimentacoes_bp = Blueprint("movimentacoes", __name__)


@movimentacoes_bp.route("/movimentacoes", methods=["GET"])
@auth_required
def listar_movimentacoes():
    try:
        tenant_id = g.usuario["tenant_id"]

        conn = conectar()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM movimentacoes WHERE tenant_id = %s ORDER BY id DESC", (tenant_id,))
        dados = cursor.fetchall()
        conn.close()

        return jsonify([dict(item) for item in dados])

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


@movimentacoes_bp.route("/movimentacoes", methods=["POST"])
@auth_required
def registrar_movimentacao():
    try:
        tenant_id = g.usuario["tenant_id"]

        dados = request.get_json()
        produto_id  = dados.get("produto_id")
        tipo        = dados.get("tipo", "").strip()
        quantidade  = float(dados.get("quantidade", 0))
        comentario  = dados.get("comentario", "")
        responsavel = dados.get("responsavel", "")

        if not produto_id or not tipo or quantidade <= 0:
            return jsonify({"erro": "Dados inválidos"}), 400

        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("SELECT id, produto, quantidade FROM produtos WHERE id = %s AND tenant_id = %s", (produto_id, tenant_id))
        produto = cursor.fetchone()

        if not produto:
            conn.close()
            return jsonify({"erro": "Produto não encontrado"}), 404

        estoque_atual = produto["quantidade"]

        if tipo == "saida" and quantidade > estoque_atual:
            conn.close()
            return jsonify({"erro": "Estoque insuficiente"}), 400

        nova_qtd = estoque_atual + quantidade if tipo == "entrada" else estoque_atual - quantidade

        cursor.execute("UPDATE produtos SET quantidade = %s WHERE id = %s AND tenant_id = %s", (nova_qtd, produto_id, tenant_id))

        cursor.execute("""
            INSERT INTO movimentacoes (tenant_id, produto, tipo, quantidade, comentario, responsavel, data)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (tenant_id, produto["produto"], tipo, quantidade, comentario, responsavel,
              datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

        conn.commit()
        conn.close()

        return jsonify({"msg": "Movimentação registrada com sucesso"})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500