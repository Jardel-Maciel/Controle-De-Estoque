document.addEventListener("DOMContentLoaded", async () => {
  const API = "https://backend-estoque-fnfc.onrender.com";
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API}/dashboard`, {
      headers: { Authorization: token }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro);
      return;
    }

    // métricas
    document.getElementById("totalProdutos").textContent = data.total_produtos;
    document.getElementById("totalItens").textContent = data.total_itens;
    document.getElementById("baixoEstoque").textContent = data.baixo_estoque;

    // gráfico
    criarGrafico(data.produtos);

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar dashboard");
  }
});

function criarGrafico(produtos) {
  const ctx = document.getElementById("grafico");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: produtos.map(p => p.nome),
      datasets: [{
        label: "Quantidade",
        data: produtos.map(p => p.quantidade)
      }]
    }
  });
}