const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

let graficoQuantidade;
let graficoValor;

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

    // DESTROI ANTIGOS
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
          label: "Quantidade",

          data: valoresQuantidade,

          backgroundColor: "rgba(56,189,248,0.7)",

          borderRadius: 8,

          maxBarThickness: 50
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false
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
          label: "Valor Total",

          data: valoresValor,

          backgroundColor: "rgba(34,197,94,0.7)",

          borderRadius: 8,

          maxBarThickness: 50
        }]
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
// GERAR PDF
// =========================
document.getElementById("btnDownloadPDF").onclick = async () => {

  const dashboard = document.querySelector(".main");

  try {

    const canvas = await html2canvas(dashboard, {
      scale: 2,
      useCORS: true
    });

    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF("p", "mm", "a4");

    const larguraPDF = 210;
    const alturaPDF = 297;

    const larguraImg = larguraPDF;
    const alturaImg =
      (canvas.height * larguraImg) / canvas.width;

    let posicaoY = 0;

    pdf.addImage(
      imgData,
      "PNG",
      0,
      posicaoY,
      larguraImg,
      alturaImg
    );

    // MULTIPÁGINAS
    let alturaRestante = alturaImg;

    while (alturaRestante > alturaPDF) {

      alturaRestante -= alturaPDF;

      posicaoY = alturaRestante - alturaImg;

      pdf.addPage();

      pdf.addImage(
        imgData,
        "PNG",
        0,
        posicaoY,
        larguraImg,
        alturaImg
      );
    }

    pdf.save("relatorio-estoque.pdf");

  } catch (err) {

    console.error(err);

    alert("Erro ao gerar PDF");
  }
};

// =========================
// INIT
// =========================
carregarDashboard();