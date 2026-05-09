from flask import Blueprint, request, jsonify
import xml.etree.ElementTree as ET

from database.database import conectar

xml_bp = Blueprint(
    "xml",
    __name__,
    url_prefix="/xml"
)

# =========================
# IMPORTAR XML
# =========================
@xml_bp.route(
    "/importar",
    methods=["POST", "OPTIONS"]
)
def importar_xml():

    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:

        arquivo = request.files.get("arquivo")

        if not arquivo:

            return jsonify({
                "erro": "Arquivo não enviado"
            }), 400

        # =========================
        # LER XML
        # =========================
        tree = ET.parse(arquivo)

        root = tree.getroot()

        conn = conectar()

        cursor = conn.cursor()

        produtos_importados = []

        # =========================
        # PRODUTOS DO XML
        # =========================
        for det in root.iter("det"):

            prod = det.find("prod")

            if prod is None:
                continue

            nome = prod.findtext("xProd", "").strip()

            quantidade = float(
                prod.findtext("qCom", "0")
            )

            valor = float(
                prod.findtext("vUnCom", "0")
            )

            if not nome:
                continue

            # =========================
            # VERIFICAR EXISTENTE
            # =========================
            cursor.execute("""
                SELECT id, quantidade
                FROM produtos
                WHERE produto = ?
            """, (nome,))

            existente = cursor.fetchone()

            if existente:

                nova_quantidade = (
                    existente["quantidade"]
                    + quantidade
                )

                cursor.execute("""
                    UPDATE produtos
                    SET quantidade = ?,
                        valor = ?
                    WHERE id = ?
                """, (
                    nova_quantidade,
                    valor,
                    existente["id"]
                ))

            else:

                cursor.execute("""
                    INSERT INTO produtos (
                        produto,
                        quantidade,
                        valor
                    )
                    VALUES (?, ?, ?)
                """, (
                    nome,
                    quantidade,
                    valor
                ))

            produtos_importados.append(nome)

        conn.commit()

        conn.close()

        return jsonify({
            "msg": "XML importado com sucesso",
            "produtos": produtos_importados
        })

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500