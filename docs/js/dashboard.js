const API = "https://backend-estoque-fnfc.onrender.com";

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

async function carregarDashboard() {

  try {

    const res = await fetch(`${API}/dashboard`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      alert(data.erro || "Erro dashboard");
      return;
    }

    document.getElementById("totalProdutos").textContent = data.total_produtos;
    document.getElementById("totalItens").textContent = data.total_itens;
    document.getElementById("baixoEstoque").textContent = data.baixo_estoque;
    document.getElementById("totalEstoque").textContent = `R$ ${data.valor_total}`;

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar dashboard");
  }
}

document.addEventListener("DOMContentLoaded", carregarDashboard);