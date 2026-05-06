from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid
import os
import base64
import schedule
import time
import threading

# 🔥 matplotlib sem erro no servidor
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment

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

    # limpar imagem
    if os.path.exists("grafico.png"):
        os.remove("grafico.png")

    return pdf

# -------- EMAIL -------- #
def enviar_email(pdf):
    api_key = os.environ.get("SENDGRID_API_KEY")

    if not api_key:
        raise Exception("SENDGRID_API_KEY não configurada no Render")

    with open(pdf, "rb") as f:
        encoded = base64.b64encode(f.read()).decode()

    attachment = Attachment(
        file_content=encoded,
        file_name="relatorio.pdf",
        file_type="application/pdf",
        disposition="attachment"
    )

    message = Mail(
        from_email="jardel.maciel22@gmail.com",  # ⚠️ precisa ser verificado no SendGrid
        to_emails=["jardelmacieldossantos.dev@gmail.com"],
        subject="Relatório de Estoque",
        html_content="<strong>Segue relatório em anexo</strong>"
    )

    message.attachment = attachment

    try:
        sg = SendGridAPIClient(api_key)
        sg.send(message)
        print("Email enviado com sucesso!")
    except Exception as e:
        print("Erro ao enviar email:", str(e))
        raise e

# -------- TESTE -------- #
@app.route("/testar-email")
def testar():
    try:
        pdf = gerar_pdf()
        enviar_email(pdf)
        return {"status": "ok", "msg": "Email enviado"}
    except Exception as e:
        return {"status": "erro", "msg": str(e)}, 500

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