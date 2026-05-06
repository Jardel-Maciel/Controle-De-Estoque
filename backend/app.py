from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid
import os
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
import matplotlib.pyplot as plt
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment
import base64
import schedule
import time
import threading

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

    cursor.execute("SELECT id, produto, quantidade, valor, fornecedor, contato FROM produtos")
    dados = cursor.fetchall()
    conn.close()

    return jsonify([
        {
            "id": r[0],
            "produto": r[1],
            "quantidade": r[2],
            "valor": r[3],
            "fornecedor": r[4],
            "contato": r[5]
        } for r in dados
    ])

@app.route("/produtos", methods=["POST"])
def criar():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    d = request.json

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO produtos (produto, quantidade, valor, fornecedor, contato)
        VALUES (?, ?, ?, ?, ?)
    """, (d["produto"], int(d["quantidade"]), float(d.get("valor", 0)), d.get("fornecedor",""), d.get("contato","")))

    conn.commit()
    conn.close()

    return jsonify({"msg": "Produto criado"})

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
                "valorTotal": p[1]*p[2]
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
    elementos.append(Spacer(1,10))

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

    elementos.append(Image("grafico.png", width=400, height=200))

    doc.build(elementos)

    return pdf

# -------- EMAIL -------- #
def enviar_email(pdf):
    with open(pdf, "rb") as f:
        encoded = base64.b64encode(f.read()).decode()

    attachment = Attachment(
        file_content=encoded,
        file_name="relatorio.pdf",
        file_type="application/pdf",
        disposition="attachment"
    )

    message = Mail(
        from_email="jardel.maciel22@gmail.com",  # 🔥 MUDE AQUI
        to_emails=["jardelmacieldossantos.dev@gmail.com"],
        subject="Relatório de Estoque",
        html_content="<strong>Segue relatório em anexo</strong>"
    )

    message.attachment = attachment

    sg = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
    sg.send(message)

# -------- ROTAS -------- #
@app.route("/testar-email")
def testar():
    pdf = gerar_pdf()
    enviar_email(pdf)
    return {"msg": "Email enviado"}

# -------- AGENDADOR -------- #
def tarefa():
    pdf = gerar_pdf()
    enviar_email(pdf)

def rodar_agendador():
    schedule.every().monday.at("08:00").do(tarefa)
    while True:
        schedule.run_pending()
        time.sleep(60)

threading.Thread(target=rodar_agendador, daemon=True).start()

# -------- START -------- #
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)