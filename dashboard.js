chartInstance = new Chart(ctx, {
  type: "bar",
  data: {
    labels: produtos.map(p => p.nome),
    datasets: [{
      label: "Quantidade",
      data: produtos.map(p => p.quantidade),
      borderRadius: 8,
      backgroundColor: "rgba(56, 189, 248, 0.7)"
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8" }
      },
      y: {
        ticks: { color: "#94a3b8" }
      }
    }
  }
});

function animarValor(id, valorFinal) {
  let atual = 0;
  const el = document.getElementById(id);

  const intervalo = setInterval(() => {
    atual += Math.ceil(valorFinal / 20);
    if (atual >= valorFinal) {
      atual = valorFinal;
      clearInterval(intervalo);
    }
    el.textContent = atual;
  }, 30);
}

animarValor("totalProdutos", data.total_produtos);