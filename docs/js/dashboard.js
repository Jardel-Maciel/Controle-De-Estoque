const API = "https://backend-estoque-fnfc.onrender.com";

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "index.html";
}

let tipoMovimentacao = null;
let produtoIdAtual = null;
let produtosCache = [];

// =========================
// MODAL
// =========================
const modal =
  document.getElementById("modal");

const inputQtd =
  document.getElementById("modalQuantidade");

const inputResponsavel =
  document.getElementById("modalResponsavel");

const inputComentario =
  document.getElementById("modalComentario");

const tituloModal =
  document.getElementById("modalTitulo");

// =========================
// ABRIR MODAL
// =========================
function abrirModal(tipo, id) {

  tipoMovimentacao = tipo;
  produtoIdAtual = id;

  tituloModal.textContent =
    tipo === "entrada"
      ? "Entrada de Produto"
      : "Saída de Produto";

  inputQtd.value = "";

  if (inputResponsavel) {
    inputResponsavel.value = "";
  }

  if (inputComentario) {
    inputComentario.value = "";
  }

  modal.classList.remove("hidden");

  inputQtd.focus();
}

// =========================
// FECHAR MODAL
// =========================
function fecharModal() {

  modal.classList.add("hidden");
}

// =========================
// CONFIRMAR MOVIMENTAÇÃO
// =========================
document
  .getElementById("confirmarModal")
  .onclick = async () => {

    const quantidade = inputQtd.value;

    const responsavel =
      inputResponsavel?.value || "";

    const comentario =
      inputComentario?.value || "";

    if (!quantidade || quantidade <= 0) {

      showToast("Quantidade inválida", "warning");

      return;
    }

    try {

      const res = await fetch(
        `${API}/movimentacoes`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },

          body: JSON.stringify({
            produto_id: produtoIdAtual,
            tipo: tipoMovimentacao,
            quantidade,
            comentario,
            responsavel
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {

        showToast(data.erro || "Erro inesperado", "error");

        return;
      }

      fecharModal();

      carregar();

    } catch (err) {

      console.error(err);

      showToast("Erro na movimentação", "error");
    }
  };

// =========================
// CANCELAR MODAL
// =========================
document
  .getElementById("cancelarModal")
  .onclick = fecharModal;

// =========================
// CARREGAR PRODUTOS
// =========================
async function carregar() {

  try {

    const res = await fetch(
      `${API}/produtos`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const dados = await res.json();

    produtosCache = dados;

    renderizarProdutos(dados);

  } catch (err) {

    console.error(err);

    showToast("Erro ao carregar produtos", "error");
  }
}

// =========================
// RENDERIZAR PRODUTOS
// =========================
function renderizarProdutos(produtos) {

  const lista =
    document.getElementById("lista");

  lista.innerHTML = "";

  produtos.forEach((item) => {

    const tr =
      document.createElement("tr");

    tr.innerHTML = `

      <td style="text-transform: capitalize;">
        ${item.produto}
      </td>

      <td>
        ${item.quantidade}
      </td>

      <td>
        R$ ${Number(item.valor || 0).toFixed(2)}
      </td>

      <td style="text-transform: capitalize;">
        ${item.fornecedor || "-"}
      </td>

      <td>
        ${item.cnpj || "-"}
      </td>

      <td>
        ${item.numero_nota || "-"}
      </td>

      <td>
        ${item.data_emissao || "-"}
      </td>

      <td>
        ${item.contato || "-"}
      </td>

      <td class="acoes">

        <button onclick="entrada(${item.id})">
          ➕
        </button>

        <button onclick="saida(${item.id})">
          ➖
        </button>

        <button
          class="btn-danger"
          onclick="remover(${item.id})"
        >
          Excluir
        </button>

      </td>
    `;

    lista.appendChild(tr);
  });
}

// =========================
// CADASTRAR PRODUTO
// =========================
document
  .getElementById("cadastrar")
  .onclick = async () => {

    const inputProduto =
      document.getElementById("inputProduto");

    const inputQuantidade =
      document.getElementById("quantidade");

    const inputValor =
      document.getElementById("valor");

    const inputFornecedor =
      document.getElementById("fornecedor");

    const inputContato =
      document.getElementById("contato");

    const produto =
      inputProduto.value.trim();

    const quantidade =
      inputQuantidade.value;

    const valor =
      inputValor.value;

    const fornecedor =
      inputFornecedor.value.trim();

    const contato =
      inputContato.value.trim();

    if (!produto || !quantidade) {

      showToast("Preencha produto e quantidade", "warning");

      return;
    }

    try {

      const res = await fetch(
        `${API}/produtos`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },

          body: JSON.stringify({
            produto,
            quantidade,
            valor,
            fornecedor,
            contato
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {

        showToast(data.erro || "Erro inesperado", "error");

        return;
      }

      inputProduto.value = "";
      inputQuantidade.value = "";
      inputValor.value = "";
      inputFornecedor.value = "";
      inputContato.value = "";

      inputProduto.focus();

      carregar();

    } catch (err) {

      console.error(err);

      showToast("Erro ao cadastrar", "error");
    }
  };

// =========================
// AÇÕES
// =========================
window.entrada = (id) => {
  abrirModal("entrada", id);
};

window.saida = (id) => {
  abrirModal("saida", id);
};

window.remover = async (id) => {

  const confirmar = confirm(
    "Deseja realmente excluir este produto?"
  );

  if (!confirmar) return;

  try {

    await fetch(
      `${API}/produtos/${id}`,
      {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    carregar();

  } catch (err) {

    console.error(err);

    showToast("Erro ao remover produto", "error");
  }
};

// =========================
// HISTÓRICO
// =========================
async function carregarHistorico() {

  try {

    const res = await fetch(
      `${API}/movimentacoes`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const dados = await res.json();

    const lista =
      document.getElementById("listaHistorico");

    lista.innerHTML = "";

    dados.forEach((item) => {

      const tr =
        document.createElement("tr");

      tr.innerHTML = `
        <td style="text-transform: capitalize;">
          ${item.produto}
        </td>

        <td style="text-transform: capitalize;">
          ${item.tipo}
        </td>

        <td>
          ${item.quantidade}
        </td>

        <td>
          ${new Date(item.data)
            .toLocaleString()}
        </td>

        <td style="text-transform: capitalize;">
          ${item.comentario || "-"}
        </td>

        <td style="text-transform: capitalize;">
          ${item.responsavel || "-"}
        </td>
      `;

      lista.appendChild(tr);
    });

  } catch (err) {

    console.error(err);

    showToast("Erro ao carregar histórico", "error");
  }
}

// =========================
// ABRIR HISTÓRICO
// =========================
document
  .getElementById("verHistorico")
  .onclick = () => {

    document
      .getElementById("modalHistorico")
      .classList.remove("hidden");

    carregarHistorico();
  };

// =========================
// FECHAR HISTÓRICO
// =========================
function fecharHistorico() {

  document
    .getElementById("modalHistorico")
    .classList.add("hidden");
}

window.fecharHistorico =
  fecharHistorico;

// =========================
// PESQUISA ESTOQUE
// =========================
document
  .getElementById("pesquisaEstoque")
  .addEventListener("input", function () {

    const termo =
      this.value.toLowerCase();

    const filtrados =
      produtosCache.filter((item) => {

        return (
          item.produto
            .toLowerCase()
            .includes(termo)
        );
      });

    renderizarProdutos(filtrados);
  });

// =========================
// PESQUISA HISTÓRICO
// =========================
document
  .getElementById("pesquisaProduto")
  .addEventListener("input", function () {

    const termo =
      this.value.toLowerCase();

    const linhas =
      document.querySelectorAll(
        "#listaHistorico tr"
      );

    linhas.forEach((linha) => {

      const texto =
        linha.innerText.toLowerCase();

      linha.style.display =
        texto.includes(termo)
          ? ""
          : "none";
    });
  });

// =========================
// DARK MODE
// =========================
const botaoTema =
  document.getElementById("toggleTema");

if (
  localStorage.getItem("tema")
  === "dark"
) {
  document.body.classList.add("dark");
}

function atualizarIcone() {

  botaoTema.textContent =
    document.body.classList.contains("dark")
      ? "☀️"
      : "🌙";
}

atualizarIcone();

botaoTema.onclick = () => {

  document.body.classList.toggle("dark");

  const dark =
    document.body.classList.contains("dark");

  localStorage.setItem(
    "tema",
    dark ? "dark" : "light"
  );

  atualizarIcone();
};

// =========================
// LOGOUT
// =========================
document
  .getElementById("btnLogout")
  .onclick = () => {

    localStorage.removeItem("token");

    window.location.href =
      "index.html";
  };

// =========================
// IMPORTAR XML
// =========================
const btnImportarXML =
  document.getElementById("btnImportarXML");

const inputXML =
  document.getElementById("inputXML");

btnImportarXML.addEventListener("click", () => {

  inputXML.click();

});

inputXML.addEventListener("change", async (e) => {

  const arquivo = e.target.files[0];

  if (!arquivo) return;

  const formData = new FormData();

  formData.append("arquivo", arquivo);

  try {

    const resposta = await fetch(
      `${API}/xml/importar`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`
        },

        body: formData
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {

      showToast(dados.erro || "Erro ao importar XML", "error");

      return;
    }

    showToast("XML importado com sucesso!", "success");

    carregar();

  } catch (erro) {

    console.error(erro);

    showToast("Erro ao importar XML", "error");
  }

});

// =========================
// INIT
// =========================
carregar();