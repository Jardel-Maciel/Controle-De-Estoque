const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

let tipoMovimentacao = null;
let produtoIdAtual = null;

// -------- MODAL --------
const modal = document.getElementById("modal");
const inputQtd = document.getElementById("modalQuantidade");
const tituloModal = document.getElementById("modalTitulo");

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

// -------- CONFIRMAR --------
document.getElementById("confirmarModal").onclick = async () => {
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
};

document.getElementById("cancelarModal").onclick = fecharModal;

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

// -------- CADASTRAR --------
document.getElementById("cadastrar").onclick = async () => {
  const produto = document.getElementById("inputProduto").value;
  const quantidade = document.getElementById("quantidade").value;
  const valor = document.getElementById("valor").value;
  const fornecedor = document.getElementById("fornecedor").value;
  const contato = document.getElementById("contato").value;

  if (!produto || !quantidade) {
    alert("Preencha produto e quantidade");
    return;
  }

  try {
    const res = await fetch(`${API}/produtos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        produto,
        quantidade,
        valor,
        fornecedor,
        contato,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro);
      return;
    }

    carregar();
  } catch (err) {
    console.error(err);
    alert("Erro ao cadastrar");
  }
};

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
async function carregarHistorico() {
  const res = await fetch(`${API}/movimentacoes`, {
    headers: { Authorization: token },
  });

  const dados = await res.json();
  const lista = document.getElementById("listaHistorico");

  lista.innerHTML = "";

  dados.forEach((item) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.produto}</td>
      <td>${item.tipo}</td>
      <td>${item.quantidade}</td>
      <td>${new Date(item.data).toLocaleString()}</td>
    `;

    lista.appendChild(tr);
  });
}

document.getElementById("verHistorico").onclick = () => {
  document.getElementById("modalHistorico").classList.remove("hidden");
  carregarHistorico();
};

function fecharHistorico() {
  document.getElementById("modalHistorico").classList.add("hidden");
}

// -------- DARK MODE (AQUI ESTAVA O ERRO) --------
const botaoTema = document.getElementById("toggleTema");

// aplicar tema salvo
if (localStorage.getItem("tema") === "dark") {
  document.body.classList.add("dark");
}

// atualizar ícone
function atualizarIcone() {
  botaoTema.textContent =
    document.body.classList.contains("dark") ? "☀️" : "🌙";
}

atualizarIcone();

// trocar tema
botaoTema.onclick = () => {
  document.body.classList.toggle("dark");

  const dark = document.body.classList.contains("dark");
  localStorage.setItem("tema", dark ? "dark" : "light");

  atualizarIcone();
};

// -------- INIT --------
if (!token) {
  window.location.href = "login.html";
}

carregar();