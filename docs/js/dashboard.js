const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
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
// NORMALIZA PRODUTOS
// =========================
function normalizarProduto(p) {
  return {
    nome: p.nome || p.produto || p.descricao || p.name || "-",
    quantidade: Number(p.quantidade ?? 0),
    valor: Number(p.valor ?? p.preco ?? 0),
    status: Number(p.quantidade ?? 0) <= 5 ? "baixo" : "ok"
  };
}

// =========================
// NORMALIZA MOVIMENTAÇÃO
// =========================
function normalizarMovimentacao(m) {
  return {
    produto: m.produto || m.nome || "-",
    quantidade: Number(m.quantidade ?? m.qtd ?? 0),
    tipo: (m.tipo || "").toLowerCase(),
    responsavel: m.responsavel || m.usuario || m.user || "-",
    motivo: m.motivo || m.comentario || m.descricao || m.observacao || "-",
    data: m.created_at || m.createdAt || m.data || m.timestamp || null
  };
}

// =========================
// LOGO
// =========================
async function carregarLogo() {
  try {
    const res = await fetch("assets/logo.png");
    if (!res.ok) throw new Error();

    const blob = await res.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result;
        resolve();
      };
      reader.readAsDataURL(blob);
    });

  } catch {
    logoBase64 = null;
  }
}

// =========================
// DASHBOARD (UI + GRÁFICOS)
// =========================
async function carregarDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const dados = await res.json();

    if (!res.ok) {
      alert(dados.erro || "Erro ao carregar dashboard");
      return;
    }

    dashboard = dados;

    produtosCache = (dados.produtos || []).map(normalizarProduto);

    document.getElementById("totalProdutos").textContent = dados.total_produtos || 0;
    document.getElementById("totalItens").textContent = dados.total_itens || 0;
    document.getElementById("baixoEstoque").textContent = dados.baixo_estoque || 0;
    document.getElementById("totalEstoque").textContent =
      `R$ ${(dados.valor_total || 0).toFixed(2)}`;

    // =========================
    // GRÁFICO QUANTIDADE
    // =========================
    if (graficoQuantidade) graficoQuantidade.destroy();

    graficoQuantidade = new Chart(document.getElementById("grafico"), {
      type: "bar",
      data: {
        labels: produtosCache.map(p => p.nome),
        datasets: [{
          label: "Quantidade",
          data: produtosCache.map(p => p.quantidade),
          backgroundColor: "rgba(99,102,241,0.7)",
          borderRadius: 10
        }]
      }
    });

    // =========================
    // GRÁFICO VALOR
    // =========================
    if (graficoValor) graficoValor.destroy();

    graficoValor = new Chart(document.getElementById("graficoValor"), {
      type: "bar",
      data: {
        labels: produtosCache.map(p => p.nome),
        datasets: [{
          label: "Valor Total",
          data: produtosCache.map(p => p.valor),
          backgroundColor: "rgba(16,185,129,0.7)",
          borderRadius: 10
        }]
      }
    });

  } catch (err) {
    console.error(err);
  }
}

