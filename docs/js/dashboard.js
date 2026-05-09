const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

let graficoQuantidade;
let graficoValor;
let produtosPDF = [];
let logoBase64 = null;
let dashboard = {};

// =========================
// LOGO
// =========================
async function carregarLogo() {
  try {
    const res = await fetch("assets/logo.png");
    if (!res.ok) throw new Error("Logo não encontrada");

    const blob = await res.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result;
        resolve();
      };
      reader.readAsDataURL(blob);
    });

  } catch (e) {
    console.warn("Logo não carregada");
    logoBase64 = null;
  }
}

// =========================
// CAPITALIZE
// =========================
function capitalizeTexto(texto) {
  if (!texto) return "-";
  return String(texto)
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// =========================
// DASHBOARD
// =========================
async function carregarDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const dados = await res.json();

    if (!res.ok) {
      alert(dados.erro || "Erro ao carregar dashboard");
      return;
    }

    dashboard = dados;
    produtosPDF = dados.produtos || [];

    document.getElementById("totalProdutos").textContent = dados.total_produtos || 0;
    document.getElementById("totalItens").textContent = dados.total_itens || 0;
    document.getElementById("baixoEstoque").textContent = dados.baixo_estoque || 0;
    document.getElementById("totalEstoque").textContent =
      `R$ ${(dados.valor_total || 0).toFixed(2)}`;

    if (graficoQuantidade) graficoQuantidade.destroy();

    graficoQuantidade = new Chart(document.getElementById("grafico"), {
      type: "bar",
      data: {
        labels: (dados.grafico_quantidade || []).map(i =>
          capitalizeTexto(i.produto)
        ),
        datasets: [{
          label: "Quantidade",
          data: (dados.grafico_quantidade || []).map(i => i.quantidade),
          backgroundColor: "rgba(99,102,241,0.7)",
          borderRadius: 10
        }]
      }
    });

    if (graficoValor) graficoValor.destroy();

    graficoValor = new Chart(document.getElementById("graficoValor"), {
      type: "bar",
      data: {
        labels: (dados.grafico_valor || []).map(i =>
          capitalizeTexto(i.produto)
        ),
        datasets: [{
          label: "Valor Total",
          data: (dados.grafico_valor || []).map(i => i.valor_total),
          backgroundColor: "rgba(16,185,129,0.7)",
          borderRadius: 10
        }]
      }
    });

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar dashboard");
  }
}

// =========================
// PDF SAAS PREMIUM
// =========================
document.getElementById("btnDownloadPDF").onclick = async () => {
  try {
    await carregarLogo();

    const movRes = await fetch(`${API}/movimentacoes`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const raw = await movRes.json();

    const movimentacoes =
      Array.isArray(raw) ? raw :
      Array.isArray(raw.movimentacoes) ? raw.movimentacoes :
      Array.isArray(raw.data) ? raw.data : [];

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    // ================= HEADER PREMIUM =================
    function header(title, subtitle = "") {
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, 210, 36, "F");

      if (logoBase64) {
        pdf.addImage(logoBase64, "PNG", 12, 8, 18, 18);
      }

      pdf.setTextColor(255);
      pdf.setFontSize(17);
      pdf.text(title, 36, 18);

      pdf.setTextColor(180);
      pdf.setFontSize(9);
      pdf.text(subtitle, 36, 26);
    }

    // ================= CAPA =================
    header("Estoque Intelligence", "Relatório executivo SaaS");

    pdf.setTextColor(120);
    pdf.setFontSize(9);
    pdf.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 45);

    // ================= KPIs PREMIUM =================
    const cards = [
      ["Produtos", dashboard.total_produtos || 0],
      ["Itens", dashboard.total_itens || 0],
      ["Baixo Estoque", dashboard.baixo_estoque || 0],
      ["Valor Total", `R$ ${(dashboard.valor_total || 0).toFixed(2)}`]
    ];

    let x = 14;
    let y = 55;

    cards.forEach(([label, value]) => {

      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x, y, 45, 24, 4, 4, "F");

      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(x, y, 45, 24, 4, 4);

      pdf.setTextColor(100);
      pdf.setFontSize(8);
      pdf.text(label.toUpperCase(), x + 4, y + 8);

      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(12);
      pdf.text(String(value), x + 4, y + 17);

      x += 48;
    });

    // ================= TABELA PREMIUM =================
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text("Inventário de Produtos", 14, 110);

    let yTable = 120;

    (dashboard.produtos || []).forEach((p, i) => {

      if (yTable > 265) {
        pdf.addPage();
        header("Estoque Intelligence", "Visão geral de inventário");
        yTable = 40;
      }

      const baixo = p.quantidade <= 5;

      if (i % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(10, yTable - 5, 190, 8, "F");
      }

      pdf.setTextColor(30);
      pdf.setFontSize(9);

      pdf.text(p.produto || "-", 14, yTable);
      pdf.text(String(p.quantidade || 0), 95, yTable);
      pdf.text(`R$ ${Number(p.valor || 0).toFixed(2)}`, 125, yTable);

      // BADGE PREMIUM
      if (baixo) {
        pdf.setFillColor(239, 68, 68);
        pdf.setTextColor(255);
        pdf.roundedRect(165, yTable - 4, 30, 6, 3, 3, "F");
        pdf.text("LOW", 173, yTable);
      } else {
        pdf.setFillColor(16, 185, 129);
        pdf.setTextColor(255);
        pdf.roundedRect(165, yTable - 4, 30, 6, 3, 3, "F");
        pdf.text("OK", 175, yTable);
      }

      yTable += 10;
    });

    // ================= MOVIMENTAÇÕES PREMIUM =================
    pdf.addPage();
    header("Movimentações", "Audit log do sistema");

    let y2 = 45;

    movimentacoes.forEach((mov) => {

      if (y2 > 250) {
        pdf.addPage();
        header("Movimentações", "Audit log do sistema");
        y2 = 45;
      }

      const dataFormatada = mov.created_at
        ? new Date(mov.created_at).toLocaleString()
        : "-";

      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(10, y2 - 6, 190, 30, 4, 4, "F");

      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(10, y2 - 6, 190, 30, 4, 4);

      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(9);

      pdf.text(`Produtos: ${mov.produto || "-"}`, 14, y2);
      y2 += 5;

      pdf.text(`Quantidade: ${mov.quantidade || 0} | Tipo: ${mov.tipo || "-"}`, 14, y2);
      y2 += 5;

      pdf.text(`Responsavel: ${mov.responsavel || "-"}`, 14, y2);
      y2 += 5;

      pdf.text(`Motivo: ${mov.motivo || "-"}`, 14, y2);
      y2 += 5;

      pdf.setTextColor(120);
      pdf.text(`Data: ${dataFormatada}`, 14, y2);

      y2 += 10;
    });

    pdf.save("estoque-intelligence.pdf");

  } catch (err) {
    console.error(err);
    alert("Erro ao gerar PDF");
  }
};

// =========================
// INIT
// =========================
carregarDashboard();