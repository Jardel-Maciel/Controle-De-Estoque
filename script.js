const produto = document.getElementById("inputProduto");
const quantidade = document.getElementById("quantidade");
const cadastrar = document.getElementById("cadastrar");
const lista = document.getElementById("lista");

 let estoque = JSON.parse(localStorage.getItem("estoque")) || [];

cadastrar.addEventListener("click", () => {
  const texto = produto.value.trim();
  if (texto === "") {
    alert("Preencha os campos porfavor!");
    return;
  }

  const quant = quantidade.value.trim();
  if (quant === "") {
    alert("Preencha os campos porfavor!");
    return;
  }

  estoque.push({
    produto: texto,
    quantidade: quant,
  });

  produto.value = "";
  quantidade.value = "";

  salvarDados();
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
        <button onclick="remover(${index})">Remover</button>
        </td>
        `;

    lista.appendChild(tr);
  });
}

function editar(index) {
  const novoProduto = prompt("Novo Produto: ", estoque[index].produto);
  const novaQuantidade = prompt("Novo Quantidade: ", estoque[index].quantidade);

  if (
    novoProduto !== null &&
    novoProduto.trim() !== "" &&
    novaQuantidade !== null &&
    novaQuantidade.trim() !== ""
  ) {
    estoque[index].produto = novoProduto.trim();
    estoque[index].quantidade = novaQuantidade.trim();
    salvarDados();
    render();
  }
}

function remover(index) {
  estoque.splice(index, 1);

  salvarDados();
  render();
}

//salvamento de informações

function salvarDados() {
  localStorage.setItem("estoque", JSON.stringify(estoque));
}

render();
