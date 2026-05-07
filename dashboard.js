const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

let graficoQuantidade;
let graficoValor;
let produtosGlobais = [];

// =========================
// CARREGAR DASHBOARD
// =========================
async function carregarDashboard() {

  try {

    const res = await fetch(`${API}/dashboard`, {
      headers: {
        Authorization: token
      }
    });

    const dados = await res.json();

    if (!res.ok) {
      alert(dados.erro || "Erro ao carregar dashboard");
      return;
    }

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
    // SALVAR PRODUTOS
    // =========================
    produtosGlobais = dados.produtos || [];

    // =========================
    // GRÁFICO QUANTIDADE
    // =========================
    const labelsQuantidade =
      dados.grafico_quantidade.map(item => item.produto);

    const valoresQuantidade =
      dados.grafico_quantidade.map(item => item.quantidade);

    // =========================
    // GRÁFICO VALOR
    // =========================
    const labelsValor =
      dados.grafico_valor.map(item => item.produto);

    const valoresValor =
      dados.grafico_valor.map(item => item.valor_total);

    // =========================
    // DESTRUIR GRÁFICOS ANTIGOS
    // =========================
    if (graficoQuantidade) {
      graficoQuantidade.destroy();
    }

    if (graficoValor) {
      graficoValor.destroy();
    }

    // =========================
    // CHART QUANTIDADE
    // =========================
    const ctxQtd = document
      .getElementById("grafico")
      .getContext("2d");

    graficoQuantidade = new Chart(ctxQtd, {

      type: "bar",

      data: {
        labels: labelsQuantidade,

        datasets: [{
          label: "Quantidade em Estoque",

          data: valoresQuantidade,

          backgroundColor: "rgba(56,189,248,0.7)",

          borderRadius: 8,

          maxBarThickness: 45
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            labels: {
              color: "#ffffff"
            }
          }
        },

        scales: {
          x: {
            ticks: {
              color: "#ffffff"
            },

            grid: {
              color: "rgba(255,255,255,0.05)"
            }
          },

          y: {
            beginAtZero: true,

            ticks: {
              color: "#ffffff"
            },

            grid: {
              color: "rgba(255,255,255,0.05)"
            }
          }
        }
      }
    });

    // =========================
    // CHART VALOR
    // =========================
    const ctxValor = document
      .getElementById("graficoValor")
      .getContext("2d");

    graficoValor = new Chart(ctxValor, {

      type: "bar",

      data: {
        labels: labelsValor,

        datasets: [{
          label: "Valor em Estoque",

          data: valoresValor,

          backgroundColor: "rgba(34,197,94,0.7)",

          borderRadius: 8,

          maxBarThickness: 45
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            labels: {
              color: "#ffffff"
            }
          }
        },

        scales: {
          x: {
            ticks: {
              color: "#ffffff"
            },

            grid: {
              color: "rgba(255,255,255,0.05)"
            }
          },

          y: {
            beginAtZero: true,

            ticks: {
              color: "#ffffff"
            },

            grid: {
              color: "rgba(255,255,255,0.05)"
            }
          }
        }
      }
    });

  } catch (err) {

    console.error(err);

    alert("Erro ao carregar dashboard");
  }
}

