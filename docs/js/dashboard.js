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
    if (!res.ok) throw new Error("Logo não encontrada");
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => { logoBase64 = reader.result; resolve(); };
      reader.onerror = () => { logoBase64 = null; reject(); };
      reader.readAsDataURL(blob);
    });
  } catch {
    logoBase64 = null;
  }
}

// =========================
// MOVIMENTAÇÕES
// =========================
async function carregarMovimentacoes() {
  try {
    const res = await fetch(`${API}/movimentacoes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dados = await res.json();
    if (!res.ok) { console.error("Erro movimentações:", dados.erro); return; }
    const lista = Array.isArray(dados)
      ? dados
      : dados.movimentacoes || dados.data || dados.items || [];
    movimentacoesCache = lista.map(normalizarMovimentacao);
  } catch (err) {
    console.error("Erro em carregarMovimentacoes:", err);
    movimentacoesCache = [];
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
    console.error("Erro em carregarDashboard:", err);
  }
}

// =========================
// UTILITÁRIOS PDF
// =========================
const truncate = (t, m) =>
  String(t || "-").length > m
    ? String(t).substring(0, m) + "…"
    : String(t || "-");

// Paleta corporativa (preto, cinza, branco + vermelho de alerta)
const C = {
  black:       [10,  10,  10],
  darkGray:    [30,  30,  30],
  midGray:     [90,  90,  90],
  lightGray:   [160, 160, 160],
  ultraLight:  [245, 245, 245],
  white:       [255, 255, 255],
  accent:      [200, 30,  30],   // vermelho corporativo (alertas / destaque)
  accentGreen: [22,  163, 74],   // verde (ok / entrada)
  rule:        [210, 210, 210],  // linha divisória
};

// Cabeçalho de seção reutilizável
function secHeader(pdf, titulo, subtitulo, dateShort) {
  const W = 210;
  pdf.setFillColor(...C.black);
  pdf.rect(0, 0, W, 18, "F");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...C.white);
  pdf.text(titulo.toUpperCase(), 15, 11);
  if (subtitulo) {
    pdf.setTextColor(180, 180, 180);
    pdf.text(subtitulo, W - 15, 11, { align: "right" });
  }
  // linha vermelha abaixo do header
  pdf.setFillColor(...C.accent);
  pdf.rect(0, 18, W, 1.2, "F");
}

// Rodapé — chamado no final de cada página (exceto capa)
function rodape(pdf, pageNum, totalPages, dataStr) {
  const W = 210;
  const Y = 287;
  pdf.setDrawColor(...C.rule);
  pdf.setLineWidth(0.3);
  pdf.line(15, Y - 4, W - 15, Y - 4);
  pdf.setFontSize(7);
  pdf.setTextColor(...C.lightGray);
  pdf.text("Relatório de Estoque — Uso Interno Confidencial", 15, Y);
  pdf.text(dataStr, W / 2, Y, { align: "center" });
  pdf.text(`${pageNum} / ${totalPages}`, W - 15, Y, { align: "right" });
}

// Gráfico de barras horizontal embutido no PDF
function desenharGrafico(pdf, startY, titulo, dados, corBarra) {
  const LEFT = 15;
  const labelW = 52;
  const maxBarW = 108;
  const barH = 5.5;
  const gap = 3;

  if (!dados.length) return startY;

  let y = startY;

  pdf.setFontSize(9);
  pdf.setTextColor(...C.darkGray);
  pdf.text(titulo, LEFT, y);
  y += 3;

  pdf.setDrawColor(...C.rule);
  pdf.setLineWidth(0.3);
  pdf.line(LEFT, y, LEFT + 180, y);
  y += 5;

  const maxVal = Math.max(...dados.map(d => d.valor), 1);

  dados.forEach((d, i) => {
    const barW = Math.max((d.valor / maxVal) * maxBarW, 1);

    if (i % 2 === 0) {
      pdf.setFillColor(...C.ultraLight);
      pdf.rect(LEFT, y - 4, 180, barH + gap, "F");
    }

    pdf.setFontSize(7);
    pdf.setTextColor(...C.darkGray);
    pdf.text(truncate(d.label, 22), LEFT + 1, y);

    pdf.setFillColor(...corBarra);
    pdf.roundedRect(LEFT + labelW, y - 4, barW, barH, 1.2, 1.2, "F");

    pdf.setFontSize(6.5);
    pdf.setTextColor(...C.midGray);
    pdf.text(String(d.valor), LEFT + labelW + barW + 2, y);

    y += barH + gap;
  });

  return y + 4;
}

// =========================
// GERAR PDF CORPORATIVO
// =========================
async function gerarPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const W = 210;
  const dataStr = new Date().toLocaleString("pt-BR");
  const dateShort = new Date().toLocaleDateString("pt-BR");

  let paginaAtual = 1;
  const novaPage = () => { pdf.addPage(); paginaAtual++; };

  // ─────────────────────────────────
  // PG 1 — CAPA
  // ─────────────────────────────────

  // Fundo branco total
  pdf.setFillColor(...C.white);
  pdf.rect(0, 0, W, 297, "F");

  // Bloco preto no topo
  pdf.setFillColor(...C.black);
  pdf.rect(0, 0, W, 80, "F");

  // Linha vermelha abaixo do bloco preto
  pdf.setFillColor(...C.accent);
  pdf.rect(0, 80, W, 2, "F");

  // Logo centralizado no bloco preto
  if (logoBase64) {
    pdf.addImage(logoBase64, "PNG", W / 2 - 22, 14, 44, 0);
  } else {
    // Fallback: texto do sistema
    pdf.setFontSize(13);
    pdf.setTextColor(...C.white);
    pdf.text("SISTEMA DE ESTOQUE", W / 2, 42, { align: "center" });
  }

  // Título na área branca
  pdf.setFontSize(30);
  pdf.setTextColor(...C.black);
  pdf.text("RELATÓRIO DE", 15, 106);
  pdf.setTextColor(...C.accent);
  pdf.text("ESTOQUE", 15, 120);

  // Subtítulo
  pdf.setFontSize(9);
  pdf.setTextColor(...C.midGray);
  pdf.text("Visão analítica do inventário  ·  Uso interno confidencial", 15, 129);

  // Linha divisória
  pdf.setDrawColor(...C.rule);
  pdf.setLineWidth(0.5);
  pdf.line(15, 136, W - 15, 136);

  // Metadados da capa em 3 colunas
  const metaCols = [
    { label: "Data de emissão",  valor: dataStr,                                                x: 15  },
    { label: "Total de produtos", valor: String(dashboard.total_produtos || produtosCache.length || 0), x: 80  },
    { label: "Valor total em estoque", valor: `R$ ${(dashboard.valor_total || 0).toFixed(2)}`,  x: 145 },
  ];

  metaCols.forEach(m => {
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.lightGray);
    pdf.text(m.label.toUpperCase(), m.x, 145);
    pdf.setFontSize(10);
    pdf.setTextColor(...C.darkGray);
    pdf.text(m.valor, m.x, 153);
  });

  // Linha divisória
  pdf.setDrawColor(...C.rule);
  pdf.setLineWidth(0.3);
  pdf.line(15, 160, W - 15, 160);

  // Índice
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.lightGray);
  pdf.text("CONTEÚDO", 15, 169);

  const secoes = [
    ["01", "Resumo Executivo & Alertas"],
    ["02", "Produtos em Estoque"],
    ["03", "Análise Gráfica"],
    ["04", "Movimentações"],
  ];

  let sy = 177;
  secoes.forEach(([num, nome]) => {
    // número em vermelho
    pdf.setFontSize(8);
    pdf.setTextColor(...C.accent);
    pdf.text(num, 15, sy);
    // nome
    pdf.setTextColor(...C.darkGray);
    pdf.text(nome, 26, sy);
    // linha pontilhada
    pdf.setDrawColor(...C.rule);
    pdf.setLineWidth(0.2);
    pdf.line(26, sy + 1.5, W - 15, sy + 1.5);
    sy += 9;
  });

  // Rodapé da capa (simples, sem paginação)
  pdf.setFillColor(...C.black);
  pdf.rect(0, 282, W, 15, "F");
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text("Relatório de Estoque — Uso Interno Confidencial", 15, 291);
  pdf.text(dateShort, W - 15, 291, { align: "right" });

  // ─────────────────────────────────
  // PG 2 — RESUMO EXECUTIVO
  // ─────────────────────────────────
  novaPage();
  secHeader(pdf, "Resumo Executivo", dateShort);

  // KPI Cards (4 cards)
  const kpis = [
    { label: "Produtos",      valor: String(dashboard.total_produtos || produtosCache.length || 0), alerta: false },
    { label: "Itens totais",  valor: String(dashboard.total_itens || 0),                            alerta: false },
    { label: "Estoque crítico", valor: String(dashboard.baixo_estoque || produtosCache.filter(p => p.status === "baixo").length || 0), alerta: true },
    { label: "Valor total",   valor: `R$ ${(dashboard.valor_total || 0).toFixed(2)}`,               alerta: false },
  ];

  const cW = 40, cH = 26, cGap = 6, cX0 = 15, cY0 = 27;

  kpis.forEach((k, i) => {
    const cx = cX0 + i * (cW + cGap);

    // sombra
    pdf.setFillColor(215, 215, 215);
    pdf.roundedRect(cx + 0.7, cY0 + 0.7, cW, cH, 2, 2, "F");

    // card
    pdf.setFillColor(...C.white);
    pdf.setDrawColor(...C.rule);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(cx, cY0, cW, cH, 2, 2, "FD");

    // borda top
    pdf.setFillColor(...(k.alerta ? C.accent : C.black));
    pdf.roundedRect(cx, cY0, cW, 2.5, 1, 1, "F");

    // valor
    pdf.setFontSize(12);
    pdf.setTextColor(...(k.alerta ? C.accent : C.darkGray));
    pdf.text(k.valor, cx + 4, cY0 + 14);

    // label
    pdf.setFontSize(6.5);
    pdf.setTextColor(...C.midGray);
    pdf.text(k.label.toUpperCase(), cx + 4, cY0 + 21);
  });

  // Alertas de estoque crítico
  const baixos = produtosCache.filter(p => p.status === "baixo");
  let yA = cY0 + cH + 10;

  pdf.setFontSize(9);
  pdf.setTextColor(...C.darkGray);
  pdf.text("Alertas de Estoque Crítico", 15, yA);

  // sotaque vermelho
  pdf.setFillColor(...C.accent);
  pdf.rect(15, yA + 2, 3, 0.8, "F");
  yA += 8;

  if (baixos.length === 0) {
    pdf.setFontSize(8.5);
    pdf.setTextColor(...C.midGray);
    pdf.text("Nenhum produto com estoque crítico no momento.", 15, yA);
    yA += 8;
  } else {
    pdf.setFillColor(...C.black);
    pdf.rect(15, yA - 5, 180, 7.5, "F");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.white);
    pdf.text("Produto",     18,  yA);
    pdf.text("Quantidade", 120,  yA);
    pdf.text("Valor Unit.", 158, yA);
    yA += 5;

    baixos.forEach((p, i) => {
      if (yA > 272) return;
      pdf.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 243 : 240, i % 2 === 0 ? 243 : 240);
      pdf.rect(15, yA - 4.5, 180, 7, "F");

      pdf.setFontSize(8);
      pdf.setTextColor(...C.darkGray);
      pdf.text(truncate(p.nome, 36), 18, yA);

      pdf.setTextColor(...C.accent);
      pdf.text(String(p.quantidade), 120, yA);

      pdf.setTextColor(...C.darkGray);
      pdf.text(`R$ ${p.valor.toFixed(2)}`, 158, yA);

      pdf.setDrawColor(...C.rule);
      pdf.setLineWidth(0.1);
      pdf.line(15, yA + 2.5, 195, yA + 2.5);

      yA += 7;
    });
  }

  rodape(pdf, 2, "?", dataStr);

  // ─────────────────────────────────
  // PG 3 — TABELA DE PRODUTOS
  // ─────────────────────────────────
  novaPage();
  secHeader(pdf, "Produtos em Estoque", `${produtosCache.length} itens · ${dateShort}`);

  let yP = 28;

  function tabelaHeaderProdutos() {
    pdf.setFillColor(...C.black);
    pdf.rect(15, yP - 5.5, 180, 8, "F");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.white);
    pdf.text("#",            18,  yP);
    pdf.text("Produto",      26,  yP);
    pdf.text("Qtd",         120,  yP);
    pdf.text("Valor Unit.",  140,  yP);
    pdf.text("Total",        165,  yP);
    pdf.text("Status",       185,  yP);
    yP += 6;
  }

  tabelaHeaderProdutos();

  const totalGeralProdutos = produtosCache.reduce((s, p) => s + p.valor * p.quantidade, 0);

  produtosCache.forEach((p, i) => {
    if (yP > 272) {
      rodape(pdf, paginaAtual, "?", dataStr);
      novaPage();
      secHeader(pdf, "Produtos em Estoque (cont.)", dateShort);
      yP = 28;
      tabelaHeaderProdutos();
    }

    pdf.setFillColor(...(i % 2 === 0 ? C.white : C.ultraLight));
    pdf.rect(15, yP - 4.5, 180, 7, "F");

    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.midGray);
    pdf.text(String(i + 1).padStart(2, "0"), 18, yP);

    pdf.setTextColor(...C.darkGray);
    pdf.text(truncate(p.nome, 34), 26,  yP);
    pdf.text(String(p.quantidade),  120, yP);
    pdf.text(`R$ ${p.valor.toFixed(2)}`, 140, yP);
    pdf.text(`R$ ${(p.valor * p.quantidade).toFixed(2)}`, 165, yP);

    if (p.status === "baixo") {
      pdf.setTextColor(...C.accent);
      pdf.text("CRÍTICO", 185, yP);
    } else {
      pdf.setTextColor(...C.accentGreen);
      pdf.text("OK", 185, yP);
    }

    pdf.setDrawColor(...C.rule);
    pdf.setLineWidth(0.1);
    pdf.line(15, yP + 2.5, 195, yP + 2.5);

    yP += 7;
  });

  // Linha de total geral
  if (yP < 272) {
    yP += 2;
    pdf.setFillColor(...C.black);
    pdf.rect(15, yP - 5, 180, 7.5, "F");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.white);
    pdf.text("TOTAL GERAL", 26, yP);
    pdf.text(`R$ ${totalGeralProdutos.toFixed(2)}`, 165, yP);
  }

  rodape(pdf, paginaAtual, "?", dataStr);

  // ─────────────────────────────────
  // PG 4 — GRÁFICOS
  // ─────────────────────────────────
  novaPage();
  secHeader(pdf, "Análise Gráfica", "Distribuição por produto");

  let yG = 28;

  const dadosQtd = [...produtosCache]
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 15)
    .map(p => ({ label: p.nome, valor: p.quantidade }));

  const dadosVal = [...produtosCache]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 15)
    .map(p => ({ label: p.nome, valor: p.valor }));

  yG = desenharGrafico(pdf, yG, "Quantidade em Estoque por Produto", dadosQtd, C.darkGray);
  yG += 8;
  yG = desenharGrafico(pdf, yG, "Valor Unitário por Produto (R$)", dadosVal, C.accent);

  rodape(pdf, paginaAtual, "?", dataStr);

  // ─────────────────────────────────
  // PG 5 — MOVIMENTAÇÕES
  // ─────────────────────────────────
  novaPage();
  secHeader(pdf, "Movimentações", `${movimentacoesCache.length} registros`);

  let yM = 28;

  function tabelaHeaderMov() {
    pdf.setFillColor(...C.black);
    pdf.rect(15, yM - 5.5, 180, 8, "F");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.white);
    pdf.text("Produto",      18,  yM);
    pdf.text("Qtd",          90,  yM);
    pdf.text("Tipo",        108,  yM);
    pdf.text("Responsável", 130,  yM);
    pdf.text("Data",        172,  yM);
    yM += 6;
  }

  tabelaHeaderMov();

  if (movimentacoesCache.length === 0) {
    pdf.setFontSize(8.5);
    pdf.setTextColor(...C.midGray);
    pdf.text("Nenhuma movimentação registrada.", 18, yM + 4);
  }

  movimentacoesCache.forEach((m, i) => {
    if (yM > 272) {
      rodape(pdf, paginaAtual, "?", dataStr);
      novaPage();
      secHeader(pdf, "Movimentações (cont.)", dateShort);
      yM = 28;
      tabelaHeaderMov();
    }

    pdf.setFillColor(...(i % 2 === 0 ? C.white : C.ultraLight));
    pdf.rect(15, yM - 4.5, 180, 7, "F");

    const tipoRaw = (m.tipo || "").toLowerCase();
    const tipo =
      tipoRaw.includes("entrada") ? "ENTRADA" :
      tipoRaw.includes("saida")   ? "SAÍDA"   : "-";

    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.darkGray);
    pdf.text(truncate(m.produto, 27), 18, yM);
    pdf.text(String(m.quantidade || 0), 90, yM);

    if (tipo === "SAÍDA")        pdf.setTextColor(...C.accent);
    else if (tipo === "ENTRADA") pdf.setTextColor(...C.accentGreen);
    else                         pdf.setTextColor(...C.midGray);
    pdf.text(tipo, 108, yM);

    pdf.setTextColor(...C.darkGray);
    pdf.text(truncate(m.responsavel, 16), 130, yM);
    pdf.text(m.data ? new Date(m.data).toLocaleDateString("pt-BR") : "-", 172, yM);

    pdf.setDrawColor(...C.rule);
    pdf.setLineWidth(0.1);
    pdf.line(15, yM + 2.5, 195, yM + 2.5);

    yM += 7;
  });

  rodape(pdf, paginaAtual, "?", dataStr);

  // ─────────────────────────────────
  // CORRIGIR PAGINAÇÃO (X / TOTAL)
  // ─────────────────────────────────
  const totalPages = paginaAtual;

  for (let pg = 2; pg <= totalPages; pg++) {
    pdf.setPage(pg);
    // cobre o "?" com retângulo branco
    pdf.setFillColor(...C.white);
    pdf.rect(W - 30, 283, 28, 6, "F");
    // reescreve com total correto
    pdf.setFontSize(7);
    pdf.setTextColor(...C.lightGray);
    pdf.text(`${pg} / ${totalPages}`, W - 15, 287, { align: "right" });
  }

  pdf.save("relatorio-estoque.pdf");
}

// =========================
// BOTÃO PDF
// =========================
function iniciarBotaoPDF() {
  const btn = document.getElementById("btnDownloadPDF");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("Biblioteca de PDF ainda não carregou. Aguarde e tente novamente.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Gerando PDF…";

    try {
      await carregarLogo();
      await carregarMovimentacoes();
      await gerarPDF();
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar o PDF. Verifique o console para mais detalhes.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Baixar PDF";
    }
  });
}

// =========================
// INIT
// =========================
carregarDashboard();
carregarMovimentacoes();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarBotaoPDF);
} else {
  iniciarBotaoPDF();
}