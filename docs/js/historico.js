// historico.js

const API = "https://backend-estoque-fnfc.onrender.com";

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

let grafico;

// =========================
// CARREGAR HISTÓRICO
// =========================
async function carregarHistorico() {

  try {

    const res = await fetch(
      `${API}/movimentacoes`,
      {
        headers: {
          Authorization: token
        }
      }
    );

    const dados = await res.json();

    if (!res.ok) {
      alert(dados.erro || "Erro");
      return;
    }

    preencherTabela(dados);

    preencherCards(dados);

    gerarGrafico(dados);

  } catch (err) {

    console.error(err);

    alert("Erro ao carregar histórico");
  }
}

// =========================
// TABELA
// =========================
function preencherTabela(lista) {

  const tabela =
    document.getElementById("tabelaHistorico");

  tabela.innerHTML = "";

  lista.forEach(item => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.produto}</td>

      <td>
        <span class="tipo ${item.tipo}">
          ${item.tipo.toUpperCase()}
        </span>
      </td>

      <td>${item.quantidade}</td>

      <td>${item.responsavel}</td>

      <td>${item.comentario || "-"}</td>

      <td>
        ${new Date(item.data)
          .toLocaleString("pt-BR")}
      </td>
    `;

    tabela.appendChild(tr);
  });
}

// =========================
// CARDS
// =========================
function preencherCards(lista) {

  const entradas =
    lista.filter(i => i.tipo === "entrada");

  const saidas =
    lista.filter(i => i.tipo === "saida");

  document.getElementById(
    "totalEntradas"
  ).textContent = entradas.length;

  document.getElementById(
    "totalSaidas"
  ).textContent = saidas.length;

  document.getElementById(
    "totalMovimentacoes"
  ).textContent = lista.length;

  // PRODUTO MAIS MOVIMENTADO
  const contador = {};

  lista.forEach(item => {

    contador[item.produto] =
      (contador[item.produto] || 0) + 1;
  });

  let topProduto = "-";
  let topValor = 0;

  for (const produto in contador) {

    if (contador[produto] > topValor) {

      topValor = contador[produto];

      topProduto = produto;
    }
  }

  document.getElementById(
    "produtoTop"
  ).textContent = topProduto;
}

// =========================
// GRÁFICO
// =========================
function gerarGrafico(lista) {

  const dias = {};

  lista.forEach(item => {

    const data = new Date(item.data)
      .toLocaleDateString("pt-BR");

    if (!dias[data]) {

      dias[data] = {
        entrada:0,
        saida:0
      };
    }

    dias[data][item.tipo] += item.quantidade;
  });

  const labels = Object.keys(dias);

  const entradas = labels.map(
    d => dias[d].entrada
  );

  const saidas = labels.map(
    d => dias[d].saida
  );

  if (grafico) {
    grafico.destroy();
  }

  const ctx =
    document
      .getElementById("graficoSemana")
      .getContext("2d");

  grafico = new Chart(ctx, {

    type:"bar",

    data:{
      labels,

      datasets:[
        {
          label:"Entradas",
          data:entradas,
          backgroundColor:"rgba(34,197,94,0.7)",
          borderRadius:8
        },

        {
          label:"Saídas",
          data:saidas,
          backgroundColor:"rgba(239,68,68,0.7)",
          borderRadius:8
        }
      ]
    },

    options:{
      responsive:true,
      maintainAspectRatio:false,

      plugins:{
        legend:{
          labels:{
            color:"#fff"
          }
        }
      },

      scales:{
        x:{
          ticks:{
            color:"#fff"
          }
        },

        y:{
          beginAtZero:true,

          ticks:{
            color:"#fff"
          }
        }
      }
    }
  });
}

// =========================
// PESQUISA
// =========================
document
  .getElementById("pesquisa")
  .addEventListener("input", async (e) => {

    const texto =
      e.target.value.toLowerCase();

    const res = await fetch(
      `${API}/movimentacoes`,
      {
        headers:{
          Authorization:token
        }
      }
    );

    const dados = await res.json();

    const filtrado =
      dados.filter(item =>
        item.produto
          .toLowerCase()
          .includes(texto)
      );

    preencherTabela(filtrado);
  });

// =========================
// BOTÃO
// =========================
document
  .getElementById("btnAtualizar")
  .onclick = carregarHistorico;

// =========================
// INIT
// =========================
carregarHistorico();