from flask import Blueprint, request, jsonify, g
import traceback
import unicodedata

from database.database import conectar
from utils.auth_middleware import auth_required

excel_bp = Blueprint("excel", __name__, url_prefix="/excel")

# Colunas aceitas para planilhas genéricas
MAPA_COLUNAS = {
    "produto":    ["produto", "product", "nome", "name", "descricao", "descrição", "item"],
    "quantidade": ["quantidade", "qtd", "qty", "quantity", "estoque", "qtde", "saldo"],
    "valor":      ["valor", "value", "preco", "preço", "price", "custo", "cost", "vl", "vr",
                   "custo unitario", "custo unitário", "media de custo", "média de custo"],
    "fornecedor": ["fornecedor", "supplier", "vendor", "fabricante"],
    "contato":    ["contato", "contact", "telefone", "tel", "fone", "phone"],
    "estoque_min":["estoque minimo", "estoque mínimo", "estoque_minimo", "min"],
}


def normalizar(texto):
    texto = str(texto).strip().lower()
    return unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode("ascii")


def mapear_cabecalho(cabecalho):
    mapa = {}
    for idx, col in enumerate(cabecalho):
        col_norm = normalizar(col)
        for campo, variantes in MAPA_COLUNAS.items():
            if col_norm in [normalizar(v) for v in variantes]:
                if campo not in mapa:
                    mapa[campo] = idx
    return mapa


def detectar_planilha_jfl(wb):
    """Retorna True se a planilha tiver as abas características da planilha JFL."""
    abas = [normalizar(s) for s in wb.sheetnames]
    return all(a in abas for a in ["prod", "entradas", "forn"])


def importar_jfl(wb, tenant_id):
    """
    Importa produtos e entradas da planilha no formato JFL.
    - Aba PROD: cabeçalho na linha 3, dados a partir da linha 4
      Colunas: col B=ITEM, col D=UNIDADE, col E=ESTOQUE MÍNIMO, col F=MÉDIA DE CUSTO, col G=PREÇO UNITÁRIO
    - Aba FORN: cabeçalho na linha 2, dados a partir da linha 3
      Colunas: col B=EMPRESA, col C=CONTATO, col D=E-MAIL, col E=ENDEREÇO
    """
    conn = conectar()
    cursor = conn.cursor()

    importados = []
    ignorados = []

    # ------- Fornecedores (aba FORN) -------
    ws_forn = wb["FORN"]
    linhas_forn = list(ws_forn.iter_rows(values_only=True))

    # Cabeçalho na linha 2 (índice 1): EMPRESA, CONTATO, E-MAIL, ENDEREÇO, TOTAL COMPRADO
    # Dados a partir da linha 3 (índice 2)
    mapa_forn = {}  # nome_empresa -> {contato, email}
    for linha in linhas_forn[2:]:
        empresa = str(linha[1] or "").strip() if len(linha) > 1 else ""
        contato = str(linha[2] or "").strip() if len(linha) > 2 else ""
        if empresa:
            mapa_forn[normalizar(empresa)] = {
                "nome": empresa,
                "contato": contato,
            }

    # ------- Produtos (aba PROD) -------
    ws_prod = wb["PROD"]
    linhas_prod = list(ws_prod.iter_rows(values_only=True))

    # Cabeçalho na linha 3 (índice 2), dados a partir da linha 4 (índice 3)
    # col 1=ITEM, col 3=UNIDADE, col 4=ESTOQUE MÍNIMO, col 5=MÉDIA DE CUSTO, col 6=PREÇO UNITÁRIO
    for i, linha in enumerate(linhas_prod[3:], start=4):
        nome = str(linha[1] or "").strip() if len(linha) > 1 else ""
        if not nome:
            continue

        try:
            estoque_min = float(str(linha[4] or 0).replace(",", ".") or 0) if len(linha) > 4 else 0.0
            valor = float(str(linha[5] or 0).replace(",", ".") or 0) if len(linha) > 5 else 0.0
        except (ValueError, TypeError):
            estoque_min = 0.0
            valor = 0.0

        # Produto já existe?
        cursor.execute(
            "SELECT id, quantidade, valor FROM produtos WHERE produto = %s AND tenant_id = %s",
            (nome, tenant_id)
        )
        existente = cursor.fetchone()

        if existente:
            qtd_atual = float(existente["quantidade"] or 0)
            valor_atual = float(existente["valor"] or 0)
            novo_valor = valor if valor > 0 else valor_atual

            cursor.execute("""
                UPDATE produtos
                SET valor = %s
                WHERE produto = %s AND tenant_id = %s
            """, (round(novo_valor, 4), nome, tenant_id))
            importados.append(f"{nome} (atualizado)")
        else:
            cursor.execute("""
                INSERT INTO produtos (tenant_id, produto, quantidade, valor)
                VALUES (%s, %s, %s, %s)
            """, (tenant_id, nome, 0, valor))
            importados.append(nome)

    # ------- Entradas (aba ENTRADAS) -------
    ws_ent = wb["ENTRADAS"]
    linhas_ent = list(ws_ent.iter_rows(values_only=True))

    # Cabeçalho na linha 3 (índice 2), dados a partir da linha 4 (índice 3)
    # col 1=DATA, col 2=PRODUTO, col 3=FORNECEDOR, col 4=QUANTIDADE, col 5=CUSTO UNIT, col 7=VALOR TOTAL
    entradas_importadas = []
    entradas_ignoradas = []

    for i, linha in enumerate(linhas_ent[3:], start=4):
        produto = str(linha[2] or "").strip() if len(linha) > 2 else ""
        if not produto:
            continue

        try:
            data_compra = linha[1]
            fornecedor_nome = str(linha[3] or "").strip() if len(linha) > 3 else ""
            quantidade = float(str(linha[4] or 0).replace(",", ".") or 0) if len(linha) > 4 else 0.0
            custo_unit = float(str(linha[5] or 0).replace(",", ".") or 0) if len(linha) > 5 else 0.0
        except (ValueError, TypeError):
            entradas_ignoradas.append(f"Linha {i}: erro ao ler dados")
            continue

        if quantidade <= 0:
            entradas_ignoradas.append(f"Linha {i}: quantidade zero ou inválida")
            continue

        # Busca produto
        cursor.execute(
            "SELECT id, quantidade, valor FROM produtos WHERE produto = %s AND tenant_id = %s",
            (produto, tenant_id)
        )
        prod_row = cursor.fetchone()

        if not prod_row:
            # Cria produto se não existir
            cursor.execute("""
                INSERT INTO produtos (tenant_id, produto, quantidade, valor)
                VALUES (%s, %s, %s, %s) RETURNING id, quantidade, valor
            """, (tenant_id, produto, 0, custo_unit))
            prod_row = cursor.fetchone()

        produto_id = prod_row["id"]
        qtd_atual = float(prod_row["quantidade"] or 0)
        valor_atual = float(prod_row["valor"] or 0)

        # Atualiza quantidade e preço médio ponderado
        nova_qtd = qtd_atual + quantidade
        if nova_qtd > 0:
            novo_valor = ((qtd_atual * valor_atual) + (quantidade * custo_unit)) / nova_qtd
        else:
            novo_valor = custo_unit

        cursor.execute("""
            UPDATE produtos SET quantidade = %s, valor = %s,
                fornecedor = CASE WHEN %s != '' THEN %s ELSE fornecedor END
            WHERE id = %s AND tenant_id = %s
        """, (nova_qtd, round(novo_valor, 4), fornecedor_nome, fornecedor_nome, produto_id, tenant_id))

        # Registra movimentação de entrada
        try:
            cursor.execute("""
                INSERT INTO movimentacoes
                    (tenant_id, produto_id, tipo, quantidade, valor_unitario, data)
                VALUES (%s, %s, 'entrada', %s, %s, %s)
            """, (tenant_id, produto_id, quantidade, custo_unit, data_compra))
        except Exception:
            pass  # movimentação opcional, não bloqueia a importação

        entradas_importadas.append(produto)

    conn.commit()
    conn.close()

    return {
        "msg": "Planilha JFL importada com sucesso",
        "produtos_importados": len(importados),
        "entradas_importadas": len(entradas_importadas),
        "produtos": importados,
        "entradas": entradas_importadas,
        "ignorados": ignorados + entradas_ignoradas,
    }


