# Controle de Estoque

Sistema web SaaS para gerenciamento de estoque, produtos, movimentações e notas fiscais, com suporte a múltiplas empresas (multi-tenant).

**Frontend:** [GitHub Pages](https://jardel-maciel.github.io/Controle-De-Estoque/) &nbsp;·&nbsp; **Backend:** [Render](https://backend-estoque-fnfc.onrender.com/health)

---

## Visão geral

O sistema permite que cada empresa (tenant) gerencie seu próprio estoque de forma isolada, com controle de acesso por perfil de usuário. A importação de notas fiscais via XML NF-e automatiza o cadastro de produtos e atualiza o estoque em tempo real.

---

## Funcionalidades

- Autenticação JWT com refresh token (sessão de 30 dias)
- Controle de acesso por perfil: `superadmin`, `admin`, `gerente` e `cliente`
- Multi-tenant: cada empresa acessa apenas seus próprios dados
- Dashboard com totais de produtos, valor do estoque e alertas de baixo estoque
- CRUD completo de produtos com busca e filtros
- Registro de entradas e saídas com aprovação por gerente
- Histórico detalhado de movimentações
- Importação automática de XML NF-e (produtos, fornecedor, valores)
- Importação via planilha Excel
- Relatórios em PDF com gráficos e logo personalizada
- Painel administrativo SaaS para gestão de tenants e usuários

---

## Tecnologias

### Backend
| Tecnologia | Uso |
|---|---|
| Python + Flask | API REST |
| PostgreSQL | Banco de dados |
| psycopg2 | Driver com pool de conexões |
| PyJWT + bcrypt | Autenticação e hash de senhas |
| lxml | Parser de XML NF-e |
| openpyxl | Importação de planilhas Excel |
| ReportLab + Matplotlib | Geração de PDFs e gráficos |
| Gunicorn | Servidor WSGI em produção |

### Frontend
| Tecnologia | Uso |
|---|---|
| HTML5 + CSS3 + JavaScript | Interface sem frameworks |
| Chart.js | Gráficos no dashboard |
| jsPDF | Exportação de relatórios |

### Infraestrutura
| Serviço | Uso |
|---|---|
| Render | Hospedagem do backend (repo privado) |
| GitHub Pages | Hospedagem do frontend |
| PostgreSQL (Render) | Banco em produção |

---

## Arquitetura

```
Controle-De-Estoque/          ← repositório público (frontend)
└── docs/
    ├── index.html            ← login
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
        ├── api.js            ← camada de fetch com renovação automática de token
        ├── login.js
        ├── dashboard.js
        ├── script.js
        ├── historico.js
        ├── admin-btn.js
        └── toast.js

controle-estoque-backend/     ← repositório privado (backend)
└── backend/
    ├── app.py                ← entry point Flask
    ├── requirements.txt
    ├── env.example
    ├── database/
    │   └── database.py       ← pool de conexões e criação de tabelas
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

## API REST

Todas as rotas (exceto `/login` e `/health`) exigem o header:

```
Authorization: Bearer <token>
```

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/login` | Autenticação — retorna `token` e `refresh_token` |
| `POST` | `/auth/refresh` | Renova o token de acesso |

### Produtos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/produtos` | Lista todos os produtos do tenant |
| `POST` | `/produtos` | Cadastra um novo produto |
| `PUT` | `/produtos/<id>` | Atualiza um produto |
| `DELETE` | `/produtos/<id>` | Remove um produto |

### Movimentações

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/movimentacoes` | Lista o histórico de movimentações |
| `POST` | `/movimentacoes` | Registra entrada ou saída |

### Dashboard

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/dashboard` | Totais, alertas e últimas movimentações |

### Importação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/importar-xml` | Importa NF-e em XML |
| `POST` | `/importar-excel` | Importa produtos via planilha |

### Administração (`/admin`)

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `GET` | `/admin/usuarios` | Lista todos os usuários | superadmin |
| `POST` | `/admin/usuarios` | Cria usuário em qualquer tenant | superadmin |
| `PUT` | `/admin/usuarios/<id>` | Edita usuário | superadmin |
| `DELETE` | `/admin/usuarios/<id>` | Remove usuário | superadmin |

### Gerente (`/gerente`)

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `GET` | `/gerente/dashboard` | Dashboard da equipe | gerente, admin |

### Health check

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status da API |

---

## Variáveis de ambiente

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

## Executando localmente

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
cd Controle-De-Estoque/docs
```

Abra `index.html` com Live Server (VS Code) ou qualquer servidor estático.
Certifique-se de que `docs/js/api.js` aponta para `http://localhost:5000` no ambiente local.

---

## Deploy

### Backend — Render

1. Conecte o repositório privado `controle-estoque-backend` ao Render
2. Configure as variáveis de ambiente no painel do Render
3. O Render detecta automaticamente o `gunicorn` via `requirements.txt`

### Frontend — GitHub Pages

O GitHub Pages publica automaticamente a pasta `docs/` do repositório `Controle-De-Estoque`.
Nenhuma configuração adicional é necessária após o primeiro setup.

---

## Segurança

- Senhas armazenadas com `bcrypt` (fator de custo padrão)
- Tokens JWT com expiração curta + refresh token de 30 dias
- Variáveis sensíveis exclusivamente via variáveis de ambiente (nunca no código)
- Backend em repositório privado — código-fonte não exposto publicamente
- CORS configurado para aceitar apenas origens autorizadas
- Isolamento total de dados por tenant (todas as queries filtram por `tenant_id`)

---

## Autor

Desenvolvido por **Jardel Maciel**

[![GitHub](https://img.shields.io/badge/GitHub-Jardel--Maciel-181717?style=flat&logo=github)](https://github.com/Jardel-Maciel)