from flask import Blueprint, jsonify, request, g
import datetime
from utils.auth_middleware import auth_required
from database.database import conectar

movimentacoes_bp = Blueprint("movimentacoes", __name__)


@movimentacoes_bp.route("/movimentacoes", methods=["GET"])
@auth_required
def listar_movimentacoes():

    try:
        tenant_id = g.usuario["tenant_id"]  # 🔥 FIX AQUI

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