const produto = document.getElementById("inputProduto");
const quantidade = document.getElementById("quantidade");
const cadastrar = document.getElementById("cadastrar");
const lista = document.getElementById("lista");

// 🔗 API
const API = "https://backend-estoque-fnfc.onrender.com/produtos";

/* ----------- CARREGAR ----------- */
async function carregar() {
  try {
    const res = await fetch(API);
    const dados = await res.json();

    lista.innerHTML = "";

    dados.forEach((item, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${item.produto}</td>
        <td>${item.quantidade}</td>
        <td>
          <button onclick="editar(${index})">Editar</button>
          <button onclick="remover(${index})">Excluir</button>
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

    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        produto: texto,
        quantidade: quant
      })
    });

    if (!res.ok) {
      const erro = await res.json();
      alert(erro.erro || "Erro ao cadastrar");
      return;
    }

    produto.value = "";
    quantidade.value = "";

    carregar();

  } catch (erro) {
    console.error(erro);
    alert("Erro ao conectar com o servidor");

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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        produto: novoProduto,
        quantidade: novaQuantidade
      })
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
      method: "DELETE"
    });

    carregar();

  } catch (erro) {
    console.error(erro);
    alert("Erro ao remover");
  }
}

/* ----------- INICIAR ----------- */
carregar();

const botaoTema = document.getElementById("toggleTema");

// carregar tema salvo
if (localStorage.getItem("tema") === "dark") {
  document.body.classList.add("dark");
}

// atualizar ícone
function atualizarIcone() {
  botaoTema.textContent =
    document.body.classList.contains("dark") ? "☀️" : "🌙";
}

atualizarIcone();

// evento do botão
botaoTema.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const dark = document.body.classList.contains("dark");
  localStorage.setItem("tema", dark ? "dark" : "light");

  atualizarIcone();
});