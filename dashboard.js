document.addEventListener("DOMContentLoaded", () => {
  const API = "https://backend-estoque-fnfc.onrender.com";
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  let chartInstance = null;
  let lastHash = "";

  async function carregarDashboard() {
    try {
      const res = await fetch(`${API}/dashboard`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) return;

      // 🔥 cria "assinatura" dos dados
      const newHash = JSON.stringify(data.produtos);

      // ⚠️ se não mudou, não faz nada
      if (newHash === lastHash) {
        console.log("Sem mudanças no estoque");
        return;
      }

      lastHash = newHash;

      console.log("Atualizando dashboard (novos dados)");

      // 📊 métricas
      document.getElementById("totalProdutos").textContent =
        data.total_produtos ?? 0;

      document.getElementById("totalItens").textContent =
        data.total_itens ?? 0;

      document.getElementById("baixoEstoque").textContent =
        data.baixo_estoque ?? 0;

      // 📈 gráfico
      atualizarGrafico(data.produtos || []);

    } catch (err) {
      console.error("Erro:", err);
    }
  }

  function atualizarGrafico(produtos) {
    const ctx = document.getElementById("grafico");

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: produtos.map(p => p.nome),
        datasets: [{
          label: "Quantidade",
          data: produtos.map(p => p.quantidade),
          backgroundColor: "#38bdf8"
        }]
      }
    });
  }

  // 🔄 verifica mudanças a cada 5s (mas só atualiza se mudou)
  setInterval(carregarDashboard, 5000);

  carregarDashboard();
});