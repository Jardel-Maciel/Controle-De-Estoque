const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

let graficoQuantidade;
let graficoValor;
let produtosPDF = [];

// =========================
// CAPITALIZE
// =========================
function capitalizeTexto(texto) {

  if (!texto) return "-";

  return String(texto)
    .toLowerCase()
    .replace(/\b\w/g, (letra) =>
      letra.toUpperCase()
    );
}

// =========================
// DASHBOARD
// =========================
async function carregarDashboard() {

  try {

    const res = await fetch(
      `${API}/dashboard`,
      {
        headers: {
          Authorization: token
        }
      }
    );

    const dados = await res.json();

    if (!res.ok) {

      alert(
        dados.erro ||
        "Erro ao carregar dashboard"
      );

      return;
    }

    // =========================
    // CARDS
    // =========================
    document.getElementById(
      "totalProdutos"
    ).textContent =
      dados.total_produtos || 0;

    document.getElementById(
      "totalItens"
    ).textContent =
      dados.total_itens || 0;

    document.getElementById(
      "baixoEstoque"
    ).textContent =
      dados.baixo_estoque || 0;

    document.getElementById(
      "totalEstoque"
    ).textContent =
      `R$ ${(dados.valor_total || 0)
        .toFixed(2)}`;

    // =========================
    // PRODUTOS PDF
    // =========================
    preencherTabela(
      dados.produtos || []
    );

    // =========================
    // GRÁFICO QUANTIDADE
    // =========================
    const labelsQuantidade =
      dados.grafico_quantidade.map(
        (item) =>
          capitalizeTexto(
            item.produto
          )
      );

    const valoresQuantidade =
      dados.grafico_quantidade.map(
        (item) =>
          item.quantidade
      );

    // =========================
    // GRÁFICO VALOR
    // =========================
    const labelsValor =
      dados.grafico_valor.map(
        (item) =>
          capitalizeTexto(
            item.produto
          )
      );

    const valoresValor =
      dados.grafico_valor.map(
        (item) =>
          item.valor_total
      );

    // =========================
    // DESTROI ANTIGOS
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
    const ctxQtd =
      document
        .getElementById("grafico")
        .getContext("2d");

    graficoQuantidade =
      new Chart(ctxQtd, {

        type: "bar",

        data: {
          labels: labelsQuantidade,

          datasets: [{
            label: "Quantidade",

            data: valoresQuantidade,

            backgroundColor:
              "rgba(56,189,248,0.7)",

            borderRadius: 8,

            maxBarThickness: 45
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
    const ctxValor =
      document
        .getElementById(
          "graficoValor"
        )
        .getContext("2d");

    graficoValor =
      new Chart(ctxValor, {

        type: "bar",

        data: {
          labels: labelsValor,

          datasets: [{
            label: "Valor Total",

            data: valoresValor,

            backgroundColor:
              "rgba(34,197,94,0.7)",

            borderRadius: 8,

            maxBarThickness: 45
          }]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });

  } catch (err) {

    console.error(err);

    alert(
      "Erro ao carregar dashboard"
    );
  }
}

// =========================
// GERAR RELATÓRIO
// =========================
document.getElementById(
  "btnDownloadPDF"
).onclick = async () => {

  try {

    // =========================
    // MOVIMENTAÇÕES
    // =========================
    const movRes =
      await fetch(
        `${API}/movimentacoes`,
        {
          headers: {
            Authorization: token
          }
        }
      );

    const movimentacoes =
      await movRes.json();

    // =========================
    // PDF
    // =========================
    const { jsPDF } =
      window.jspdf;

    const pdf =
      new jsPDF(
        "p",
        "mm",
        "a4"
      );

    const logo =
      "/frontend/assets/logo.png";

    
    // =====================================================
// FUNÇÃO MARCA D'ÁGUA
// =====================================================
function adicionarMarcaDagua() {

  try {

    // SALVA estado atual
    pdf.saveGraphicsState();

    // transparência SOMENTE na logo
    pdf.setGState(
      new pdf.GState({ opacity: 0.08 })
    );

    pdf.addImage(
      logo,
      "PNG",
      45,
      90,
      120,
      120
    );

    // RESTAURA estado normal
    pdf.restoreGraphicsState();

  } catch (e) {

    console.log("Logo não encontrada");
  }
}

    // =====================================================
    // PÁGINA 1
    // =====================================================
    adicionarMarcaDagua();

    // HEADER
    pdf.setFillColor(
      15,
      23,
      42
    );

    pdf.rect(
      0,
      0,
      210,
      32,
      "F"
    );

    // LOGO TOPO
    try {

      pdf.addImage(
        logo,
        "PNG",
        12,
        6,
        18,
        18
      );

    } catch (e) {

      console.log(
        "Logo não encontrada"
      );
    }

    // TÍTULO
    pdf.setTextColor(
      255
    );

    pdf.setFontSize(
      22
    );

    pdf.text(
      "Relatório Semanal",
      36,
      18
    );

    pdf.setFontSize(
      10
    );

    pdf.text(
      `Gerado em: ${new Date()
        .toLocaleString()}`,
      135,
      18
    );

    // =====================================================
    // RESUMO
    // =====================================================
    pdf.setTextColor(
      20
    );

    pdf.setFontSize(
      18
    );

    pdf.text(
      "Resumo Do Estoque",
      14,
      48
    );

    const cards = [
      {
        titulo: "Produtos",
        valor:
          document
            .getElementById(
              "totalProdutos"
            )
            .textContent
      },

      {
        titulo: "Itens",
        valor:
          document
            .getElementById(
              "totalItens"
            )
            .textContent
      },

      {
        titulo: "Baixo Estoque",
        valor:
          document
            .getElementById(
              "baixoEstoque"
            )
            .textContent
      },

      {
        titulo: "Valor Total",
        valor:
          document
            .getElementById(
              "totalEstoque"
            )
            .textContent
      }
    ];

    let cardX = 14;

    cards.forEach((card) => {

      pdf.setFillColor(
        248,
        250,
        252
      );

      pdf.roundedRect(
        cardX,
        58,
        42,
        24,
        4,
        4,
        "F"
      );

      pdf.setDrawColor(
        226,
        232,
        240
      );

      pdf.roundedRect(
        cardX,
        58,
        42,
        24,
        4,
        4
      );

      pdf.setFontSize(
        9
      );

      pdf.setTextColor(
        100
      );

      pdf.text(
        card.titulo,
        cardX + 4,
        66
      );

      pdf.setFontSize(
        16
      );

      pdf.setTextColor(
        15,
        23,
        42
      );

      pdf.text(
        String(card.valor),
        cardX + 4,
        77
      );

      cardX += 48;
    });

    // =====================================================
    // TABELA PRODUTOS
    // =====================================================
    let y = 100;

    pdf.setFontSize(
      18
    );

    pdf.setTextColor(
      20
    );

    pdf.text(
      "Produtos Em Estoque",
      14,
      y
    );

    y += 12;

    // HEADER
    pdf.setFillColor(
      30,
      41,
      59
    );

    pdf.roundedRect(
      10,
      y,
      190,
      10,
      2,
      2,
      "F"
    );

    pdf.setTextColor(
      255
    );

    pdf.setFontSize(
      10
    );

    pdf.text(
      "Produto",
      16,
      y + 6
    );

    pdf.text(
      "Qtd",
      92,
      y + 6
    );

    pdf.text(
      "Valor",
      118,
      y + 6
    );

    pdf.text(
      "Total",
      148,
      y + 6
    );

    pdf.text(
      "Status",
      176,
      y + 6
    );

    y += 14;

    // PRODUTOS
    produtosPDF.forEach(
      (item, index) => {

        const total =
          item.quantidade *
          item.valor;

        const status =
          item.quantidade <= 5
            ? "Baixo"
            : "Confortável";

        // fundo zebrado
        if (
          index % 2 === 0
        ) {

          pdf.setFillColor(
            248,
            250,
            252
          );

          pdf.rect(
            10,
            y - 5,
            190,
            10,
            "F"
          );
        }

        pdf.setTextColor(
          30
        );

        pdf.setFontSize(
          9
        );

        pdf.text(
          capitalizeTexto(
            item.produto
          ),
          16,
          y
        );

        pdf.text(
          String(
            item.quantidade
          ),
          95,
          y
        );

        pdf.text(
          `R$ ${Number(
            item.valor
          ).toFixed(2)}`,
          118,
          y
        );

        pdf.text(
          `R$ ${total.toFixed(2)}`,
          148,
          y
        );

        // badge
        if (
          item.quantidade <= 5
        ) {

          pdf.setFillColor(
            239,
            68,
            68
          );

        } else {

          pdf.setFillColor(
            59,
            130,
            246
          );
        }

        pdf.roundedRect(
          170,
          y - 4,
          24,
          7,
          2,
          2,
          "F"
        );

        pdf.setTextColor(
          255
        );

        pdf.setFontSize(
          7
        );

        pdf.text(
          status,
          173,
          y
        );

        y += 11;
      }
    );

    // RODAPÉ
    pdf.setTextColor(
      120
    );

    pdf.setFontSize(
      9
    );

    pdf.text(
      "© Jardel Maciel - Sistema SaaS de Controle de Estoque",
      10,
      290
    );

    pdf.text(
      "Página 1",
      180,
      290
    );

    // =====================================================
    // PÁGINA 2
    // =====================================================
    pdf.addPage();

    adicionarMarcaDagua();

    // HEADER
    pdf.setFillColor(
      15,
      23,
      42
    );

    pdf.rect(
      0,
      0,
      210,
      32,
      "F"
    );

    try {

      pdf.addImage(
        logo,
        "PNG",
        12,
        6,
        18,
        18
      );

    } catch (e) {}

    pdf.setTextColor(
      255
    );

    pdf.setFontSize(
      22
    );

    pdf.text(
      "Histórico Semanal",
      36,
      18
    );

    pdf.setFontSize(
      10
    );

    pdf.text(
      "Últimas Movimentações Registradas",
      36,
      24
    );

    let movY = 50;

    // HEADER TABELA
    pdf.setFillColor(
      30,
      41,
      59
    );

    pdf.roundedRect(
      10,
      movY,
      190,
      10,
      2,
      2,
      "F"
    );

    pdf.setTextColor(
      255
    );

    pdf.setFontSize(
      9
    );

    pdf.text(
      "Produto",
      14,
      movY + 6
    );

    pdf.text(
      "Tipo",
      74,
      movY + 6
    );

    pdf.text(
      "Qtd",
      102,
      movY + 6
    );

    pdf.text(
      "Responsável",
      122,
      movY + 6
    );

    pdf.text(
      "Data",
      170,
      movY + 6
    );

    movY += 14;

    // MOVIMENTAÇÕES
    movimentacoes
      .slice(0, 20)
      .forEach(
        (mov, index) => {

          if (movY > 270) {

            pdf.addPage();

            adicionarMarcaDagua();

            movY = 20;
          }

          if (
            index % 2 === 0
          ) {

            pdf.setFillColor(
              248,
              250,
              252
            );

            pdf.rect(
              10,
              movY - 5,
              190,
              10,
              "F"
            );
          }

          pdf.setTextColor(
            30
          );

          pdf.setFontSize(
            8
          );

          pdf.text(
            capitalizeTexto(
              mov.produto
            ).substring(0, 24),
            14,
            movY
          );

          // badge tipo
          if (
            mov.tipo ===
            "entrada"
          ) {

            pdf.setFillColor(
              34,
              197,
              94
            );

          } else {

            pdf.setFillColor(
              239,
              68,
              68
            );
          }

          pdf.roundedRect(
            72,
            movY - 4,
            22,
            7,
            2,
            2,
            "F"
          );

          pdf.setTextColor(
            255
          );

          pdf.setFontSize(
            7
          );

          pdf.text(
            capitalizeTexto(
              mov.tipo
            ),
            75,
            movY
          );

          pdf.setTextColor(
            30
          );

          pdf.setFontSize(
            8
          );

          pdf.text(
            String(
              mov.quantidade
            ),
            104,
            movY
          );

          pdf.text(
            capitalizeTexto(
              mov.responsavel || "-"
            ).substring(0, 18),
            122,
            movY
          );

          const data =
            new Date(
              mov.data
            ).toLocaleDateString();

          pdf.text(
            data,
            170,
            movY
          );

          movY += 11;
        }
      );

    // RODAPÉ
    pdf.setTextColor(
      120
    );

    pdf.setFontSize(
      9
    );

    pdf.text(
      "© Jardel Maciel - Histórico Semanal",
      10,
      290
    );

    pdf.text(
      "Página 2",
      180,
      290
    );

    // DOWNLOAD
    pdf.save(
      "relatorio-semanal.pdf"
    );

  } catch (err) {

    console.error(err);

    alert(
      "Erro ao gerar PDF"
    );
  }
};

// =========================
// AUXILIAR
// =========================
function preencherTabela(
  produtos
) {

  produtosPDF =
    produtos;
}

// =========================
// INIT
// =========================
carregarDashboard();