const API = "https://backend-estoque-fnfc.onrender.com";

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "index.html";
  throw new Error("Sem token");
}

let tipoMovimentacao = null;
let produtoIdAtual = null;
let produtosCache = [];

// =========================
// MODAL MOVIMENTAÇÃO
// =========================
const modal           = document.getElementById("modal");
const inputQtd        = document.getElementById("modalQuantidade");
const inputResponsavel = document.getElementById("modalResponsavel");
const inputComentario = document.getElementById("modalComentario");
const tituloModal     = document.getElementById("modalTitulo");

function abrirModal(tipo, id) {
  tipoMovimentacao = tipo;
  produtoIdAtual = id;
  if (tituloModal) tituloModal.textContent = tipo === "entrada" ? "Entrada de Produto" : "Saída de Produto";
  if (inputQtd) inputQtd.value = "";
  if (inputResponsavel) inputResponsavel.value = "";
  if (inputComentario) inputComentario.value = "";
  if (modal) { modal.classList.remove("hidden"); inputQtd?.focus(); }
}

function fecharModal() {
  if (modal) modal.classList.add("hidden");
}

const btnConfirmar = document.getElementById("confirmarModal");
if (btnConfirmar) {
  btnConfirmar.onclick = async () => {
    const quantidade = inputQtd?.value;
    const responsavel = inputResponsavel?.value || "";
    const comentario = inputComentario?.value || "";

    if (!quantidade || quantidade <= 0) {
      showToast("Quantidade inválida", "warning");
      return;
    }

    try {
      const res = await fetch(`${API}/movimentacoes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ produto_id: produtoIdAtual, tipo: tipoMovimentacao, quantidade, comentario, responsavel })
      });

      const data = await res.json();
      if (!res.ok) { showToast(data.erro || "Erro inesperado", "error"); return; }

      fecharModal();
      carregar();

    } catch (err) {
      console.error(err);
      showToast("Erro na movimentação", "error");
    }
  };
}

const btnCancelar = document.getElementById("cancelarModal");
if (btnCancelar) btnCancelar.onclick = fecharModal;

// =========================
// CARREGAR PRODUTOS
// =========================
async function carregar() {
  try {
    const res = await fetch(`${API}/produtos`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "index.html";
      return;
    }

    const dados = await res.json();

    if (!res.ok) { showToast(dados.erro || "Erro ao carregar produtos", "error"); return; }
    if (!Array.isArray(dados)) { showToast("Resposta inesperada da API", "error"); return; }

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
  const lista = document.getElementById("lista");
  if (!lista) return;

  lista.innerHTML = "";

  if (!produtos || produtos.length === 0) {
    lista.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <p>Nenhum produto cadastrado</p>
        </div>
      </td></tr>`;
    return;
  }

  produtos.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-transform:capitalize">${item.produto}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${Number(item.valor || 0).toFixed(2)}</td>
      <td style="text-transform:capitalize">${item.fornecedor || "-"}</td>
      <td>${item.cnpj || "-"}</td>
      <td>${item.numero_nota || "-"}</td>
      <td>${item.data_emissao || "-"}</td>
      <td>${item.contato || "-"}</td>
      <td class="acoes">
        <button onclick="entrada(${item.id})">➕</button>
        <button onclick="saida(${item.id})">➖</button>
        <button class="btn-danger" onclick="remover(${item.id})">Excluir</button>
      </td>`;
    lista.appendChild(tr);
  });
}

// =========================
// CADASTRAR PRODUTO
// =========================
const btnCadastrar = document.getElementById("cadastrar");
if (btnCadastrar) {
  btnCadastrar.onclick = async () => {
    const produto    = document.getElementById("inputProduto")?.value.trim();
    const quantidade = document.getElementById("quantidade")?.value;
    const valor      = document.getElementById("valor")?.value;
    const fornecedor = document.getElementById("fornecedor")?.value.trim();
    const contato    = document.getElementById("contato")?.value.trim();

    if (!produto || !quantidade) {
      showToast("Preencha produto e quantidade", "warning");
      return;
    }

    try {
      const res = await fetch(`${API}/produtos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ produto, quantidade, valor, fornecedor, contato })
      });

      const data = await res.json();
      if (!res.ok) { showToast(data.erro || "Erro inesperado", "error"); return; }

      document.getElementById("inputProduto").value = "";
      document.getElementById("quantidade").value   = "";
      document.getElementById("valor").value        = "";
      document.getElementById("fornecedor").value   = "";
      document.getElementById("contato").value      = "";
      document.getElementById("inputProduto").focus();

      showToast("Produto cadastrado!", "success");
      carregar();

    } catch (err) {
      console.error(err);
      showToast("Erro ao cadastrar", "error");
    }
  };
}

