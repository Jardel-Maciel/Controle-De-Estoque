from flask import Blueprint, request, jsonify, g
import traceback
import unicodedata
import re

from database.database import conectar
from utils.auth_middleware import auth_required

excel_bp = Blueprint("excel", __name__, url_prefix="/excel")

# =========================================================
# MAPA FLEXÍVEL DE COLUNAS
# =========================================================

MAPA_COLUNAS = {

    "produto": [
        "produto",
        "nome",
        "item",
        "descricao",
        "descrição"
    ],

    "quantidade": [
        "quantidade",
        "qtd",
        "qtde",
        "estoque",
        "saldo",
        "quant",
        "qtd estoque",
        "quantidade estoque"
    ],

    "valor": [
        "valor",
        "valor unit",
        "valor unit.",
        "valor unitario",
        "valor unitário",
        "preco",
        "preço",
        "custo",
        "price"
    ],

    "fornecedor": [
        "fornecedor",
        "empresa",
        "fabricante"
    ],

    "contato": [
        "contato",
        "telefone",
        "fone",
        "tel"
    ],

    "cnpj": [
        "cnpj"
    ],

    "nota_fiscal": [
        "nota fiscal",
        "nf",
        "nfe",
        "nota"
    ],

    "emissao": [
        "emissao",
        "emissão",
        "data",
        "data emissao"
    ]
}


# =========================================================
# NORMALIZAR TEXTO
# =========================================================

def normalizar(texto):

    texto = str(texto).strip().lower()

    texto = unicodedata.normalize(
        "NFD",
        texto
    ).encode(
        "ascii",
        "ignore"
    ).decode("ascii")

    texto = re.sub(r"\s+", " ", texto)

    return texto.strip()


# =========================================================
# MAPEAR CABEÇALHO
# =========================================================

def mapear_cabecalho(cabecalho):

    mapa = {}

    for idx, col in enumerate(cabecalho):

        col_norm = normalizar(col)

        for campo, variantes in MAPA_COLUNAS.items():

            for variante in variantes:

                variante_norm = normalizar(variante)

                if (
                    col_norm == variante_norm
                    or variante_norm in col_norm
                    or col_norm in variante_norm
                ):

                    if campo not in mapa:
                        mapa[campo] = idx

    return mapa


# =========================================================
# IMPORTADOR GENÉRICO
# =========================================================

