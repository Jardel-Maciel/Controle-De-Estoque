from flask import Flask, jsonify
from flask_cors import CORS

from database.database import criar_tabelas

# ROTAS
from routes.auth_routes import auth_bp
from routes.produtos_routes import produtos_bp
from routes.movimentacoes_routes import movimentacoes_bp
from routes.dashboard_routes import dashboard_bp
from routes.xml_routes import xml_bp

app = Flask(__name__)

CORS(app)

# =========================
# CRIAR BANCO
# =========================
criar_tabelas()

# =========================
# REGISTRAR ROTAS
# =========================
app.register_blueprint(auth_bp)

app.register_blueprint(produtos_bp)

app.register_blueprint(movimentacoes_bp)

app.register_blueprint(dashboard_bp)

app.register_blueprint(xml_bp)

# =========================
# ROTA TESTE
# =========================
@app.route("/")
def home():
    return jsonify({
        "status": "API online"
    })

# =========================
# START
# =========================
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=10000,
        debug=True
    )