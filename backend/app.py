from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import uuid

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# -------- DADOS -------- #
ARQUIVO = "dados.json"

usuarios = [
    {"email": "admin@teste.com", "senha": "123456"}
]

tokens = {}

# -------- FUNÇÕES -------- #
def ler_dados():
    try:
        with open(ARQUIVO, "r") as f:
            return json.load(f)
    except:
        return []

def salvar_dados(dados):
    with open(ARQUIVO, "w") as f:
        json.dump(dados, f, indent=4)

def autenticar():
    token = request.headers.get("Authorization")
    return token in tokens

# -------- LOGIN -------- #
@app.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return '', 200

    dados = request.json

    email = dados.get("email")
    senha = dados.get("senha")

    for user in usuarios:
        if user["email"] == email and user["senha"] == senha:
            token = str(uuid.uuid4())
            tokens[token] = user
            return jsonify({"token": token})

    return jsonify({"erro": "Credenciais inválidas"}), 401

# -------- ROTAS -------- #
@app.route("/produtos", methods=["GET"])
def listar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401
    return jsonify(ler_dados())

@app.route("/produtos", methods=["POST"])
def criar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    dados = ler_dados()
    novo = request.json

    if not novo.get("produto") or len(novo["produto"]) < 3:
        return jsonify({"erro": "Produto inválido"}), 400

    if not str(novo.get("quantidade")).isdigit() or int(novo["quantidade"]) <= 0:
        return jsonify({"erro": "Quantidade inválida"}), 400

    dados.append(novo)
    salvar_dados(dados)

    return jsonify(novo)

@app.route("/produtos/<int:index>", methods=["PUT"])
def atualizar(index):
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    dados = ler_dados()
    dados[index] = request.json
    salvar_dados(dados)

    return jsonify(dados[index])

@app.route("/produtos/<int:index>", methods=["DELETE"])
def deletar(index):
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    dados = ler_dados()
    removido = dados.pop(index)
    salvar_dados(dados)

    return jsonify(removido)

# -------- START -------- #
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)