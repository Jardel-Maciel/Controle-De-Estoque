const produto = document.getElementById("inputProduto");
const quantidade = document.getElementById("quantidade");
const cadastrar = document.getElementById("cadastrar");
const lista = document.getElementById("lista");
const botaoTema = document.getElementById("toggleTema");

let estoque = JSON.parse(localStorage.getItem("estoque")) || [];

/* ----------- CRUD ----------- */

cadastrar.addEventListener("click", () => {
  const texto = produto.value.trim();
  const quant = quantidade.value.trim();

  if (texto === "" || quant === "") {
    alert("Preencha todos os campos!");
    return;
  }

  estoque.push({
    produto: texto,
    quantidade: quant
  });

  produto.value = "";
  quantidade.value = "";

  salvar();
  render();
});

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

function editar(index) {
  const novoProduto = prompt("Novo produto:", estoque[index].produto);
  const novaQuantidade = prompt("Nova quantidade:", estoque[index].quantidade);

  if (
    novoProduto !== null && novoProduto.trim() !== "" &&
    novaQuantidade !== null && novaQuantidade.trim() !== ""
  ) {
    estoque[index].produto = novoProduto.trim();
    estoque[index].quantidade = novaQuantidade.trim();

    salvar();
    render();
  }
}

function remover(index) {
  estoque.splice(index, 1);
  salvar();
  render();
}

function salvar() {
  localStorage.setItem("estoque", JSON.stringify(estoque));
}

/* ----------- TEMA ----------- */

// carregar tema
if (localStorage.getItem("tema") === "dark") {
  document.body.classList.add("dark");
}

// atualizar ícone
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

/* iniciar */
render();