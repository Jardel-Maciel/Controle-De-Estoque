

(function () {
  'use strict';

  /* ─── Só injeta em telas ≤ 1024px ─── */
  const isMobileOrTablet = () => window.innerWidth <= 1024;

  /* ─── Estado ─── */
  const state = {
    stream: null,
    detector: null,
    scanning: false,
    animFrame: null,
    items: [],      // { code, name, qty, found }
    lastCode: null,
    lastCodeTs: 0,
  };

  /* ─── Injetar HTML ─── */
  function injectHTML() {
    /* FAB */
    const fab = document.createElement('button');
    fab.id = 'barcodeFab';
    fab.className = 'barcode-fab';
    fab.setAttribute('aria-label', 'Ler código de barras');
    fab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      <span class="barcode-fab-label">Scan</span>`;
    document.body.appendChild(fab);

    /* Modal */
    const overlay = document.createElement('div');
    overlay.id = 'barcodeModalOverlay';
    overlay.className = 'barcode-modal-overlay';
    overlay.innerHTML = `
      <div class="barcode-modal" role="dialog" aria-modal="true" aria-label="Leitor de código de barras">
        <div class="barcode-modal-handle"></div>

        <div class="barcode-modal-header">
          <span class="barcode-modal-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
              <path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/>
              <path d="M21 15v4a2 2 0 0 1-2 2h-4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/>
              <line x1="7" y1="8" x2="7" y2="16"/><line x1="10" y1="8" x2="10" y2="16"/>
              <line x1="13" y1="8" x2="13" y2="16"/>
            </svg>
            Leitor de Código de Barras
          </span>
          <button class="btn btn-ghost btn-icon" id="barcodeModalClose" aria-label="Fechar">✕</button>
        </div>

        <div class="barcode-modal-body">

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

          <!-- Digitação manual -->
          <div class="barcode-divider">ou digite o código</div>
          <div class="barcode-manual">
            <input
              class="form-input"
              type="text"
              id="barcodeManualInput"
              placeholder="Ex: 7891234567890"
              inputmode="numeric"
              maxlength="50"
            />
            <button class="btn btn-primary" id="barcodeManualBtn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              OK
            </button>
          </div>

          <!-- Lista de itens escaneados -->
          <div id="barcodeList" class="barcode-list" style="display:none"></div>

        </div>

        <div class="barcode-modal-footer">
          <button class="btn btn-secondary" id="barcodeModalCancel">Cancelar</button>
          <button class="btn btn-primary"   id="barcodeModalConfirm" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/>
            </svg>
            Importar itens
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  /* ─── Câmera ─── */
  async function startCamera() {
    const video = document.getElementById('barcodeVideo');
    const status = document.getElementById('barcodeStatus');

    try {
      state.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = state.stream;
      await video.play();
      status.textContent = 'Aponte para o código de barras';
      status.className = 'barcode-status';

      if (state.detector) {
        state.scanning = true;
        scanLoop(video);
      } else {
        status.textContent = 'Câmera ativa — use a digitação manual';
        status.className = 'barcode-status';
      }
    } catch (err) {
      console.warn('Câmera indisponível:', err);
      status.textContent = 'Câmera indisponível. Use a digitação manual.';
      status.className = 'barcode-status err';
      document.getElementById('barcodeVideoWrap').style.display = 'none';
    }
  }

  function stopCamera() {
    state.scanning = false;
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    if (state.stream) {
      state.stream.getTracks().forEach(t => t.stop());
      state.stream = null;
    }
  }

  /* ─── Loop de detecção ─── */
  async function scanLoop(video) {
    if (!state.scanning) return;

    try {
      const barcodes = await state.detector.detect(video);
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        const now = Date.now();
        /* debounce: ignora o mesmo código por 2s */
        if (code !== state.lastCode || now - state.lastCodeTs > 2000) {
          state.lastCode = code;
          state.lastCodeTs = now;
          handleCode(code);
        }
      }
    } catch (_) { /* frame inválido, ignora */ }

    state.animFrame = requestAnimationFrame(() => scanLoop(video));
  }

  /* ─── Processar código ─── */
  async function handleCode(code) {
    const status = document.getElementById('barcodeStatus');
    if (!code) return;

    /* Vibrar para feedback tátil */
    if (navigator.vibrate) navigator.vibrate(80);

    /* Verificar se já está na lista */
    const existing = state.items.find(i => i.code === code);
    if (existing) {
      existing.qty++;
      renderList();
      status.textContent = `+1 em "${existing.name}"`;
      status.className = 'barcode-status ok';
      return;
    }

    status.textContent = `Código ${code} lido — buscando…`;
    status.className = 'barcode-status';

    /* Buscar produto na API (se disponível) */
    let name = null;
    const token = localStorage.getItem('token');
    const API = window.API_URL || 'https://backend-estoque-fnfc.onrender.com';

    if (token) {
      try {
        const res = await fetch(`${API}/produtos?codigo=${encodeURIComponent(code)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            name = data[0].nome || data[0].name || data[0].produto || null;
          }
        }
      } catch (_) { /* API indisponível */ }
    }

    const item = { code, name: name || `Código ${code}`, qty: 1, found: !!name };
    state.items.push(item);
    renderList();

    status.textContent = name
      ? `✓ "${name}" adicionado`
      : `Código ${code} adicionado (produto não cadastrado)`;
    status.className = 'barcode-status ok';

    updateConfirmBtn();
  }

  /* ─── Renderizar lista ─── */
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/>
            <path d="M21 15v4a2 2 0 0 1-2 2h-4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/>
            <line x1="7" y1="8" x2="7" y2="16"/><line x1="13" y1="8" x2="13" y2="16"/>
          </svg>
        </div>
        <div class="barcode-item-info">
          <div class="barcode-item-name">${escHtml(item.name)}</div>
          <div class="barcode-item-code">${escHtml(item.code)}</div>
        </div>
        <div class="barcode-item-qty">
          <button data-action="dec" data-idx="${idx}" aria-label="Diminuir">−</button>
          <span>${item.qty}</span>
          <button data-action="inc" data-idx="${idx}" aria-label="Aumentar">+</button>
        </div>
        <button class="barcode-item-remove" data-action="del" data-idx="${idx}" aria-label="Remover">✕</button>
      </div>`).join('');

    /* Marcar como não-novo após render */
    state.items.forEach(i => { i._new = false; });

    updateConfirmBtn();
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function updateConfirmBtn() {
    const btn = document.getElementById('barcodeModalConfirm');
    if (btn) btn.disabled = state.items.length === 0;
  }

  /* ─── Abrir / fechar modal ─── */
  function openModal() {
    const overlay = document.getElementById('barcodeModalOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    state.items = [];
    state.lastCode = null;
    renderList();
    updateConfirmBtn();
    startCamera();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const overlay = document.getElementById('barcodeModalOverlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    stopCamera();
    document.body.style.overflow = '';

    const status = document.getElementById('barcodeStatus');
    if (status) { status.textContent = ''; status.className = 'barcode-status'; }

    const input = document.getElementById('barcodeManualInput');
    if (input) input.value = '';
  }

  /* ─── Importar itens ─── */
  async function importItems() {
    if (state.items.length === 0) return;

    const token = localStorage.getItem('token');
    const API   = window.API_URL || 'https://backend-estoque-fnfc.onrender.com';
    const btn   = document.getElementById('barcodeModalConfirm');
    const status = document.getElementById('barcodeStatus');

    btn.disabled = true;
    btn.textContent = 'Importando…';

    let ok = 0, fail = 0;

    for (const item of state.items) {
      try {
        /* Tenta entrada de movimentação por código de barras */
        const body = {
          codigo_barras: item.code,
          quantidade: item.qty,
          tipo: 'entrada',
          comentario: 'Importado via leitura de código de barras (mobile)',
          responsavel: localStorage.getItem('nome') || 'Mobile',
        };

        const res = await fetch(`${API}/movimentacoes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });

        if (res.ok) { ok++; } else { fail++; }
      } catch (_) { fail++; }
    }

    const msgFn = typeof showToast === 'function' ? showToast : (m) => alert(m);

    if (ok > 0 && fail === 0) {
      msgFn(`${ok} item(s) importado(s) com sucesso!`, 'success');
    } else if (ok > 0) {
      msgFn(`${ok} importado(s), ${fail} com erro.`, 'warning');
    } else {
      msgFn('Erro ao importar os itens. Verifique a conexão.', 'error');
    }

    closeModal();

    /* Recarregar lista de produtos se a função existir na página */
    if (typeof carregar === 'function') carregar();
    if (typeof carregarMovimentacoes === 'function') carregarMovimentacoes();
  }

  /* ─── Eventos ─── */
  function bindEvents() {
    /* FAB */
    document.getElementById('barcodeFab').addEventListener('click', openModal);

    /* Fechar */
    document.getElementById('barcodeModalClose').addEventListener('click', closeModal);
    document.getElementById('barcodeModalCancel').addEventListener('click', closeModal);

    /* Fechar clicando fora */
    document.getElementById('barcodeModalOverlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    /* Confirmar importação */
    document.getElementById('barcodeModalConfirm').addEventListener('click', importItems);

    /* Digitação manual */
    const manualInput = document.getElementById('barcodeManualInput');
    const manualBtn   = document.getElementById('barcodeManualBtn');

    function submitManual() {
      const code = manualInput.value.trim();
      if (!code) return;
      handleCode(code);
      manualInput.value = '';
      manualInput.focus();
    }

    manualBtn.addEventListener('click', submitManual);
    manualInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitManual();
    });

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

    /* Fechar com ESC */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('barcodeModalOverlay');
        if (overlay && overlay.classList.contains('open')) closeModal();
      }
    });
  }

  /* ─── Inicialização ─── */
  async function init() {
    if (!isMobileOrTablet()) return;

    injectHTML();
    bindEvents();

    /* Inicializar BarcodeDetector se disponível */
    if ('BarcodeDetector' in window) {
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        const wanted  = ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'];
        const supported = formats.filter(f => wanted.includes(f));
        state.detector = new BarcodeDetector({
          formats: supported.length > 0 ? supported : formats
        });
        console.info('[BarcodeScanner] BarcodeDetector disponível:', supported);
      } catch (err) {
        console.warn('[BarcodeScanner] BarcodeDetector falhou:', err);
      }
    } else {
      console.info('[BarcodeScanner] BarcodeDetector não disponível — usando modo manual');
    }
  }

  /* Aguardar DOM */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Re-verificar ao redimensionar a janela */
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