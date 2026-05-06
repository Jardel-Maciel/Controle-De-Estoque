from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid
import smtplib
from email.mime.text import MIMEText
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Image
import matplotlib.pyplot as plt
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment
import base64

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

# -------- DASHBOARD (ADICIONADO DE VOLTA) -------- #
@app.route("/dashboard", methods=["GET"])
def dashboard():
    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        conn = conectar()
        cursor = conn.cursor()

        cursor.execute("SELECT produto, quantidade, valor FROM produtos")
        dados = cursor.fetchall()

        conn.close()

        total_produtos = len(dados)
        total_itens = sum([row[1] for row in dados])
        baixo_estoque = len([row for row in dados if row[1] <= 5])

        produtos = [
            {
                "nome": row[0],
                "quantidade": row[1],
                "valorUnitario": row[2],
                "valorTotal": row[1] * row[2]
            }
            for row in dados
        ]

        return jsonify({
            "total_produtos": total_produtos,
            "total_itens": total_itens,
            "baixo_estoque": baixo_estoque,
            "produtos": produtos
        })

    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# -------- CORS FIX -------- #
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return '', 200

#----------Gerar relatorio -----------#

def gerar_relatorio():
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT produto, quantidade, valor FROM produtos")
    dados = cursor.fetchall()

    conn.close()

    total_itens = sum([row[1] for row in dados])
    valor_total = sum([row[1] * row[2] for row in dados])

    relatorio = f"""
📦 RELATÓRIO SEMANAL

Total de produtos: {len(dados)}
Total de itens: {total_itens}
Valor total em estoque: R$ {valor_total:.2f}

-------------------------

"""

    for p in dados:
        relatorio += f"{p[0]} | Qtd: {p[1]} | Valor: R$ {p[2]}\n"

    return relatorio

# -------- ENVIO DE EMAIL -------- #
def enviar_email(relatorio):
    remetente = "jardel.maciel22@gmail.com"
    senha = "Manut218"  # ⚠️ não usar senha normal
    destinatario = "jardel.maciel22@gmail.com"

    msg = MIMEText(relatorio)
    msg["Subject"] = "Relatório Semanal de Estoque"
    msg["From"] = remetente
    msg["To"] = destinatario

    servidor = smtplib.SMTP("smtp.gmail.com", 587)
    servidor.starttls()
    servidor.login(remetente, senha)
    servidor.send_message(msg)
    servidor.quit()

# -------- AGENDAR ENVIO -------- #

import schedule
import time
import threading

def tarefa_semanal():
    relatorio = gerar_relatorio()
    enviar_email(relatorio)
    print("Relatório enviado!")

def iniciar_agendador():
    schedule.every().Wednesday.at("08:00").do(tarefa_semanal)

    while True:
        schedule.run_pending()
        time.sleep(60)

# rodar em thread separada
threading.Thread(target=iniciar_agendador, daemon=True).start()

#--------- GERAR PDF -------#
def gerar_pdf():
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT produto, quantidade, valor FROM produtos")
    dados = cursor.fetchall()
    conn.close()

    pdf_path = "relatorio.pdf"
    doc = SimpleDocTemplate(pdf_path)
    styles = getSampleStyleSheet()

    elementos = []

    elementos.append(Paragraph("Relatório Semanal de Estoque", styles["Title"]))
    elementos.append(Spacer(1, 10))

    total_itens = sum([p[1] for p in dados])
    valor_total = sum([p[1] * p[2] for p in dados])

    elementos.append(Paragraph(f"Total de itens: {total_itens}", styles["Normal"]))
    elementos.append(Paragraph(f"Valor total: R$ {valor_total:.2f}", styles["Normal"]))
    elementos.append(Spacer(1, 10))

    # lista produtos
    for p in dados:
        elementos.append(Paragraph(f"{p[0]} - Qtd: {p[1]} - R$ {p[2]}", styles["Normal"]))

    # gerar gráfico
    nomes = [p[0] for p in dados]
    quantidades = [p[1] for p in dados]

    plt.figure()
    plt.bar(nomes, quantidades)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig("grafico.png")
    plt.close()

    elementos.append(Spacer(1, 20))
    elementos.append(Image("grafico.png", width=400, height=200))
    
    baixo = [p for p in dados if p[1] <= 5]

    if baixo:
        elementos.append(Spacer(1, 15))
        elementos.append(Paragraph("⚠️ Produtos com baixo estoque:", styles["Heading2"]))

        for p in baixo:
            elementos.append(Paragraph(f"{p[0]} - Qtd: {p[1]}", styles["Normal"]))

    doc.build(elementos)

    return pdf_path

#---------ENVIO PDF-------#

def enviar_email_sendgrid(pdf_path):
    emails = [
        "email1@gmail.com",
        "email2@gmail.com"
    ]

    with open(pdf_path, "rb") as f:
        data = f.read()

    encoded = base64.b64encode(data).decode()

    attachment = Attachment(
        file_content=encoded,
        file_name="relatorio.pdf",
        file_type="application/pdf",
        disposition="attachment"
    )

    message = Mail(
        from_email="seuemail@dominio.com",
        to_emails=emails,
        subject="Relatório Semanal de Estoque",
        html_content="<strong>Segue o relatório em anexo.</strong>"
    )

    message.attachment = attachment

    try:
        sg = SendGridAPIClient("SUA_API_KEY")
        sg.send(message)
        print("Email enviado com sucesso!")
    except Exception as e:
        print(e)
        
def tarefa_semanal():
    pdf = gerar_pdf()
    enviar_email_sendgrid(pdf)

@app.route("/relatorio", methods=["GET"])
def relatorio_manual():
    pdf = gerar_pdf()
    enviar_email_sendgrid(pdf)
    return {"msg": "Relatório enviado"}

#------- teste envio de email--------#

@app.route("/testar-email", methods=["GET"])
def testar_email():
    try:
        pdf = gerar_pdf()
        enviar_email_sendgrid(pdf)
        return {"status": "ok", "msg": "Email enviado com sucesso"}
    except Exception as e:
        return {"status": "erro", "msg": str(e)}
# -------- START -------- #
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)