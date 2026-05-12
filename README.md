# 📦 Controle de Estoque SaaS

Sistema web completo para gerenciamento de estoque, produtos, movimentações e relatórios empresariais.

Desenvolvido com arquitetura SaaS utilizando Flask no backend e JavaScript no frontend.

---

# 🚀 Demonstração

## Funcionalidades principais

✅ Login com JWT
✅ Dashboard administrativo
✅ Cadastro de produtos
✅ Controle de estoque
✅ Entrada e saída de produtos
✅ Histórico de movimentações
✅ Importação XML de NF-e
✅ Relatórios PDF
✅ Painel Admin SaaS
✅ Dashboard com gráficos
✅ Sistema online

---

# 🖥️ Tecnologias Utilizadas

## Backend

* Python
* Flask
* Flask-CORS
* JWT Authentication
* SQLAlchemy
* PostgreSQL

## Frontend

* HTML5
* CSS3
* JavaScript
* Chart.js
* jsPDF

## Deploy

* Render
* GitHub Pages

---

# 📁 Estrutura do Projeto

```text
Controle-De-Estoque/
│
├── backend/
│   ├── app.py
│   ├── routes/
│   ├── database/
│   ├── utils/
│   └── requirements.txt
│
├── docs/
│   ├── index.html
│   ├── dashboard.html
│   ├── css/
│   ├── js/
│   └── assets/
│
└── README.md
```

---

# 🔐 Autenticação

O sistema utiliza autenticação JWT para proteção das rotas.

## Recursos

* Login seguro
* Controle de sessão
* Proteção de rotas
* Controle administrativo

---

# 📊 Dashboard

O dashboard apresenta:

* Quantidade total de produtos
* Valor total do estoque
* Produtos com baixo estoque
* Gráficos estatísticos
* Histórico de movimentações

---

# 📦 Gestão de Produtos

## Funcionalidades

* Cadastro de produtos
* Edição
* Exclusão
* Pesquisa
* Controle de quantidade
* Controle de preço

---

# 🔄 Movimentações

Controle completo de entradas e saídas.

## Recursos

* Entrada de produtos
* Saída de produtos
* Histórico detalhado
* Registro automático

---

# 📄 Importação XML

Importação automática de notas fiscais XML.

## Recursos

* Leitura de XML NF-e
* Cadastro automático de produtos
* Atualização de estoque
* Extração automática de dados

---

# 🧾 Relatórios PDF

Geração de relatórios profissionais.

## Recursos

* Relatório de estoque
* Histórico de movimentações
* Gráficos no PDF
* Logo personalizada
* Layout Premium SaaS

---

# 🌐 API REST

## Principais rotas

### Autenticação

```http
POST /login
POST /register
```

### Produtos

```http
GET /produtos
POST /produtos
PUT /produtos/:id
DELETE /produtos/:id
```

### Movimentações

```http
GET /movimentacoes
POST /movimentacoes
```

### Dashboard

```http
GET /dashboard
```

### XML

```http
POST /importar-xml
```

---

# ⚙️ Instalação

## 1. Clonar repositório

```bash
git clone https://github.com/seuusuario/controle-de-estoque.git
```

---

## 2. Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

---

## 3. Frontend

Abrir:

```text
/docs/index.html
```

---

# 🔧 Variáveis de Ambiente

```env
DATABASE_URL=
JWT_SECRET_KEY=
PORT=
```

---

# ☁️ Deploy

## Backend

Pode ser hospedado em:

* Render
* Railway
* VPS
* Heroku

## Frontend

Pode ser hospedado em:

* GitHub Pages
* Netlify
* Vercel

---

# 🔒 Segurança

## Implementado

* JWT Authentication
* Proteção de rotas
* Middleware de autenticação
* Controle de acesso

## Melhorias futuras

* Rate limiting
* Refresh token
* Auditoria
* Logs avançados
* Controle multiempresa

---

# 📈 Futuras Melhorias

* Multiempresa
* Multiusuário
* Controle financeiro
* App mobile
* API pública
* Emissão fiscal
* Backup automático
* Notificações

---

# 💼 Projeto para Portfólio

Este projeto demonstra conhecimentos em:

* Desenvolvimento Full Stack
* Backend com Flask
* Frontend JavaScript
* API REST
* Banco de dados
* JWT Authentication
* Arquitetura SaaS
* Relatórios PDF
* Importação XML
* Deploy Cloud

---

# 📌 Status do Projeto

✅ Em desenvolvimento ativo
✅ Estrutura SaaS funcional
✅ Projeto pronto para expansão

---

# 👨‍💻 Autor

Desenvolvido por Jardel Maciel.

---

# ⭐ Objetivo

Criar um sistema profissional de gestão de estoque moderno, escalável e preparado para uso comercial.
