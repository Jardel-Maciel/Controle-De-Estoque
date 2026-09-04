const API = window.API_URL;

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "index.html";
  throw new Error("Sem token");
}


let tipoMovimentacao = null;
let produtoIdAtual = null;
let produtosCache = [];
let setoresCache = [];

// =========================
// SETORES — carregar e popular seletores
// (o seletor de cadastro e o filtro só aparecem para gerente/admin;
// cliente tem o setor atribuído automaticamente pelo backend)
// =========================
async function carregarSetores() {
  try {
    const res = await fetch(`${API}/setores`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    setoresCache = await res.json();

    const usuario = JSON.parse(localStorage.getItem("user") || "{}");
    const role = usuario.role || "";
    if (role !== "gerente" && role !== "admin") return;

    const selectCadastro = document.getElementById("setorProduto");
    const selectFiltro    = document.getElementById("filtroSetor");

    setoresCache.forEach((s) => {
      if (selectCadastro) {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.nome;
        selectCadastro.appendChild(opt);
      }
      if (selectFiltro) {
        const opt2 = document.createElement("option");
        opt2.value = s.id;
        opt2.textContent = s.nome;
        selectFiltro.appendChild(opt2);
      }
    });

    if (selectCadastro) {
      selectCadastro.style.display = "";
      const dica = document.getElementById("dicaSetorImportacao");
      if (dica) dica.style.display = "";
    }
    if (selectFiltro) {
      selectFiltro.style.display = "";
      selectFiltro.addEventListener("change", () => carregar(selectFiltro.value));
    }
  } catch (err) {
    console.error("Erro ao carregar setores:", err);
  }
}
if (document.getElementById("setorProduto") || document.getElementById("filtroSetor")) {
  carregarSetores();
}

// Popula o seletor de unidade de medida do formulário de cadastro
popularSelectUnidades(document.getElementById("unidadeMedida"), "unidade");

// =========================
// MODAL MOVIMENTAÇÃO
// =========================
const modal           = document.getElementById("modal");
const inputQtd        = document.getElementById("modalQuantidade");
const inputResponsavel = document.getElementById("modalResponsavel");
const inputComentario = document.getElementById("modalComentario");
const tituloModal     = document.getElementById("modalTitulo");
const labelQtdModal   = document.getElementById("modalQuantidadeLabel");

function abrirModal(tipo, id) {
  tipoMovimentacao = tipo;
  produtoIdAtual = id;
  if (tituloModal) tituloModal.textContent = tipo === "entrada" ? "Entrada de Produto" : "Saída de Produto";
  if (inputQtd) inputQtd.value = "";
  if (inputResponsavel) inputResponsavel.value = "";
  if (inputComentario) inputComentario.value = "";
  const produto = produtosCache.find(p => p.id === id);
  if (labelQtdModal) {
    labelQtdModal.textContent = produto ? `Quantidade (${labelUnidade(produto.unidade_medida)})` : "Quantidade";
  }
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
async function carregar(setorId) {
  try {
    const qs = setorId ? `?setor_id=${encodeURIComponent(setorId)}` : "";
    const res = await fetch(`${API}/produtos${qs}`, {
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
      <tr><td colspan="10">
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
    const setorNome = item.setor_id
      ? (setoresCache.find(s => s.id === item.setor_id)?.nome || "-")
      : "Geral";
    tr.innerHTML = `
      <td style="text-transform:capitalize">${item.produto}</td>
      <td>${setorNome}</td>
      <td>${formatarQuantidade(item.quantidade, item.unidade_medida)}</td>
      <td>R$ ${Number(item.valor || 0).toFixed(2)}</td>
      <td style="text-transform:capitalize">${item.fornecedor || "-"}</td>
      <td>${item.cnpj || "-"}</td>
      <td>${item.numero_nota || "-"}</td>
      <td>${item.data_emissao || "-"}</td>
      <td>${item.contato || "-"}</td>
      <td class="acoes">
        <button class="btn btn-success btn-sm" onclick="entrada(${item.id})" title="Entrada de estoque">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Entrada
        </button>
        <button class="btn btn-warning btn-sm" onclick="saida(${item.id})" title="Saída de estoque">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Saída
        </button>
        <button class="btn btn-ghost btn-sm" onclick="editarProduto(${item.id})" title="Editar produto">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          Editar
        </button>
        <button class="btn btn-danger btn-sm" onclick="remover(${item.id})" title="Excluir produto">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          Excluir
        </button>
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
    const unidade_medida = document.getElementById("unidadeMedida")?.value || "unidade";
    const valor      = document.getElementById("valor")?.value;
    const fornecedor = document.getElementById("fornecedor")?.value.trim();
    const contato    = document.getElementById("contato")?.value.trim();
    const setor_id   = document.getElementById("setorProduto")?.value || null;

    if (!produto || !quantidade) {
      showToast("Preencha produto e quantidade", "warning");
      return;
    }

    try {
      const res = await fetch(`${API}/produtos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ produto, quantidade, unidade_medida, valor, fornecedor, contato, setor_id })
      });

      const data = await res.json();
      if (!res.ok) { showToast(data.erro || "Erro inesperado", "error"); return; }

      document.getElementById("inputProduto").value = "";
      document.getElementById("quantidade").value   = "";
      document.getElementById("unidadeMedida").value = "unidade";
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
// EDITAR PRODUTO
// =========================
let produtoEditandoId = null;

window.editarProduto = (id) => {
  const item = produtosCache.find(p => p.id === id);
  if (!item) return;

  produtoEditandoId = id;

  document.getElementById("editProduto").value    = item.produto || "";
  document.getElementById("editQuantidade").value = item.quantidade ?? "";
  document.getElementById("editValor").value      = item.valor ?? "";
  document.getElementById("editFornecedor").value = item.fornecedor || "";
  document.getElementById("editContato").value    = item.contato || "";
  popularSelectUnidades(document.getElementById("editUnidadeMedida"), item.unidade_medida);

  const usuario = JSON.parse(localStorage.getItem("user") || "{}");
  const grupoSetor  = document.getElementById("grupoEditSetor");
  const selectSetor = document.getElementById("editSetor");

  if (usuario.role === "gerente" || usuario.role === "admin") {
    selectSetor.innerHTML = `<option value="">Geral (sem setor)</option>` +
      setoresCache.map(s => `<option value="${s.id}">${s.nome}</option>`).join("");
    selectSetor.value = item.setor_id || "";
    grupoSetor.style.display = "";
  } else {
    grupoSetor.style.display = "none";
  }

  document.getElementById("modalEditar").classList.add("open");
};

function fecharModalEditar() {
  document.getElementById("modalEditar")?.classList.remove("open");
  produtoEditandoId = null;
}
document.getElementById("cancelarModalEditar")?.addEventListener("click", fecharModalEditar);
document.getElementById("cancelarModalEditarBtn")?.addEventListener("click", fecharModalEditar);

document.getElementById("confirmarModalEditar")?.addEventListener("click", async () => {
  if (!produtoEditandoId) return;

  const produto    = document.getElementById("editProduto").value.trim();
  const quantidade = document.getElementById("editQuantidade").value;
  const valor      = document.getElementById("editValor").value;
  const fornecedor = document.getElementById("editFornecedor").value.trim();
  const contato    = document.getElementById("editContato").value.trim();
  const unidade_medida = document.getElementById("editUnidadeMedida").value;

  if (!produto || quantidade === "") {
    showToast("Preencha produto e quantidade", "warning");
    return;
  }

  const corpo = { produto, quantidade, valor, fornecedor, contato, unidade_medida };

  const grupoSetor = document.getElementById("grupoEditSetor");
  if (grupoSetor && grupoSetor.style.display !== "none") {
    corpo.setor_id = document.getElementById("editSetor").value || null;
  }

  try {
    const res = await fetch(`${API}/produtos/${produtoEditandoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(corpo)
    });
    const data = await res.json();

    if (!res.ok) { showToast(data.erro || "Erro ao salvar", "error"); return; }

    showToast("Produto atualizado!", "success");
    fecharModalEditar();
    carregar();
  } catch (err) {
    console.error(err);
    showToast("Erro ao conectar com o servidor", "error");
  }
});

// =========================
// AÇÕES DA TABELA
// =========================
window.entrada = (id) => abrirModal("entrada", id);
window.saida   = (id) => abrirModal("saida", id);

window.remover = async (id) => {
  const confirmar = await showConfirm({
    titulo:       "Excluir produto",
    mensagem:     "Tem certeza que deseja excluir este produto?<br>Essa ação não pode ser desfeita.",
    confirmTexto: "Sim, excluir",
    cancelTexto:  "Cancelar",
    tipo:         "danger",
  });
  if (!confirmar) return;
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
const inputXML = document.getElementById("inputXML");

// Suporta tanto btnImportarXML quanto navImportarXML como gatilhos
["btnImportarXML", "navImportarXML"].forEach(function(id) {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      if (inputXML) inputXML.click();
    });
  }
});

if (inputXML) {
  inputXML.addEventListener("change", async function(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const formData = new FormData();
    formData.append("arquivo", arquivo);
    const setorImportXML = document.getElementById("setorProduto")?.value;
    if (setorImportXML) formData.append("setor_id", setorImportXML);

    showToast("Importando XML...", "info");

    try {
      const resposta = await fetch(`${API}/xml/importar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const dados = await resposta.json();
      if (!resposta.ok) { showToast(dados.erro || "Erro ao importar XML", "error"); return; }
      showToast(`XML importado! ${dados.total_produtos} produto(s) processado(s).`, "success");
      carregar();
    } catch (erro) {
      console.error(erro);
      showToast("Erro ao importar XML", "error");
    } finally {
      inputXML.value = "";
    }
  });
}

// =========================
// IMPORTAR EXCEL — com seleção de aba
// =========================
const inputExcel = document.getElementById("inputExcel");

// Guarda o arquivo e a aba escolhida entre os passos
let _excelArquivo    = null;
let _excelAbaSelecionada = null;
let _excelDadosAbas  = [];

// Abre o file picker
["btnImportarExcel", "navImportarExcel"].forEach(function(id) {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      if (inputExcel) inputExcel.click();
    });
  }
});

