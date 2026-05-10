from flask import Blueprint, jsonify, g
from utils.auth_middleware import auth_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard", methods=["GET"])
@auth_required
def dashboard():

    usuario = g.usuario

    return jsonify({
        "total_produtos": 10,
        "total_itens": 100,
        "baixo_estoque": 2,
        "valor_total": 5000,
        "produtos": []
    }), 200