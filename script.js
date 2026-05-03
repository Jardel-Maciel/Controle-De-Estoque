const produto = document.getElementById("inputProduto");
const quantidade = document.getElementById("quantidade");
const lista = document.getElementById("lista");
const botaoTema = document.getElementById("toggleTema");

// 🔗 SUA API ONLINE
const API = "https://backend-estoque-fnfc.onrender.com/produtos";

// 🛑 controle anti clique duplo
let carregando = false;

/* ----------- CARREGAR DADOS ----------- */
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
          <button class="btn-danger" onclick="remover(${index})">Excluir</button>
        </td>
      `;

      lista.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar dados");
  }
}

/* ----------- CADASTRAR ----------- */

// 🔥 remove eventos antigos (evita duplicação)
const btnOriginal = document.getElementById("cadastrar");
const novoBotao = btnOriginal.cloneNode(true);
btnOriginal.parentNode.replaceChild(novoBotao, btnOriginal);

novoBotao.addEventListener("click", async (e) => {
  e.preventDefault();

  if (carregando) return; // 🛑 evita múltiplos cliques

  const texto = produto.value.trim();
  const quant = quantidade.value.trim();

  if (texto === "" || quant === "") {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    carregando = true;
    novoBotao.disabled = true;

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

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || "Erro ao cadastrar");
      return;
    }

    produto.value = "";
    quantidade.value = "";

    await carregar();

  } catch (err) {
    console.error(err);
    alert("Erro de conexão com o servidor");

  } finally {
    carregando = false;
    novoBotao.disabled = false;
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

  } catch (err) {
    console.error(err);
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

  } catch (err) {
    console.error(err);
    alert("Erro ao remover");
  }
}

/* ----------- TEMA ----------- */

// carregar tema salvo
if (localStorage.getItem("tema") === "dark") {
  document.body.classList.add("dark");
}

// atualizar botão
function atualizarIcone() {
  botaoTema.textContent =
    document.body.classList.contains("dark") ? "☀️" : "🌙";
}

atualizarIcone();

botaoTema.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const dark = document.body.classList.contains("dark");
  localStorage.setItem("tema", dark ? "dark" : "light");

  atualizarIcone();
});

/* ----------- INICIAR ----------- */
carregar();