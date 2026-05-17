from flask import Flask
from flask_cors import CORS

# =========================
# CARREGA O .env ANTES DE TUDO
# =========================
from dotenv import load_dotenv
load_dotenv()

from database.database import criar_tabelas

from routes.auth_routes import auth_bp
from routes.produtos_routes import produtos_bp
from routes.dashboard_routes import dashboard_bp
from routes.movimentacoes_routes import movimentacoes_bp
from routes.xml_importador import xml_bp
from routes.excel_importador import excel_bp
from routes.admin_routes import admin_bp

import routes.auth_routes

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

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
# TESTE API
# =========================
@app.route("/")
def home():
    return {"status": "API ONLINE"}

@app.route("/health")
def health():
    return {"status": "ok"}

# =========================
# START
# =========================
if __name__ == "__main__":
    app.run(debug=True)