const API = window.API_URL;
const token = localStorage.getItem("token");
if (!token) window.location.href = "index.html";

async function carregarValidades() {
  const dias = document.getElementById("filtroDias").value;
  const container = document.getElementById("listaValidades");
  container.innerHTML = `<div class="empty-state"><p>Carregando...</p></div>`;

  try {
    const res = await fetch(`${API}/lotes/vencimentos?dias=${dias}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dados = await res.json();
    if (!res.ok) { showToast(dados.erro || "Erro ao carregar validades", "error"); return; }

    renderizarValidades(dados);

  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar validades", "error");
  }
}

function diasRestantes(dataValidade) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade + "T00:00:00");
  return Math.round((validade - hoje) / (1000 * 60 * 60 * 24));
}

function renderizarValidades(lotes) {
  const container = document.getElementById("listaValidades");

  if (!lotes || lotes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>✅ Nenhum lote vencido ou vencendo no período selecionado</p>
      </div>`;
    return;
  }

  container.innerHTML = lotes.map(l => {
    const dias = diasRestantes(l.data_validade);
    let badge, corBorda;

    if (l.vencido) {
      badge = `<span class="badge badge-danger">vencido há ${Math.abs(dias)} dia(s)</span>`;
      corBorda = "var(--danger)";
    } else if (dias <= 2) {
      badge = `<span class="badge badge-danger">vence em ${dias} dia(s)</span>`;
      corBorda = "var(--danger)";
    } else if (dias <= 7) {
      badge = `<span class="badge badge-warning">vence em ${dias} dia(s)</span>`;
      corBorda = "var(--warning)";
    } else {
      badge = `<span class="badge badge-info">vence em ${dias} dia(s)</span>`;
      corBorda = "var(--accent)";
    }

    const dataFormatada = new Date(l.data_validade + "T00:00:00").toLocaleDateString("pt-BR");

    return `
      <div class="validade-linha" style="border-left:3px solid ${corBorda}">
        <div>
          <div class="produto-nome">${escapeHtml(l.produto_nome)}</div>
          <div class="qtd">${formatarQuantidade(l.quantidade, l.unidade_medida)}</div>
        </div>
        <div class="qtd">${dataFormatada}</div>
        <div>${badge}</div>
        <div></div>
      </div>`;
  }).join("");
}

document.getElementById("filtroDias").addEventListener("change", carregarValidades);

carregarValidades();