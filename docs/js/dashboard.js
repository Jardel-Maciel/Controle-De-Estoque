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

    document.getElementById("totalProdutos").textContent =
      dados.total_produtos || 0;

    document.getElementById("totalItens").textContent =
      dados.total_itens || 0;

    document.getElementById("baixoEstoque").textContent =
      dados.baixo_estoque || 0;

    document.getElementById("totalEstoque").textContent =
      `R$ ${(dados.valor_total || 0).toFixed(2)}`;

    preencherTabela(dados.produtos || []);

    if (graficoQuantidade) graficoQuantidade.destroy();
    if (graficoValor) graficoValor.destroy();

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
    const grayBg = [248, 250, 252];
    const textDark = [30, 41, 59];

    // =========================
    // STATUS
    // =========================
    function statusCor(qtd) {
      return qtd <= 5 ? [239, 68, 68] : [34, 197, 94];
    }

    function statusTexto(qtd) {
      return qtd <= 5 ? "ESTOQUE BAIXO" : "CONFORTÁVEL";
    }

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
    // MARCA D'ÁGUA
    // =========================
    function watermark() {
      if (!logoBase64) return;

      try {
        const GState = pdf.GState || window.jspdf?.GState;
        if (GState) {
          pdf.setGState(new GState({ opacity: 0.06 }));
        }
      } catch (e) {}

      pdf.addImage(logoBase64, "PNG", 60, 100, 90, 90);
    }

    // =========================
    // PÁGINA 1 - RESUMO
    // =========================
    watermark();
    header("Relatório de Estoque", "Resumo do Sistema");

    pdf.setTextColor(...textDark);
    pdf.setFontSize(12);

    pdf.text(`Total de Produtos: ${dashboard.total_produtos || 0}`, 14, 45);
    pdf.text(`Total de Itens: ${dashboard.total_itens || 0}`, 14, 52);
    pdf.text(`Baixo Estoque: ${dashboard.baixo_estoque || 0}`, 14, 59);
    pdf.text(
      `Valor Total: R$ ${(dashboard.valor_total || 0).toFixed(2)}`,
      14,
      66
    );

    pdf.text("Lista de Produtos:", 14, 80);

    let y = 90;

    (dashboard.produtos || []).forEach((p) => {
      if (y > 270) {
        pdf.addPage();
        watermark();
        header("Relatório de Estoque");
        y = 40;
      }

      const cor = statusCor(p.quantidade || 0);

      pdf.setFillColor(...cor);
      pdf.setTextColor(255);

      pdf.roundedRect(10, y - 5, 190, 8, 2, 2, "F");

      pdf.text(
        `${p.nome || "Produto"} | Qtd: ${p.quantidade || 0} | ${statusTexto(
          p.quantidade || 0
        )}`,
        14,
        y
      );

      y += 10;
    });

    // =========================
    // PÁGINA 2 - MOVIMENTAÇÕES
    // =========================
    pdf.addPage();
    watermark();
    header("Movimentações", "Histórico de entradas e saídas");

    let y2 = 45;

    movimentacoes.forEach((mov) => {
      if (y2 > 270) {
        pdf.addPage();
        watermark();
        header("Movimentações");
        y2 = 45;
      }

      const cor = mov.tipo === "entrada" ? [34, 197, 94] : [239, 68, 68];

      pdf.setFillColor(...cor);
      pdf.setTextColor(255);

      pdf.roundedRect(10, y2 - 5, 190, 8, 2, 2, "F");

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
// AUXILIAR
// =========================
function preencherTabela(produtos) {
  produtosPDF = produtos;
}

// =========================
// INIT
// =========================
carregarDashboard();