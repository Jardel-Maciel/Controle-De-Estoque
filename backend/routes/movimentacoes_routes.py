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

        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM movimentacoes WHERE tenant_id = %s ORDER BY id DESC",
                (tenant_id,)
            )
            dados = cursor.fetchall()

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

        dados       = request.get_json()
        produto_id  = dados.get("produto_id")
        tipo        = dados.get("tipo", "").strip()
        quantidade  = float(dados.get("quantidade", 0))
        comentario  = dados.get("comentario", "")
        responsavel = dados.get("responsavel", "")

        if not produto_id or not tipo or quantidade <= 0:
            return jsonify({"erro": "Dados inválidos"}), 400

        with conectar() as conn:
            cursor = conn.cursor()

            cursor.execute(
                "SELECT id, produto, quantidade, valor FROM produtos WHERE id = %s AND tenant_id = %s",
                (produto_id, tenant_id)
            )
            produto = cursor.fetchone()

            if not produto:
                return jsonify({"erro": "Produto não encontrado"}), 404

            estoque_atual = produto["quantidade"]
            valor_atual   = float(produto["valor"] or 0)

            if tipo == "saida" and quantidade > estoque_atual:
                return jsonify({"erro": "Estoque insuficiente"}), 400

            # Verifica se o tenant tem gerente — se sim, movimentação fica pendente
            role_usuario = g.usuario.get("role", "cliente")
            cursor.execute(
                "SELECT id FROM users WHERE tenant_id = %s AND role = 'gerente' AND ativo = 1 LIMIT 1",
                (tenant_id,)
            )
            tem_gerente = cursor.fetchone() is not None
            status = "pendente" if (tem_gerente and role_usuario not in ("gerente", "admin")) else "aprovado"

            # Só aplica efeito no estoque se aprovado imediatamente
            if status == "aprovado":
                if tipo == "entrada":
                    valor_entrada = float(dados.get("valor_unitario", valor_atual))
                    total_atual   = estoque_atual * valor_atual
                    total_entrada = quantidade * valor_entrada
                    nova_qtd      = estoque_atual + quantidade
                    novo_valor    = (total_atual + total_entrada) / nova_qtd if nova_qtd > 0 else valor_entrada
                    cursor.execute(
                        "UPDATE produtos SET quantidade = %s, valor = %s WHERE id = %s AND tenant_id = %s",
                        (nova_qtd, round(novo_valor, 4), produto_id, tenant_id)
                    )
                else:
                    nova_qtd = estoque_atual - quantidade
                    cursor.execute(
                        "UPDATE produtos SET quantidade = %s WHERE id = %s AND tenant_id = %s",
                        (nova_qtd, produto_id, tenant_id)
                    )

            cursor.execute("""
                INSERT INTO movimentacoes (tenant_id, produto, tipo, quantidade, comentario, responsavel, data, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (tenant_id, produto["produto"], tipo, quantidade, comentario, responsavel,
                  datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), status))

            conn.commit()

        msg = "Movimentação enviada para aprovação do gerente" if status == "pendente" else "Movimentação registrada com sucesso"
        return jsonify({"msg": msg, "status": status})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500