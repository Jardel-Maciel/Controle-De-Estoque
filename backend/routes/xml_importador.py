from flask import Blueprint, request, jsonify
import xml.etree.ElementTree as ET
import sqlite3
import datetime

xml_bp = Blueprint("xml", __name__)


# =========================
# CONEXÃO
# =========================
def conectar():
    conn = sqlite3.connect("banco.db")
    conn.row_factory = sqlite3.Row
    return conn


# =========================
# IMPORTAR XML
# =========================
@xml_bp.route("/importar-xml", methods=["POST"])
def importar_xml():

    try:

        arquivo = request.files.get("xml")

        if not arquivo:
            return jsonify({
                "erro": "Arquivo XML não enviado"
            }), 400

        # =========================
        # LER XML
        # =========================
        tree = ET.parse(arquivo)

        root = tree.getroot()

        ns = {
            "nfe": "http://www.portalfiscal.inf.br/nfe"
        }

        conn = conectar()

        cursor = conn.cursor()

        produtos_importados = 0

        # =========================
        # FORNECEDOR
        # =========================
        emit = root.find(".//nfe:emit", ns)

        fornecedor = "Fornecedor"

        if emit is not None:

            nome_emit = emit.find("nfe:xNome", ns)

            if nome_emit is not None:
                fornecedor = nome_emit.text

        # =========================
        # PRODUTOS
        # =========================
        for det in root.findall(".//nfe:det", ns):

            prod = det.find("nfe:prod", ns)

            if prod is None:
                continue

            nome = prod.find("nfe:xProd", ns)

            quantidade = prod.find("nfe:qCom", ns)

            valor = prod.find("nfe:vUnCom", ns)

            produto_nome = nome.text.strip()

            qtd = int(float(quantidade.text))

            valor_unitario = float(valor.text)

            # =========================
            # VERIFICAR EXISTÊNCIA
            # =========================
            cursor.execute("""
                SELECT *
                FROM produtos
                WHERE produto = ?
            """, (produto_nome,))

            existente = cursor.fetchone()

            # =========================
            # PRODUTO EXISTE
            # =========================
            if existente:

                novo_estoque = (
                    existente["quantidade"] + qtd
                )

                cursor.execute("""
                    UPDATE produtos
                    SET quantidade = ?,
                        valor = ?
                    WHERE id = ?
                """, (
                    novo_estoque,
                    valor_unitario,
                    existente["id"]
                ))

            # =========================
            # NOVO PRODUTO
            # =========================
            else:

                cursor.execute("""
                    INSERT INTO produtos (
                        produto,
                        quantidade,
                        valor
                    )
                    VALUES (?, ?, ?)
                """, (
                    produto_nome,
                    qtd,
                    valor_unitario
                ))

            # =========================
            # MOVIMENTAÇÃO
            # =========================
            cursor.execute("""
                INSERT INTO movimentacoes (
                    produto,
                    tipo,
                    quantidade,
                    comentario,
                    responsavel,
                    data
                )
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                produto_nome,
                "entrada",
                qtd,
                f"Importação XML - {fornecedor}",
                "Sistema XML",
                datetime.datetime.now().isoformat()
            ))

            produtos_importados += 1

        conn.commit()

        conn.close()

        return jsonify({
            "msg": f"{produtos_importados} produtos importados com sucesso"
        })

    except Exception as e:

        return jsonify({
            "erro": str(e)
        }), 500