// =========================
// GERAR PDF PROFISSIONAL
// =========================
document.getElementById("btnDownloadPDF").onclick = async () => {

  const botao = document.getElementById("btnDownloadPDF");

  botao.innerHTML = "Gerando PDF...";
  botao.disabled = true;

  try {

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF("p", "mm", "a4");

    // =========================
    // CABEÇALHO
    // =========================
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, 210, 30, "F");

    // =========================
    // LOGO
    // =========================
    try {

      const logo = new Image();

      logo.src = "logo.png";

      await new Promise((resolve) => {
        logo.onload = resolve;
        logo.onerror = resolve;
      });

      pdf.addImage(
        logo,
        "PNG",
        10,
        6,
        16,
        16
      );

    } catch (e) {
      console.log("Logo não encontrada");
    }

    // =========================
    // TÍTULO
    // =========================
    pdf.setTextColor(255, 255, 255);

    pdf.setFontSize(20);

    pdf.text(
      "Relatório de Estoque",
      32,
      18
    );

    pdf.setFontSize(10);

    pdf.text(
      `Gerado em: ${new Date().toLocaleString()}`,
      135,
      18
    );

    // =========================
    // CARDS
    // =========================
    const cards = [

      {
        titulo: "Produtos",
        valor: document.getElementById("totalProdutos").textContent
      },

      {
        titulo: "Itens",
        valor: document.getElementById("totalItens").textContent
      },

      {
        titulo: "Baixo Estoque",
        valor: document.getElementById("baixoEstoque").textContent
      },

      {
        titulo: "Valor Total",
        valor: document.getElementById("totalEstoque").textContent
      }
    ];

    let x = 10;

    cards.forEach(card => {

      pdf.setFillColor(30, 41, 59);

      pdf.roundedRect(
        x,
        40,
        45,
        25,
        3,
        3,
        "F"
      );

      pdf.setTextColor(180);

      pdf.setFontSize(10);

      pdf.text(
        card.titulo,
        x + 4,
        49
      );

      pdf.setTextColor(255);

      pdf.setFontSize(14);

      pdf.text(
        String(card.valor),
        x + 4,
        60
      );

      x += 48;
    });

    // =========================
    // TÍTULO TABELA
    // =========================
    pdf.setTextColor(15, 23, 42);

    pdf.setFontSize(16);

    pdf.text(
      "Produtos em Estoque",
      10,
      82
    );

    // =========================
    // HEADER TABELA
    // =========================
    pdf.setFillColor(15, 23, 42);

    pdf.rect(10, 88, 190, 10, "F");

    pdf.setTextColor(255);

    pdf.setFontSize(9);

    pdf.text("Produto", 14, 95);
    pdf.text("Qtd", 100, 95);
    pdf.text("Valor", 120, 95);
    pdf.text("Total", 150, 95);
    pdf.text("Status", 178, 95);

    // =========================
    // LINHAS PRODUTOS
    // =========================
    let y = 105;

    produtosGlobais.forEach((item, index) => {

      const total =
        Number(item.quantidade) *
        Number(item.valor);

      const estoqueBaixo =
        Number(item.quantidade) <= 5;

      // FUNDO LINHA
      if (index % 2 === 0) {

        pdf.setFillColor(241, 245, 249);

      } else {

        pdf.setFillColor(226, 232, 240);
      }

      pdf.rect(10, y - 6, 190, 10, "F");

      // TEXOS
      pdf.setTextColor(20);

      pdf.setFontSize(9);

      pdf.text(
        String(item.produto),
        14,
        y
      );

      pdf.text(
        String(item.quantidade),
        102,
        y
      );

      pdf.text(
        `R$ ${Number(item.valor).toFixed(2)}`,
        120,
        y
      );

      pdf.text(
        `R$ ${total.toFixed(2)}`,
        150,
        y
      );

      // =========================
      // STATUS
      // =========================
      if (estoqueBaixo) {

        pdf.setFillColor(239, 68, 68);

        pdf.roundedRect(
          175,
          y - 5,
          20,
          6,
          2,
          2,
          "F"
        );

        pdf.setTextColor(255);

        pdf.setFontSize(7);

        pdf.text(
          "BAIXO",
          179,
          y - 1
        );

      } else {

        pdf.setFillColor(59, 130, 246);

        pdf.roundedRect(
          170,
          y - 5,
          28,
          6,
          2,
          2,
          "F"
        );

        pdf.setTextColor(255);

        pdf.setFontSize(7);

        pdf.text(
          "CONFORTÁVEL",
          172,
          y - 1
        );
      }

      y += 10;

      // NOVA PÁGINA
      if (y > 270) {

        pdf.addPage();

        y = 20;
      }
    });

    // =========================
    // RODAPÉ
    // =========================
    pdf.setFontSize(9);

    pdf.setTextColor(120);

    pdf.text(
      "Sistema SaaS de Controle de Estoque",
      10,
      290
    );

    pdf.text(
      "Dellmaciel © 2026",
      160,
      290
    );

    // =========================
    // DOWNLOAD
    // =========================
    pdf.save("relatorio-profissional.pdf");

    botao.innerHTML = "📄 Baixar PDF";
    botao.disabled = false;

  } catch (err) {

    console.error(err);

    botao.innerHTML = "📄 Baixar PDF";
    botao.disabled = false;

    alert("Erro ao gerar PDF");
  }
};

// =========================
// INIT
// =========================
carregarDashboard();