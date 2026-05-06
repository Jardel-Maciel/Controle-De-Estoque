from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid

app = Flask(__name__)
CORS(app)

# -------- BANCO -------- #
def conectar():
    return sqlite3.connect("banco.db")

def criar_tabelas():
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            valor REAL DEFAULT 0,
            fornecedor TEXT,
            contato TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimentacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER,
            tipo TEXT CHECK(tipo IN ('entrada', 'saida')),
            quantidade INTEGER,
            data DATETIME DEFAULT CURRENT_TIMESTAMP,
            comentario TEXT,
            responsavel TEXT
        )
    """)

    conn.commit()
    conn.close()

criar_tabelas()

# -------- AUTH -------- #
usuarios = [{"email": "admin@teste.com", "senha": "123456"}]
tokens = {}

def autenticar():
    token = request.headers.get("Authorization")
    return bool(token)

# -------- LOGIN -------- #
@app.route("/login", methods=["POST"])
def login():
    dados = request.json

    for user in usuarios:
        if user["email"] == dados.get("email") and user["senha"] == dados.get("senha"):
            token = str(uuid.uuid4())
            tokens[token] = user
            return jsonify({"token": token})

    return jsonify({"erro": "Credenciais inválidas"}), 401

# -------- PRODUTOS -------- #
@app.route("/produtos", methods=["GET"])
def listar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, produto, quantidade,
               COALESCE(valor, 0),
               COALESCE(fornecedor, ''),
               COALESCE(contato, '')
        FROM produtos
    """)

    dados = cursor.fetchall()
    conn.close()

    return jsonify([
        {
            "id": row[0],
            "produto": row[1],
            "quantidade": row[2],
            "valor": row[3],
            "fornecedor": row[4],
            "contato": row[5]
        }
        for row in dados
    ])

@app.route("/produtos", methods=["POST"])
def criar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    novo = request.json

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO produtos (produto, quantidade, valor, fornecedor, contato)
        VALUES (?, ?, ?, ?, ?)
    """, (
        novo["produto"],
        int(novo["quantidade"]),
        float(novo.get("valor", 0)),
        novo.get("fornecedor", ""),
        novo.get("contato", "")
    ))

    conn.commit()
    conn.close()

    return jsonify({"msg": "Produto criado"})

@app.route("/produtos/<int:id>", methods=["PUT"])
def atualizar(id):
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    dados = request.json

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE produtos SET quantidade = ? WHERE id = ?",
        (int(dados["quantidade"]), id)
    )

    conn.commit()
    conn.close()

    return jsonify({"msg": "Atualizado"})

@app.route("/produtos/<int:id>", methods=["DELETE"])
def deletar(id):
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM produtos WHERE id = ?", (id,))

    conn.commit()
    conn.close()

    return jsonify({"msg": "Removido"})

# -------- MOVIMENTAÇÕES -------- #
@app.route("/movimentacoes", methods=["POST"])
def movimentar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    dados = request.json

    produto_id = dados.get("produto_id")
    tipo = dados.get("tipo")
    quantidade = int(dados.get("quantidade", 0))
    comentario = dados.get("comentario", "")
    responsavel = dados.get("responsavel", "")

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT quantidade FROM produtos WHERE id = ?", (produto_id,))
    produto = cursor.fetchone()

    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404

    estoque = produto[0]

    if tipo == "saida" and quantidade > estoque:
        return jsonify({"erro": "Estoque insuficiente"}), 400

    novo = estoque + quantidade if tipo == "entrada" else estoque - quantidade

    cursor.execute(
        "UPDATE produtos SET quantidade = ? WHERE id = ?",
        (novo, produto_id)
    )

    cursor.execute("""
        INSERT INTO movimentacoes 
        (produto_id, tipo, quantidade, comentario, responsavel)
        VALUES (?, ?, ?, ?, ?)
    """, (produto_id, tipo, quantidade, comentario, responsavel))

    conn.commit()
    conn.close()

    return jsonify({"msg": "Movimentado com sucesso"})

@app.route("/movimentacoes", methods=["GET"])
def historico():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT m.id, p.produto, m.tipo, m.quantidade, m.data,
               COALESCE(m.comentario, ''),
               COALESCE(m.responsavel, '')
        FROM movimentacoes m
        JOIN produtos p ON p.id = m.produto_id
        ORDER BY m.data DESC
    """)

    dados = cursor.fetchall()
    conn.close()

    return jsonify([
        {
            "id": row[0],
            "produto": row[1],
            "tipo": row[2],
            "quantidade": row[3],
            "data": row[4],
            "comentario": row[5],
            "responsavel": row[6]
        }
        for row in dados
    ])

# -------- START -------- #
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)