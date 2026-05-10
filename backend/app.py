from flask import Flask
from flask_cors import CORS

from database.database import criar_tabelas

from routes.auth_routes import auth_bp
from routes.produtos_routes import produtos_bp
from routes.dashboard_routes import dashboard_bp
from routes.movimentacoes_routes import movimentacoes_bp

app = Flask(__name__)

CORS(app)

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

# =========================
# TESTE API
# =========================
@app.route("/")
def home():
    return {
        "status": "API ONLINE"
    }

# =========================
# START
# =========================
if __name__ == "__main__":
    app.run(debug=True)