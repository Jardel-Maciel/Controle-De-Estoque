const API = "https://backend-estoque-fnfc.onrender.com";

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

let graficoQtd   = null;
let graficoValor = null;

// =========================
// CARREGAR DASHBOARD
// =========================
async function carregarDashboard() {

  try {

    const res = await fetch(`${API}/dashboard`, {
      method: "GET",
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
        "<h2>Quantidade</h2><p style='color:#888'>Nenhum produto cadastrado.</p>";
      document.getElementById("graficoValor").parentElement.innerHTML =
        "<h2>Valor</h2><p style='color:#888'>Nenhum produto cadastrado.</p>";
      return;
    }

    const labels     = produtos.map(p => p.produto);
    const quantidades = produtos.map(p => p.quantidade);
    const valores    = produtos.map(p => parseFloat(p.valor || 0));

    // Destrói gráficos anteriores se existirem
    if (graficoQtd)   graficoQtd.destroy();
    if (graficoValor) graficoValor.destroy();

    // =========================
    // GRÁFICO QUANTIDADE
    // =========================
    graficoQtd = new Chart(
      document.getElementById("grafico"),
      {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Quantidade em estoque",
            data: quantidades,
            backgroundColor: "rgba(99, 102, 241, 0.7)",
            borderColor: "rgba(99, 102, 241, 1)",
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      }
    );

    // =========================
    // GRÁFICO VALOR
    // =========================
    graficoValor = new Chart(
      document.getElementById("graficoValor"),
      {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Valor unitário (R$)",
            data: valores,
            backgroundColor: "rgba(16, 185, 129, 0.7)",
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: v => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              }
            }
          }
        }
      }
    );

  } catch (err) {
    console.error("Erro dashboard:", err);
    alert("Erro ao carregar dashboard");
  }
}

// =========================
// DOWNLOAD PDF
// =========================
document.getElementById("btnDownloadPDF")?.addEventListener("click", () => {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Relatório de Estoque", 14, 20);

  doc.setFontSize(12);
  doc.text(`Total de Produtos: ${document.getElementById("totalProdutos").textContent}`, 14, 35);
  doc.text(`Total de Itens:    ${document.getElementById("totalItens").textContent}`,    14, 45);
  doc.text(`Baixo Estoque:     ${document.getElementById("baixoEstoque").textContent}`,  14, 55);
  doc.text(`Custo Total:       ${document.getElementById("totalEstoque").textContent}`,  14, 65);

  doc.save("relatorio-estoque.pdf");
});

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", carregarDashboard);