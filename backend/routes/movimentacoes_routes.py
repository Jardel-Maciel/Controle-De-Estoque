from flask import Blueprint, jsonify, request
import datetime
from utils.auth_middleware import auth_required
from database.database import conectar

movimentacoes_bp = Blueprint("movimentacoes", __name__)

# =========================
# LISTAR MOVIMENTAÇÕES
# =========================
@movimentacoes_bp.route("/movimentacoes", methods=["GET"])
@auth_required
def listar_movimentacoes():

    try:
        tenant_id = request.user["tenant_id"]

        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM movimentacoes
            WHERE tenant_id = ?
            ORDER BY id DESC
        """, (tenant_id,))

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
        return jsonify({"erro": str(e)}), 500


# =========================
# CRIAR MOVIMENTAÇÃO
# =========================
@movimentacoes_bp.route("/movimentacoes", methods=["POST"])
@auth_required
def criar_movimentacao():

    try:
        tenant_id = request.user["tenant_id"]

        dados = request.get_json(force=True)

        produto_id = dados.get("produto_id")

        tipo = str(dados.get("tipo", "")).lower().strip()

        quantidade = int(dados.get("quantidade", 0))

        comentario = dados.get("comentario", "")

        responsavel = dados.get("responsavel", "Sistema")

        data = datetime.datetime.now().isoformat()

        conn = conectar()
        cursor = conn.cursor()

        # =========================
        # BUSCA PRODUTO DO TENANT
        # =========================
        cursor.execute("""
            SELECT id, produto, quantidade
            FROM produtos
            WHERE id = ?
            AND tenant_id = ?
        """, (produto_id, tenant_id))

        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({"erro": "Produto não encontrado"}), 404

        produto = row["produto"]
        estoque_atual = row["quantidade"]

        # =========================
        # VALIDAÇÃO ESTOQUE
        # =========================
        if tipo == "saida" and quantidade > estoque_atual:
            conn.close()
            return jsonify({"erro": "Estoque insuficiente"}), 400

        # =========================
        # NOVO ESTOQUE
        # =========================
        if tipo == "entrada":
            novo_estoque = estoque_atual + quantidade
        else:
            novo_estoque = estoque_atual - quantidade

        # =========================
        # ATUALIZA PRODUTO (TENANT SAFE)
        # =========================
        cursor.execute("""
            UPDATE produtos
            SET quantidade = ?
            WHERE id = ?
            AND tenant_id = ?
        """, (novo_estoque, produto_id, tenant_id))

        # =========================
        # REGISTRA MOVIMENTAÇÃO
        # =========================
        cursor.execute("""
            INSERT INTO movimentacoes (
                tenant_id,
                produto,
                tipo,
                quantidade,
                comentario,
                responsavel,
                data
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            tenant_id,
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
        return jsonify({"erro": str(e)}), 500