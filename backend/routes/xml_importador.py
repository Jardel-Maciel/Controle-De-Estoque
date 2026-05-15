from flask import Blueprint, request, jsonify, g
import xml.etree.ElementTree as ET
import traceback
import re
import uuid

from database.database import conectar
from utils.auth_middleware import auth_required

xml_bp = Blueprint("xml", __name__, url_prefix="/xml")


def _strip_ns(tag):
    """Remove namespace de uma tag. Ex: '{http://...}ide' -> 'ide'"""
    return re.sub(r"\{[^}]+\}", "", tag)


def _find(node, tag):
    """Busca um filho direto pelo nome local, ignorando namespace."""
    if node is None:
        return None
    for child in node:
        if _strip_ns(child.tag) == tag:
            return child
    return None


def _findtext(node, tag, default=""):
    """Retorna o texto de um filho pelo nome local."""
    child = _find(node, tag)
    if child is not None and child.text:
        return child.text.strip()
    return default


def _find_deep(root, tag):
    """Busca recursiva pelo nome local em toda a árvore."""
    if root is None:
        return None
    if _strip_ns(root.tag) == tag:
        return root
    for child in root:
        result = _find_deep(child, tag)
        if result is not None:
            return result
    return None


def _findall_deep(root, tag):
    """Busca recursiva de todos os nós com determinado nome local."""
    results = []
    if root is None:
        return results
    if _strip_ns(root.tag) == tag:
        results.append(root)
    for child in root:
        results.extend(_findall_deep(child, tag))
    return results


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

        # Busca os nós principais ignorando namespace
        infNFe = _find_deep(root, "infNFe")
        ide    = _find_deep(root, "ide")
        emit   = _find_deep(root, "emit")
        total  = _find_deep(root, "ICMSTot")

        # --- Campos do emitente ---
        fornecedor    = _findtext(emit, "xNome")
        cnpj          = _findtext(emit, "CNPJ")
        telefone_emit = _findtext(emit, "fone")

        # --- Campos da nota (ide pode não existir em XMLs simplificados) ---
        numero_nota  = _findtext(ide, "nNF")
        serie        = _findtext(ide, "serie")
        data_emissao = _findtext(ide, "dhEmi") or _findtext(ide, "dEmi")

        # chave da NF-e (atributo Id do infNFe)
        chave_nfe = infNFe.attrib.get("Id", "") if infNFe is not None else ""

        # Fallbacks para campos ausentes (XMLs simplificados / de teste)
        if not numero_nota:
            numero_nota = chave_nfe[3:45] if len(chave_nfe) > 10 else str(uuid.uuid4())[:8].upper()
        if not chave_nfe:
            chave_nfe = f"MANUAL-{tenant_id}-{numero_nota}"

        # Valor total
        valor_total_nota = 0.0
        if total is not None:
            try:
                valor_total_nota = float(_findtext(total, "vNF", "0"))
            except ValueError:
                valor_total_nota = 0.0

        # Log de diagnóstico
        print(f"[XML] numero_nota={numero_nota!r} | fornecedor={fornecedor!r} | "
              f"chave={chave_nfe!r} | data={data_emissao!r} | total={valor_total_nota}")

        # Validação mínima: precisa ter ao menos o emitente OU produtos
        dets = _findall_deep(root, "det")
        if not fornecedor and not dets:
            return jsonify({
                "erro": "XML não reconhecido: nenhum dado de fornecedor ou produto foi encontrado.",
                "debug": {
                    "root_tag": _strip_ns(root.tag),
                    "root_children": [_strip_ns(c.tag) for c in root],
                    "ide_encontrado": ide is not None,
                    "emit_encontrado": emit is not None,
                    "infNFe_encontrado": infNFe is not None,
                }
            }), 400

        conn = conectar()
        cursor = conn.cursor()

        # Verifica duplicidade pela chave
        cursor.execute(
            "SELECT id FROM notas_fiscais WHERE chave_nfe = %s AND tenant_id = %s",
            (chave_nfe, tenant_id)
        )
        if cursor.fetchone():
            conn.close()
            return jsonify({"erro": f"NF-e {numero_nota} já foi importada anteriormente"}), 400

        xml_texto = conteudo.decode("utf-8", errors="replace")

        # Salva nota fiscal
        cursor.execute("""
            INSERT INTO notas_fiscais
                (tenant_id, numero_nota, serie, chave_nfe, fornecedor, cnpj, data_emissao, valor_total, xml_original)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (tenant_id, numero_nota, serie, chave_nfe,
              fornecedor or "Sem fornecedor", cnpj,
              data_emissao, valor_total_nota, xml_texto))

        produtos_importados = []

        for det in dets:
            prod = _find(det, "prod")
            if prod is None:
                continue

            nome           = _findtext(prod, "xProd")
            quantidade_str = _findtext(prod, "qCom",   "0")
            valor_str      = _findtext(prod, "vUnCom", "0")

            if not nome:
                continue

            try:
                quantidade = float(quantidade_str)
                valor      = float(valor_str)
            except ValueError:
                continue

            cursor.execute(
                "SELECT id, quantidade, valor FROM produtos WHERE produto = %s AND tenant_id = %s",
                (nome, tenant_id)
            )
            existente = cursor.fetchone()

            if existente:
                qtd_atual   = float(existente["quantidade"])
                valor_atual = float(existente["valor"] or 0)
                nova_qtd    = qtd_atual + quantidade
                novo_valor  = ((qtd_atual * valor_atual) + (quantidade * valor)) / nova_qtd if nova_qtd > 0 else valor
                cursor.execute("""
                    UPDATE produtos
                    SET quantidade = %s, valor = %s, fornecedor = %s,
                        contato = %s, cnpj = %s, numero_nota = %s, data_emissao = %s
                    WHERE produto = %s AND tenant_id = %s
                """, (nova_qtd, round(novo_valor, 4), fornecedor or "Sem fornecedor",
                      telefone_emit, cnpj, numero_nota, data_emissao,
                      nome, tenant_id))
            else:
                cursor.execute("""
                    INSERT INTO produtos
                        (tenant_id, produto, quantidade, valor, fornecedor, contato, cnpj, numero_nota, data_emissao)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (tenant_id, nome, quantidade, valor,
                      fornecedor or "Sem fornecedor",
                      telefone_emit, cnpj, numero_nota, data_emissao))

            produtos_importados.append(nome)

        conn.commit()
        conn.close()

        return jsonify({
            "msg": "XML importado com sucesso",
            "nota": numero_nota,
            "fornecedor": fornecedor or "Sem fornecedor",
            "produtos": produtos_importados,
            "total_produtos": len(produtos_importados)
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500