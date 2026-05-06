const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

let chartInstance;

document.addEventListener("DOMContentLoaded", carregarDashboard);

async function carregarDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`, {
      headers: { Authorization: token }
    });

    if (!res.ok) {
      const erro = await res.text();
      console.error("Erro dashboard:", erro);
      return;
    }

    const data = await res.json(); // 🔥 FALTAVA ISSO

    // CARDS
    document.getElementById("totalProdutos").textContent = data.total_produtos;
    document.getElementById("totalItens").textContent = data.total_itens;
    document.getElementById("baixoEstoque").textContent = data.baixo_estoque;

    const produtos = data.produtos || [];

    // TOTAL ESTOQUE
    let total = 0;
    produtos.forEach(p => {
      total += (p.quantidade || 0) * (p.valorUnitario || 0);
    });

    document.getElementById("totalEstoque").textContent =
      "R$ " + total.toFixed(2);

    // GRÁFICO QUANTIDADE
    const ctx = document.getElementById("grafico").getContext("2d");

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: produtos.map(p => p.nome),
        datasets: [{
          label: "Quantidade",
          data: produtos.map(p => p.quantidade)
        }]
      }
    });

    // GRÁFICO VALOR
    const ctx2 = document.getElementById("graficoValor").getContext("2d");

    new Chart(ctx2, {
      type: "bar",
      data: {
        labels: produtos.map(p => p.nome),
        datasets: [{
          label: "Valor",
          data: produtos.map(p => p.valorTotal)
        }]
      }
    });

  } catch (err) {
    console.error("Erro geral:", err);
  }
}