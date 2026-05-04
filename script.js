document.addEventListener("DOMContentLoaded", () => {
  const API = "https://backend-estoque-fnfc.onrender.com";
  const token = localStorage.getItem("token");

  const produto = document.getElementById("inputProduto");
  const quantidade = document.getElementById("quantidade");
  const cadastrar = document.getElementById("cadastrar");
  const lista = document.getElementById("lista");
  const botaoTema = document.getElementById("toggleTema");

  

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // -------- CARREGAR --------
  async function carregar() {
    try {
      const res = await fetch(`${API}/produtos`, {
        headers: { Authorization: token }
      });

      const dados = await res.json();

      if (!res.ok) {
        alert(dados.erro || "Erro inesperado");
        return;
      }

      lista.innerHTML = "";

      dados.forEach((item, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${item.produto}</td>
          <td>${item.quantidade}</td>
          <td>
            <button onclick="editar(${index})">Editar</button>
            <button class="btn-danger" onclick="remover(${index})">Excluir</button>
          </td>
        `;

        lista.appendChild(tr);
      });

    } catch (err) {
      console.error(err);
      alert("Erro ao carregar dados");
    }
    console.log("TOKEN ENVIADO:", token);
  }

  // -------- CADASTRAR --------
  cadastrar.addEventListener("click", async (e) => {
    e.preventDefault();

    const texto = produto.value.trim();
    const quant = quantidade.value.trim();

    if (!texto || !quant) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      cadastrar.disabled = true;

      const res = await fetch(`${API}/produtos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          produto: texto,
          quantidade: quant
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.erro);
        return;
      }

      produto.value = "";
      quantidade.value = "";

      carregar();

    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar");
    } finally {
      cadastrar.disabled = false;
    }
  });

  // -------- EDITAR --------
  window.editar = async function (index) {
    const novoProduto = prompt("Novo produto:");
    const novaQuantidade = prompt("Nova quantidade:");

    if (!novoProduto || !novaQuantidade) return;

    await fetch(`${API}/produtos/${index}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        produto: novoProduto,
        quantidade: novaQuantidade
      })
    });

    carregar();
  };

  // -------- REMOVER --------
  window.remover = async function (index) {
    await fetch(`${API}/produtos/${index}`, {
      method: "DELETE",
      headers: { Authorization: token }
    });

    carregar();
  };

  // -------- TEMA --------
  if (localStorage.getItem("tema") === "dark") {
    document.body.classList.add("dark");
  }

  function atualizarIcone() {
    botaoTema.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  }

  atualizarIcone();

  botaoTema.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const dark = document.body.classList.contains("dark");
    localStorage.setItem("tema", dark ? "dark" : "light");

    atualizarIcone();
  });

  carregar();
});

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}