def importar_generica(wb, tenant_id):
    """Importação genérica pela aba ativa, detectando colunas pelo cabeçalho."""
    ws = wb.active
    linhas = list(ws.iter_rows(values_only=True))

    if not linhas or len(linhas) < 2:
        return None, "Planilha vazia ou sem dados além do cabeçalho"

    cabecalho = [str(c) if c is not None else "" for c in linhas[0]]
    mapa = mapear_cabecalho(cabecalho)

    if "produto" not in mapa:
        return None, (
            "Coluna 'produto' não encontrada. Verifique o cabeçalho da planilha. "
            f"Cabeçalho encontrado: {cabecalho}"
        )

    conn = conectar()
    cursor = conn.cursor()
    importados = []
    ignorados = []

    for i, linha in enumerate(linhas[1:], start=2):
        def cel(campo, padrao=""):
            idx = mapa.get(campo)
            if idx is None:
                return padrao
            val = linha[idx] if idx < len(linha) else None
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
        contato    = str(cel("contato", "")).strip()

        cursor.execute(
            "SELECT id, quantidade, valor FROM produtos WHERE produto = %s AND tenant_id = %s",
            (nome, tenant_id)
        )
        existente = cursor.fetchone()

        if existente:
            qtd_atual   = float(existente["quantidade"] or 0)
            valor_atual = float(existente["valor"] or 0)
            nova_qtd    = qtd_atual + quantidade
            if nova_qtd > 0:
                novo_valor = ((qtd_atual * valor_atual) + (quantidade * valor)) / nova_qtd
            else:
                novo_valor = valor

            cursor.execute("""
                UPDATE produtos
                SET quantidade = %s, valor = %s,
                    fornecedor = CASE WHEN %s != '' THEN %s ELSE fornecedor END,
                    contato    = CASE WHEN %s != '' THEN %s ELSE contato END
                WHERE produto = %s AND tenant_id = %s
            """, (
                nova_qtd, round(novo_valor, 4),
                fornecedor, fornecedor,
                contato, contato,
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

    return {
        "msg": "Planilha importada com sucesso",
        "total_importados": len(importados),
        "produtos": importados,
        "ignorados": ignorados,
    }, None


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

        try:
            import openpyxl
            from io import BytesIO
            conteudo = arquivo.read()
            wb = openpyxl.load_workbook(BytesIO(conteudo), read_only=True, data_only=True)
        except Exception as e:
            return jsonify({"erro": f"Erro ao ler planilha: {str(e)}"}), 400

        # Detecta o formato da planilha e usa o importador correto
        if detectar_planilha_jfl(wb):
            resultado = importar_jfl(wb, tenant_id)
            return jsonify(resultado), 200
        else:
            resultado, erro = importar_generica(wb, tenant_id)
            if erro:
                return jsonify({"erro": erro}), 400
            return jsonify(resultado), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500