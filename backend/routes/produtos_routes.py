from flask import Blueprint, jsonify, request
import sqlite3

from database.database import conectar
from utils.auth import autenticar

produtos_bp = Blueprint("produtos", __name__)

# =========================
# LISTAR
# =========================
@produtos_bp.route("/produtos", methods=["GET", "OPTIONS"])
def listar_produtos():

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
            ORDER BY id DESC
        """)

        dados = cursor.fetchall()

        conn.close()

        return jsonify([

            {
                "id": item["id"],

                "produto": item["produto"],

                "quantidade": item["quantidade"],

                "valor": item["valor"],

                "fornecedor": item["fornecedor"],

                "contato": item["contato"],

                "cnpj": item["cnpj"],

                "numero_nota": item["numero_nota"],

                "serie": item["serie"],

                "chave_nfe": item["chave_nfe"],

                "data_emissao": item["data_emissao"]
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
@produtos_bp.route("/produtos", methods=["POST", "OPTIONS"])
def criar_produto():

    if request.method == "OPTIONS":
        return jsonify({}), 200

    if not autenticar():
        return jsonify({
            "erro": "Não autorizado"
        }), 401

    try:

        dados = request.get_json(force=True)

        produto = str(
            dados.get("produto", "")
        ).strip()

        quantidade = int(
            dados.get("quantidade", 0)
        )

        valor = float(
            dados.get("valor", 0)
        )

        fornecedor = dados.get(
            "fornecedor",
            ""
        )

        contato = dados.get(
            "contato",
            ""
        )

        conn = conectar()

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO produtos (
                produto,
                quantidade,
                valor,
                fornecedor,
                contato
            )
            VALUES (?, ?, ?, ?, ?)
        """, (
            produto,
            quantidade,
            valor,
            fornecedor,
            contato
        ))

        conn.commit()

        conn.close()

        return jsonify({
            "msg": "Produto cadastrado com sucesso"
        })

    except sqlite3.IntegrityError:

        return jsonify({
            "erro": "Produto já cadastrado"
        }), 400

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500


# =========================
# REMOVER
# =========================
@produtos_bp.route("/produtos/<int:id>", methods=["DELETE", "OPTIONS"])
def remover_produto(id):

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
            DELETE FROM produtos
            WHERE id = ?
        """, (id,))

        conn.commit()

        conn.close()

        return jsonify({
            "msg": "Produto removido"
        })

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500