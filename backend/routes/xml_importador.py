from flask import Blueprint, request, jsonify, g
import xml.etree.ElementTree as ET
import traceback

from database.database import conectar
from utils.auth_middleware import auth_required

xml_bp = Blueprint("xml", __name__, url_prefix="/xml")


@xml_bp.route("/importar", methods=["POST"])
@auth_required
def importar_xml():
    try:
        tenant_id = g.usuario["tenant_id"]

        arquivo = request.files.get("arquivo")
        if not arquivo:
            return jsonify({"erro": "Arquivo não enviado"}), 400

        conteudo = arquivo.read()

        try:
            root = ET.fromstring(conteudo)
        except ET.ParseError as e:
            return jsonify({"erro": f"XML inválido: {str(e)}"}), 400

        ns = {"nfe": "http://www.portalfiscal.inf.br/nfe"}

        infNFe = root.find(".//nfe:infNFe", ns)
        ide    = root.find(".//nfe:ide",    ns)
        emit   = root.find(".//nfe:emit",   ns)

        # FIX #4: path correto para ICMSTot (dentro de <total>)
        total  = root.find(".//nfe:total/nfe:ICMSTot", ns)

        numero_nota  = ide.findtext("nfe:nNF",   "", ns) if ide    is not None else ""
        serie        = ide.findtext("nfe:serie",  "", ns) if ide    is not None else ""
        data_emissao = (ide.findtext("nfe:dhEmi", "", ns) or ide.findtext("nfe:dEmi", "", ns)) if ide is not None else ""
        chave_nfe    = infNFe.attrib.get("Id", "")        if infNFe is not None else ""
        fornecedor   = emit.findtext("nfe:xNome", "", ns) if emit   is not None else ""
        cnpj         = emit.findtext("nfe:CNPJ",  "", ns) if emit   is not None else ""

        # Validação mínima: XML precisa ter ao menos número da nota e fornecedor
        if not numero_nota or not fornecedor:
            return jsonify({"erro": "XML inválido ou namespace NF-e não reconhecido. Verifique se o arquivo é uma NF-e válida."}), 400

        # Telefone do emitente (campo correto para contato)
        telefone_emit = ""
        if emit is not None:
            enderEmit = emit.find("nfe:enderEmit", ns)
            telefone_emit = emit.findtext("nfe:fone", "", ns)

        valor_total_nota = float(total.findtext("nfe:vNF", "0", ns) if total is not None else 0)

        # Avisa se valor total não foi encontrado
        if total is None:
            print(f"[AVISO] Tag <ICMSTot> não encontrada no XML da nota {numero_nota}")

        conn = conectar()
        cursor = conn.cursor()

        # Verifica duplicidade
        cursor.execute("SELECT id FROM notas_fiscais WHERE chave_nfe = %s AND tenant_id = %s", (chave_nfe, tenant_id))
        if cursor.fetchone():
            conn.close()
            return jsonify({"erro": "NF-e já importada"}), 400

        # FIX #2: salva o conteúdo XML, não apenas o nome do arquivo
        xml_texto = conteudo.decode("utf-8", errors="replace")

        # Salva nota fiscal
        cursor.execute("""
            INSERT INTO notas_fiscais (tenant_id, numero_nota, serie, chave_nfe, fornecedor, cnpj, data_emissao, valor_total, xml_original)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (tenant_id, numero_nota, serie, chave_nfe, fornecedor, cnpj, data_emissao, valor_total_nota, xml_texto))

        produtos_importados = []

        for det in root.findall(".//nfe:det", ns):
            prod = det.find("nfe:prod", ns)
            if prod is None:
                continue

            nome       = prod.findtext("nfe:xProd", "", ns).strip()
            quantidade = float(prod.findtext("nfe:qCom",   "0", ns))
            valor      = float(prod.findtext("nfe:vUnCom", "0", ns))

            if not nome:
                continue

            # FIX #1: incluir "valor" no SELECT para poder calcular preço médio
            cursor.execute(
                "SELECT id, quantidade, valor FROM produtos WHERE produto = %s AND tenant_id = %s",
                (nome, tenant_id)
            )
            existente = cursor.fetchone()

            if existente:
                qtd_atual   = float(existente["quantidade"])
                valor_atual = float(existente["valor"] or 0)
                nova_qtd    = qtd_atual + quantidade
                # Preço médio ponderado
                novo_valor  = ((qtd_atual * valor_atual) + (quantidade * valor)) / nova_qtd if nova_qtd > 0 else valor
                cursor.execute("""
                    UPDATE produtos
                    SET quantidade = %s, valor = %s, fornecedor = %s,
                        contato = %s, cnpj = %s, numero_nota = %s, data_emissao = %s
                    WHERE produto = %s AND tenant_id = %s
                """, (nova_qtd, round(novo_valor, 4), fornecedor,
                      # FIX #3: contato recebe telefone, não o CNPJ
                      telefone_emit, cnpj, numero_nota, data_emissao,
                      nome, tenant_id))
            else:
                cursor.execute("""
                    INSERT INTO produtos (tenant_id, produto, quantidade, valor, fornecedor, contato, cnpj, numero_nota, data_emissao)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (tenant_id, nome, quantidade, valor, fornecedor,
                      # FIX #3: contato recebe telefone, não o CNPJ
                      telefone_emit, cnpj, numero_nota, data_emissao))

            produtos_importados.append(nome)

        conn.commit()
        conn.close()

        return jsonify({
            "msg": "XML importado com sucesso",
            "nota": numero_nota,
            "fornecedor": fornecedor,
            "produtos": produtos_importados,
            "total_produtos": len(produtos_importados)
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500