// Ao escolher o arquivo → chama /excel/preview
if (inputExcel) {
  inputExcel.addEventListener("change", async function(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    _excelArquivo = arquivo;
    _excelAbaSelecionada = null;

    showToast("Lendo planilha...", "info");

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const res = await fetch(`${API}/excel/preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const dados = await res.json();

      if (!res.ok) {
        showToast(dados.erro || "Erro ao ler planilha", "error");
        inputExcel.value = "";
        return;
      }

      _excelDadosAbas = dados.abas || [];

      // Se só tem 1 aba, importa direto sem abrir modal
      if (_excelDadosAbas.length === 1) {
        _excelAbaSelecionada = _excelDadosAbas[0].nome;
        await _executarImportacaoExcel();
        return;
      }

      // Várias abas → abre o modal de seleção
      _abrirModalExcel(_excelDadosAbas);

    } catch (err) {
      console.error(err);
      showToast("Erro ao ler planilha", "error");
      inputExcel.value = "";
    }
  });
}

// ── Abre o modal e popula as tabs ──────────────────────────
function _abrirModalExcel(abas) {
  const modal    = document.getElementById("modalExcel");
  const tabBar   = document.getElementById("excelTabBar");
  const preview  = document.getElementById("excelPreviewWrap");
  const info     = document.getElementById("excelAbaInfo");
  const btnOk    = document.getElementById("confirmarImportExcel");

  if (!modal) return;

  // Limpa estado anterior
  tabBar.innerHTML  = "";
  preview.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:32px;">Selecione uma aba acima para visualizar os dados</div>';
  info.textContent  = "";
  if (btnOk) btnOk.disabled = true;
  _excelAbaSelecionada = null;

  // Cria um botão-tab por aba
  abas.forEach(function(aba) {
    const btn = document.createElement("button");
    btn.className = "btn btn-ghost";
    btn.style.cssText = "font-size:12.5px; padding:6px 14px; position:relative;";
    btn.dataset.aba = aba.nome;

    const badge = aba.tem_produto
      ? '<span style="color:var(--green);margin-left:5px;font-size:11px;">✓</span>'
      : '<span style="color:var(--text-muted);margin-left:5px;font-size:11px;">—</span>';

    btn.innerHTML = aba.nome + badge;

    btn.addEventListener("click", function() {
      // Marca tab ativa
      tabBar.querySelectorAll("button").forEach(function(b) {
        b.style.background   = "";
        b.style.borderColor  = "";
        b.style.color        = "";
      });
      btn.style.background  = "var(--accent-dim)";
      btn.style.borderColor = "var(--accent)";
      btn.style.color       = "var(--accent)";

      _excelAbaSelecionada = aba.nome;

      // Habilita botão importar
      if (btnOk) {
        btnOk.disabled = !aba.tem_produto;
        btnOk.title = aba.tem_produto ? "" : "Essa aba não possui coluna de produto reconhecida";
      }

      // Info
      if (info) {
        if (aba.tem_produto) {
          info.innerHTML = 'Campos detectados: <strong style="color:var(--green)">'
            + aba.colunas_mapeadas.join(", ") + '</strong>';
        } else {
          info.innerHTML = '<span style="color:var(--warning)">⚠ Coluna de produto não detectada nessa aba</span>';
        }
      }

      // Renderiza preview
      _renderPreview(aba, preview);
    });

    tabBar.appendChild(btn);
  });

  // Seleciona automaticamente a primeira aba com produto, ou a primeira
  const sugerida = abas.find(function(a) { return a.tem_produto; }) || abas[0];
  if (sugerida) {
    const btnSugerido = tabBar.querySelector('[data-aba="' + sugerida.nome + '"]');
    if (btnSugerido) btnSugerido.click();
  }

  modal.style.display = "flex";
}

// ── Renderiza tabela de preview da aba ────────────────────
function _renderPreview(aba, container) {
  if (!aba.preview || aba.preview.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:32px;">Nenhum dado para exibir nessa aba</div>';
    return;
  }

  const header = aba.preview[0] || [];
  const rows   = aba.preview.slice(1);

  let html = '<div style="overflow-x:auto;">';
  html += '<p style="color:var(--text-muted);font-size:12px;margin-bottom:10px;">Prévia das primeiras linhas — <em>somente leitura</em></p>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:12.5px;">';

  // Cabeçalho
  html += '<thead><tr>';
  header.forEach(function(col) {
    html += '<th style="padding:8px 12px;background:var(--surface-3);color:var(--text-secondary);'
          + 'font-weight:600;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap;">'
          + _esc(col) + '</th>';
  });
  html += '</tr></thead>';

  // Linhas de dados
  html += '<tbody>';
  if (rows.length === 0) {
    html += '<tr><td colspan="' + header.length + '" style="padding:20px;color:var(--text-muted);text-align:center;">Sem dados de amostra</td></tr>';
  } else {
    rows.forEach(function(row, ri) {
      const bg = ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)";
      html += '<tr style="background:' + bg + '">';
      row.forEach(function(cel) {
        html += '<td style="padding:7px 12px;border-bottom:1px solid var(--border);color:var(--text-primary);">'
              + _esc(cel) + '</td>';
      });
      html += '</tr>';
    });
  }
  html += '</tbody></table></div>';

  container.innerHTML = html;
}

function _esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Fecha o modal ─────────────────────────────────────────
function _fecharModalExcel() {
  const modal = document.getElementById("modalExcel");
  if (modal) modal.style.display = "none";
  inputExcel.value = "";
  _excelArquivo    = null;
  _excelAbaSelecionada = null;
}

document.getElementById("fecharModalExcel") ?.addEventListener("click", _fecharModalExcel);
document.getElementById("cancelarModalExcel")?.addEventListener("click", _fecharModalExcel);

// Fecha ao clicar fora da caixa
document.getElementById("modalExcel")?.addEventListener("click", function(e) {
  if (e.target === this) _fecharModalExcel();
});

// ── Confirmar importação ───────────────────────────────────
document.getElementById("confirmarImportExcel")?.addEventListener("click", async function() {
  if (!_excelAbaSelecionada) return;
  await _executarImportacaoExcel();
});

async function _executarImportacaoExcel() {
  if (!_excelArquivo) return;

  // Fecha modal antes de importar
  const modal = document.getElementById("modalExcel");
  if (modal) modal.style.display = "none";

  showToast("Importando planilha...", "info");

  const formData = new FormData();
  formData.append("arquivo", _excelArquivo);
  if (_excelAbaSelecionada) formData.append("aba", _excelAbaSelecionada);
  const setorImportExcel = document.getElementById("setorProduto")?.value;
  if (setorImportExcel) formData.append("setor_id", setorImportExcel);

  try {
    const res = await fetch(`${API}/excel/importar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const dados = await res.json();

    if (!res.ok) {
      showToast(dados.erro || "Erro ao importar planilha", "error");
      return;
    }

    const msg = `✓ ${dados.total_importados} produto(s) importados da aba "${dados.aba}".`;
    showToast(msg, "success");

    if (dados.ignorados && dados.ignorados.length > 0) {
      console.info("Linhas ignoradas:", dados.ignorados);
    }

    carregar();

  } catch (err) {
    console.error(err);
    showToast("Erro ao importar planilha", "error");
  } finally {
    inputExcel.value  = "";
    _excelArquivo     = null;
    _excelAbaSelecionada = null;
  }
}

// =========================
// INIT
// =========================
carregar();