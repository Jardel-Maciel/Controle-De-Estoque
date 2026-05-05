const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

// -------- CARREGAR (GLOBAL) --------
async function carregar() {
  try {
    const res = await fetch(`${API}/produtos`, {
      headers: { Authorization: token },
    });

    const dados = await res.json();

    if (!res.ok) {
      alert(dados.erro || "Erro inesperado");
      return;
    }

    const lista = document.getElementById("lista");
    lista.innerHTML = "";

    dados.forEach((item) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${item.produto}</td>
        <td>
          <span class="editavel" data-id="${item.id}">
            ${item.quantidade}
          </span>
        </td>
        <td>
          <button onclick="entrada(${item.id})">➕</button>
          <button onclick="saida(${item.id})">➖</button>
          <button class="btn-danger" onclick="remover(${item.id})">Excluir</button>
        </td>
      `;

      lista.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar dados");
  }
}

// -------- INICIO --------
document.addEventListener("DOMContentLoaded", () => {
  const produto = document.getElementById("inputProduto");
  const quantidade = document.getElementById("quantidade");
  const cadastrar = document.getElementById("cadastrar");
  const lista = document.getElementById("lista");
  const botaoTema = document.getElementById("toggleTema");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // -------- EDIÇÃO INLINE --------
  lista.addEventListener("click", (e) => {
    if (!e.target.classList.contains("editavel")) return;

    const span = e.target;
    const id = span.dataset.id;
    const valorAtual = span.textContent;

    const input = document.createElement("input");
    input.type = "number";
    input.value = valorAtual;
    input.style.width = "60px";

    span.replaceWith(input);
    input.focus();

    input.addEventListener("blur", () => salvarEdicao(input, id));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") salvarEdicao(input, id);
    });
  });

  async function salvarEdicao(input, id) {
    const novaQuantidade = input.value;

    if (!novaQuantidade || novaQuantidade <= 0) {
      alert("Valor inválido");
      carregar();
      return;
    }

    try {
      const res = await fetch(`${API}/produtos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          quantidade: novaQuantidade,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.erro || "Erro ao atualizar");
        return;
      }

      carregar();

    } catch (err) {
      console.error(err);
      alert("Erro ao salvar");
    }
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
          Authorization: token,
        },
        body: JSON.stringify({
          produto: texto,
          quantidade: quant,
        }),
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

  // -------- TEMA --------
  if (localStorage.getItem("tema") === "dark") {
    document.body.classList.add("dark");
  }

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

  carregar();
});

// -------- ENTRADA --------
window.entrada = async function (id) {
  const quantidade = prompt("Quantidade de entrada:");

  if (!quantidade || quantidade <= 0) return;

  try {
    await fetch(`${API}/movimentacoes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        produto_id: id,
        tipo: "entrada",
        quantidade,
      }),
    });

    carregar();
  } catch (err) {
    console.error(err);
    alert("Erro na entrada");
  }
};

// -------- SAÍDA --------
window.saida = async function (id) {
  const quantidade = prompt("Quantidade de saída:");

  if (!quantidade || quantidade <= 0) return;

  try {
    const res = await fetch(`${API}/movimentacoes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        produto_id: id,
        tipo: "saida",
        quantidade,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro);
      return;
    }

    carregar();
  } catch (err) {
    console.error(err);
    alert("Erro na saída");
  }
};

// -------- REMOVER --------
window.remover = async function (id) {
  try {
    await fetch(`${API}/produtos/${id}`, {
      method: "DELETE",
      headers: { Authorization: token },
    });

    carregar();
  } catch (err) {
    console.error(err);
    alert("Erro ao remover");
  }
};

// -------- LOGOUT --------
document.getElementById("btnLogout")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});