from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid
import datetime

app = Flask(__name__)

# =========================
# CORS (CORRIGIDO PARA DEV + PROD)
# =========================
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "*"
        ],
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

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT UNIQUE,
            quantidade INTEGER DEFAULT 0,
            valor REAL DEFAULT 0
        )
    """)

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
# AUTH SIMPLES
# =========================
usuarios = [{"email": "admin@teste.com", "senha": "123456"}]

def autenticar():
    return bool(request.headers.get("Authorization"))

# =========================
# LOGIN
# =========================
@app.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    dados = request.json

    for u in usuarios:
        if u["email"] == dados.get("email") and u["senha"] == dados.get("senha"):
            return jsonify({"token": str(uuid.uuid4())})

    return jsonify({"erro": "Credenciais inválidas"}), 401

# =========================
# MOVIMENTAÇÕES - LISTAR
# =========================
@app.route("/movimentacoes", methods=["GET", "OPTIONS"])
def listar_movimentacoes():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT produto, tipo, quantidade, comentario, responsavel, data
            FROM movimentacoes
            ORDER BY id DESC
        """)

        dados = cursor.fetchall()
        conn.close()

        return jsonify([
            {
                "produto": d["produto"],
                "tipo": d["tipo"],
                "quantidade": d["quantidade"],
                "comentario": d["comentario"],
                "responsavel": d["responsavel"],
                "data": d["data"]
            }
            for d in dados
        ])

    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# =========================
# MOVIMENTAÇÕES - CRIAR
# =========================
@app.route("/movimentacoes", methods=["POST", "OPTIONS"])
def criar_movimentacao():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        dados = request.json

        produto = dados.get("produto")
        tipo = dados.get("tipo")
        quantidade = int(dados.get("quantidade", 0))
        comentario = dados.get("comentario", "")
        responsavel = dados.get("responsavel", "Sistema")
        data = datetime.datetime.now().isoformat()

        if not produto or tipo not in ["entrada", "saida"] or quantidade <= 0:
            return jsonify({"erro": "Dados inválidos"}), 400

        conn = conectar()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT quantidade FROM produtos WHERE produto = ?",
            (produto,)
        )

        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({"erro": "Produto não encontrado"}), 404

        estoque_atual = row["quantidade"]

        if tipo == "saida" and quantidade > estoque_atual:
            conn.close()
            return jsonify({"erro": "Estoque insuficiente"}), 400

        novo_estoque = (
            estoque_atual + quantidade
            if tipo == "entrada"
            else estoque_atual - quantidade
        )

        cursor.execute(
            "UPDATE produtos SET quantidade = ? WHERE produto = ?",
            (novo_estoque, produto)
        )

        cursor.execute("""
            INSERT INTO movimentacoes
            (produto, tipo, quantidade, comentario, responsavel, data)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (produto, tipo, quantidade, comentario, responsavel, data))

        conn.commit()
        conn.close()

        return jsonify({"msg": "Movimentação registrada com sucesso"})

    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# =========================
# PRODUTOS
# =========================
@app.route("/produtos", methods=["GET", "OPTIONS"])
def listar_produtos():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM produtos")

    dados = cursor.fetchall()
    conn.close()

    return jsonify([
        {
            "id": d["id"],
            "produto": d["produto"],
            "quantidade": d["quantidade"],
            "valor": d["valor"]
        }
        for d in dados
    ])

# =========================
# START
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)