// =========================
// AÇÕES DA TABELA
// =========================
window.entrada = (id) => abrirModal("entrada", id);
window.saida   = (id) => abrirModal("saida", id);

window.remover = async (id) => {
  if (!confirm("Deseja realmente excluir este produto?")) return;
  try {
    await fetch(`${API}/produtos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    carregar();
  } catch (err) {
    console.error(err);
    showToast("Erro ao remover produto", "error");
  }
};

// =========================
// HISTÓRICO (opcional — só existe em algumas páginas)
// =========================
async function carregarHistorico() {
  try {
    const res = await fetch(`${API}/movimentacoes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dados = await res.json();
    const lista = document.getElementById("listaHistorico");
    if (!lista) return;

    lista.innerHTML = "";

    if (!Array.isArray(dados) || dados.length === 0) {
      lista.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Nenhuma movimentação</td></tr>`;
      return;
    }

    dados.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-transform:capitalize">${item.produto}</td>
        <td style="text-transform:capitalize">${item.tipo}</td>
        <td>${item.quantidade}</td>
        <td>${new Date(item.data).toLocaleString()}</td>
        <td style="text-transform:capitalize">${item.comentario || "-"}</td>
        <td style="text-transform:capitalize">${item.responsavel || "-"}</td>`;
      lista.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar histórico", "error");
  }
}

const btnVerHistorico = document.getElementById("verHistorico");
if (btnVerHistorico) {
  btnVerHistorico.onclick = () => {
    document.getElementById("modalHistorico")?.classList.remove("hidden");
    carregarHistorico();
  };
}

function fecharHistorico() {
  document.getElementById("modalHistorico")?.classList.add("hidden");
}
window.fecharHistorico = fecharHistorico;

// =========================
// PESQUISA ESTOQUE
// =========================
const campoPesquisa = document.getElementById("pesquisaEstoque");
if (campoPesquisa) {
  campoPesquisa.addEventListener("input", function () {
    const termo = this.value.toLowerCase();
    renderizarProdutos(produtosCache.filter(item => item.produto.toLowerCase().includes(termo)));
  });
}

// =========================
// PESQUISA HISTÓRICO
// =========================
const campoPesquisaProduto = document.getElementById("pesquisaProduto");
if (campoPesquisaProduto) {
  campoPesquisaProduto.addEventListener("input", function () {
    const termo = this.value.toLowerCase();
    document.querySelectorAll("#listaHistorico tr").forEach(linha => {
      linha.style.display = linha.innerText.toLowerCase().includes(termo) ? "" : "none";
    });
  });
}

// =========================
// DARK MODE
// =========================
const botaoTema = document.getElementById("toggleTema");
if (botaoTema) {
  if (localStorage.getItem("tema") === "dark") document.body.classList.add("dark");

  function atualizarIcone() {
    botaoTema.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  }
  atualizarIcone();

  botaoTema.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("tema", document.body.classList.contains("dark") ? "dark" : "light");
    atualizarIcone();
  };
}

// =========================
// LOGOUT
// =========================
const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
  btnLogout.onclick = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("nome");
    window.location.href = "index.html";
  };
}

// =========================
// IMPORTAR XML
// =========================
const btnImportarXML = document.getElementById("btnImportarXML");
const inputXML       = document.getElementById("inputXML");

if (btnImportarXML && inputXML) {
  btnImportarXML.addEventListener("click", () => inputXML.click());

  inputXML.addEventListener("change", async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const resposta = await fetch(`${API}/xml/importar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const dados = await resposta.json();
      if (!resposta.ok) { showToast(dados.erro || "Erro ao importar XML", "error"); return; }
      showToast("XML importado com sucesso!", "success");
      carregar();
    } catch (erro) {
      console.error(erro);
      showToast("Erro ao importar XML", "error");
    }
  });
}

// =========================
// INIT
// =========================
carregar();