from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# -------- BANCO DE DADOS -------- #
def conectar():
    return sqlite3.connect("banco.db")

def criar_tabela():
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT NOT NULL,
            quantidade INTEGER NOT NULL
        )
    """)

    conn.commit()
    conn.close()

criar_tabela()

# -------- USUÁRIOS -------- #
usuarios = [
    {"email": "admin@teste.com", "senha": "123456"}
]

tokens = {}

# -------- AUTENTICAÇÃO -------- #
def autenticar():
    token = request.headers.get("Authorization")

    if not token:
        return False

    # modo portfólio (aceita qualquer token existente)
    return True

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

# -------- ATUALIZAR PRODUTO (APENAS QUANTIDADE) -------- #
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

    return jsonify({"msg": "Quantidade atualizada com sucesso"})

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

    return jsonify({"msg": "Produto removido com sucesso"})

# -------- START -------- #
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
    
    
def criar_tabela():
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto TEXT,
        quantidade INTEGER
    )
    """)

    conn.commit()
    conn.close()

criar_tabela()

@app.route("/dashboard", methods=["GET", "OPTIONS"])
def dashboard():
    if request.method == "OPTIONS":
        return '', 200

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
    
@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    return response