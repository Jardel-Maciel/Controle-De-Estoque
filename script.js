const produto = document.getElementById("inputProduto");
const quantidade = document.getElementById("quantidade");
const cadastrar = document.getElementById("cadastrar");
const lista = document.getElementById("lista");
const botaoTema = document.getElementById("toggleTema");

const API = "http://127.0.0.1:5000/produtos";

let estoque = [];

/* ----------- CARREGAR DADOS ----------- */
async function carregar() {
  const res = await fetch(API);
  estoque = await res.json();
  render();
}

/* ----------- CADASTRAR ----------- */
cadastrar.addEventListener("click", async () => {
  const texto = produto.value.trim();
  const quant = quantidade.value.trim();

  if (texto === "" || quant === "") {
    alert("Preencha todos os campos!");
    return;
  }

  await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      produto: texto,
      quantidade: quant
    })
  });

  produto.value = "";
  quantidade.value = "";

  carregar();
});

/* ----------- RENDER ----------- */
function render() {
  lista.innerHTML = "";

  estoque.forEach((item, index) => {
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
}

/* ----------- EDITAR ----------- */
async function editar(index) {
  const novoProduto = prompt("Novo produto:", estoque[index].produto);
  const novaQuantidade = prompt("Nova quantidade:", estoque[index].quantidade);

  if (
    novoProduto !== null && novoProduto.trim() !== "" &&
    novaQuantidade !== null && novaQuantidade.trim() !== ""
  ) {
    await fetch(`${API}/${index}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        produto: novoProduto.trim(),
        quantidade: novaQuantidade.trim()
      })
    });

    carregar();
  }
}

/* ----------- REMOVER ----------- */
async function remover(index) {
  await fetch(`${API}/${index}`, {
    method: "DELETE"
  });

  carregar();
}

/* ----------- TEMA (mantém igual) ----------- */

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

/* ----------- INICIAR ----------- */
carregar();

function validarEntrada(produto, quantidade) {
  const erros = [];

  // Produto
  if (!produto) {
    erros.push("Produto é obrigatório");
  } else if (produto.length < 3) {
    erros.push("Produto deve ter pelo menos 3 caracteres");
  }

  // Quantidade
  if (!quantidade) {
    erros.push("Quantidade é obrigatória");
  } else if (isNaN(quantidade)) {
    erros.push("Quantidade deve ser um número");
  } else if (Number(quantidade) <= 0) {
    erros.push("Quantidade deve ser maior que zero");
  }

  return erros;
}

cadastrar.addEventListener("click", async () => {
  const texto = produto.value.trim();
  const quant = quantidade.value.trim();

  const erros = validarEntrada(texto, quant);

  if (erros.length > 0) {
    alert(erros.join("\n"));
    return;
  }

  await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      produto: texto,
      quantidade: quant
    })
  });

  produto.value = "";
  quantidade.value = "";

  carregar();
});
async function editar(index) {
  const novoProduto = prompt("Novo produto:", estoque[index].produto);
  const novaQuantidade = prompt("Nova quantidade:", estoque[index].quantidade);

  if (novoProduto === null || novaQuantidade === null) return;

  const erros = validarEntrada(novoProduto.trim(), novaQuantidade.trim());

  if (erros.length > 0) {
    alert(erros.join("\n"));
    return;
  }

  await fetch(`${API}/${index}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      produto: novoProduto.trim(),
      quantidade: novaQuantidade.trim()
    })
  });

  carregar();
}
if (estoque.some(item => item.produto.toLowerCase() === produto.toLowerCase())) {
  erros.push("Produto já existe");
}