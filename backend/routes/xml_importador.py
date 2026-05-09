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
        # XML
        # =========================
        tree = ET.parse(arquivo)

        root = tree.getroot()

        # =========================
        # NAMESPACE NF-E
        # =========================
        ns = {
            "nfe": "http://www.portalfiscal.inf.br/nfe"
        }

        # =========================
        # DADOS NF-E
        # =========================
        infNFe = root.find(".//nfe:infNFe", ns)

        ide = root.find(".//nfe:ide", ns)

        emit = root.find(".//nfe:emit", ns)

        total = root.find(".//nfe:ICMSTot", ns)

        numero_nota = ""

        if ide is not None:
            numero_nota = ide.findtext(
                "nfe:nNF",
                "",
                ns
            )

        serie = ""

        if ide is not None:
            serie = ide.findtext(
                "nfe:serie",
                "",
                ns
            )

        data_emissao = ""

        if ide is not None:
            data_emissao = ide.findtext(
                "nfe:dhEmi",
                "",
                ns
            )

        chave_nfe = ""

        if infNFe is not None:
            chave_nfe = infNFe.attrib.get(
                "Id",
                ""
            )

        fornecedor = ""

        if emit is not None:
            fornecedor = emit.findtext(
                "nfe:xNome",
                "",
                ns
            )

        cnpj = ""

        if emit is not None:
            cnpj = emit.findtext(
                "nfe:CNPJ",
                "",
                ns
            )

        valor_total_nota = 0

        if total is not None:

            valor_total_nota = float(
                total.findtext(
                    "nfe:vNF",
                    "0",
                    ns
                )
            )

        # =========================
        # BANCO
        # =========================
        conn = conectar()

        cursor = conn.cursor()

        produtos_importados = []

        # =========================
        # VERIFICAR DUPLICIDADE
        # =========================
        cursor.execute("""
            SELECT id
            FROM notas_fiscais
            WHERE chave_nfe = ?
        """, (chave_nfe,))

        nota_existente = cursor.fetchone()

        if nota_existente:

            conn.close()

            return jsonify({
                "erro": "NF-e já importada"
            }), 400

        # =========================
        # SALVAR NOTA
        # =========================
        cursor.execute("""
            INSERT INTO notas_fiscais (
                numero_nota,
                serie,
                chave_nfe,
                fornecedor,
                cnpj,
                data_emissao,
                valor_total,
                xml_original
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            numero_nota,
            serie,
            chave_nfe,
            fornecedor,
            cnpj,
            data_emissao,
            valor_total_nota,
            arquivo.filename
        ))

        # =========================
        # PRODUTOS
        # =========================
        for det in root.findall(".//nfe:det", ns):

            prod = det.find("nfe:prod", ns)

            if prod is None:
                continue

            nome = prod.findtext(
                "nfe:xProd",
                "",
                ns
            ).strip()

            quantidade = float(
                prod.findtext(
                    "nfe:qCom",
                    "0",
                    ns
                )
            )

            valor = float(
                prod.findtext(
                    "nfe:vUnCom",
                    "0",
                    ns
                )
            )

            if not nome:
                continue

            # =========================
            # PRODUTO EXISTENTE
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
                        valor = ?,
                        fornecedor = ?,
                        contato = ?,
                        cnpj = ?,
                        numero_nota = ?,
                        data_emissao = ?
                    WHERE produto = ?
                """, (
                    nova_quantidade,
                    valor,
                    fornecedor,
                    cnpj,
                    cnpj,
                    numero_nota,
                    data_emissao,
                    nome
                ))

            else:

                cursor.execute("""
                    INSERT INTO produtos (
                        produto,
                        quantidade,
                        valor,
                        fornecedor,
                        contato,
                        cnpj,
                        numero_nota,
                        data_emissao
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    nome,
                    quantidade,
                    valor,
                    fornecedor,
                    cnpj,
                    cnpj,
                    numero_nota,
                    data_emissao
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