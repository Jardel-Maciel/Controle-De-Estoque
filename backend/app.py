from flask import Flask
from flask_cors import CORS

# =========================
# CARREGA O .env ANTES DE TUDO
# =========================
from dotenv import load_dotenv
load_dotenv()

import os
from database.database import criar_tabelas

from routes.auth_routes import auth_bp
from routes.produtos_routes import produtos_bp
from routes.dashboard_routes import dashboard_bp
from routes.movimentacoes_routes import movimentacoes_bp
from routes.xml_importador import xml_bp
from routes.excel_importador import excel_bp
from routes.admin_routes import admin_bp

app = Flask(__name__)

# =========================
# CORS — lê origens permitidas do ambiente.
# Em produção, defina no .env:
#   ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com
# Em desenvolvimento, deixe em branco para liberar localhost.
# =========================
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
if _raw_origins.strip():
    _origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
else:
    # Desenvolvimento local — libera apenas localhost
    _origins = ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000"]

CORS(app, resources={r"/*": {"origins": _origins}}, supports_credentials=False)

# =========================
# CRIAR TABELAS
# =========================
criar_tabelas()

# =========================
# ROTAS
# =========================
app.register_blueprint(auth_bp)
app.register_blueprint(produtos_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(movimentacoes_bp)
app.register_blueprint(xml_bp)
app.register_blueprint(excel_bp)
app.register_blueprint(admin_bp)

# =========================
# HEALTHCHECK
# =========================
@app.route("/")
def home():
    return {"status": "API ONLINE"}

@app.route("/health")
def health():
    return {"status": "ok"}

# =========================
# START — debug lido do ambiente (False em produção)
# =========================
if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    port  = int(os.environ.get("PORT", 5000))
    app.run(debug=debug, port=port)