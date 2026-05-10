from flask import Blueprint, request, jsonify
import xml.etree.ElementTree as ET

from database.database import conectar
from utils.auth_middleware import auth_required

xml_bp = Blueprint("xml", __name__, url_prefix="/xml")

# =========================
# IMPORTAR XML (TENANT SAFE)
# =========================
@xml_bp.route("/importar", methods=["POST"])
@auth_required
def importar_xml():

    try:
        tenant_id = request.user["tenant_id"]

        arquivo = request.files.get("arquivo")

        if not arquivo:
            return jsonify({"erro": "Arquivo não enviado"}), 400

        # =========================
        # PARSE XML
        # =========================
        tree = ET.parse(arquivo)
        root = tree.getroot()

        ns = {"nfe": "http://www.portalfiscal.inf.br/nfe"}

        infNFe = root.find(".//nfe:infNFe", ns)
        ide = root.find(".//nfe:ide", ns)
        emit = root.find(".//nfe:emit", ns)
        total = root.find(".//nfe:ICMSTot", ns)

        numero_nota = ide.findtext("nfe:nNF", "", ns) if ide is not None else ""
        serie = ide.findtext("nfe:serie", "", ns) if ide is not None else ""
        data_emissao = ide.findtext("nfe:dhEmi", "", ns) if ide is not None else ""

        chave_nfe = infNFe.attrib.get("Id", "") if infNFe is not None else ""

        fornecedor = emit.findtext("nfe:xNome", "", ns) if emit is not None else ""
        cnpj = emit.findtext("nfe:CNPJ", "", ns) if emit is not None else ""

        valor_total_nota = float(
            total.findtext("nfe:vNF", "0", ns) if total is not None else 0
        )

        conn = conectar()
        cursor = conn.cursor()

        # =========================
        # VERIFICA DUPLICIDADE POR TENANT
        # =========================
        cursor.execute("""
            SELECT id
            FROM notas_fiscais
            WHERE chave_nfe = ?
            AND tenant_id = ?
        """, (chave_nfe, tenant_id))

        if cursor.fetchone():
            conn.close()
            return jsonify({"erro": "NF-e já importada"}), 400

        # =========================
        # SALVAR NOTA (TENANT)
        # =========================
        cursor.execute("""
            INSERT INTO notas_fiscais (
                tenant_id,
                numero_nota,
                serie,
                chave_nfe,
                fornecedor,
                cnpj,
                data_emissao,
                valor_total,
                xml_original
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tenant_id,
            numero_nota,
            serie,
            chave_nfe,
            fornecedor,
            cnpj,
            data_emissao,
            valor_total_nota,
            arquivo.filename
        ))

        produtos_importados = []

        # =========================
        # PRODUTOS DO XML
        # =========================
        for det in root.findall(".//nfe:det", ns):

            prod = det.find("nfe:prod", ns)
            if prod is None:
                continue

            nome = prod.findtext("nfe:xProd", "", ns).strip()
            quantidade = float(prod.findtext("nfe:qCom", "0", ns))
            valor = float(prod.findtext("nfe:vUnCom", "0", ns))

            if not nome:
                continue

            # =========================
            # BUSCA PRODUTO DO TENANT
            # =========================
            cursor.execute("""
                SELECT id, quantidade
                FROM produtos
                WHERE produto = ?
                AND tenant_id = ?
            """, (nome, tenant_id))

            existente = cursor.fetchone()

            if existente:

                nova_qtd = existente["quantidade"] + quantidade

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
                    AND tenant_id = ?
                """, (
                    nova_qtd,
                    valor,
                    fornecedor,
                    cnpj,
                    cnpj,
                    numero_nota,
                    data_emissao,
                    nome,
                    tenant_id
                ))

            else:

                cursor.execute("""
                    INSERT INTO produtos (
                        tenant_id,
                        produto,
                        quantidade,
                        valor,
                        fornecedor,
                        contato,
                        cnpj,
                        numero_nota,
                        data_emissao
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    tenant_id,
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
        return jsonify({"erro": str(e)}), 500