const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

let graficoQuantidade;
let graficoValor;
let produtosPDF = [];
let logoBase64 = null;
let dashboard = {};

// =========================
// LOGO
// =========================
async function carregarLogo() {
  try {
    const res = await fetch("assets/logo.png");

    if (!res.ok) throw new Error("Logo não encontrada");

    const blob = await res.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result;
        resolve();
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Logo não carregada");
    logoBase64 = null;
  }
}

// =========================
// CAPITALIZE
// =========================
function capitalizeTexto(texto) {
  if (!texto) return "-";

  return String(texto)
    .toLowerCase()
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

// =========================
// DASHBOARD
// =========================
async function carregarDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const dados = await res.json();

    if (!res.ok) {
      alert(dados.erro || "Erro ao carregar dashboard");
      return;
    }

    dashboard = dados;

    // =========================
    // CARDS
    // =========================
    document.getElementById("totalProdutos").textContent =
      dados.total_produtos || 0;

    document.getElementById("totalItens").textContent =
      dados.total_itens || 0;

    document.getElementById("baixoEstoque").textContent =
      dados.baixo_estoque || 0;

    document.getElementById("totalEstoque").textContent =
      `R$ ${(dados.valor_total || 0).toFixed(2)}`;

    // =========================
    // DADOS PARA PDF
    // =========================
    produtosPDF = dados.produtos || [];

    // =========================
    // GRÁFICO QUANTIDADE
    // =========================
    if (graficoQuantidade) graficoQuantidade.destroy();

    const ctxQtd = document.getElementById("grafico").getContext("2d");

    graficoQuantidade = new Chart(ctxQtd, {
      type: "bar",
      data: {
        labels: (dados.grafico_quantidade || []).map((i) =>
          capitalizeTexto(i.produto)
        ),
        datasets: [
          {
            label: "Quantidade",
            data: (dados.grafico_quantidade || []).map((i) => i.quantidade),
            backgroundColor: "rgba(56,189,248,0.7)",
            borderRadius: 8,
            maxBarThickness: 45
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    // =========================
    // GRÁFICO VALOR
    // =========================
    if (graficoValor) graficoValor.destroy();

    const ctxValor = document
      .getElementById("graficoValor")
      .getContext("2d");

    graficoValor = new Chart(ctxValor, {
      type: "bar",
      data: {
        labels: (dados.grafico_valor || []).map((i) =>
          capitalizeTexto(i.produto)
        ),
        datasets: [
          {
            label: "Valor Total",
            data: (dados.grafico_valor || []).map((i) => i.valor_total),
            backgroundColor: "rgba(34,197,94,0.7)",
            borderRadius: 8,
            maxBarThickness: 45
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar dashboard");
  }
}

// =========================
// BOTÃO PDF
// =========================
document.getElementById("btnDownloadPDF").onclick = async () => {
  try {
    await carregarLogo();

    const movRes = await fetch(`${API}/movimentacoes`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await movRes.json();

    const movimentacoes = Array.isArray(data)
      ? data
      : (data && data.movimentacoes ? data.movimentacoes : []);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    const primary = [15, 23, 42];

    // =========================
    // HEADER
    // =========================
    function header(title, subtitle = "") {
      pdf.setFillColor(...primary);
      pdf.rect(0, 0, 210, 32, "F");

      if (logoBase64) {
        pdf.addImage(logoBase64, "PNG", 13, 7, 16, 16);
      }

      pdf.setTextColor(255);
      pdf.setFontSize(16);
      pdf.text(title, 36, 18);

      if (subtitle) {
        pdf.setFontSize(9);
        pdf.text(subtitle, 36, 25);
      }
    }

    // =========================
// PÁGINA 1 - CAPA PROFISSIONAL
// =========================
header("RELATÓRIO DE ESTOQUE", "Visão geral do sistema");

const dataAtual = new Date().toLocaleString();

pdf.setTextColor(120);
pdf.setFontSize(9);
pdf.text(`Gerado em: ${dataAtual}`, 14, 40);

// =========================
// GRID DE KPIs (SAAS STYLE)
// =========================
const cards = [
  {
    label: "Produtos",
    value: dashboard.total_produtos || 0
  },
  {
    label: "Itens",
    value: dashboard.total_itens || 0
  },
  {
    label: "Baixo Estoque",
    value: dashboard.baixo_estoque || 0
  },
  {
    label: "Valor Total",
    value: `R$ ${(dashboard.valor_total || 0).toFixed(2)}`
  }
];

let x = 14;
let y = 55;

cards.forEach((c, i) => {
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(x, y, 45, 22, 3, 3, "F");

  pdf.setTextColor(100);
  pdf.setFontSize(8);
  pdf.text(c.label, x + 4, y + 8);

  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(12);
  pdf.text(String(c.value), x + 4, y + 16);

  x += 48;

  if ((i + 1) % 4 === 0) {
    x = 14;
    y += 28;
  }
});

// =========================
// TABELA PROFISSIONAL
// =========================
pdf.setFontSize(12);
pdf.setTextColor(20);
pdf.text("Produtos em Estoque", 14, 110);

let yTable = 120;

// HEADER TABELA
pdf.setFillColor(15, 23, 42);
pdf.rect(10, yTable, 190, 10, "F");

pdf.setTextColor(255);
pdf.setFontSize(9);

pdf.text("Produto", 14, yTable + 7);
pdf.text("Qtd", 90, yTable + 7);
pdf.text("Valor", 120, yTable + 7);
pdf.text("Status", 160, yTable + 7);

yTable += 14;

// LINHAS
(dashboard.produtos || []).forEach((p, index) => {

  if (yTable > 270) {
    pdf.addPage();
    header("RELATÓRIO DE ESTOQUE");
    yTable = 40;
  }

  const total = p.quantidade * p.valor;
  const baixo = p.quantidade <= 5;

  if (index % 2 === 0) {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(10, yTable - 5, 190, 8, "F");
  }

  pdf.setTextColor(30);
  pdf.setFontSize(8);

  pdf.text(p.produto || "-", 14, yTable);
  pdf.text(String(p.quantidade || 0), 90, yTable);
  pdf.text(`R$ ${Number(p.valor || 0).toFixed(2)}`, 120, yTable);

  // STATUS BADGE
  if (baixo) {
    pdf.setFillColor(239, 68, 68);
  } else {
    pdf.setFillColor(34, 197, 94);
  }

  pdf.roundedRect(160, yTable - 4, 30, 6, 2, 2, "F");

  pdf.setTextColor(255);
  pdf.text(baixo ? "BAIXO" : "OK", 168, yTable);

  yTable += 10;
});

    // =========================
    // PÁGINA 2 - MOVIMENTAÇÕES
    // =========================
    pdf.addPage();
    header("Movimentações", "Histórico");

    let y2 = 45;

    movimentacoes.forEach((mov) => {
      if (y2 > 270) {
        pdf.addPage();
        header("Movimentações");
        y2 = 45;
      }

      pdf.text(
        `${mov.produto || "-"} | ${mov.tipo || "-"} | Qtd: ${mov.quantidade || 0}`,
        14,
        y2
      );

      y2 += 10;
    });

    pdf.save("relatorio.pdf");

  } catch (err) {
    console.error(err);
    alert("Erro ao gerar PDF");
  }
};

// =========================
// INIT
// =========================
carregarDashboard();