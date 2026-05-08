from flask import Flask
from flask_cors import CORS

# ROTAS
from routes.auth_routes import auth_bp
from routes.dashboard_routes import dashboard_bp
from routes.produtos_routes import produtos_bp
from routes.movimentacoes_routes import movimentacoes_bp

# BANCO
from database.database import criar_tabelas

# =========================
# APP
# =========================
app = Flask(__name__)

# =========================
# CORS
# =========================
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# =========================
# BANCO
# =========================
criar_tabelas()

# =========================
# BLUEPRINTS
# =========================
app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(produtos_bp)
app.register_blueprint(movimentacoes_bp)

# =========================
# START
# =========================
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=10000,
        debug=True
    )