// =========================
// CARREGA MOVIMENTAÇÕES (CACHE)
// =========================
async function carregarMovimentacoes() {
  try {
    const res = await fetch(`${API}/movimentacoes`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const raw = await res.json();

    movimentacoesCache = (
      Array.isArray(raw)
        ? raw
        : raw.movimentacoes || raw.data || []
    ).map(normalizarMovimentacao);

  } catch {
    movimentacoesCache = [];
  }
}

// =========================
// PDF PROFISSIONAL
// =========================
window.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("btnDownloadPDF");
  if (!btn) return;

  btn.addEventListener("click", async () => {

    try {
      await carregarLogo();
      await carregarMovimentacoes(); // usa cache separado

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");

      const primary = [15, 23, 42];

      // =========================
      // CAPA PROFISSIONAL
      // =========================
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, 210, 297, "F");

      pdf.setTextColor(...primary);
      pdf.setFontSize(22);
      pdf.text("RELATÓRIO DE ESTOQUE", 15, 35);

      pdf.setFontSize(10);
      pdf.setTextColor(120);
      pdf.text("Sistema de gestão inteligente", 15, 42);

      if (logoBase64) {
        try {
          pdf.addImage(logoBase64, "PNG", 170, 10, 25, 0);
        } catch {}
      }

      // =========================
      // CARDS
      // =========================
      const d = dashboard;

      function card(x, y, label, value) {
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(x, y, 45, 22, 3, 3, "F");

        pdf.setTextColor(120);
        pdf.setFontSize(8);
        pdf.text(label, x + 3, y + 8);

        pdf.setTextColor(...primary);
        pdf.setFontSize(11);
        pdf.text(String(value), x + 3, y + 16);
      }

      card(15, 90, "Produtos", d.total_produtos || 0);
      card(65, 90, "Itens", d.total_itens || 0);
      card(115, 90, "Baixo", d.baixo_estoque || 0);
      card(165, 90, "Valor", `R$ ${(d.valor_total || 0).toFixed(2)}`);

      // =========================
      // PRODUTOS
      // =========================
      pdf.addPage();

      pdf.setFontSize(14);
      pdf.setTextColor(...primary);
      pdf.text("PRODUTOS", 14, 18);

      let y = 30;

      function header() {
        pdf.setFillColor(...primary);
        pdf.setTextColor(255);
        pdf.rect(10, y - 6, 190, 10, "F");

        pdf.text("Produto", 14, y);
        pdf.text("Valor", 95, y);
        pdf.text("Qtd", 135, y);
        pdf.text("Status", 165, y);

        y += 10;
      }

      header();

      produtosCache.forEach(p => {

        if (y > 270) {
          pdf.addPage();
          y = 30;
          header();
        }

        pdf.setTextColor(20);
        pdf.setFontSize(9);

        pdf.text((p.nome || "-").substring(0, 35), 14, y);
        pdf.text(`R$ ${p.valor.toFixed(2)}`, 95, y);
        pdf.text(String(p.quantidade), 135, y);

        if (p.status === "baixo") {
          pdf.setTextColor(220, 53, 69);
          pdf.text("BAIXO", 165, y);
        } else {
          pdf.setTextColor(34, 197, 94);
          pdf.text("OK", 165, y);
        }

        y += 8;
      });

      // =========================
      // MOVIMENTAÇÕES
      // =========================
      pdf.addPage();

      pdf.setFontSize(14);
      pdf.setTextColor(...primary);
      pdf.text("MOVIMENTAÇÕES", 14, 18);

      let yM = 30;

      function headerMov() {
        pdf.setFillColor(...primary);
        pdf.setTextColor(255);
        pdf.rect(10, yM - 6, 190, 10, "F");

        pdf.text("Produto", 14, yM);
        pdf.text("Qtd", 55, yM);
        pdf.text("Tipo", 80, yM);
        pdf.text("Resp", 110, yM);
        pdf.text("Motivo", 140, yM);
        pdf.text("Data", 175, yM);

        yM += 10;
      }

      headerMov();

      movimentacoesCache.forEach(m => {

        if (yM > 270) {
          pdf.addPage();
          yM = 30;
          headerMov();
        }

        const tipoRaw = (m.tipo || "").toLowerCase();

        const tipo =
          tipoRaw.includes("entrada") ? "ENTRADA" :
          tipoRaw.includes("saida") ? "SAÍDA" : "-";

        const data = m.data
          ? new Date(m.data).toLocaleString("pt-BR")
          : "-";

        pdf.setFontSize(9);
        pdf.setTextColor(20);

        pdf.text(m.produto || "-", 14, yM);
        pdf.text(String(m.quantidade || 0), 55, yM);

        if (tipo === "SAÍDA") pdf.setTextColor(220, 53, 69);
        else if (tipo === "ENTRADA") pdf.setTextColor(34, 197, 94);
        else pdf.setTextColor(120);

        pdf.text(tipo, 80, yM);

        pdf.setTextColor(20);
        pdf.text(m.responsavel || "-", 110, yM);

        const motivo = (m.motivo || "-").substring(0, 18);
        pdf.text(motivo, 140, yM);

        pdf.text(data, 175, yM);

        yM += 8;
      });

      pdf.save("relatorio-estoque.pdf");

    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF");
    }
  });
});

// =========================
// INIT
// =========================
carregarDashboard();
carregarMovimentacoes();