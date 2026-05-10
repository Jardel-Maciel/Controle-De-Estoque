const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

if (!token) window.location.href = "login.html";

let graficoQtd   = null;
let graficoValor = null;
let dadosGlobais = null;

// =========================
// PALETA DO PROJETO
// =========================
const COR = {
  bg:        [2,   6,  23],   // #020617 body background
  surface:   [15,  23,  42],  // #0f172a card/header
  card:      [30,  41,  59],  // #1e293b cards
  border:    [30,  41,  59],  // #1e293b borders
  blue:      [56, 189, 248],  // #38bdf8 accent principal
  indigo:    [99, 102, 241],  // #6366f1 gráfico qtd
  green:     [34, 197,  94],  // #22c55e entrada
  red:       [239, 68,  68],  // #ef4444 saída
  yellow:    [250, 204,  21], // #facc15 warning
  textWhite: [226, 232, 240], // #e2e8f0
  textGray:  [148, 163, 184], // #94a3b8
  textMuted: [100, 116, 139], // #64748b
};

// =========================
// CARREGAR DASHBOARD
// =========================
async function carregarDashboard() {

  try {

    const res = await fetch(`${API}/dashboard`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || "Erro ao carregar dashboard");
      return;
    }

    dadosGlobais = data;

    // =========================
    // CARDS
    // =========================
    document.getElementById("totalProdutos").textContent = data.total_produtos ?? 0;
    document.getElementById("totalItens").textContent    = data.total_itens    ?? 0;
    document.getElementById("baixoEstoque").textContent  = data.baixo_estoque  ?? 0;

    const valorTotal = parseFloat(data.valor_total || 0);
    document.getElementById("totalEstoque").textContent =
      `R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

    // =========================
    // GRÁFICOS
    // =========================
    const produtos = data.produtos || [];

    if (produtos.length === 0) {
      document.getElementById("grafico").parentElement.innerHTML =
        "<h2>Quantidade</h2><p style='color:#94a3b8;padding:20px'>Nenhum produto cadastrado.</p>";
      document.getElementById("graficoValor").parentElement.innerHTML =
        "<h2>Valor</h2><p style='color:#94a3b8;padding:20px'>Nenhum produto cadastrado.</p>";
      return;
    }

    const labels     = produtos.map(p => p.produto);
    const quantidades = produtos.map(p => p.quantidade);
    const valores    = produtos.map(p => parseFloat(p.valor || 0));

    if (graficoQtd)   graficoQtd.destroy();
    if (graficoValor) graficoValor.destroy();

    graficoQtd = new Chart(document.getElementById("grafico"), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Quantidade em estoque",
          data: quantidades,
          backgroundColor: "rgba(99,102,241,0.7)",
          borderColor: "rgba(99,102,241,1)",
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0, color: "#94a3b8" }, grid: { color: "#1e293b" } },
                  x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } } }
      }
    });

    graficoValor = new Chart(document.getElementById("graficoValor"), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Valor unitário (R$)",
          data: valores,
          backgroundColor: "rgba(34,197,94,0.7)",
          borderColor: "rgba(34,197,94,1)",
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "#94a3b8",
              callback: v => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            },
            grid: { color: "#1e293b" }
          },
          x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } }
        }
      }
    });

  } catch (err) {
    console.error("Erro dashboard:", err);
    alert("Erro ao carregar dashboard");
  }
}

// =========================
// GERAR PDF PROFISSIONAL
// =========================
document.getElementById("btnDownloadPDF")?.addEventListener("click", () => {

  if (!dadosGlobais) {
    alert("Aguarde os dados carregarem.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W     = doc.internal.pageSize.getWidth();
  const H     = doc.internal.pageSize.getHeight();
  const agora = new Date().toLocaleString("pt-BR");
  const data  = new Date().toISOString().slice(0, 10);
  const produtos = dadosGlobais.produtos || [];

  // ----------------------------------------
  // CABEÇALHO — #0f172a com accent #38bdf8
  // ----------------------------------------
  doc.setFillColor(...COR.surface);
  doc.rect(0, 0, W, 44, "F");

  // barra accent topo
  doc.setFillColor(...COR.blue);
  doc.rect(0, 0, W, 3, "F");

  doc.setFontSize(20);
  doc.setTextColor(...COR.textWhite);
  doc.setFont("helvetica", "bold");
  doc.text("Controle de Estoque", 14, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COR.textGray);
  doc.text("Relatório Gerencial de Estoque", 14, 28);
  doc.text(`Emitido em: ${agora}`, 14, 35);

  // ----------------------------------------
  // CARDS RESUMO — #1e293b com borda colorida
  // ----------------------------------------
  const cards = [
    { label: "Total Produtos", valor: String(dadosGlobais.total_produtos ?? 0), cor: COR.blue   },
    { label: "Total Itens",    valor: String(dadosGlobais.total_itens    ?? 0), cor: COR.indigo },
    { label: "Baixo Estoque",  valor: String(dadosGlobais.baixo_estoque  ?? 0), cor: COR.yellow },
    {
      label: "Custo Total",
      valor: `R$ ${parseFloat(dadosGlobais.valor_total || 0)
        .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      cor: COR.green
    }
  ];

  const cardW = (W - 28 - 9) / 4;
  const cardY = 50;

  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 3);

    doc.setFillColor(...COR.card);
    doc.roundedRect(x, cardY, cardW, 24, 3, 3, "F");

    // borda esquerda colorida (igual ao .card.warning do CSS)
    doc.setFillColor(...card.cor);
    doc.rect(x, cardY, 3, 24, "F");

    doc.setFontSize(7);
    doc.setTextColor(...COR.textGray);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, x + 6, cardY + 9);

    doc.setFontSize(10);
    doc.setTextColor(...COR.textWhite);
    doc.setFont("helvetica", "bold");
    doc.text(card.valor, x + 6, cardY + 19);
  });

  // ----------------------------------------
  // TÍTULO SEÇÃO TABELA
  // ----------------------------------------
  let y = 84;

  doc.setFontSize(11);
  doc.setTextColor(...COR.textWhite);
  doc.setFont("helvetica", "bold");
  doc.text("Produtos em Estoque", 14, y);

  // linha accent #38bdf8
  doc.setDrawColor(...COR.blue);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, W - 14, y + 2);

  y += 10;

  // ----------------------------------------
  // TABELA
  // ----------------------------------------
  if (produtos.length === 0) {

    doc.setFontSize(9);
    doc.setTextColor(...COR.textGray);
    doc.setFont("helvetica", "normal");
    doc.text("Nenhum produto cadastrado.", 14, y + 8);

  } else {

    const cols   = ["#", "Produto", "Qtd.", "Valor Unit.", "Total"];
    const colX   = [14, 24, 106, 126, 162];
    const colW   = W - 28;

    // header tabela — #0f172a
    doc.setFillColor(...COR.surface);
    doc.rect(14, y - 5, colW, 10, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COR.blue);
    cols.forEach((col, i) => doc.text(col, colX[i], y));

    y += 8;

    produtos.forEach((p, idx) => {

      if (y > H - 20) {
        doc.addPage();
        // mini cabeçalho continuação
        doc.setFillColor(...COR.surface);
        doc.rect(0, 0, W, 12, "F");
        doc.setFillColor(...COR.blue);
        doc.rect(0, 0, W, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(...COR.textGray);
        doc.text("Controle de Estoque — continuação", 14, 9);
        y = 20;
      }

      // zebra — linhas pares usam #1e293b, ímpares ficam transparentes
      if (idx % 2 === 0) {
        doc.setFillColor(...COR.card);
        doc.rect(14, y - 5, colW, 9, "F");
      }

      const qtd   = p.quantidade ?? 0;
      const valor = parseFloat(p.valor || 0);
      const total = qtd * valor;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COR.textWhite);

      doc.text(String(idx + 1), colX[0], y);
      doc.text(String(p.produto || "-").substring(0, 38), colX[1], y);
      doc.text(String(qtd), colX[2], y);
      doc.text(
        `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        colX[3], y
      );
      doc.text(
        `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        colX[4], y
      );

      // badge baixo estoque — cor #facc15 igual ao .card.warning
      if (qtd <= 5) {
        doc.setFillColor(...COR.yellow);
        doc.roundedRect(colX[2] + 6, y - 4, 14, 5, 1, 1, "F");
        doc.setFontSize(5.5);
        doc.setTextColor(...COR.surface);
        doc.text("⚠ baixo", colX[2] + 7.5, y - 0.5);
        doc.setFontSize(8);
        doc.setTextColor(...COR.textWhite);
      }

      y += 9;
    });

    // linha separadora final — #38bdf8
    doc.setDrawColor(...COR.blue);
    doc.setLineWidth(0.3);
    doc.line(14, y, W - 14, y);

    // total geral
    y += 7;
    const totalGeral = produtos.reduce(
      (acc, p) => acc + (p.quantidade ?? 0) * parseFloat(p.valor || 0), 0
    );

    doc.setFillColor(...COR.surface);
    doc.rect(14, y - 5, colW, 10, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COR.textGray);
    doc.text("Custo Total do Estoque:", colX[3], y);

    doc.setTextColor(...COR.blue);
    doc.text(
      `R$ ${totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      colX[4], y
    );
  }

  // ----------------------------------------
  // RODAPÉ — #0f172a em todas as páginas
  // ----------------------------------------
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...COR.surface);
    doc.rect(0, H - 10, W, 10, "F");
    doc.setFillColor(...COR.blue);
    doc.rect(0, H - 10, W, 1, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COR.textMuted);
    doc.text("Controle de Estoque — Documento Confidencial", 14, H - 3);
    doc.text(`Página ${i} de ${totalPages}`, W - 28, H - 3);
  }

  doc.save(`relatorio-estoque-${data}.pdf`);
});

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", carregarDashboard);