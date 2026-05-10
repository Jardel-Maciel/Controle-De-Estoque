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
// DASHBOARD
// =========================
async function carregarDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const dados = await res.json();

    if (!res.ok) return alert(dados.erro || "Erro dashboard");

    dashboard = dados;
    produtosCache = (dados.produtos || []).map(normalizarProduto);

    document.getElementById("totalProdutos").textContent = dados.total_produtos || 0;
    document.getElementById("totalItens").textContent = dados.total_itens || 0;
    document.getElementById("baixoEstoque").textContent = dados.baixo_estoque || 0;
    document.getElementById("totalEstoque").textContent =
      `R$ ${(dados.valor_total || 0).toFixed(2)}`;

    if (graficoQuantidade) graficoQuantidade.destroy();
    if (graficoValor) graficoValor.destroy();

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

    graficoValor = new Chart(document.getElementById("graficoValor"), {
      type: "bar",
      data: {
        labels: produtosCache.map(p => p.nome),
        datasets: [{
          label: "Valor",
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
// MOVIMENTAÇÕES CACHE
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
// PDF PREMIUM NOTION / SAAS
// =========================
window.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("btnDownloadPDF");
  if (!btn) return;

  btn.addEventListener("click", async () => {

    try {
      await carregarLogo();
      await carregarMovimentacoes();

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");

      const primary = [15, 23, 42];

      // =========================
      // CAPA CLEAN (NOTION STYLE)
      // =========================
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, 210, 297, "F");

      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, 210, 20, "F");

      pdf.setFontSize(22);
      pdf.setTextColor(...primary);
      pdf.text("Relatório de Estoque", 15, 38);

      pdf.setFontSize(10);
      pdf.setTextColor(120);
      pdf.text("Dashboard inteligente • visão analítica", 15, 46);

      pdf.setFontSize(9);
      pdf.setTextColor(160);
      pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 15, 54);

      if (logoBase64) {
        try {
          pdf.addImage(logoBase64, "PNG", 172, 8, 18, 0);
        } catch {}
      }

      // =========================
      // CARDS PREMIUM
      // =========================
      const d = dashboard;

      function card(x, y, label, value, color) {
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(x, y, 45, 24, 4, 4, "F");

        pdf.setDrawColor(235, 235, 235);
        pdf.roundedRect(x, y, 45, 24, 4, 4, "S");

        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(label, x + 4, y + 9);

        pdf.setFontSize(12);

        if (Array.isArray(color)) {
          pdf.setTextColor(color[0], color[1], color[2]);
        } else {
          pdf.setTextColor(...primary);
        }

        pdf.text(String(value), x + 4, y + 18);
      }

      card(15, 75, "Produtos", d.total_produtos || 0, primary);
      card(65, 75, "Itens", d.total_itens || 0, primary);
      card(115, 75, "Baixo estoque", d.baixo_estoque || 0, [220, 53, 69]);
      card(165, 75, "Valor total", `R$ ${(d.valor_total || 0).toFixed(2)}`, [34, 197, 94]);

      pdf.setDrawColor(240, 240, 240);
      pdf.line(15, 105, 195, 105);

      // =========================
      // PRODUTOS
      // =========================
      pdf.addPage();

      pdf.setFontSize(14);
      pdf.setTextColor(...primary);
      pdf.text("Produtos", 14, 18);

      let y = 30;

      const header = () => {
        pdf.setFillColor(...primary);
        pdf.setTextColor(255);
        pdf.rect(10, y - 6, 190, 10, "F");

        pdf.text("Produto", 14, y);
        pdf.text("Valor", 95, y);
        pdf.text("Qtd", 135, y);
        pdf.text("Status", 165, y);

        y += 10;
      };

      header();

      produtosCache.forEach(p => {

        if (y > 270) {
          pdf.addPage();
          y = 30;
          header();
        }

        pdf.setFontSize(9);
        pdf.setTextColor(20);

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

      pdf.setFontSize(12);
      pdf.setTextColor(...primary);
      pdf.text("Movimentações", 14, 18);

      let yM = 30;

      const headerMov = () => {
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
      };

      headerMov();

      movimentacoesCache.forEach(m => {

        if (yM > 270) {
          pdf.addPage();
          yM = 30;
          headerMov();
        }

        const tipo = (m.tipo || "").includes("saida") ? "SAÍDA" :
                     (m.tipo || "").includes("entrada") ? "ENTRADA" : "-";

        pdf.setTextColor(20);
        pdf.text(m.produto || "-", 14, yM);
        pdf.text(String(m.quantidade || 0), 55, yM);

        if (tipo === "SAÍDA") pdf.setTextColor(220, 53, 69);
        else if (tipo === "ENTRADA") pdf.setTextColor(34, 197, 94);
        else pdf.setTextColor(120);

        pdf.text(tipo, 80, yM);

        pdf.setTextColor(20);
        pdf.text(m.responsavel || "-", 110, yM);

        pdf.text((m.motivo || "-").substring(0, 18), 140, yM);

        pdf.text(
          m.data ? new Date(m.data).toLocaleString("pt-BR") : "-",
          175,
          yM
        );

        yM += 8;
      });

      pdf.save("relatorio-estoque.pdf");

    } catch (err) {
      console.error("Erro PDF:", err);
      alert("Erro ao gerar PDF");
    }
  });
});

// =========================
// INIT
// =========================
carregarDashboard();
carregarMovimentacoes();