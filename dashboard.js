const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

let chartInstance;

document.addEventListener("DOMContentLoaded", carregarDashboard);

async function carregarDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`, {
      headers: {
        Authorization: token,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(data);
      return;
    }

    // =====================
    // CARDS (quantidade)
    // =====================
    animarValor("totalProdutos", data.total_produtos);
    animarValor("totalItens", data.total_itens);
    animarValor("baixoEstoque", data.baixo_estoque);

    // =====================
    // PRODUTOS
    // =====================
    const produtos = Array.isArray(data.produtos) ? data.produtos : [];

    // =====================
    // 💰 CUSTO TOTAL DO ESTOQUE (CORRIGIDO)
    // =====================
    let totalEstoque = 0;

    produtos.forEach((p) => {
      const quantidade = Number(p.quantidade) || 0;

      const valorUnitario = Number(
        p.valorUnitario ?? p.preco ?? p.valor ?? p.custo ?? 0,
      );

      totalEstoque += quantidade * valorUnitario;
    });

    const canvasValor = document.getElementById("graficoValor");

    if (canvasValor) {
      const ctx2 = canvasValor.getContext("2d");

      new Chart(ctx2, {
        type: "bar",
        data: {
          labels: produtos.map((p) => p.nome),
          datasets: [
            {
              label: "Valor em Estoque",
              data: produtos.map((p) => p.valorTotal),
              backgroundColor: "rgba(34, 197, 94, 0.7)",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
            y: { ticks: { color: "#94a3b8" } },
          },
        },
      });
    }

    const elEstoque = document.getElementById("totalEstoque");

    if (elEstoque) {
      elEstoque.textContent = `R$ ${totalEstoque.toFixed(2)}`;
    }

    // =====================
    // GRÁFICO
    // =====================
    const canvas = document.getElementById("grafico");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: produtos.map((p) => p.nome),
        datasets: [
          {
            label: "Quantidade",
            data: produtos.map((p) => p.quantidade),
            borderRadius: 6,
            backgroundColor: "rgba(56, 189, 248, 0.7)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8" },
            grid: { display: false },
          },
          y: {
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(148,163,184,0.1)" },
          },
        },
      },
    });
  } catch (err) {
    console.error("Erro dashboard:", err);
  }
}

// =====================
// ANIMAÇÃO (corrigida para evitar bugs com dinheiro)
// =====================
function animarValor(id, valorFinal) {
  let atual = 0;
  const el = document.getElementById(id);

  if (!el) return;

  const final = Number(valorFinal) || 0;
  const incremento = Math.max(1, Math.ceil(final / 20));

  const intervalo = setInterval(() => {
    atual += incremento;

    if (atual >= final) {
      atual = final;
      clearInterval(intervalo);
    }

    el.textContent = atual;
  }, 30);
}
