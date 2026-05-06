from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import sqlite3
import uuid
import os
import schedule
import time
import threading
import smtplib

from io import BytesIO

from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

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

# -------- PDF (AGORA EM MEMÓRIA) -------- #

def gerar_pdf():
    conn = conectar()
    cursor = conn.cursor()

    # PRODUTOS
    cursor.execute("SELECT produto, quantidade, valor FROM produtos")
    produtos = cursor.fetchall()

    # MOVIMENTAÇÕES
    cursor.execute("SELECT tipo, quantidade FROM movimentacoes")
    mov = cursor.fetchall()

    conn.close()

    pdf = "relatorio.pdf"
    doc = SimpleDocTemplate(pdf)

    styles = getSampleStyleSheet()
    elementos = []

    # =========================
    # TÍTULO
    # =========================
    elementos.append(Paragraph("📊 RELATÓRIO PROFISSIONAL DE ESTOQUE", styles["Title"]))
    elementos.append(Spacer(1, 12))

    # =========================
    # KPIs (RESUMO)
    # =========================
    total_produtos = len(produtos)
    total_itens = sum(p[1] for p in produtos)
    valor_total = sum(p[1] * p[2] for p in produtos)
    baixo_estoque = len([p for p in produtos if p[1] <= 5])

    elementos.append(Paragraph(f"📦 Total de Produtos: {total_produtos}", styles["Normal"]))
    elementos.append(Paragraph(f"📦 Total de Itens em Estoque: {total_itens}", styles["Normal"]))
    elementos.append(Paragraph(f"💰 Valor Total do Estoque: R$ {valor_total:.2f}", styles["Normal"]))
    elementos.append(Paragraph(f"⚠️ Produtos com Baixo Estoque: {baixo_estoque}", styles["Normal"]))

    elementos.append(Spacer(1, 15))

    # =========================
    # LISTA DE PRODUTOS
    # =========================
    elementos.append(Paragraph("📦 DETALHAMENTO DOS PRODUTOS", styles["Heading2"]))
    elementos.append(Spacer(1, 10))

    for p in produtos:
        nome = p[0]
        qtd = p[1]
        valor = p[2]
        total = qtd * valor

        elementos.append(
            Paragraph(
                f"• <b>{nome}</b> | Qtd: {qtd} | Unit: R$ {valor:.2f} | Total: R$ {total:.2f}",
                styles["Normal"]
            )
        )

    elementos.append(Spacer(1, 20))

    # =========================
    # GRÁFICO PROFISSIONAL
    # =========================
    nomes = [p[0] for p in produtos]
    qtds = [p[1] for p in produtos]

    plt.figure(figsize=(8, 4))
    plt.bar(nomes, qtds)
    plt.title("Estoque por Produto")
    plt.xticks(rotation=45)
    plt.tight_layout()

    grafico_path = "grafico.png"
    plt.savefig(grafico_path)
    plt.close()

    elementos.append(Paragraph("📉 VISÃO GRÁFICA DO ESTOQUE", styles["Heading2"]))
    elementos.append(Image(grafico_path, width=450, height=250))

    # =========================
    # MOVIMENTAÇÕES
    # =========================
    elementos.append(Spacer(1, 20))
    elementos.append(Paragraph("🔄 MOVIMENTAÇÕES RECENTES", styles["Heading2"]))

    if mov:
        for m in mov[-10:]:
            elementos.append(
                Paragraph(f"{m[0]} - {m[1]} itens", styles["Normal"])
            )
    else:
        elementos.append(Paragraph("Nenhuma movimentação registrada.", styles["Normal"]))

    # =========================
    # GERAR PDF
    # =========================
    doc.build(elementos)

    if os.path.exists(grafico_path):
        os.remove(grafico_path)

    return pdf

# -------- DOWNLOAD PDF -------- #
@app.route("/download-pdf")
def download_pdf():
    pdf_buffer = gerar_pdf()

    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name="relatorio_estoque.pdf",
        mimetype="application/pdf"
    )

# -------- EMAIL (mantido) -------- #
def enviar_email(pdf):
    try:
        REMETENTE = os.environ.get("EMAIL_USER")
        SENHA = os.environ.get("EMAIL_PASS")
        DESTINATARIO = "jardelmacieldossantos.dev@gmail.com"

        if not REMETENTE or not SENHA:
            raise Exception("EMAIL_USER ou EMAIL_PASS não configurados")

        msg = MIMEMultipart()
        msg["From"] = REMETENTE
        msg["To"] = DESTINATARIO
        msg["Subject"] = "Relatório de Estoque"

        with open(pdf, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())

        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f"attachment; filename={pdf}")
        msg.attach(part)

        servidor = smtplib.SMTP("smtp.gmail.com", 587, timeout=20)
        servidor.starttls()
        servidor.login(REMETENTE, SENHA)
        servidor.send_message(msg)
        servidor.quit()

        return True

    except Exception as e:
        print("Erro ao enviar email:", e)
        return False

# -------- START -------- #
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
