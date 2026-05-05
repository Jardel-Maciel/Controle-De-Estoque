from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid

app = Flask(__name__)
CORS(app)  # ✅ apenas UMA vez (corrige CORS)

# -------- BANCO DE DADOS -------- #
def conectar():
    return sqlite3.connect("banco.db")

def criar_tabelas():
    conn = conectar()
    cursor = conn.cursor()

    # Produtos
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT NOT NULL,
            quantidade INTEGER NOT NULL
        )
    """)

    # Movimentações
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimentacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER,
            tipo TEXT CHECK(tipo IN ('entrada', 'saida')),
            quantidade INTEGER,
            data DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()

criar_tabelas()

# -------- USUÁRIOS -------- #
usuarios = [
    {"email": "admin@teste.com", "senha": "123456"}
]

tokens = {}

# -------- AUTENTICAÇÃO -------- #
def autenticar():
    token = request.headers.get("Authorization")
    return bool(token)

# -------- LOGIN -------- #
@app.route("/login", methods=["POST"])
def login():
    dados = request.json

    email = dados.get("email")
    senha = dados.get("senha")

    for user in usuarios:
        if user["email"] == email and user["senha"] == senha:
            token = str(uuid.uuid4())
            tokens[token] = user
            return jsonify({"token": token})

    return jsonify({"erro": "Credenciais inválidas"}), 401

# -------- LISTAR PRODUTOS -------- #
@app.route("/produtos", methods=["GET"])
def listar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM produtos")
    dados = cursor.fetchall()

    conn.close()

    produtos = [
        {"id": row[0], "produto": row[1], "quantidade": row[2]}
        for row in dados
    ]

    return jsonify(produtos)

# -------- CRIAR PRODUTO -------- #
@app.route("/produtos", methods=["POST"])
def criar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    novo = request.json

    if not novo.get("produto") or len(novo["produto"]) < 3:
        return jsonify({"erro": "Produto inválido"}), 400

    if not str(novo.get("quantidade")).isdigit() or int(novo["quantidade"]) <= 0:
        return jsonify({"erro": "Quantidade inválida"}), 400

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO produtos (produto, quantidade) VALUES (?, ?)",
        (novo["produto"], int(novo["quantidade"]))
    )

    conn.commit()
    conn.close()

    return jsonify(novo)

# -------- ATUALIZAR QUANTIDADE -------- #
@app.route("/produtos/<int:id>", methods=["PUT"])
def atualizar(id):
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    dados = request.json

    if not str(dados.get("quantidade")).isdigit() or int(dados["quantidade"]) <= 0:
        return jsonify({"erro": "Quantidade inválida"}), 400

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE produtos SET quantidade = ? WHERE id = ?",
        (int(dados["quantidade"]), id)
    )

    conn.commit()
    conn.close()

    return jsonify({"msg": "Quantidade atualizada"})

# -------- DELETAR PRODUTO -------- #
@app.route("/produtos/<int:id>", methods=["DELETE"])
def deletar(id):
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM produtos WHERE id = ?", (id,))

    conn.commit()
    conn.close()

    return jsonify({"msg": "Produto removido"})

# -------- MOVIMENTAÇÃO -------- #
@app.route("/movimentacoes", methods=["POST"])
def movimentar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    dados = request.json

    produto_id = dados.get("produto_id")
    tipo = dados.get("tipo")
    quantidade = int(dados.get("quantidade", 0))

    if tipo not in ["entrada", "saida"]:
        return jsonify({"erro": "Tipo inválido"}), 400

    if quantidade <= 0:
        return jsonify({"erro": "Quantidade inválida"}), 400

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT quantidade FROM produtos WHERE id = ?", (produto_id,))
    produto = cursor.fetchone()

    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404

    estoque_atual = produto[0]

    if tipo == "saida" and quantidade > estoque_atual:
        return jsonify({"erro": "Estoque insuficiente"}), 400

    novo_estoque = (
        estoque_atual + quantidade
        if tipo == "entrada"
        else estoque_atual - quantidade
    )

    # Atualiza estoque
    cursor.execute(
        "UPDATE produtos SET quantidade = ? WHERE id = ?",
        (novo_estoque, produto_id)
    )

    # Salva histórico
    cursor.execute("""
        INSERT INTO movimentacoes (produto_id, tipo, quantidade)
        VALUES (?, ?, ?)
    """, (produto_id, tipo, quantidade))

    conn.commit()
    conn.close()

    return jsonify({"msg": "Movimentação realizada"})

# -------- LISTAR HISTÓRICO -------- #
@app.route("/movimentacoes", methods=["GET"])
def listar_movimentacoes():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT m.id, p.produto, m.tipo, m.quantidade, m.data
        FROM movimentacoes m
        JOIN produtos p ON m.produto_id = p.id
        ORDER BY m.data DESC
    """)

    dados = cursor.fetchall()
    conn.close()

    movimentacoes = [
        {
            "id": row[0],
            "produto": row[1],
            "tipo": row[2],
            "quantidade": row[3],
            "data": row[4]
        }
        for row in dados
    ]

    return jsonify(movimentacoes)

# -------- DASHBOARD -------- #
@app.route("/dashboard", methods=["GET"])
def dashboard():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM produtos")
    dados = cursor.fetchall()

    conn.close()

    total_produtos = len(dados)
    total_itens = sum([row[2] for row in dados])
    baixo_estoque = len([row for row in dados if row[2] <= 5])

    produtos = [
        {
            "nome": row[1],
            "quantidade": row[2]
        }
        for row in dados
    ]

    return jsonify({
        "total_produtos": total_produtos,
        "total_itens": total_itens,
        "baixo_estoque": baixo_estoque,
        "produtos": produtos
    })

# -------- START -------- #
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)