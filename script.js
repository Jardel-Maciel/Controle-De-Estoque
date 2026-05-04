const produto = document.getElementById("inputProduto");
const quantidade = document.getElementById("quantidade");
const cadastrar = document.getElementById("cadastrar");
const lista = document.getElementById("lista");

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

// 🔗 API
const API = "https://backend-estoque-fnfc.onrender.com/produtos";

/* ----------- CARREGAR ----------- */
async function carregar() {
  try {
    const res = await fetch(`${API}/produtos`, {
      headers: {
        Authorization: token,
      },
    });

    const dados = await res.json();

    if (!res.ok) {
      alert(dados.erro || "Erro ao carregar dados");
      return;
    }

    if (!Array.isArray(dados)) {
      console.error("Resposta inválida:", dados);
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
  } catch (erro) {
    console.error(erro);
    alert("Erro ao carregar dados");
  }
}

/* ----------- CADASTRAR ----------- */
cadastrar.addEventListener("click", async (e) => {
  e.preventDefault();

  const texto = produto.value.trim();
  const quant = quantidade.value.trim();

  if (texto === "" || quant === "") {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    cadastrar.disabled = true;

    const res = await fetch(`${API}/produtos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        produto: texto,
        quantidade: quant,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || "Erro ao cadastrar");
      return;
    }

    console.log("Produto cadastrado:", data);
  } catch (err) {
    console.error(err);
    alert("Erro de conexão");
  } finally {
    cadastrar.disabled = false;
  }
});

/* ----------- EDITAR ----------- */
async function editar(index) {
  const novoProduto = prompt("Novo produto:");
  const novaQuantidade = prompt("Nova quantidade:");

  if (!novoProduto || !novaQuantidade) return;

  try {
    await fetch(`${API}/${index}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        produto: novoProduto,
        quantidade: novaQuantidade,
      }),
    });

    carregar();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao editar");
  }
}

/* ----------- REMOVER ----------- */
async function remover(index) {
  try {
    await fetch(`${API}/${index}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });

    carregar();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao remover");
  }
}

/* ----------- INICIAR ----------- */
carregar();

/* ----------- TEMA ----------- */

document.addEventListener("DOMContentLoaded", () => {
  const botaoTema = document.getElementById("toggleTema");

  if (!botaoTema) {
    console.log("Botão de tema não encontrado");
    return;
  }

  if (localStorage.getItem("tema") === "dark") {
    document.body.classList.add("dark");
  }

  function atualizarIcone() {
    botaoTema.textContent = document.body.classList.contains("dark")
      ? "☀️"
      : "🌙";
  }

  atualizarIcone();

  botaoTema.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const dark = document.body.classList.contains("dark");
    localStorage.setItem("tema", dark ? "dark" : "light");

    atualizarIcone();
  });
});
