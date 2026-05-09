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
        
        # =========================
        # DADOS DA NF-E
        # =========================
        infNFe = root.find(".//infNFe")

        ide = root.find(".//ide")

        emit = root.find(".//emit")

        total = root.find(".//ICMSTot")

        # NÚMERO NOTA
        numero_nota = ""

        if ide is not None:
            numero_nota = ide.findtext("nNF", "")

        # SÉRIE
        serie = ""

        if ide is not None:
            serie = ide.findtext("serie", "")

        # DATA
        data_emissao = ""

        if ide is not None:
            data_emissao = ide.findtext("dhEmi", "")

        # CHAVE
        chave_nfe = ""

        if infNFe is not None:
            chave_nfe = infNFe.attrib.get("Id", "")

        # FORNECEDOR
        fornecedor = ""

        if emit is not None:
            fornecedor = emit.findtext("xNome", "")

        # CNPJ
        cnpj = ""

        if emit is not None:
            cnpj = emit.findtext("CNPJ", "")

        # VALOR TOTAL
        valor_total_nota = 0

        if total is not None:

            valor_total_nota = float(
                total.findtext("vNF", "0")
            )

        conn = conectar()

        cursor = conn.cursor()

        produtos_importados = []
        
        # =========================
        # VERIFICAR NF DUPLICADA
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
                "erro": "Esta NF-e já foi importada"
            }), 400

        # =========================
        # SALVAR NF
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
                        valor = ?,
                        fornecedor = ?,
                        contato = ?
                    WHERE produto = ?
                """, (
                    nova_quantidade,
                    valor,
                    fornecedor,
                    cnpj,
                    nome
                ))
            else:

                cursor.execute("""
                    INSERT INTO produtos (
                        produto,
                        quantidade,
                        valor,
                        fornecedor,
                        contato
                    )
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    nome,
                    quantidade,
                    valor,
                    fornecedor,
                    cnpj
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