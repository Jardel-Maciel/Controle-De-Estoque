# =========================
# MOVIMENTAÇÕES - CRIAR
# =========================
@app.route("/movimentacoes", methods=["POST", "OPTIONS"])
def criar_movimentacao():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    if not autenticar():
        return jsonify({"erro": "Não autorizado"}), 401

    try:
        dados = request.get_json(force=True)

        # FRONTEND ENVIA produto_id
        produto_id = dados.get("produto_id")

        tipo = str(dados.get("tipo", "")).lower().strip()

        quantidade = int(dados.get("quantidade", 0))

        comentario = dados.get("comentario", "")
        responsavel = dados.get("responsavel", "Sistema")

        data = datetime.datetime.now().isoformat()

        # VALIDAÇÃO
        if not produto_id or tipo not in ["entrada", "saida"] or quantidade <= 0:
            return jsonify({"erro": "Dados inválidos"}), 400

        conn = conectar()
        cursor = conn.cursor()

        # BUSCA PRODUTO PELO ID
        cursor.execute(
            "SELECT produto, quantidade FROM produtos WHERE id = ?",
            (produto_id,)
        )

        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({"erro": "Produto não encontrado"}), 404

        produto = row["produto"]
        estoque_atual = row["quantidade"]

        # VALIDA ESTOQUE
        if tipo == "saida" and quantidade > estoque_atual:
            conn.close()
            return jsonify({"erro": "Estoque insuficiente"}), 400

        # CALCULA NOVO ESTOQUE
        novo_estoque = (
            estoque_atual + quantidade
            if tipo == "entrada"
            else estoque_atual - quantidade
        )

        # ATUALIZA ESTOQUE
        cursor.execute(
            "UPDATE produtos SET quantidade = ? WHERE id = ?",
            (novo_estoque, produto_id)
        )

        # SALVA MOVIMENTAÇÃO
        cursor.execute("""
            INSERT INTO movimentacoes
            (produto, tipo, quantidade, comentario, responsavel, data)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            produto,
            tipo,
            quantidade,
            comentario,
            responsavel,
            data
        ))

        conn.commit()
        conn.close()

        return jsonify({
            "msg": "Movimentação registrada com sucesso"
        })

    except Exception as e:
        return jsonify({"erro": str(e)}), 500