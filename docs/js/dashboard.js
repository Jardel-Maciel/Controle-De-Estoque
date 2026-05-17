const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

if (!token) window.location.href = "index.html";

let graficoQtd   = null;
let graficoValor = null;
let dadosGlobais = null;

// =========================
// PALETA DO PROJETO (tela)
// =========================
const COR = {
  bg:        [2,   6,  23],
  surface:   [15,  23,  42],
  card:      [30,  41,  59],
  border:    [30,  41,  59],
  blue:      [56, 189, 248],
  indigo:    [99, 102, 241],
  green:     [34, 197,  94],
  red:       [239, 68,  68],
  yellow:    [250, 204,  21],
  textWhite: [226, 232, 240],
  textGray:  [148, 163, 184],
  textMuted: [100, 116, 139],
};

// =========================
// PALETA DO PDF — identidade Estoque Fácil
// Azul #38bdf8 + Teal #14b8a6 + Escuro #0f172a
// =========================
const PDF = {
  headerBg:    [15,  23,  42],   // #0f172a cabeçalho escuro
  headerText:  [226, 232, 240],  // #e2e8f0 texto do cabeçalho
  headerSub:   [148, 163, 184],  // #94a3b8 subtítulo
  accent:      [56,  189, 248],  // #38bdf8 azul (cor principal)
  teal:        [20,  184, 166],  // #14b8a6 teal (cor secundária da logo)
  indigo:      [99,  102, 241],  // #6366f1
  green:       [20,  184, 166],  // teal no lugar de verde — consistência de marca
  yellow:      [234, 179,   8],  // #eab308 amarelo mais escuro (legível no branco)
  cardBg:      [240, 249, 255],  // #f0f9ff azul bem claro (tom de marca)
  cardBorder:  [186, 230, 253],  // #bae6fd borda azul claro
  rowEven:     [240, 253, 250],  // #f0fdfa teal bem claro
  rowOdd:      [255, 255, 255],  // #ffffff linha ímpar (branco)
  tableHeader: [15,  23,  42],   // #0f172a fundo header tabela (escuro marca)
  tableHText:  [226, 232, 240],  // #e2e8f0 texto header tabela
  textDark:    [15,  23,  42],   // #0f172a texto principal
  textMid:     [71,  85, 105],   // #475569 texto secundário
  textLight:   [148, 163, 184],  // #94a3b8 texto fraco
  border:      [186, 230, 253],  // #bae6fd bordas da tabela (azul suave)
  badgeBg:     [254, 243, 199],  // #fef3c7 fundo badge amarelo claro
  badgeText:   [146,  64,  14],  // #92400e texto badge
  footerBg:    [15,  23,  42],   // #0f172a rodapé escuro (igual header)
  footerText:  [148, 163, 184],  // #94a3b8 texto rodapé
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
      window.location.href = "index.html";
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      showToast(data.erro || "Erro ao carregar dashboard", "error");
      return;
    }

    dadosGlobais = data;

    document.getElementById("totalProdutos").textContent = data.total_produtos ?? 0;
    document.getElementById("totalItens").textContent    = data.total_itens    ?? 0;
    document.getElementById("baixoEstoque").textContent  = data.baixo_estoque  ?? 0;

    const valorTotal = parseFloat(data.valor_total || 0);
    document.getElementById("totalEstoque").textContent =
      `R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

    const produtos = data.produtos || [];

    if (produtos.length === 0) {
      document.getElementById("grafico").parentElement.innerHTML =
        "<h2>Quantidade</h2><p style='color:#94a3b8;padding:20px'>Nenhum produto cadastrado.</p>";
      document.getElementById("graficoValor").parentElement.innerHTML =
        "<h2>Valor</h2><p style='color:#94a3b8;padding:20px'>Nenhum produto cadastrado.</p>";
      return;
    }

    const labels      = produtos.map(p => p.produto);
    const quantidades = produtos.map(p => p.quantidade);
    const valores     = produtos.map(p => parseFloat(p.valor || 0));

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
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0, color: "#94a3b8" }, grid: { color: "#1e293b" } },
          x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } }
        }
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
    showToast("Erro ao carregar dashboard", "error");
  }
}

// =========================
// GERAR PDF — tema claro profissional
// =========================
document.getElementById("btnDownloadPDF")?.addEventListener("click", () => {

  if (!dadosGlobais) {
    showToast("Aguarde os dados carregarem.", "warning");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W        = doc.internal.pageSize.getWidth();
  const H        = doc.internal.pageSize.getHeight();
  const agora    = new Date().toLocaleString("pt-BR");
  const dataArq  = new Date().toISOString().slice(0, 10);
  const produtos = dadosGlobais.produtos || [];

  // ----------------------------------------
  // CABEÇALHO — fundo escuro com logo + info
  // ----------------------------------------
  doc.setFillColor(...PDF.headerBg);
  doc.rect(0, 0, W, 52, "F");

  // barra accent topo — azul (cor principal da logo)
  doc.setFillColor(...PDF.accent);
  doc.rect(0, 0, W, 3, "F");

  // barra teal inferior do header — cor secundária da logo
  doc.setFillColor(...PDF.teal);
  doc.rect(0, 49, W, 3, "F");

  // LOGO — inserida no lado esquerdo do cabeçalho
  // A logo tem 879x258px (razão ≈ 3.41:1). Altura no PDF = 22mm → largura ≈ 75mm
  try {
    const logoUrl = "assets/logo_transparent.png";
    doc.addImage(logoUrl, "PNG", 10, 8, 75, 22);
  } catch (e) {
    // fallback: texto caso a logo não carregue
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF.accent);
    doc.text("Estoque", 14, 22);
    doc.setTextColor(...PDF.teal);
    doc.text(" Fácil", 47, 22);
  }

  // Info do relatório — lado direito
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF.headerSub);
  doc.text("Relatório Gerencial de Estoque", W - 14, 20, { align: "right" });
  doc.text(`Emitido em: ${agora}`, W - 14, 28, { align: "right" });

  // ----------------------------------------
  // CARDS RESUMO — fundo claro com borda colorida
  // ----------------------------------------
  const cards = [
    { label: "Total Produtos", valor: String(dadosGlobais.total_produtos ?? 0), cor: PDF.accent  },
    { label: "Total Itens",    valor: String(dadosGlobais.total_itens    ?? 0), cor: PDF.teal    },
    { label: "Baixo Estoque",  valor: String(dadosGlobais.baixo_estoque  ?? 0), cor: PDF.yellow  },
    {
      label: "Custo Total",
      valor: `R$ ${parseFloat(dadosGlobais.valor_total || 0)
        .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      cor: PDF.teal
    }
  ];

  const cardW = (W - 28 - 9) / 4;
  const cardY = 58;

  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 3);

    // fundo claro
    doc.setFillColor(...PDF.cardBg);
    doc.roundedRect(x, cardY, cardW, 24, 3, 3, "F");

    // borda colorida esquerda
    doc.setFillColor(...card.cor);
    doc.rect(x, cardY, 3, 24, "F");

    doc.setFontSize(7);
    doc.setTextColor(...PDF.textMid);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, x + 6, cardY + 9);

    doc.setFontSize(11);
    doc.setTextColor(...PDF.textDark);
    doc.setFont("helvetica", "bold");
    doc.text(card.valor, x + 6, cardY + 19);
  });

  // ----------------------------------------
  // TÍTULO SEÇÃO TABELA
  // ----------------------------------------
  let y = 92;

  doc.setFontSize(11);
  doc.setTextColor(...PDF.textDark);
  doc.setFont("helvetica", "bold");
  doc.text("Produtos em Estoque", 14, y);

  doc.setDrawColor(...PDF.accent);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, W - 14, y + 2);

  y += 10;

  // ----------------------------------------
  // TABELA
  // ----------------------------------------
  if (produtos.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...PDF.textLight);
    doc.setFont("helvetica", "normal");
    doc.text("Nenhum produto cadastrado.", 14, y + 8);
  } else {

    const cols = ["#", "Produto", "Qtd.", "Valor Unit.", "Total"];
    const colX = [14, 24, 106, 126, 162];
    const colW = W - 28;

    // header da tabela — fundo escuro, texto claro
    doc.setFillColor(...PDF.tableHeader);
    doc.rect(14, y - 5, colW, 10, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF.tableHText);
    cols.forEach((col, i) => doc.text(col, colX[i], y));

    y += 8;

    produtos.forEach((p, idx) => {

      // quebra de página
      if (y > H - 20) {
        doc.addPage();
        doc.setFillColor(...PDF.headerBg);
        doc.rect(0, 0, W, 14, "F");
        doc.setFillColor(...PDF.accent);
        doc.rect(0, 0, W, 2, "F");
        doc.setFillColor(...PDF.teal);
        doc.rect(0, 12, W, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(...PDF.headerSub);
        doc.text("Estoque Fácil — continuação", 14, 10);
        y = 22;
      }

      // zebra clara: par = cinza claro, ímpar = branco
      doc.setFillColor(...(idx % 2 === 0 ? PDF.rowEven : PDF.rowOdd));
      doc.rect(14, y - 5, colW, 9, "F");

      // borda inferior sutil
      doc.setDrawColor(...PDF.border);
      doc.setLineWidth(0.1);
      doc.line(14, y + 4, W - 14, y + 4);

      const qtd   = p.quantidade ?? 0;
      const valor = parseFloat(p.valor || 0);
      const total = qtd * valor;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PDF.textDark);

      doc.text(String(idx + 1), colX[0], y);
      doc.text(String(p.produto || "-").substring(0, 38), colX[1], y);
      doc.text(String(qtd), colX[2], y);

      // badge baixo estoque — amarelo claro com texto marrom (legível no fundo branco)
      if (qtd <= 5) {
        doc.setFillColor(...PDF.badgeBg);
        doc.roundedRect(colX[2] + 8, y - 3.5, 14, 5, 1, 1, "F");
        doc.setFontSize(5.5);
        doc.setTextColor(...PDF.badgeText);
        doc.text("! baixo", colX[2] + 9, y - 0.2);
        doc.setFontSize(8);
        doc.setTextColor(...PDF.textDark);
      }

      doc.text(
        `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        colX[3], y
      );
      doc.text(
        `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        colX[4], y
      );

      y += 9;
    });

    // linha separadora final
    doc.setDrawColor(...PDF.accent);
    doc.setLineWidth(0.4);
    doc.line(14, y, W - 14, y);

    // rodapé da tabela — total geral
    y += 7;
    const totalGeral = produtos.reduce(
      (acc, p) => acc + (p.quantidade ?? 0) * parseFloat(p.valor || 0), 0
    );

    doc.setFillColor(...PDF.tableHeader);
    doc.rect(14, y - 5, colW, 10, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF.headerSub);
    doc.text("Custo Total do Estoque", colX[3], y);

    doc.setTextColor(...PDF.accent);
    doc.text(
      `R$ ${totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      colX[4], y
    );
  }

  // ----------------------------------------
  // RODAPÉ em todas as páginas
  // ----------------------------------------
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...PDF.footerBg);
    doc.rect(0, H - 10, W, 10, "F");
    doc.setFillColor(...PDF.teal);
    doc.rect(0, H - 10, W, 1, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF.footerText);
    doc.text("Estoque Fácil — Controle Inteligente | Documento Confidencial", 14, H - 3);
    doc.text(`Página ${i} de ${totalPages}`, W - 14, H - 3, { align: "right" });
  }

  doc.save(`relatorio-estoque-${dataArq}.pdf`);
});

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", carregarDashboard);