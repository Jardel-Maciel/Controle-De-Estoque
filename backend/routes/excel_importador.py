from flask import Blueprint, request, jsonify
from openpyxl import load_workbook
from database import db
from models.produto import Produto
import tempfile
import os

excel_importador_bp = Blueprint(
    "excel_importador",
    __name__
)

@excel_importador_bp.route(
    "/importar-excel",
    methods=["POST"]
)
def importar_excel():

    try:

        arquivo = request.files.get(
            "arquivo"
        )

        aba_escolhida = request.form.get(
            "aba"
        )

        if not arquivo:
            return jsonify({
                "erro":
                "Arquivo não enviado"
            }), 400

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".xlsx"
        ) as temp:

            arquivo.save(
                temp.name
            )

            caminho = temp.name

        wb = load_workbook(
            caminho,
            data_only=True
        )

        # ==================================
        # LISTA ABAS
        # ==================================

        abas = wb.sheetnames

        # Se não informar aba
        # devolve lista

        if not aba_escolhida:

            os.remove(caminho)

            return jsonify({
                "selecione_aba": True,
                "abas": abas
            })

        # ==================================
        # VALIDA ABA
        # ==================================

        if aba_escolhida not in abas:

            os.remove(caminho)

            return jsonify({
                "erro":
                f"A aba "
                f"{aba_escolhida} "
                f"não existe",
                "abas":
                abas
            }), 400

        ws = wb[
            aba_escolhida
        ]

        # ==================================
        # CABEÇALHOS
        # ==================================

        headers = []

        for cell in ws[1]:

            valor = ""

            if cell.value:

                valor = str(
                    cell.value
                ).lower().strip()

            headers.append(
                valor
            )

        coluna_produto = None
        coluna_qtd = None
        coluna_valor = None
        coluna_fornecedor = None

        for i, h in enumerate(
            headers
        ):

            if any(
                x in h
                for x in [
                    "produto",
                    "descricao",
                    "descrição",
                    "item"
                ]
            ):
                coluna_produto = i

            if any(
                x in h
                for x in [
                    "qtd",
                    "quantidade",
                    "estoque",
                    "qtde"
                ]
            ):
                coluna_qtd = i

            if any(
                x in h
                for x in [
                    "valor",
                    "preco",
                    "preço",
                    "custo"
                ]
            ):
                coluna_valor = i

            if any(
                x in h
                for x in [
                    "fornecedor",
                    "fabricante"
                ]
            ):
                coluna_fornecedor = i

        if coluna_produto is None:

            return jsonify({
                "erro":
                "Coluna produto não encontrada"
            }), 400

        total_importados = 0
        total_atualizados = 0

        # ==================================
        # IMPORTAÇÃO
        # ==================================

        for row in ws.iter_rows(
            min_row=2
        ):

            nome = row[
                coluna_produto
            ].value

            if not nome:
                continue

            nome = str(
                nome
            ).strip()

            qtd = 0
            valor = 0
            fornecedor = ""

            if (
                coluna_qtd
                is not None
            ):

                v = row[
                    coluna_qtd
                ].value

                if v:

                    try:
                        qtd = float(v)
                    except:
                        qtd = 0

            if (
                coluna_valor
                is not None
            ):

                v = row[
                    coluna_valor
                ].value

                if v:

                    try:
                        valor = float(v)
                    except:
                        valor = 0

            if (
                coluna_fornecedor
                is not None
            ):

                v = row[
                    coluna_fornecedor
                ].value

                if v:
                    fornecedor = str(
                        v
                    )

            produto = Produto.query.filter_by(
                nome=nome
            ).first()

            if produto:

                produto.quantidade = qtd
                produto.valor = valor
                produto.fornecedor = fornecedor

                total_atualizados += 1

            else:

                novo = Produto(
                    nome=nome,
                    quantidade=qtd,
                    valor=valor,
                    fornecedor=fornecedor
                )

                db.session.add(
                    novo
                )

                total_importados += 1

        db.session.commit()

        os.remove(
            caminho
        )

        return jsonify({

            "sucesso": True,

            "aba_importada":
            aba_escolhida,

            "produtos_importados":
            total_importados,

            "produtos_atualizados":
            total_atualizados,

            "abas_disponiveis":
            abas

        })

    except Exception as e:

        return jsonify({
            "erro":
            str(e)
        }), 500