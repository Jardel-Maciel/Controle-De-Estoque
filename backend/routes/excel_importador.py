from flask import Blueprint, request, jsonify, g
import traceback

from database.database import conectar
from utils.auth_middleware import auth_required

excel_bp = Blueprint("excel", __name__, url_prefix="/excel")

# Colunas aceitas (variações de nome que o usuário pode usar)
MAPA_COLUNAS = {
    "produto":     ["produto", "product", "nome", "name", "descricao", "descrição", "item"],
    "quantidade":  ["quantidade", "qtd", "qty", "quantity", "estoque", "qtde"],
    "valor":       ["valor", "value", "preco", "preço", "price", "custo", "cost", "vl", "vr"],
    "fornecedor":  ["fornecedor", "supplier", "vendor", "fabricante"],
    "contato":     ["contato", "contact", "telefone", "tel", "fone", "phone"],
}


def normalizar(texto):
    """Remove acentos, espaços extras e deixa minúsculo para comparação."""
    import unicodedata
    texto = str(texto).strip().lower()
    return unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode("ascii")


def mapear_cabecalho(cabecalho):
    """Retorna dict {campo_interno: indice_coluna} com base no cabeçalho da planilha."""
    mapa = {}
    for idx, col in enumerate(cabecalho):
        col_norm = normalizar(col)
        for campo, variantes in MAPA_COLUNAS.items():
            if col_norm in [normalizar(v) for v in variantes]:
                if campo not in mapa:  # primeira ocorrência ganha
                    mapa[campo] = idx
    return mapa


@excel_bp.route("/importar", methods=["POST"])
@auth_required
def importar_excel():
    try:
        tenant_id = g.usuario["tenant_id"]

        arquivo = request.files.get("arquivo")
        if not arquivo:
            return jsonify({"erro": "Arquivo não enviado"}), 400

        nome_arquivo = arquivo.filename or ""
        extensao = nome_arquivo.rsplit(".", 1)[-1].lower() if "." in nome_arquivo else ""

        if extensao not in ("xlsx", "xls", "ods"):
            return jsonify({"erro": "Formato inválido. Envie um arquivo .xlsx, .xls ou .ods"}), 400

        # Lê o arquivo em memória com openpyxl
        try:
            import openpyxl
            from io import BytesIO

            conteudo = arquivo.read()
            wb = openpyxl.load_workbook(BytesIO(conteudo), read_only=True, data_only=True)
            ws = wb.active

            linhas = list(ws.iter_rows(values_only=True))

        except Exception as e:
            return jsonify({"erro": f"Erro ao ler planilha: {str(e)}"}), 400

        if not linhas or len(linhas) < 2:
            return jsonify({"erro": "Planilha vazia ou sem dados além do cabeçalho"}), 400

        # Mapeia cabeçalho (primeira linha)
        cabecalho = [str(c) if c is not None else "" for c in linhas[0]]
        mapa = mapear_cabecalho(cabecalho)

        if "produto" not in mapa:
            return jsonify({
                "erro": "Coluna 'produto' não encontrada. Verifique o cabeçalho da planilha.",
                "cabecalho_encontrado": cabecalho
            }), 400

        conn = conectar()
        cursor = conn.cursor()

        importados = []
        ignorados  = []

        for i, linha in enumerate(linhas[1:], start=2):  # pula cabeçalho

            def cel(campo, padrao=""):
                idx = mapa.get(campo)
                if idx is None:
                    return padrao
                val = linha[idx]
                return val if val is not None else padrao

            nome = str(cel("produto", "")).strip()
            if not nome:
                ignorados.append(f"Linha {i}: produto vazio")
                continue

            try:
                quantidade = float(str(cel("quantidade", 0)).replace(",", ".") or 0)
            except (ValueError, TypeError):
                quantidade = 0.0

            try:
                valor = float(str(cel("valor", 0)).replace(",", ".") or 0)
            except (ValueError, TypeError):
                valor = 0.0

            fornecedor = str(cel("fornecedor", "")).strip()
            contato    = str(cel("contato",    "")).strip()

            # Verifica se produto já existe
            cursor.execute(
                "SELECT id, quantidade, valor FROM produtos WHERE produto = %s AND tenant_id = %s",
                (nome, tenant_id)
            )
            existente = cursor.fetchone()

            if existente:
                qtd_atual   = float(existente["quantidade"] or 0)
                valor_atual = float(existente["valor"] or 0)
                nova_qtd    = qtd_atual + quantidade

                # Preço médio ponderado (igual ao importador XML)
                if nova_qtd > 0:
                    novo_valor = ((qtd_atual * valor_atual) + (quantidade * valor)) / nova_qtd
                else:
                    novo_valor = valor

                cursor.execute("""
                    UPDATE produtos
                    SET quantidade = %s,
                        valor      = %s,
                        fornecedor = CASE WHEN %s != '' THEN %s ELSE fornecedor END,
                        contato    = CASE WHEN %s != '' THEN %s ELSE contato END
                    WHERE produto = %s AND tenant_id = %s
                """, (
                    nova_qtd, round(novo_valor, 4),
                    fornecedor, fornecedor,
                    contato,    contato,
                    nome, tenant_id
                ))
            else:
                cursor.execute("""
                    INSERT INTO produtos (tenant_id, produto, quantidade, valor, fornecedor, contato)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (tenant_id, nome, quantidade, valor, fornecedor, contato))

            importados.append(nome)

        conn.commit()
        conn.close()

        return jsonify({
            "msg":             "Planilha importada com sucesso",
            "total_importados": len(importados),
            "produtos":        importados,
            "ignorados":       ignorados
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500