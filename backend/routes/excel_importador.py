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
        "product",
        "nome",
        "name",
        "descricao",
        "descrição",
        "item",
        "nome produto",
        "produto descricao",
        "descricao produto"
    ],

    "quantidade": [
        "quantidade",
        "qtd",
        "qty",
        "quantity",
        "estoque",
        "qtde",
        "saldo",
        "qtd estoque"
    ],

    "valor": [
        "valor",
        "value",
        "preco",
        "preço",
        "price",
        "custo",
        "cost",
        "vl",
        "vr",
        "valor custo",
        "custo unitario",
        "custo unitário",
        "media de custo",
        "média de custo",
        "preco unitario",
        "preço unitário"
    ],

    "fornecedor": [
        "fornecedor",
        "supplier",
        "vendor",
        "fabricante",
        "empresa"
    ],

    "contato": [
        "contato",
        "contact",
        "telefone",
        "tel",
        "fone",
        "phone"
    ],

    "estoque_min": [
        "estoque minimo",
        "estoque mínimo",
        "estoque_minimo",
        "min"
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
# DETECTAR PLANILHA JFL
# =========================================================

def detectar_planilha_jfl(wb):

    abas = [normalizar(s) for s in wb.sheetnames]

    return all(
        aba in abas
        for aba in ["prod", "entradas", "forn"]
    )


# =========================================================
# IMPORTADOR JFL
# =========================================================

def importar_jfl(wb, tenant_id):

    conn = conectar()
    cursor = conn.cursor()

    importados = []
    ignorados = []

    ws_prod = wb["PROD"]

    linhas_prod = list(
        ws_prod.iter_rows(values_only=True)
    )

    for i, linha in enumerate(linhas_prod[3:], start=4):

        try:

            nome = str(
                linha[1] or ""
            ).strip()

            if not nome:
                continue

            try:
                valor = float(
                    str(
                        linha[5] or 0
                    ).replace(",", ".")
                )
            except:
                valor = 0

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

            if existente:

                valor_atual = float(
                    existente["valor"] or 0
                )

                novo_valor = (
                    valor
                    if valor > 0
                    else valor_atual
                )

                cursor.execute("""
                    UPDATE produtos
                    SET valor = %s
                    WHERE id = %s
                """, (
                    round(novo_valor, 4),
                    existente["id"]
                ))

                importados.append(
                    f"{nome} (atualizado)"
                )

            else:

                cursor.execute("""
                    INSERT INTO produtos (
                        tenant_id,
                        produto,
                        quantidade,
                        valor
                    )
                    VALUES (%s,%s,%s,%s)
                """, (
                    tenant_id,
                    nome,
                    0,
                    valor
                ))

                importados.append(nome)

        except Exception as e:

            ignorados.append(
                f"Linha {i}: {str(e)}"
            )

            continue

    conn.commit()
    conn.close()

    return {
        "msg": "Planilha JFL importada com sucesso",
        "produtos_importados": len(importados),
        "produtos": importados,
        "ignorados": ignorados
    }


# =========================================================
# IMPORTADOR GENÉRICO
# =========================================================

def importar_generica(wb, tenant_id):

    ws = wb.active

    linhas = list(
        ws.iter_rows(values_only=True)
    )

    if not linhas or len(linhas) < 2:

        return None, (
            "Planilha vazia ou sem dados"
        )

    cabecalho = [
        str(c) if c is not None else ""
        for c in linhas[0]
    ]

    mapa = mapear_cabecalho(cabecalho)

    if "produto" not in mapa:

        return None, (
            "Coluna produto não encontrada"
        )

    conn = conectar()
    cursor = conn.cursor()

    importados = []
    ignorados = []

    colunas_ignoradas = []

    for col in cabecalho:

        col_norm = normalizar(col)

        reconhecida = False

        for variantes in MAPA_COLUNAS.values():

            if any(
                normalizar(v) in col_norm
                or col_norm in normalizar(v)
                for v in variantes
            ):
                reconhecida = True
                break

        if not reconhecida:
            colunas_ignoradas.append(col)

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

            nome = str(
                cel("produto", "")
            ).strip()

            if not nome:

                ignorados.append(
                    f"Linha {i}: produto vazio"
                )

                continue

            try:
                quantidade = float(
                    str(
                        cel("quantidade", 0)
                    ).replace(",", ".")
                )
            except:
                quantidade = 0

            try:
                valor = float(
                    str(
                        cel("valor", 0)
                    ).replace(",", ".")
                )
            except:
                valor = 0

            fornecedor = str(
                cel("fornecedor", "")
            ).strip()

            contato = str(
                cel("contato", "")
            ).strip()

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

    print("IMPORTADOS:", importados)
    print("IGNORADOS:", ignorados)

    conn.commit()
    conn.close()

    return {
        "msg": "Planilha importada com sucesso",

        "total_importados": len(importados),

        "produtos": importados,

        "ignorados": ignorados,

        "colunas_reconhecidas": list(
            mapa.keys()
        ),

        "colunas_ignoradas": colunas_ignoradas
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
                    "Formato inválido"
                )
            }), 400

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

        # =================================================
        # IMPORTAÇÃO JFL
        # =================================================

        if detectar_planilha_jfl(wb):

            resultado = importar_jfl(
                wb,
                tenant_id
            )

            return jsonify(resultado), 200

        # =================================================
        # IMPORTAÇÃO GENÉRICA
        # =================================================

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