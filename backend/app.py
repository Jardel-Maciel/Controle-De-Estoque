from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid
import datetime

# =========================
# APP
# =========================
app = Flask(__name__)

# =========================
# CORS
# =========================
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# =========================
# BANCO
# =========================
def conectar():
    conn = sqlite3.connect("banco.db")
    conn.row_factory = sqlite3.Row
    return conn


def criar_tabelas():
    conn = conectar()
    cursor = conn.cursor()

    # =========================
    # TABELA PRODUTOS
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT UNIQUE,
            quantidade INTEGER DEFAULT 0,
            valor REAL DEFAULT 0
        )
    """)

    # =========================
    # TABELA MOVIMENTAÇÕES
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimentacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT,
            tipo TEXT,
            quantidade INTEGER,
            comentario TEXT,
            responsavel TEXT,
            data TEXT
        )
    """)

    conn.commit()
    conn.close()


criar_tabelas()

# =========================
# AUTH
# =========================
usuarios = [
    {
        "email": "admin@teste.com",
        "senha": "123456"
    }
]


def autenticar():
    token = request.headers.get("Authorization")
    return bool(token)

# =========================
# LOGIN
# =========================
@app.route("/login", methods=["POST", "OPTIONS"])
def login():

    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:

        dados = request.get_json(force=True)

        email = dados.get("email")
        senha = dados.get("senha")

        for usuario in usuarios:

            if (
                usuario["email"] == email
                and usuario["senha"] == senha
            ):

                return jsonify({
                    "token": str(uuid.uuid4())
                })

        return jsonify({
            "erro": "Credenciais inválidas"
        }), 401

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500


# =========================
# DASHBOARD
# =========================
@app.route("/dashboard", methods=["GET", "OPTIONS"])
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

        # =========================
        # CARDS
        # =========================
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

        # =========================
        # GRÁFICO QUANTIDADE
        # =========================
        grafico_quantidade = []

        for p in produtos:

            grafico_quantidade.append({
                "produto": p["produto"],
                "quantidade": p["quantidade"]
            })

        # =========================
        # GRÁFICO VALOR
        # =========================
        grafico_valor = []

        for p in produtos:

            grafico_valor.append({
                "produto": p["produto"],
                "valor_total": round(
                    p["quantidade"] * p["valor"],
                    2
                )
            })

        # =========================
        # PRODUTOS PARA PDF
        # =========================
        lista_produtos = []

        for p in produtos:

            quantidade = p["quantidade"]
            valor = p["valor"]
            total = quantidade * valor

            status = (
                "BAIXO"
                if quantidade <= 5
                else "CONFORTÁVEL"
            )

            lista_produtos.append({
                "id": p["id"],
                "produto": p["produto"],
                "quantidade": quantidade,
                "valor": valor,
                "valor_total": round(total, 2),
                "status": status
            })

        conn.close()

        return jsonify({

            # =========================
            # CARDS
            # =========================
            "total_produtos": total_produtos,
            "total_itens": total_itens,
            "baixo_estoque": baixo_estoque,
            "valor_total": round(valor_total, 2),

            # =========================
            # GRÁFICOS
            # =========================
            "grafico_quantidade": grafico_quantidade,
            "grafico_valor": grafico_valor,

            # =========================
            # PDF / TABELA
            # =========================
            "produtos": lista_produtos
        })

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500


# =========================
# PRODUTOS - LISTAR
# =========================
@app.route("/produtos", methods=["GET", "OPTIONS"])
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
                "valor": item["valor"]
            }

            for item in dados

        ])

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500


# =========================
# PRODUTOS - CRIAR
# =========================
@app.route("/produtos", methods=["POST", "OPTIONS"])
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

        if not produto:

            return jsonify({
                "erro": "Produto obrigatório"
            }), 400

        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO produtos (
                produto,
                quantidade,
                valor
            )
            VALUES (?, ?, ?)
        """, (
            produto,
            quantidade,
            valor
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
# PRODUTOS - REMOVER
# =========================
@app.route("/produtos/<int:id>", methods=["DELETE", "OPTIONS"])
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


# =========================
# MOVIMENTAÇÕES - LISTAR
# =========================
@app.route("/movimentacoes", methods=["GET", "OPTIONS"])
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
# MOVIMENTAÇÕES - CRIAR
# =========================
@app.route("/movimentacoes", methods=["POST", "OPTIONS"])
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

        # =========================
        # VALIDAÇÃO
        # =========================
        if (
            not produto_id
            or tipo not in ["entrada", "saida"]
            or quantidade <= 0
        ):

            return jsonify({
                "erro": "Dados inválidos"
            }), 400

        conn = conectar()
        cursor = conn.cursor()

        # =========================
        # BUSCAR PRODUTO
        # =========================
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

        # =========================
        # VALIDAR ESTOQUE
        # =========================
        if (
            tipo == "saida"
            and quantidade > estoque_atual
        ):

            conn.close()

            return jsonify({
                "erro": "Estoque insuficiente"
            }), 400

        # =========================
        # NOVO ESTOQUE
        # =========================
        if tipo == "entrada":
            novo_estoque = estoque_atual + quantidade
        else:
            novo_estoque = estoque_atual - quantidade

        # =========================
        # UPDATE PRODUTO
        # =========================
        cursor.execute("""
            UPDATE produtos
            SET quantidade = ?
            WHERE id = ?
        """, (
            novo_estoque,
            produto_id
        ))

        # =========================
        # INSERT MOVIMENTAÇÃO
        # =========================
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


# =========================
# START
# =========================
if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=10000
    )