def importar_generica(wb, tenant_id):

    # =====================================================
    # PROCURA A ABA DE CONTROLE DE ESTOQUE
    # =====================================================

    ws = None

    for sheet in wb.worksheets:

        nome_aba = normalizar(sheet.title)

        if (
            "controle" in nome_aba
            and "estoque" in nome_aba
        ):

            ws = sheet
            break

    # =====================================================
    # SE NÃO ENCONTRAR
    # =====================================================

    if ws is None:

        return None, (
            "Aba 'Controle de Estoque' não encontrada."
        )

    # =====================================================
    # LER LINHAS
    # =====================================================

    linhas = list(
        ws.iter_rows(values_only=True)
    )

    if not linhas or len(linhas) < 2:

        return None, (
            "Planilha vazia ou sem dados."
        )

    # =====================================================
    # CABEÇALHO
    # =====================================================

    cabecalho = [
        str(c) if c is not None else ""
        for c in linhas[0]
    ]

    mapa = mapear_cabecalho(cabecalho)

    if "produto" not in mapa:

        return None, (
            "Coluna PRODUTO não encontrada."
        )

    # =====================================================
    # CONEXÃO
    # =====================================================

    conn = conectar()
    cursor = conn.cursor()

    importados = []
    ignorados = []

    # =====================================================
    # IMPORTAÇÃO
    # =====================================================

    for i, linha in enumerate(linhas[1:], start=2):

        try:

            def cel(campo, padrao=""):

                idx = mapa.get(campo)

                if idx is None:
                    return padrao

                val = (
                    linha[idx]
                    if idx < len(linha)
                    else None
                )

                return (
                    val
                    if val is not None
                    else padrao
                )

            # =================================================
            # PRODUTO
            # =================================================

            nome = str(
                cel("produto", "")
            ).strip()

            if not nome:

                ignorados.append(
                    f"Linha {i}: produto vazio"
                )

                continue

            # =================================================
            # QUANTIDADE
            # =================================================

            try:

                valor_qtd = cel("quantidade", 0)

                if valor_qtd is None:
                    valor_qtd = 0

                valor_qtd = str(
                    valor_qtd
                ).strip()

                if valor_qtd == "":
                    valor_qtd = "0"

                valor_qtd = valor_qtd.replace(",", ".")

                quantidade = float(valor_qtd)

            except Exception:

                quantidade = 0

            # =================================================
            # VALOR
            # =================================================

            try:

                valor_valor = cel("valor", 0)

                if valor_valor is None:
                    valor_valor = 0

                valor_valor = str(
                    valor_valor
                ).strip()

                if valor_valor == "":
                    valor_valor = "0"

                valor_valor = valor_valor.replace(",", ".")

                valor = float(valor_valor)

            except Exception:

                valor = 0

            # =================================================
            # OUTROS CAMPOS
            # =================================================

            fornecedor = str(
                cel("fornecedor", "")
            ).strip()

            contato = str(
                cel("contato", "")
            ).strip()

            # =================================================
            # DEBUG
            # =================================================

            print("================================")
            print("PRODUTO:", nome)
            print("QUANTIDADE:", quantidade)
            print("VALOR:", valor)
            print("FORNECEDOR:", fornecedor)

            # =================================================
            # VERIFICAR SE EXISTE
            # =================================================

            cursor.execute("""
                SELECT id, quantidade, valor
                FROM produtos
                WHERE LOWER(TRIM(produto)) =
                      LOWER(TRIM(%s))
                AND tenant_id = %s
            """, (
                nome,
                tenant_id
            ))

            existente = cursor.fetchone()

            # =================================================
            # ATUALIZAR
            # =================================================

            if existente:

                qtd_atual = float(
                    existente["quantidade"] or 0
                )

                valor_atual = float(
                    existente["valor"] or 0
                )

                nova_qtd = qtd_atual + quantidade

                if nova_qtd > 0:

                    novo_valor = (
                        (
                            qtd_atual * valor_atual
                        ) + (
                            quantidade * valor
                        )
                    ) / nova_qtd

                else:

                    novo_valor = valor

                cursor.execute("""
                    UPDATE produtos
                    SET
                        quantidade = %s,
                        valor = %s,
                        fornecedor = CASE
                            WHEN %s != ''
                            THEN %s
                            ELSE fornecedor
                        END,
                        contato = CASE
                            WHEN %s != ''
                            THEN %s
                            ELSE contato
                        END
                    WHERE id = %s
                """, (

                    nova_qtd,
                    round(novo_valor, 4),

                    fornecedor,
                    fornecedor,

                    contato,
                    contato,

                    existente["id"]
                ))

            # =================================================
            # INSERIR
            # =================================================

            else:

                cursor.execute("""
                    INSERT INTO produtos (
                        tenant_id,
                        produto,
                        quantidade,
                        valor,
                        fornecedor,
                        contato
                    )
                    VALUES (
                        %s,%s,%s,%s,%s,%s
                    )
                """, (

                    tenant_id,
                    nome,
                    quantidade,
                    valor,
                    fornecedor,
                    contato
                ))

            importados.append(nome)

        except Exception as e:

            ignorados.append(
                f"Linha {i}: {str(e)}"
            )

            continue

    # =====================================================
    # FINALIZAR
    # =====================================================

    conn.commit()
    conn.close()

    print("================================")
    print("IMPORTADOS:", importados)
    print("IGNORADOS:", ignorados)

    return {
        "msg": "Planilha importada com sucesso",

        "total_importados": len(importados),

        "produtos": importados,

        "ignorados": ignorados
    }, None


# =========================================================
# ROTA IMPORTAR
# =========================================================

@excel_bp.route("/importar", methods=["POST"])
@auth_required
def importar_excel():

    try:

        tenant_id = g.usuario["tenant_id"]

        arquivo = request.files.get("arquivo")

        if not arquivo:

            return jsonify({
                "erro": "Arquivo não enviado"
            }), 400

        nome_arquivo = arquivo.filename or ""

        extensao = (
            nome_arquivo.rsplit(".", 1)[-1].lower()
            if "." in nome_arquivo
            else ""
        )

        if extensao not in (
            "xlsx",
            "xls",
            "ods"
        ):

            return jsonify({
                "erro": (
                    "Formato inválido. "
                    "Envie .xlsx, .xls ou .ods"
                )
            }), 400

        # =====================================================
        # ABRIR PLANILHA
        # =====================================================

        try:

            import openpyxl
            from io import BytesIO

            conteudo = arquivo.read()

            wb = openpyxl.load_workbook(
                BytesIO(conteudo),
                read_only=True,
                data_only=True
            )

        except Exception as e:

            return jsonify({
                "erro": (
                    f"Erro ao ler planilha: {str(e)}"
                )
            }), 400

        # =====================================================
        # IMPORTAR
        # =====================================================

        resultado, erro = importar_generica(
            wb,
            tenant_id
        )

        if erro:

            return jsonify({
                "erro": erro
            }), 400

        return jsonify(resultado), 200

    except Exception as e:

        traceback.print_exc()

        return jsonify({
            "erro": str(e)
        }), 500