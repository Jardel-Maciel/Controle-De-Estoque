/**
 * Escapa caracteres especiais de HTML antes de inserir texto vindo do
 * backend (nome de produto, fornecedor, comentário, nome de usuário, etc.)
 * dentro de innerHTML. Sem isso, alguém podia cadastrar um produto com um
 * nome tipo "<img src=x onerror=alert(1)>" e rodar JavaScript na tela de
 * qualquer outro usuário do mesmo tenant que abrisse a lista.
 *
 * Sempre que for montar um template `` `<td>${algumCampoDoBanco}</td>` ``,
 * envolva o campo com escapeHtml(): `` `<td>${escapeHtml(item.produto)}</td>` ``
 */
function escapeHtml(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Escapa um valor pra ser embutido dentro de um onclick="fn('...')" —
 * ex: onclick="excluir(${id}, '${escapeForInlineJs(nome)}')".
 *
 * IMPORTANTE: não use escapeHtml() nesse caso. O navegador decodifica
 * entidades HTML (como &#039;) ANTES de interpretar o onclick como
 * JavaScript, então um &#039; simplesmente vira ' de novo bem a tempo de
 * quebrar a string — escapeHtml() não protege esse contexto.
 * Aqui a aspa simples é escapada como \' (escape de JavaScript, sobrevive
 * à decodificação do HTML) e a aspa dupla como &quot; (porque essa sim
 * ainda é o delimitador do atributo HTML, e precisa da entidade).
 */
function escapeForInlineJs(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Motivos de uma saída de estoque — precisa bater com backend/utils/motivos.py
 */
const MOTIVOS_SAIDA = {
  consumo:           "Consumo / Venda",
  perda_vencimento:  "Perda — vencimento",
  perda_dano:        "Perda — dano/quebra",
  erro_registro:     "Erro de registro / ajuste",
};

function popularSelectMotivos(select, selecionado) {
  if (!select) return;
  select.innerHTML = Object.entries(MOTIVOS_SAIDA)
    .map(([valor, label]) => `<option value="${valor}">${label}</option>`)
    .join("");
  select.value = selecionado && MOTIVOS_SAIDA[selecionado] ? selecionado : "consumo";
}

/** true se o motivo for algum tipo de perda (não consumo/venda normal). */
function ehMotivoPerda(motivo) {
  return motivo && motivo !== "consumo" && MOTIVOS_SAIDA[motivo] !== undefined;
}