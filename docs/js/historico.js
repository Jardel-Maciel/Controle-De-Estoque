const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "index.html";
  throw new Error("Sem token");
}

let dadosCache = [];

// =========================
// CARREGAR HISTÓRICO
// =========================
async function carregarHistorico() {
  const tbody = document.getElementById("listaHistorico");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Carregando...</p></div></td></tr>`;

  try {
    const res = await fetch(`${API}/movimentacoes`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "index.html";
      return;
    }

    const dados = await res.json();

    if (!res.ok) {
      showToast(dados.erro || "Erro ao carregar histórico", "error");
      return;
    }

    dadosCache = Array.isArray(dados) ? dados : [];
    preencherTabela(dadosCache);

  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar histórico", "error");
  }
}

// =========================
// PREENCHER TABELA
// =========================
function preencherTabela(lista) {
  const tbody = document.getElementById("listaHistorico");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <p>Nenhuma movimentação registrada</p>
        </div>
      </td></tr>`;
    return;
  }

  lista.forEach(item => {
    const tr = document.createElement("tr");
    const badge = item.tipo === "entrada"
      ? `<span class="badge badge-success">Entrada</span>`
      : `<span class="badge badge-danger">Saída</span>`;

    tr.innerHTML = `
      <td style="text-transform:capitalize">${item.produto}</td>
      <td>${badge}</td>
      <td>${item.quantidade}</td>
      <td>${item.responsavel || "-"}</td>
      <td>${item.comentario || "-"}</td>
      <td>${item.data ? new Date(item.data).toLocaleString("pt-BR") : "-"}</td>`;
    tbody.appendChild(tr);
  });
}

// =========================
// PESQUISA
// =========================
const campoPesquisa = document.getElementById("pesquisaProduto");
if (campoPesquisa) {
  campoPesquisa.addEventListener("input", function () {
    const termo = this.value.toLowerCase();
    const filtrado = dadosCache.filter(item =>
      item.produto.toLowerCase().includes(termo) ||
      (item.responsavel || "").toLowerCase().includes(termo) ||
      (item.comentario || "").toLowerCase().includes(termo)
    );
    preencherTabela(filtrado);
  });
}

// =========================
// EXPORTAR PDF
// =========================
const btnPDF = document.getElementById("btnExportarPDF");
if (btnPDF) {
  btnPDF.addEventListener("click", () => {
    if (!dadosCache.length) {
      showToast("Nenhum dado para exportar", "warning");
      return;
    }

    if (!window.jspdf) {
      showToast("Biblioteca PDF não carregada", "error");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const agora = new Date().toLocaleString("pt-BR");
    const data  = new Date().toISOString().slice(0, 10);

    // Cabeçalho
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 30, "F");
    doc.setFillColor(56, 189, 248);
    doc.rect(0, 0, W, 3, "F");
    doc.setFontSize(16);
    doc.setTextColor(226, 232, 240);
    doc.setFont("helvetica", "bold");
    doc.text("Histórico de Movimentações", 14, 16);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Emitido em: ${agora}`, 14, 24);

    // Tabela
    const cols = ["Produto", "Tipo", "Qtd.", "Responsável", "Comentário", "Data"];
    const colX = [14, 70, 100, 120, 170, 220];
    let y = 42;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y - 6, W - 28, 10, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(56, 189, 248);
    cols.forEach((col, i) => doc.text(col, colX[i], y));
    y += 8;

    dadosCache.forEach((item, idx) => {
      if (y > H - 15) {
        doc.addPage();
        y = 20;
      }
      if (idx % 2 === 0) {
        doc.setFillColor(30, 41, 59);
        doc.rect(14, y - 5, W - 28, 9, "F");
      }
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(226, 232, 240);
      doc.text(String(item.produto || "-").substring(0, 22), colX[0], y);
      doc.text(String(item.tipo || "-").toUpperCase(), colX[1], y);
      doc.text(String(item.quantidade ?? "-"), colX[2], y);
      doc.text(String(item.responsavel || "-").substring(0, 18), colX[3], y);
      doc.text(String(item.comentario || "-").substring(0, 22), colX[4], y);
      doc.text(item.data ? new Date(item.data).toLocaleString("pt-BR") : "-", colX[5], y);
      y += 9;
    });

    // Rodapé
    doc.setFillColor(15, 23, 42);
    doc.rect(0, H - 10, W, 10, "F");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Controle de Estoque", 14, H - 3);
    doc.text(`Total: ${dadosCache.length} registros`, W - 40, H - 3);

    doc.save(`historico-${data}.pdf`);
  });
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
// INIT
// =========================
carregarHistorico();