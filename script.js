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

btnCancelar.addEventListener("click", fecharModal);

// -------- CARREGAR PRODUTOS --------
async function carregar() {
  try {
    const res = await fetch(`${API}/produtos`, {
      headers: { Authorization: token },
    });

    const dados = await res.json();

    const lista = document.getElementById("lista");
    lista.innerHTML = "";

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

      lista.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar");
  }
}

// -------- INICIO --------
document.addEventListener("DOMContentLoaded", () => {
  const produto = document.getElementById("inputProduto");
  const quantidade = document.getElementById("quantidade");
  const valor = document.getElementById("valor");
  const fornecedor = document.getElementById("fornecedor");
  const contato = document.getElementById("contato");
  const cadastrar = document.getElementById("cadastrar");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  cadastrar.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API}/produtos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          produto: produto.value,
          quantidade: quantidade.value,
          valor: valor.value,
          fornecedor: fornecedor.value,
          contato: contato.value,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.erro);
        return;
      }

      produto.value = "";
      quantidade.value = "";
      valor.value = "";
      fornecedor.value = "";
      contato.value = "";

      carregar();
    } catch (err) {
      console.error(err);
    }
  });

  carregar();
});

// -------- AÇÕES --------
window.entrada = (id) => abrirModal("entrada", id);
window.saida = (id) => abrirModal("saida", id);

window.remover = async (id) => {
  await fetch(`${API}/produtos/${id}`, {
    method: "DELETE",
    headers: { Authorization: token },
  });

  carregar();
};

// -------- HISTÓRICO --------
const modalHistorico = document.getElementById("modalHistorico");
const listaHistorico = document.getElementById("listaHistorico");

async function carregarHistorico() {
  const res = await fetch(`${API}/movimentacoes`, {
    headers: { Authorization: token },
  });

  const dados = await res.json();

  listaHistorico.innerHTML = "";

  dados.forEach((item) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.produto}</td>
      <td>${item.tipo}</td>
      <td>${item.quantidade}</td>
      <td>${new Date(item.data).toLocaleString()}</td>
    `;

    listaHistorico.appendChild(tr);
  });
}

document.getElementById("verHistorico").onclick = () => {
  modalHistorico.classList.remove("hidden");
  carregarHistorico();
};

function fecharHistorico() {
  modalHistorico.classList.add("hidden");
}