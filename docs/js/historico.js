const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "index.html";
  throw new Error("Sem token");
}

let dadosCache = [];
let graficoDonut = null;
let periodoAtivo = "todos"; // "todos" | "30" | "7"

// Paleta de cores para o gráfico
const PALETA = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#a855f7", "#ec4899",
  "#14b8a6", "#84cc16", "#f43f5e", "#3b82f6",
];

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
    renderizarAnalytics(dadosCache, periodoAtivo);

  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar histórico", "error");
  }
}

// =========================
// FILTRAR POR PERÍODO
// =========================
function filtrarPorPeriodo(dados, periodo) {
  if (periodo === "todos") return dados;
  const dias = parseInt(periodo);
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  return dados.filter(item => item.data && new Date(item.data) >= limite);
}

// =========================
// RENDERIZAR ANALYTICS
// =========================
function renderizarAnalytics(todos, periodo) {
  const dados = filtrarPorPeriodo(todos, periodo);

  const saidas   = dados.filter(d => d.tipo === "saida");
  const entradas = dados.filter(d => d.tipo === "entrada");

  // ── Stat cards ──
  const totalSaidas   = saidas.reduce((s, d) => s + Number(d.quantidade || 0), 0);
  const totalEntradas = entradas.reduce((s, d) => s + Number(d.quantidade || 0), 0);

  document.getElementById("statTotalSaidas").textContent   = totalSaidas;
  document.getElementById("statTotalEntradas").textContent = totalEntradas;

  // ── Agrupamento de saídas por produto ──
  const mapa = {};
  saidas.forEach(d => {
    const nome = (d.produto || "Desconhecido").toLowerCase();
    mapa[nome] = (mapa[nome] || 0) + Number(d.quantidade || 0);
  });

  const ranking = Object.entries(mapa)
    .map(([produto, qtd]) => ({ produto, qtd }))
    .sort((a, b) => b.qtd - a.qtd);

  // Top produto
  const topEl = document.getElementById("statTopProduto");
  if (ranking.length > 0) {
    topEl.textContent = ranking[0].produto.charAt(0).toUpperCase() + ranking[0].produto.slice(1);
  } else {
    topEl.textContent = "—";
  }

  // ── Donut ──
  renderizarDonut(ranking, totalSaidas);

  // ── Ranking ──
  renderizarRanking(ranking);
}

// =========================
// DONUT CHART
// =========================
function renderizarDonut(ranking, total) {
  document.getElementById("donutTotal").textContent = total;

  const wrap = document.getElementById("wrapDonut");

  if (ranking.length === 0) {
    if (graficoDonut) { graficoDonut.destroy(); graficoDonut = null; }
    wrap.innerHTML = `
      <div class="chart-empty">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 7.07 17.07"/>
        </svg>
        Nenhuma saída registrada
      </div>`;
    return;
  }

  // Garante que o canvas existe
  if (!document.getElementById("graficoDonut")) {
    wrap.innerHTML = `
      <canvas id="graficoDonut"></canvas>
      <div class="donut-center" id="donutCenter">
        <div class="donut-center-value" id="donutTotal">${total}</div>
        <div class="donut-center-label">saídas</div>
      </div>`;
    document.getElementById("donutTotal").textContent = total;
  }

  // Pega top 10, agrupa o resto em "Outros"
  const top     = ranking.slice(0, 10);
  const resto   = ranking.slice(10).reduce((s, r) => s + r.qtd, 0);
  const labels  = top.map(r => r.produto.charAt(0).toUpperCase() + r.produto.slice(1));
  const values  = top.map(r => r.qtd);
  const colors  = top.map((_, i) => PALETA[i % PALETA.length]);

  if (resto > 0) {
    labels.push("Outros");
    values.push(resto);
    colors.push("#3D5A80");
  }

  const ctx = document.getElementById("graficoDonut").getContext("2d");

  if (graficoDonut) graficoDonut.destroy();

  graficoDonut = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: "#0A1D3D",
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#8BA6CC",
            font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 3,
            padding: 12,
            usePointStyle: true,
            pointStyle: "circle",
          }
        },
        tooltip: {
          backgroundColor: "#0d2348",
          borderColor: "rgba(22,119,255,0.25)",
          borderWidth: 1,
          titleColor: "#F0F6FF",
          bodyColor: "#8BA6CC",
          padding: 12,
          callbacks: {
            label: function(ctx) {
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return `  ${ctx.parsed} unidades (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// =========================
// RANKING LIST
// =========================
function renderizarRanking(ranking) {
  const lista = document.getElementById("rankingLista");
  const badge = document.getElementById("rankingTotal");

  const top = ranking.slice(0, 8);
  badge.textContent = `${ranking.length} produto${ranking.length !== 1 ? "s" : ""}`;

  if (top.length === 0) {
    lista.innerHTML = `
      <div class="chart-empty">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        Nenhuma saída no período
      </div>`;
    return;
  }

  const max = top[0].qtd;

  lista.innerHTML = top.map((item, i) => {
    const pct = max > 0 ? (item.qtd / max * 100).toFixed(0) : 0;
    const cor = PALETA[i % PALETA.length];

    let posClass = "other";
    if (i === 0) posClass = "gold";
    else if (i === 1) posClass = "silver";
    else if (i === 2) posClass = "bronze";

    const nome = item.produto.charAt(0).toUpperCase() + item.produto.slice(1);

    return `
      <div class="ranking-item">
        <div class="ranking-pos ${posClass}">${i + 1}</div>
        <div class="ranking-dot" style="background:${cor}"></div>
        <div class="ranking-info">
          <div class="ranking-name" title="${nome}">${nome}</div>
          <div class="ranking-bar-wrap">
            <div class="ranking-bar" style="width:${pct}%;background:${cor}"></div>
          </div>
        </div>
        <div class="ranking-value">${item.qtd}</div>
      </div>`;
  }).join("");
}

// =========================
// FILTROS DE PERÍODO
// =========================
document.querySelectorAll(".filter-chip[data-periodo]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-chip[data-periodo]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    periodoAtivo = btn.dataset.periodo;
    renderizarAnalytics(dadosCache, periodoAtivo);
  });
});

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
      <td>${item.responsavel || "—"}</td>
      <td>${item.comentario || "—"}</td>
      <td>${item.data ? new Date(item.data).toLocaleString("pt-BR") : "—"}</td>`;
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
      (item.comentario  || "").toLowerCase().includes(termo)
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
      doc.text(String(item.produto || "—").substring(0, 22), colX[0], y);
      doc.text(String(item.tipo || "—").toUpperCase(), colX[1], y);
      doc.text(String(item.quantidade ?? "—"), colX[2], y);
      doc.text(String(item.responsavel || "—").substring(0, 18), colX[3], y);
      doc.text(String(item.comentario  || "—").substring(0, 22), colX[4], y);
      doc.text(item.data ? new Date(item.data).toLocaleString("pt-BR") : "—", colX[5], y);
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
