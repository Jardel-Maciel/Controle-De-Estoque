const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

let tipoMovimentacao = null;
let produtoIdAtual = null;

// -------- MODAL --------
const modal = document.getElementById("modal");
const inputQtd = document.getElementById("modalQuantidade");
const tituloModal = document.getElementById("modalTitulo");
const btnConfirmar = document.getElementById("confirmarModal");
const btnCancelar = document.getElementById("cancelarModal");

function abrirModal(tipo, id) {
  tipoMovimentacao = tipo;
  produtoIdAtual = id;

  tituloModal.textContent =
    tipo === "entrada" ? "Entrada de Produto" : "Saída de Produto";

  inputQtd.value = "";
  modal.classList.remove("hidden");
  inputQtd.focus();
}

function fecharModal() {
  modal.classList.add("hidden");
}

// -------- CONFIRMAR MODAL --------
btnConfirmar.addEventListener("click", async () => {
  const quantidade = inputQtd.value;

  if (!quantidade || quantidade <= 0) {
    alert("Quantidade inválida");
    return;
  }

  try {
    const res = await fetch(`${API}/movimentacoes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        produto_id: produtoIdAtual,
        tipo: tipoMovimentacao,
        quantidade,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro);
      return;
    }

    fecharModal();
    carregar();
  } catch (err) {
    console.error(err);
    alert("Erro na movimentação");
  }
});

// -------- CANCELAR MODAL --------
btnCancelar.addEventListener("click", fecharModal);

// -------- FECHAR COM ESC --------
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModal();
});

// -------- CARREGAR (GLOBAL) --------
async function carregar() {
  try {
    const res = await fetch(`${API}/produtos`, {
      headers: { Authorization: token },
    });

    const dados = await res.json();

    if (!res.ok) {
      alert(dados.erro || "Erro inesperado");
      return;
    }

    const lista = document.getElementById("lista");
    lista.innerHTML = "";

    dados.forEach((item) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${item.produto}</td>
        <td>
          <span class="editavel" data-id="${item.id}">
            ${item.quantidade}
          </span>
        </td>
        <td>
          <button onclick="entrada(${item.id})">➕</button>
          <button onclick="saida(${item.id})">➖</button>
          <button class="btn-danger" onclick="remover(${item.id})">Excluir</button>
        </td>
      `;

      lista.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar dados");
  }
}

// -------- INICIO --------
document.addEventListener("DOMContentLoaded", () => {
  const produto = document.getElementById("inputProduto");
  const quantidade = document.getElementById("quantidade");
  const cadastrar = document.getElementById("cadastrar");
  const lista = document.getElementById("lista");
  const botaoTema = document.getElementById("toggleTema");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // -------- EDIÇÃO INLINE --------
  lista.addEventListener("click", (e) => {
    if (!e.target.classList.contains("editavel")) return;

    const span = e.target;
    const id = span.dataset.id;
    const valorAtual = span.textContent;

    const input = document.createElement("input");
    input.type = "number";
    input.value = valorAtual;
    input.style.width = "60px";

    span.replaceWith(input);
    input.focus();

    input.addEventListener("blur", () => salvarEdicao(input, id));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") salvarEdicao(input, id);
    });
  });

  async function salvarEdicao(input, id) {
    const novaQuantidade = input.value;

    if (!novaQuantidade || novaQuantidade <= 0) {
      alert("Valor inválido");
      carregar();
      return;
    }

    try {
      const res = await fetch(`${API}/produtos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          quantidade: novaQuantidade,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.erro || "Erro ao atualizar");
        return;
      }

      carregar();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar");
    }
  }

  // -------- CADASTRAR --------
  cadastrar.addEventListener("click", async (e) => {
    e.preventDefault();

    const texto = produto.value.trim();
    const quant = quantidade.value.trim();

    if (!texto || !quant) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      cadastrar.disabled = true;

      const res = await fetch(`${API}/produtos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          produto: texto,
          quantidade: quant,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.erro);
        return;
      }

      produto.value = "";
      quantidade.value = "";

      carregar();
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar");
    } finally {
      cadastrar.disabled = false;
    }
  });

  // -------- TEMA --------
  if (localStorage.getItem("tema") === "dark") {
    document.body.classList.add("dark");
  }

  function atualizarIcone() {
    botaoTema.textContent = document.body.classList.contains("dark")
      ? "☀️"
      : "🌙";
  }

  atualizarIcone();

  botaoTema.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const dark = document.body.classList.contains("dark");
    localStorage.setItem("tema", dark ? "dark" : "light");

    atualizarIcone();
  });

  carregar();
});

// -------- ENTRADA --------
window.entrada = function (id) {
  abrirModal("entrada", id);
};

// -------- SAÍDA --------
window.saida = function (id) {
  abrirModal("saida", id);
};

// -------- REMOVER --------
window.remover = async function (id) {
  try {
    await fetch(`${API}/produtos/${id}`, {
      method: "DELETE",
      headers: { Authorization: token },
    });

    carregar();
  } catch (err) {
    console.error(err);
    alert("Erro ao remover");
  }
};

// -------- LOGOUT --------
document.getElementById("btnLogout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

const modalHistorico = document.getElementById("modalHistorico");
const listaHistorico = document.getElementById("listaHistorico");

async function carregarHistorico() {
  try {
    const res = await fetch(`${API}/movimentacoes`, {
      headers: { Authorization: token },
    });

    const dados = await res.json();

    if (!res.ok) {
      alert(dados.erro);
      return;
    }

    listaHistorico.innerHTML = "";

    dados.forEach((item) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
  <td>${item.produto}</td>
  <td>${item.quantidade}</td>
  <td>R$ ${item.valor || 0}</td>
  <td>${item.fornecedor || "-"}</td>
  <td>${item.contato || "-"}</td>
  <td>
    <button onclick="entrada(${item.id})">➕</button>
    <button onclick="saida(${item.id})">➖</button>
    <button class="btn-danger" onclick="remover(${item.id})">Excluir</button>
  </td>
`;

      listaHistorico.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar histórico");
  }
}

document.getElementById("verHistorico").addEventListener("click", () => {
  modalHistorico.classList.remove("hidden");
  carregarHistorico();
});
function fecharHistorico() {
  modalHistorico.classList.add("hidden");
}
