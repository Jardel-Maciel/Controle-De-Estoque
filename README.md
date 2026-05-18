<div align="center">

# 📦 Controle de Estoque

### Sistema SaaS completo para gestão de estoque empresarial

[![Status](https://img.shields.io/badge/status-online-brightgreen?style=flat-square)](https://backend-estoque-fnfc.onrender.com/health)
[![License](https://img.shields.io/badge/license-BUSL--1.1-blue?style=flat-square)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://render.com)
[![GitHub Pages](https://img.shields.io/badge/Frontend-GitHub%20Pages-222222?style=flat-square&logo=github&logoColor=white)](https://pages.github.com)

**[🚀 Acessar o sistema](https://jardel-maciel.github.io/Controle-De-Estoque/) &nbsp;·&nbsp; [🔍 Ver demonstração](#-demonstração) &nbsp;·&nbsp; [📖 Documentação da API](#-api-rest)**

</div>

---

## ✨ Sobre o projeto

O **Controle de Estoque** é uma plataforma SaaS desenvolvida para empresas que precisam gerenciar seu estoque de forma simples, segura e eficiente. Cada empresa opera em um ambiente isolado (multi-tenant), com controle de acesso por perfil de usuário e integração nativa com Notas Fiscais Eletrônicas.

Desenvolvido do zero com foco em segurança, escalabilidade e experiência do usuário — pronto para uso comercial.

---

## 🖥️ Demonstração

> Teste o sistema agora mesmo, sem precisar criar uma conta:

| Campo | Valor |
|---|---|
| 🔗 **URL** | https://jardel-maciel.github.io/Controle-De-Estoque/ |
| 📧 **Email** | `demo@estoque.com` |
| 🔑 **Senha** | `demo1234` |

A conta demo tem perfil **gerente** com acesso completo ao sistema — dashboard, produtos, movimentações, importação de XML/Excel e geração de relatórios PDF.

> ⚠️ O painel administrativo (gestão de tenants e usuários) é exclusivo do superadmin.

---

## 📸 Screenshots

> 💡 **Dica:** tire prints das telas abaixo e salve na pasta `docs/assets/` substituindo os placeholders.

### Dashboard
![Dashboard](docs/assets/screenshot-dashboard.png)

### Gestão de Produtos
![Produtos](docs/assets/screenshot-produtos.png)

### Importação de NF-e
![Importação XML](docs/assets/screenshot-xml.png)

### Relatório PDF
![Relatório](docs/assets/screenshot-relatorio.png)

---

## 🚀 Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 🔐 **Autenticação JWT** | Login seguro com refresh token (sessão de 30 dias) |
| 🏢 **Multi-tenant** | Cada empresa acessa apenas seus próprios dados |
| 👥 **Controle de acesso** | Perfis: `superadmin`, `admin`, `gerente` e `cliente` |
| 📊 **Dashboard** | Totais, alertas de baixo estoque e gráficos em tempo real |
| 📦 **Gestão de produtos** | CRUD completo com busca e filtros |
| 🔄 **Movimentações** | Entradas e saídas com aprovação por gerente |
| 📄 **Importação NF-e** | Leitura automática de XML no padrão SEFAZ |
| 📊 **Importação Excel** | Suporte a múltiplas abas com detecção automática de colunas |
| 🧾 **Relatórios PDF** | Geração de relatórios com gráficos e logo personalizada |
| ⚙️ **Painel Admin SaaS** | Gestão completa de tenants e usuários |

---

## 🛠️ Tecnologias

<div align="center">

| Camada | Tecnologias |
|---|---|
| **Backend** | Python · Flask · PostgreSQL · psycopg2 · PyJWT · bcrypt · Gunicorn |
| **Frontend** | HTML5 · CSS3 · JavaScript · Chart.js · jsPDF |
| **Importação** | lxml (XML NF-e) · openpyxl (Excel) |
| **Relatórios** | ReportLab · Matplotlib |
| **Infraestrutura** | Render (backend) · GitHub Pages (frontend) |

</div>

---

## 🏗️ Arquitetura

```
Controle-De-Estoque/              ← repositório público (frontend)
└── docs/
    ├── index.html                ← login
    ├── dashboard.html
    ├── produtos.html
    ├── movimentacoes.html
    ├── historico.html
    ├── admin.html
    ├── gerente.html
    ├── css/
    │   ├── design-system.css
    │   └── toast.css
    └── js/
        ├── api.js                ← fetch com renovação automática de token
        ├── login.js
        ├── dashboard.js
        ├── script.js
        ├── historico.js
        ├── admin-btn.js
        └── toast.js

controle-estoque-backend/         ← repositório privado (backend)
└── backend/
    ├── app.py                    ← entry point Flask
    ├── requirements.txt
    ├── env.example
    ├── database/
    │   └── database.py           ← pool de conexões e criação de tabelas
    ├── models/
    │   ├── produto.py
    │   ├── movimentacao.py
    │   ├── nota_fiscal.py
    │   ├── item_nota.py
    │   └── fornecedor.py
    ├── routes/
    │   ├── auth_routes.py
    │   ├── produtos_routes.py
    │   ├── movimentacoes_routes.py
    │   ├── dashboard_routes.py
    │   ├── xml_importador.py
    │   ├── excel_importador.py
    │   ├── admin_routes.py
    │   └── gerente_routes.py
    ├── services/
    │   └── xml_service.py
    └── utils/
        ├── auth.py
        ├── auth_middleware.py
        ├── jwt.py
        └── xml_parser.py
```

---

## 🌐 API REST

Todas as rotas (exceto `/login` e `/health`) exigem o header:

```http
Authorization: Bearer <token>
```

<details>
<summary><strong>🔑 Autenticação</strong></summary>

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/login` | Retorna `token` e `refresh_token` |
| `POST` | `/auth/refresh` | Renova o token de acesso |

</details>

<details>
<summary><strong>📦 Produtos</strong></summary>

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/produtos` | Lista todos os produtos do tenant |
| `POST` | `/produtos` | Cadastra novo produto |
| `PUT` | `/produtos/<id>` | Atualiza produto |
| `DELETE` | `/produtos/<id>` | Remove produto |

</details>

<details>
<summary><strong>🔄 Movimentações</strong></summary>

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/movimentacoes` | Histórico de movimentações |
| `POST` | `/movimentacoes` | Registra entrada ou saída |

</details>

<details>
<summary><strong>📊 Dashboard & Importação</strong></summary>

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/dashboard` | Totais, alertas e últimas movimentações |
| `POST` | `/xml/importar` | Importa NF-e em XML (padrão SEFAZ) |
| `POST` | `/excel/importar` | Importa produtos via planilha Excel |

</details>

<details>
<summary><strong>⚙️ Administração</strong></summary>

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `GET` | `/admin/usuarios` | Lista todos os usuários | superadmin |
| `POST` | `/admin/usuarios` | Cria usuário em qualquer tenant | superadmin |
| `PUT` | `/admin/usuarios/<id>` | Edita usuário | superadmin |
| `DELETE` | `/admin/usuarios/<id>` | Remove usuário | superadmin |
| `GET` | `/gerente/dashboard` | Dashboard da equipe | gerente, admin |
| `GET` | `/health` | Status da API | público |

</details>

---

## ⚙️ Variáveis de ambiente

Copie `env.example` para `.env` e preencha:

```env
# Banco de dados
DATABASE_URL=postgresql://usuario:senha@host:5432/nome_banco

# JWT — gere com: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=chave-aleatoria-de-64-caracteres

# Superadmin (criado automaticamente na primeira execução)
SUPERADMIN_EMAIL=seu@email.com
SUPERADMIN_SENHA=senha-forte
SUPERADMIN_NOME=SeuNome

# CORS — domínios permitidos pelo frontend (separados por vírgula)
ALLOWED_ORIGINS=https://jardel-maciel.github.io

# Flask
FLASK_DEBUG=false
PORT=5000
```

---

## 💻 Executando localmente

### Pré-requisitos
- Python 3.10+
- PostgreSQL

### Backend

```bash
git clone https://github.com/Jardel-Maciel/controle-estoque-backend.git
cd controle-estoque-backend/backend

python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp env.example .env            # preencha as variáveis
python app.py
```

A API estará disponível em `http://localhost:5000`.

### Frontend

```bash
git clone https://github.com/Jardel-Maciel/Controle-De-Estoque.git
```

Abra `docs/index.html` com o Live Server do VS Code.

---

## ☁️ Deploy

### Backend — Render
1. Conecte o repositório privado `controle-estoque-backend` ao Render
2. Configure as variáveis de ambiente no painel
3. O Render detecta automaticamente o `gunicorn` via `requirements.txt`

### Frontend — GitHub Pages
O GitHub Pages publica automaticamente a pasta `docs/` do repositório público.

---

## 🔒 Segurança

- ✅ Senhas armazenadas com `bcrypt`
- ✅ JWT com expiração curta + refresh token de 30 dias
- ✅ Variáveis sensíveis exclusivamente via variáveis de ambiente
- ✅ Backend em repositório **privado** — código não exposto publicamente
- ✅ CORS configurado para origens autorizadas
- ✅ Isolamento total de dados por tenant em todas as queries

---

## 🗺️ Roadmap

- [ ] Notificações automáticas de baixo estoque por e-mail
- [ ] App mobile (React Native)
- [ ] Cadastro self-service de novas empresas
- [ ] Emissão de NF-e diretamente pelo sistema
- [ ] Integração com sistemas de ERP
- [ ] Backup automático do banco de dados
- [ ] API pública com autenticação por API Key
- [ ] Dashboard financeiro com controle de custos

---

## 📄 Licença

Este projeto está licenciado sob a [Business Source License 1.1](./LICENSE).  
Uso comercial sem autorização prévia do autor é **proibido**.  
Para licenciamento comercial: jardel.maciel22@gmail.com

---

<div align="center">

Desenvolvido por **Jardel Maciel**

[![GitHub](https://img.shields.io/badge/GitHub-Jardel--Maciel-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/Jardel-Maciel)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Jardel%20Maciel-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/jardel-maciel)

⭐ Se este projeto te inspirou, deixe uma estrela no repositório!

</div>
