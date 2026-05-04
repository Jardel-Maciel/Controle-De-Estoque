# 🚀 Controle de Estoque SaaS

Sistema web completo de controle de estoque com autenticação, API REST e edição inline estilo Excel.

---

## 📸 Preview

> 💡 (adicione um print ou GIF aqui depois)
> ![preview](./preview.png)

---

## 🔥 Destaques

* 🔐 Autenticação com token (login real)
* 📦 CRUD completo com persistência no backend
* ✏️ Edição inline da quantidade (estilo Excel)
* 🌙 Dark Mode
* ⚡ Integração frontend + backend
* ☁️ Deploy em produção (Render)

---

## 🧠 Sobre o projeto

Este projeto começou como um CRUD simples com LocalStorage e evoluiu para uma aplicação fullstack completa, simulando um sistema SaaS real.

Foco em:

* Arquitetura cliente-servidor
* Boas práticas de desenvolvimento
* Experiência do usuário (UX)
* Integração com API REST

---

## 🛠️ Tecnologias

### Frontend

* HTML5
* CSS3
* JavaScript (Vanilla)

### Backend

* Python
* Flask
* Flask-CORS
* Gunicorn

---

## 🔗 API

### 🔐 Login

POST /login

### 📦 Produtos

GET /produtos
POST /produtos
PUT /produtos/:id
DELETE /produtos/:id

---

## 🔐 Autenticação

O sistema utiliza token armazenado no navegador e enviado no header:

Authorization: TOKEN

---

## 🚀 Como executar

### Backend

```bash
pip install -r requirements.txt
python app.py
```

### Frontend

Abra o arquivo:

```bash
index.html
```

---

## 💡 Diferenciais do projeto

* Interface com comportamento de aplicação real (SaaS)
* Edição inline sem uso de prompts
* Comunicação com backend em produção
* Estrutura organizada e escalável

---

## 📈 Próximas melhorias

* 👥 Sistema multiusuário
* 🗄️ Banco de dados (SQLite ou PostgreSQL)
* 📊 Dashboard com métricas
* 🔒 Autenticação mais robusta (JWT)

---

## ⚠️ Licença

Este projeto é destinado apenas para fins educacionais e de portfólio.

🚫 Uso comercial, redistribuição ou cópia não são permitidos sem autorização do autor.

---

## 💼 Contato

Interessado em utilizar este sistema ou contratar uma versão personalizada?

📩 [SEU EMAIL AQUI]
