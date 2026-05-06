from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid
import os
import base64
import schedule
import time
import threading
import requests  # 🔥 NOVO

# 🔥 matplotlib sem erro no servidor
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# -------- BANCO -------- #
def conectar():
    return sqlite3.connect("banco.db")

def criar_tabelas():
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT,
            quantidade INTEGER,
            valor REAL
        )
    """)

    conn.commit()
    conn.close()

criar_tabelas()

# -------- AUTH -------- #
usuarios = [{"email": "admin@teste.com", "senha": "123456"}]

def autenticar():
    return bool(request.headers.get("Authorization"))

# -------- LOGIN -------- #
@app.route("/login", methods=["POST"])
def login():
    dados = request.json

    for u in usuarios:
        if u["email"] == dados.get("email") and u["senha"] == dados.get("senha"):
            return jsonify({"token": str(uuid.uuid4())})

    return jsonify({"erro": "Credenciais inválidas"}), 401

# -------- PRODUTOS -------- #
@app.route("/produtos", methods=["GET"])
def listar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM produtos")
    dados = cursor.fetchall()
    conn.close()

    return jsonify([
        {"id": r[0], "produto": r[1], "quantidade": r[2], "valor": r[3]}
        for r in dados
    ])

@app.route("/produtos", methods=["POST"])
def criar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    d = request.json

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO produtos (produto, quantidade, valor) VALUES (?, ?, ?)",
        (d["produto"], int(d["quantidade"]), float(d.get("valor", 0)))
    )

    conn.commit()
    conn.close()

    return jsonify({"msg": "Produto criado"})

# -------- DASHBOARD -------- #
@app.route("/dashboard", methods=["GET"])
def dashboard():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("SELECT produto, quantidade, valor FROM produtos")
    dados = cursor.fetchall()
    conn.close()

    return jsonify({
        "total_produtos": len(dados),
        "total_itens": sum(p[1] for p in dados),
        "baixo_estoque": len([p for p in dados if p[1] <= 5]),
        "produtos": [
            {
                "nome": p[0],
                "quantidade": p[1],
                "valorUnitario": p[2],
                "valorTotal": p[1] * p[2]
            } for p in dados
        ]
    })

# -------- PDF -------- #
def gerar_pdf():
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("SELECT produto, quantidade, valor FROM produtos")
    dados = cursor.fetchall()
    conn.close()

    pdf = "relatorio.pdf"
    doc = SimpleDocTemplate(pdf)
    styles = getSampleStyleSheet()
    elementos = []

    elementos.append(Paragraph("Relatório de Estoque", styles["Title"]))
    elementos.append(Spacer(1, 10))

    for p in dados:
        elementos.append(Paragraph(f"{p[0]} - Qtd: {p[1]} - R$ {p[2]}", styles["Normal"]))

    nomes = [p[0] for p in dados]
    qtd = [p[1] for p in dados]

    plt.figure()
    plt.bar(nomes, qtd)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig("grafico.png")
    plt.close()

    elementos.append(Spacer(1, 20))
    elementos.append(Image("grafico.png", width=400, height=200))

    doc.build(elementos)

    if os.path.exists("grafico.png"):
        os.remove("grafico.png")

    return pdf

# -------- EMAIL (RESEND API) -------- #
def enviar_email(pdf):
    API_KEY = os.environ.get("RESEND_API_KEY")

    if not API_KEY:
        raise Exception("Configure RESEND_API_KEY no Render")

    with open(pdf, "rb") as f:
        arquivo = base64.b64encode(f.read()).decode()

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "from": "Estoque <onboarding@resend.dev>",
            "to": ["jardelmacieldossantos.dev@gmail.com"],
            "subject": "Relatório de Estoque",
            "html": "<strong>Segue relatório em anexo</strong>",
            "attachments": [
                {
                    "filename": "relatorio.pdf",
                    "content": arquivo
                }
            ]
        }
    )

    if response.status_code not in [200, 201]:
        raise Exception(f"Erro ao enviar email: {response.text}")

# -------- TESTE -------- #
@app.route("/testar-email")
def testar():
    def tarefa_background():
        try:
            pdf = gerar_pdf()
            enviar_email(pdf)
            print("Email enviado com sucesso")
        except Exception as e:
            print("Erro:", e)

    threading.Thread(target=tarefa_background).start()

    return {"status": "ok", "msg": "Relatório sendo processado"}

# -------- AGENDADOR -------- #
def tarefa():
    try:
        pdf = gerar_pdf()
        enviar_email(pdf)
        print("Relatório automático enviado")
    except Exception as e:
        print("Erro no agendador:", e)

def rodar_agendador():
    schedule.every().monday.at("08:00").do(tarefa)
    while True:
        schedule.run_pending()
        time.sleep(60)

threading.Thread(target=rodar_agendador, daemon=True).start()

# -------- START -------- #
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)