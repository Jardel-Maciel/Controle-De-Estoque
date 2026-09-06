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

/**
 * Conversão entre unidades da mesma família — precisa bater exatamente com
 * backend/utils/unidades.py (FAMILIAS_CONVERSAO). Usado nas Fichas Técnicas
 * pra converter a quantidade do ingrediente pra unidade do produto estocado.
 */
const FAMILIAS_CONVERSAO = {
  kg: ["massa", 1000],
  g:  ["massa", 1],
  mg: ["massa", 0.001],
  l:  ["volume", 1000],
  ml: ["volume", 1],
  m:  ["comprimento", 100],
  cm: ["comprimento", 1],
};

/** Lista de unidades conversíveis com a unidade dada (incluindo ela mesma). */
function unidadesCompativeis(unidade) {
  const familia = FAMILIAS_CONVERSAO[unidade];
  if (!familia) return [unidade];
  return Object.entries(FAMILIAS_CONVERSAO)
    .filter(([, [fam]]) => fam === familia[0])
    .map(([u]) => u);
}

/** Converte uma quantidade de uma unidade pra outra da mesma família. null se incompatível. */
function converterQuantidade(quantidade, unidadeOrigem, unidadeDestino) {
  if (unidadeOrigem === unidadeDestino) return quantidade;
  const origem  = FAMILIAS_CONVERSAO[unidadeOrigem];
  const destino = FAMILIAS_CONVERSAO[unidadeDestino];
  if (!origem || !destino || origem[0] !== destino[0]) return null;
  const base = quantidade * origem[1];
  return base / destino[1];
}
