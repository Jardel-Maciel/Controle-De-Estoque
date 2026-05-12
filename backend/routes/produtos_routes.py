from flask import Blueprint, jsonify, request, g
from utils.auth_middleware import auth_required
from database.database import conectar

produtos_bp = Blueprint("produtos", __name__)


# =========================
# LISTAR PRODUTOS
# =========================
@produtos_bp.route("/produtos", methods=["GET"])
@auth_required
def listar_produtos():

    try:
        tenant_id = g.usuario["tenant_id"]

        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM produtos
            WHERE tenant_id = %s
            ORDER BY id DESC
        """, (tenant_id,))

        dados = cursor.fetchall()
        conn.close()

        return jsonify([dict(item) for item in dados])

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


# =========================
# CRIAR PRODUTO
# =========================
@produtos_bp.route("/produtos", methods=["POST"])
@auth_required
def criar_produto():

    try:
        tenant_id = g.usuario["tenant_id"]

        dados = request.get_json(force=True)

        produto      = str(dados.get("produto", "")).strip()
        quantidade   = float(dados.get("quantidade", 0))
        valor        = float(dados.get("valor", 0))
        fornecedor   = dados.get("fornecedor", "")
        contato      = dados.get("contato", "")
        cnpj         = dados.get("cnpj", "")
        numero_nota  = dados.get("numero_nota", "")
        serie        = dados.get("serie", "")
        chave_nfe    = dados.get("chave_nfe", "")
        data_emissao = dados.get("data_emissao", "")

        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO produtos (
                tenant_id, produto, quantidade, valor,
                fornecedor, contato, cnpj, numero_nota,
                serie, chave_nfe, data_emissao
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, produto, quantidade, valor,
            fornecedor, contato, cnpj, numero_nota,
            serie, chave_nfe, data_emissao
        ))

        conn.commit()
        conn.close()

        return jsonify({"msg": "Produto cadastrado com sucesso"})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


# =========================
# REMOVER PRODUTO
# =========================
@produtos_bp.route("/produtos/<int:id>", methods=["DELETE"])
@auth_required
def remover_produto(id):

    try:
        tenant_id = g.usuario["tenant_id"]

        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM produtos
            WHERE id = %s AND tenant_id = %s
        """, (id, tenant_id))

        conn.commit()
        conn.close()

        return jsonify({"msg": "Produto removido"})

    except Exception as e:
        return jsonify({"erro": str(e)}), 500