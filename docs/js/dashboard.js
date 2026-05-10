const API = "https://backend-estoque-fnfc.onrender.com";

const token = localStorage.getItem("token");

// =========================
// SEM TOKEN
// =========================
if (!token) {

  localStorage.removeItem("token");

  window.location.href = "login.html";
}

// =========================
// ESTADO GLOBAL
// =========================
let graficoQuantidade;
let graficoValor;
let logoBase64 = null;

let dashboard = {};

let produtosCache = [];

let movimentacoesCache = [];

// =========================
// NORMALIZA PRODUTO
// =========================
function normalizarProduto(p) {

  return {

    nome:
      p.nome ||
      p.produto ||
      p.descricao ||
      p.name ||
      "-",

    quantidade: Number(
      p.quantidade ?? 0
    ),

    valor: Number(
      p.valor ??
      p.preco ??
      0
    ),

    status:
      Number(p.quantidade ?? 0) <= 5
        ? "baixo"
        : "ok"
  };
}

// =========================
// NORMALIZA MOVIMENTAÇÃO
// =========================
function normalizarMovimentacao(m) {

  return {

    produto:
      m.produto ||
      m.nome ||
      "-",

    quantidade: Number(
      m.quantidade ??
      m.qtd ??
      0
    ),

    tipo: (
      m.tipo || ""
    ).toLowerCase(),

    responsavel:
      m.responsavel ||
      m.usuario ||
      m.user ||
      "-",

    motivo:
      m.motivo ||
      m.comentario ||
      m.descricao ||
      m.observacao ||
      "-",

    data:
      m.created_at ||
      m.createdAt ||
      m.data ||
      m.timestamp ||
      null
  };
}

// =========================
// LOGO
// =========================
async function carregarLogo() {

  try {

    const res = await fetch(
      "assets/logo.png"
    );

    if (!res.ok) {
      throw new Error(
        "Logo não encontrada"
      );
    }

    const blob = await res.blob();

    return await new Promise(
      (resolve, reject) => {

        const reader =
          new FileReader();

        reader.onloadend = () => {

          logoBase64 =
            reader.result;

          resolve();
        };

        reader.onerror = () => {

          logoBase64 = null;

          reject();
        };

        reader.readAsDataURL(
          blob
        );
      }
    );

  } catch {

    logoBase64 = null;
  }
}

// =========================
// MOVIMENTAÇÕES
// =========================
async function carregarMovimentacoes() {

  try {

    const res = await fetch(
      `${API}/movimentacoes`,
      {

        method: "GET",

        headers: {

          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`
        }
      }
    );

    // =========================
    // TOKEN INVÁLIDO
    // =========================
    if (res.status === 401) {

      alert(
        "Sessão expirada"
      );

      localStorage.removeItem(
        "token"
      );

      window.location.href =
        "login.html";

      return;
    }

    const texto =
      await res.text();

    let dados = {};

    try {

      dados = JSON.parse(
        texto
      );

    } catch {

      console.error(
        "Resposta inválida:",
        texto
      );

      movimentacoesCache = [];

      return;
    }

    if (!res.ok) {

      console.error(
        "Erro movimentações:",
        dados
      );

      movimentacoesCache = [];

      return;
    }

    const lista =
      Array.isArray(dados)
        ? dados
        : (
            dados.movimentacoes ||
            dados.data ||
            dados.items ||
            []
          );

    movimentacoesCache =
      lista.map(
        normalizarMovimentacao
      );

  } catch (err) {

    console.error(
      "Erro em carregarMovimentacoes:",
      err
    );

    movimentacoesCache = [];
  }
}

// =========================
// DASHBOARD
// =========================
async function carregarDashboard() {

  try {

    const res = await fetch(
      `${API}/dashboard`,
      {

        method: "GET",

        headers: {

          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`
        }
      }
    );

    // =========================
    // TOKEN INVÁLIDO
    // =========================
    if (res.status === 401) {

      alert(
        "Sessão expirada. Faça login novamente."
      );

      localStorage.removeItem(
        "token"
      );

      window.location.href =
        "login.html";

      return;
    }

    // =========================
    // TEXTO
    // =========================
    const texto =
      await res.text();

    let dados = {};

    try {

      dados = JSON.parse(
        texto
      );

    } catch {

      console.error(
        "Resposta inválida:",
        texto
      );

      alert(
        "Erro interno do backend"
      );

      return;
    }

    // =========================
    // ERRO BACKEND
    // =========================
    if (!res.ok) {

      console.error(dados);

      alert(
        dados.erro ||
        "Erro dashboard"
      );

      return;
    }

    // =========================
    // DADOS
    // =========================
    dashboard = dados;

    produtosCache =
      (
        dados.produtos || []
      ).map(
        normalizarProduto
      );

    // =========================
    // KPIS
    // =========================
    document.getElementById(
      "totalProdutos"
    ).textContent =
      dados.total_produtos || 0;

    document.getElementById(
      "totalItens"
    ).textContent =
      dados.total_itens || 0;

    document.getElementById(
      "baixoEstoque"
    ).textContent =
      dados.baixo_estoque || 0;

    document.getElementById(
      "totalEstoque"
    ).textContent =
      `R$ ${(
        dados.valor_total || 0
      ).toFixed(2)}`;

    // =========================
    // RESET GRÁFICOS
    // =========================
    if (graficoQuantidade) {
      graficoQuantidade.destroy();
    }

    if (graficoValor) {
      graficoValor.destroy();
    }

    // =========================
    // GRÁFICO QUANTIDADE
    // =========================
    graficoQuantidade =
      new Chart(
        document.getElementById(
          "grafico"
        ),
        {

          type: "bar",

          data: {

            labels:
              produtosCache.map(
                p => p.nome
              ),

            datasets: [
              {

                label:
                  "Quantidade",

                data:
                  produtosCache.map(
                    p => p.quantidade
                  ),

                backgroundColor:
                  "rgba(99,102,241,0.7)",

                borderRadius: 10
              }
            ]
          },

          options: {

            responsive: true,

            maintainAspectRatio: false
          }
        }
      );

    // =========================
    // GRÁFICO VALOR
    // =========================
    graficoValor =
      new Chart(
        document.getElementById(
          "graficoValor"
        ),
        {

          type: "bar",

          data: {

            labels:
              produtosCache.map(
                p => p.nome
              ),

            datasets: [
              {

                label: "Valor",

                data:
                  produtosCache.map(
                    p => p.valor
                  ),

                backgroundColor:
                  "rgba(16,185,129,0.7)",

                borderRadius: 10
              }
            ]
          },

          options: {

            responsive: true,

            maintainAspectRatio: false
          }
        }
      );

  } catch (err) {

    console.error(
      "Erro em carregarDashboard:",
      err
    );

    alert(
      "Erro ao conectar com backend"
    );
  }
}

// =========================
// INIT
// =========================
async function iniciarSistema() {

  await carregarDashboard();

  await carregarMovimentacoes();
}

// =========================
// START
// =========================
document.addEventListener(
  "DOMContentLoaded",
  iniciarSistema
);