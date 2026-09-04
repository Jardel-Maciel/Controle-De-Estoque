/**
 * Unidades de medida de produtos — precisa bater com backend/utils/unidades.py
 * Chave: valor salvo no banco. Valor: rótulo curto exibido nas telas.
 */
const UNIDADES_MEDIDA = {
  unidade: "Un",
  kg:      "Kg",
  g:       "g",
  mg:      "mg",
  l:       "L",
  ml:      "ml",
  pct:     "Pct",
  fardo:   "Fardo",
  m:       "m",
  cm:      "cm",
};

/** Rótulo curto pra mostrar ao lado de uma quantidade (ex: "Kg"). */
function labelUnidade(unidade) {
  return UNIDADES_MEDIDA[unidade] || "Un";
}

/** Formata "10" + "kg" -> "10 Kg". */
function formatarQuantidade(qtd, unidade) {
  return `${qtd} ${labelUnidade(unidade)}`;
}

/** Preenche um <select> com todas as opções de unidade de medida. */
function popularSelectUnidades(select, selecionado) {
  if (!select) return;
  select.innerHTML = Object.entries(UNIDADES_MEDIDA)
    .map(([valor, label]) => `<option value="${valor}">${label}</option>`)
    .join("");
  select.value = selecionado && UNIDADES_MEDIDA[selecionado] ? selecionado : "unidade";
}
