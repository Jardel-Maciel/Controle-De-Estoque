/**
 * barcode-scanner.js — Importador de Nota Fiscal via Câmera
 *
 * Fluxo em 3 etapas:
 *   1. Dados da NF (fornecedor, CNPJ, número da nota, data)
 *   2. Scan / digitação de produtos (código + qty + valor unitário)
 *   3. Revisão e confirmação → POST /produtos para cada item
 *
 * Compatível com: produtos.html (usa token, API, carregar())
 */

(function () {
  'use strict';

  /* ─── Só injeta em telas ≤ 1024px ─── */
  const isMobileOrTablet = () => window.innerWidth <= 1024;

  /* ─── Estado global ─── */
  const state = {
    step: 1,            // 1 | 2 | 3
    nf: {               // Dados da nota fiscal
      fornecedor: '',
      cnpj: '',
      numero_nota: '',
      data_emissao: '',
      contato: '',
    },
    items: [],          // { code, name, qty, valor, found, _new }
    stream: null,
    detector: null,
    scanning: false,
    animFrame: null,
    lastCode: null,
    lastCodeTs: 0,
  };

  /* ─── Utilitários ─── */
  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatCNPJ(v) {
    return v.replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  }

  const API   = window.API_URL;
  const token = () => localStorage.getItem('token');

  /* ═══════════════════════════════════════════
     HTML — injeta modal e FAB
  ═══════════════════════════════════════════ */
  function injectHTML() {
    /* FAB */
    const fab = document.createElement('button');
    fab.id = 'barcodeFab';
    fab.className = 'barcode-fab';
    fab.setAttribute('aria-label', 'Importar nota fiscal via câmera');
    fab.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9V5a2 2 0 0 1 2-2h4"/>
        <path d="M15 3h4a2 2 0 0 1 2 2v4"/>
        <path d="M21 15v4a2 2 0 0 1-2 2h-4"/>
        <path d="M9 21H5a2 2 0 0 1-2-2v-4"/>
        <line x1="7"  y1="8"  x2="7"  y2="16"/>
        <line x1="10" y1="8"  x2="10" y2="16"/>
        <line x1="13" y1="8"  x2="13" y2="16"/>
        <line x1="16" y1="8"  x2="16" y2="12"/>
        <line x1="16" y1="14" x2="16" y2="16"/>
      </svg>
      <span class="barcode-fab-label">Nota&nbsp;Fiscal</span>`;
    document.body.appendChild(fab);

    /* Modal */
    const overlay = document.createElement('div');
    overlay.id = 'barcodeModalOverlay';
    overlay.className = 'barcode-modal-overlay';
    overlay.innerHTML = `
      <div class="barcode-modal" role="dialog" aria-modal="true" aria-label="Importar Nota Fiscal via Câmera">
        <div class="barcode-modal-handle"></div>

        <!-- Header com título + stepper -->
        <div class="barcode-modal-header">
          <span class="barcode-modal-title">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
              <path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/>
              <path d="M21 15v4a2 2 0 0 1-2 2h-4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/>
              <line x1="7" y1="8" x2="7" y2="16"/><line x1="10" y1="8" x2="10" y2="16"/>
              <line x1="13" y1="8" x2="13" y2="16"/>
            </svg>
            Importar Nota Fiscal
          </span>
          <button class="btn btn-ghost btn-icon" id="barcodeModalClose" aria-label="Fechar">✕</button>
        </div>

        <!-- Stepper -->
        <div class="nf-stepper" id="nfStepper">
          <div class="nf-step active" data-step="1">
            <div class="nf-step-circle">1</div>
            <span>Dados NF</span>
          </div>
          <div class="nf-step-line"></div>
          <div class="nf-step" data-step="2">
            <div class="nf-step-circle">2</div>
            <span>Produtos</span>
          </div>
          <div class="nf-step-line"></div>
          <div class="nf-step" data-step="3">
            <div class="nf-step-circle">3</div>
            <span>Revisar</span>
          </div>
        </div>

        <div class="barcode-modal-body">

          <!-- ══ ETAPA 1 — Dados da NF ══ -->
          <div id="nfStep1" class="nf-panel active">
            <p class="nf-panel-hint">Preencha os dados da nota fiscal. Todos podem ser deixados em branco.</p>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Fornecedor</label>
                <input class="form-input" id="nfFornecedor" type="text" placeholder="Nome do fornecedor" autocomplete="off"/>
              </div>
              <div class="form-group">
                <label class="form-label">CNPJ</label>
                <input class="form-input" id="nfCNPJ" type="text" placeholder="00.000.000/0000-00" inputmode="numeric" maxlength="18"/>
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Número da Nota</label>
                <input class="form-input" id="nfNumero" type="text" placeholder="Ex: 000123" inputmode="numeric"/>
              </div>
              <div class="form-group">
                <label class="form-label">Data de Emissão</label>
                <input class="form-input" id="nfData" type="date"/>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Contato / Telefone</label>
              <input class="form-input" id="nfContato" type="text" placeholder="(11) 99999-9999" inputmode="tel"/>
            </div>
          </div>

          <!-- ══ ETAPA 2 — Scan de produtos ══ -->
          <div id="nfStep2" class="nf-panel">

            <!-- Visor câmera -->
            <div class="barcode-video-wrap" id="barcodeVideoWrap">
              <video id="barcodeVideo" autoplay muted playsinline></video>
              <div class="scan-line"></div>
              <div class="scan-corner tl"></div>
              <div class="scan-corner tr"></div>
              <div class="scan-corner bl"></div>
              <div class="scan-corner br"></div>
            </div>

            <p class="barcode-status" id="barcodeStatus">Iniciando câmera…</p>

            <!-- Digitação manual + campos do item -->
            <div class="nf-item-form">
              <div class="nf-item-code-row">
                <input class="form-input" type="text" id="barcodeManualInput"
                  placeholder="Código de barras ou nome"
                  inputmode="numeric" autocomplete="off"/>
                <button class="btn btn-primary" id="barcodeManualBtn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
                  OK
                </button>
              </div>
              <div class="nf-item-extras" id="nfItemExtras" style="display:none">
                <div class="form-row-2">
                  <div class="form-group">
                    <label class="form-label">Qtd.</label>
                    <input class="form-input" type="number" id="nfItemQty" value="1" min="1" step="1"/>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Valor unit. (R$)</label>
                    <input class="form-input" type="number" id="nfItemValor" placeholder="0.00" min="0" step="0.01"/>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Nome do produto</label>
                  <input class="form-input" type="text" id="nfItemNome" placeholder="Nome do produto"/>
                </div>
                <button class="btn btn-success nf-add-btn" id="nfAddItemBtn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Adicionar à nota
                </button>
              </div>
            </div>

            <!-- Lista de itens escaneados -->
            <div id="barcodeList" class="barcode-list" style="display:none"></div>
          </div>

          <!-- ══ ETAPA 3 — Revisão ══ -->
          <div id="nfStep3" class="nf-panel">
            <div class="nf-review" id="nfReview"></div>
          </div>

        </div><!-- /.barcode-modal-body -->

        <!-- Footer com botões contextuais -->
        <div class="barcode-modal-footer">
          <button class="btn btn-secondary" id="nfBtnBack" style="display:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar
          </button>
          <button class="btn btn-secondary" id="barcodeModalCancel">Cancelar</button>
          <button class="btn btn-primary"   id="nfBtnNext">
            Próximo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="btn btn-primary"   id="barcodeModalConfirm" style="display:none" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
            Importar nota
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  /* ═══════════════════════════════════════════
     STEPPER — navegação por etapas
  ═══════════════════════════════════════════ */
  function goToStep(n) {
    state.step = n;

    /* Atualizar painéis */
    [1, 2, 3].forEach(i => {
      const panel = document.getElementById(`nfStep${i}`);
      if (panel) panel.classList.toggle('active', i === n);
    });

    /* Atualizar stepper visual */
    document.querySelectorAll('.nf-step').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.toggle('active', s === n);
      el.classList.toggle('done', s < n);
    });

    /* Botões do footer */
    const btnBack    = document.getElementById('nfBtnBack');
    const btnNext    = document.getElementById('nfBtnNext');
    const btnConfirm = document.getElementById('barcodeModalConfirm');

    btnBack.style.display    = n > 1 ? 'flex' : 'none';
    btnNext.style.display    = n < 3 ? 'flex' : 'none';
    btnConfirm.style.display = n === 3 ? 'flex' : 'none';
    btnConfirm.disabled      = state.items.length === 0;

    /* Etapa 2: iniciar câmera */
    if (n === 2) startCamera();
    else stopCamera();

    /* Etapa 3: renderizar revisão */
    if (n === 3) renderReview();
  }

  /* ─── Avançar ─── */
  function nextStep() {
    if (state.step === 1) {
      /* Capturar dados NF */
      state.nf.fornecedor   = document.getElementById('nfFornecedor').value.trim();
      state.nf.cnpj         = document.getElementById('nfCNPJ').value.trim();
      state.nf.numero_nota  = document.getElementById('nfNumero').value.trim();
      state.nf.data_emissao = document.getElementById('nfData').value;
      state.nf.contato      = document.getElementById('nfContato').value.trim();
      goToStep(2);
    } else if (state.step === 2) {
      if (state.items.length === 0) {
        showMsg('Adicione ao menos um produto antes de continuar.', 'err');
        return;
      }
      goToStep(3);
    }
  }

  /* ─── Voltar ─── */
  function prevStep() {
    if (state.step > 1) goToStep(state.step - 1);
  }

  /* ═══════════════════════════════════════════
     CÂMERA
  ═══════════════════════════════════════════ */
  async function startCamera() {
    const video  = document.getElementById('barcodeVideo');
    const status = document.getElementById('barcodeStatus');
    if (!video) return;

    try {
      state.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = state.stream;
      await video.play();
      setStatus('Aponte para o código de barras do produto');

      if (state.detector) {
        state.scanning = true;
        scanLoop(video);
      } else {
        setStatus('Câmera ativa — use o campo abaixo para digitar o código');
      }
    } catch (err) {
      console.warn('[NF Scanner] Câmera indisponível:', err);
      setStatus('Câmera indisponível — use a digitação manual', 'err');
      const wrap = document.getElementById('barcodeVideoWrap');
      if (wrap) wrap.style.display = 'none';
    }
  }

  function stopCamera() {
    state.scanning = false;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    state.animFrame = null;
    if (state.stream) {
      state.stream.getTracks().forEach(t => t.stop());
      state.stream = null;
    }
  }

  /* ─── Loop detecção ─── */
  async function scanLoop(video) {
    if (!state.scanning) return;
    try {
      const barcodes = await state.detector.detect(video);
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        const now  = Date.now();
        if (code !== state.lastCode || now - state.lastCodeTs > 2000) {
          state.lastCode   = code;
          state.lastCodeTs = now;
          handleCodeScanned(code);
        }
      }
    } catch (_) { /* frame inválido */ }
    state.animFrame = requestAnimationFrame(() => scanLoop(video));
  }

  /* ═══════════════════════════════════════════
     PROCESSAR CÓDIGO LIDO / DIGITADO
  ═══════════════════════════════════════════ */
  async function handleCodeScanned(code) {
    if (!code) return;
    if (navigator.vibrate) navigator.vibrate(80);

    setStatus(`Código lido: ${code} — buscando produto…`);

    /* Preencher campo de código */
    const inp = document.getElementById('barcodeManualInput');
    if (inp) inp.value = code;

    /* Buscar na API */
    await lookupAndFillForm(code);
  }

  async function lookupAndFillForm(code) {
    const extrasDiv = document.getElementById('nfItemExtras');
    const nomeInput = document.getElementById('nfItemNome');
    const valorInput = document.getElementById('nfItemValor');

    extrasDiv.style.display = 'flex';

    /* Se já está na lista, pré-preencher qty como +1 */
    const existing = state.items.find(i => i.code === code);
    if (existing) {
      nomeInput.value = existing.name;
      valorInput.value = existing.valor || '';
      document.getElementById('nfItemQty').value = 1;
      setStatus(`Produto já na lista — ajuste a quantidade se necessário`);
      return;
    }

    /* Buscar na API */
    let nome = null;
    let valor = null;
    try {
      const res = await fetch(`${API}/produtos?codigo=${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          nome  = data[0].nome || data[0].produto || data[0].name || null;
          valor = data[0].valor || null;
        }
      }
    } catch (_) { /* API offline */ }

    nomeInput.value  = nome || '';
    valorInput.value = valor || '';
    document.getElementById('nfItemQty').value = 1;

    if (nome) {
      setStatus(`✓ "${nome}" encontrado no estoque`);
    } else {
      setStatus(`Produto não cadastrado — preencha o nome abaixo`, '');
      nomeInput.focus();
    }
  }

  /* ─── Adicionar item à lista ─── */
  function addItemFromForm() {
    const code  = document.getElementById('barcodeManualInput').value.trim();
    const nome  = document.getElementById('nfItemNome').value.trim();
    const qty   = parseInt(document.getElementById('nfItemQty').value) || 1;
    const valor = parseFloat(document.getElementById('nfItemValor').value) || 0;

    if (!code && !nome) {
      setStatus('Digite o código ou nome do produto', 'err');
      return;
    }

    const key = code || nome;

    /* Se já existe, somar quantidade */
    const existing = state.items.findIndex(i => i.code === key);
    if (existing >= 0) {
      state.items[existing].qty += qty;
      state.items[existing]._new = true;
      if (valor > 0) state.items[existing].valor = valor;
    } else {
      state.items.push({
        code:  key,
        name:  nome || `Código ${key}`,
        qty,
        valor,
        found: !!nome,
        _new:  true,
      });
    }

    /* Limpar formulário */
    document.getElementById('barcodeManualInput').value = '';
    document.getElementById('nfItemNome').value  = '';
    document.getElementById('nfItemValor').value = '';
    document.getElementById('nfItemQty').value   = 1;
    document.getElementById('nfItemExtras').style.display = 'none';
    document.getElementById('barcodeManualInput').focus();
    state.lastCode = null; // permite re-escanear mesmo código

    renderList();
    setStatus(`✓ Item adicionado à nota (${state.items.length} produto(s))`, 'ok');
  }

  /* ═══════════════════════════════════════════
     RENDER — lista de itens (etapa 2)
  ═══════════════════════════════════════════ */
  function renderList() {
    const list = document.getElementById('barcodeList');
    if (!list) return;

    if (state.items.length === 0) {
      list.style.display = 'none';
      list.innerHTML = '';
      return;
    }

    list.style.display = 'flex';
    list.innerHTML = state.items.map((item, idx) => `
      <div class="barcode-item ${item._new ? 'novo' : ''}" data-idx="${idx}">
        <div class="barcode-item-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/>
            <path d="M21 15v4a2 2 0 0 1-2 2h-4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/>
            <line x1="7" y1="8" x2="7" y2="16"/><line x1="13" y1="8" x2="13" y2="16"/>
          </svg>
        </div>
        <div class="barcode-item-info">
          <div class="barcode-item-name">${escHtml(item.name)}</div>
          <div class="barcode-item-code">${escHtml(item.code)}${item.valor > 0 ? ` · R$&nbsp;${Number(item.valor).toFixed(2)}` : ''}</div>
        </div>
        <div class="barcode-item-qty">
          <button data-action="dec" data-idx="${idx}" aria-label="Diminuir">−</button>
          <span>${item.qty}</span>
          <button data-action="inc" data-idx="${idx}" aria-label="Aumentar">+</button>
        </div>
        <button class="barcode-item-remove" data-action="del" data-idx="${idx}" aria-label="Remover">✕</button>
      </div>`).join('');

    state.items.forEach(i => { i._new = false; });
  }

  /* ═══════════════════════════════════════════
     RENDER — revisão (etapa 3)
  ═══════════════════════════════════════════ */
  function renderReview() {
    const nf = state.nf;
    const div = document.getElementById('nfReview');
    if (!div) return;

    const totalItens = state.items.reduce((s, i) => s + i.qty, 0);
    const totalValor = state.items.reduce((s, i) => s + (i.qty * (i.valor || 0)), 0);

    const nfInfo = [
      nf.fornecedor ? `<span class="nf-rev-label">Fornecedor:</span> ${escHtml(nf.fornecedor)}` : null,
      nf.cnpj       ? `<span class="nf-rev-label">CNPJ:</span> ${escHtml(nf.cnpj)}` : null,
      nf.numero_nota? `<span class="nf-rev-label">Nota:</span> ${escHtml(nf.numero_nota)}` : null,
      nf.data_emissao? `<span class="nf-rev-label">Data:</span> ${escHtml(nf.data_emissao)}` : null,
      nf.contato    ? `<span class="nf-rev-label">Contato:</span> ${escHtml(nf.contato)}` : null,
    ].filter(Boolean);

    div.innerHTML = `
      <div class="nf-rev-card">
        <div class="nf-rev-card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          Dados da Nota Fiscal
        </div>
        ${nfInfo.length > 0
          ? `<div class="nf-rev-meta">${nfInfo.join('<br>')}</div>`
          : `<div class="nf-rev-meta empty">Nenhum dado de NF informado</div>`
        }
      </div>

      <div class="nf-rev-card">
        <div class="nf-rev-card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          ${state.items.length} produto(s) · ${totalItens} unidade(s)
          ${totalValor > 0 ? `· <strong>R$ ${totalValor.toFixed(2)}</strong>` : ''}
        </div>
        <div class="nf-rev-items">
          ${state.items.map(item => `
            <div class="nf-rev-item">
              <span class="nf-rev-item-name">${escHtml(item.name)}</span>
              <span class="nf-rev-item-detail">
                ${item.qty}x
                ${item.valor > 0 ? `· R$ ${Number(item.valor).toFixed(2)}` : ''}
              </span>
            </div>`).join('')}
        </div>
      </div>

      <p class="nf-rev-hint">
        Ao importar, cada produto será adicionado ao estoque. Se já existir, a quantidade será somada e o valor médio recalculado.
      </p>`;

    document.getElementById('barcodeModalConfirm').disabled = state.items.length === 0;
  }

  /* ═══════════════════════════════════════════
     IMPORTAR — POST /produtos para cada item
  ═══════════════════════════════════════════ */
  async function importarNota() {
    if (state.items.length === 0) return;

    const btn    = document.getElementById('barcodeModalConfirm');
    const btnTxt = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span style="opacity:.7">Importando…</span>';

    let ok = 0, fail = 0;

    for (const item of state.items) {
      try {
        const body = {
          produto:      item.name,
          quantidade:   item.qty,
          valor:        item.valor || 0,
          fornecedor:   state.nf.fornecedor  || undefined,
          cnpj:         state.nf.cnpj        || undefined,
          numero_nota:  state.nf.numero_nota || undefined,
          data_emissao: state.nf.data_emissao|| undefined,
          contato:      state.nf.contato     || undefined,
          codigo_barras: item.code !== item.name ? item.code : undefined,
          responsavel:  localStorage.getItem('nome') || 'Mobile',
        };

        /* Remove campos undefined */
        Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

        const res = await fetch(`${API}/produtos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token()}`
          },
          body: JSON.stringify(body),
        });

        if (res.ok) { ok++; } else { fail++; }
      } catch (_) { fail++; }
    }

    const msg = typeof showToast === 'function' ? showToast : (m) => alert(m);

    if (ok > 0 && fail === 0) {
      msg(`✓ ${ok} produto(s) importado(s) com sucesso!`, 'success');
    } else if (ok > 0) {
      msg(`${ok} importado(s), ${fail} com erro.`, 'warning');
    } else {
      msg('Erro ao importar os produtos. Verifique a conexão.', 'error');
      btn.disabled = false;
      btn.innerHTML = btnTxt;
      return;
    }

    closeModal();

    if (typeof carregar === 'function') carregar();
    if (typeof carregarMovimentacoes === 'function') carregarMovimentacoes();
  }

  /* ═══════════════════════════════════════════
     MODAL — abrir / fechar
  ═══════════════════════════════════════════ */
  function openModal() {
    const overlay = document.getElementById('barcodeModalOverlay');
    if (!overlay) return;

    /* Reset estado */
    state.step = 1;
    state.items = [];
    state.lastCode = null;
    state.nf = { fornecedor: '', cnpj: '', numero_nota: '', data_emissao: '', contato: '' };

    /* Limpar campos etapa 1 */
    ['nfFornecedor','nfCNPJ','nfNumero','nfData','nfContato'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    /* Definir data de hoje como padrão */
    const today = new Date().toISOString().split('T')[0];
    const dataEl = document.getElementById('nfData');
    if (dataEl) dataEl.value = today;

    /* Limpar etapa 2 */
    const manualInp = document.getElementById('barcodeManualInput');
    if (manualInp) manualInp.value = '';
    const extrasDiv = document.getElementById('nfItemExtras');
    if (extrasDiv) extrasDiv.style.display = 'none';
    renderList();

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    goToStep(1);
  }

  function closeModal() {
    const overlay = document.getElementById('barcodeModalOverlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    stopCamera();
    document.body.style.overflow = '';
  }

  /* ─── Utilitário status ─── */
  function setStatus(msg, cls = '') {
    const el = document.getElementById('barcodeStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'barcode-status' + (cls ? ` ${cls}` : '');
  }

  /* ═══════════════════════════════════════════
     EVENTOS
  ═══════════════════════════════════════════ */
  function bindEvents() {
    document.getElementById('barcodeFab').addEventListener('click', openModal);
    document.getElementById('barcodeModalClose').addEventListener('click', closeModal);
    document.getElementById('barcodeModalCancel').addEventListener('click', closeModal);

    /* Fechar clicando fora */
    document.getElementById('barcodeModalOverlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    /* Navegação stepper */
    document.getElementById('nfBtnNext').addEventListener('click', nextStep);
    document.getElementById('nfBtnBack').addEventListener('click', prevStep);

    /* Importar */
    document.getElementById('barcodeModalConfirm').addEventListener('click', importarNota);

    /* Máscara CNPJ */
    document.getElementById('nfCNPJ').addEventListener('input', function () {
      this.value = formatCNPJ(this.value);
    });

    /* Digitação manual de código → mostrar extras */
    const manualInput = document.getElementById('barcodeManualInput');
    manualInput.addEventListener('keydown', async function (e) {
      if (e.key === 'Enter') {
        const code = this.value.trim();
        if (!code) return;
        await lookupAndFillForm(code);
      }
    });
    manualInput.addEventListener('input', function () {
      /* Esconder extras se o campo for limpo */
      if (!this.value.trim()) {
        document.getElementById('nfItemExtras').style.display = 'none';
      }
    });

    /* Botão OK da digitação manual */
    document.getElementById('barcodeManualBtn').addEventListener('click', async function () {
      const code = manualInput.value.trim();
      const extrasDiv = document.getElementById('nfItemExtras');
      if (!code) return;

      /* Se extras já está visível, adicionar direto */
      if (extrasDiv.style.display !== 'none') {
        addItemFromForm();
      } else {
        await lookupAndFillForm(code);
      }
    });

    /* Botão "Adicionar à nota" */
    document.getElementById('nfAddItemBtn').addEventListener('click', addItemFromForm);

    /* Ações na lista (inc/dec/del) */
    document.getElementById('barcodeList').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const idx    = parseInt(btn.dataset.idx, 10);
      const action = btn.dataset.action;

      if (action === 'inc') {
        state.items[idx].qty++;
      } else if (action === 'dec') {
        state.items[idx].qty--;
        if (state.items[idx].qty <= 0) state.items.splice(idx, 1);
      } else if (action === 'del') {
        state.items.splice(idx, 1);
      }
      renderList();
    });

    /* ESC fecha modal */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('barcodeModalOverlay');
        if (overlay && overlay.classList.contains('open')) closeModal();
      }
    });
  }

  /* ═══════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════ */
  async function init() {
    if (!isMobileOrTablet()) return;

    injectHTML();
    bindEvents();

    /* BarcodeDetector */
    if ('BarcodeDetector' in window) {
      try {
        const formats  = await BarcodeDetector.getSupportedFormats();
        const wanted   = ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e'];
        const supported = formats.filter(f => wanted.includes(f));
        state.detector = new BarcodeDetector({
          formats: supported.length > 0 ? supported : formats
        });
        console.info('[NF Scanner] BarcodeDetector ativo:', supported);
      } catch (err) {
        console.warn('[NF Scanner] BarcodeDetector falhou:', err);
      }
    } else {
      console.info('[NF Scanner] BarcodeDetector não disponível — modo manual ativo');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      const fab = document.getElementById('barcodeFab');
      if (!fab) { if (isMobileOrTablet()) init(); return; }
      fab.style.display = isMobileOrTablet() ? 'flex' : 'none';
    }, 200);
  });

})();
