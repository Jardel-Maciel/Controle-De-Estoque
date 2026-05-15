// =========================
// SISTEMA DE NOTIFICAÇÕES E CONFIRMAÇÕES
// Substitui alert() e confirm() nativos
// =========================

(function () {

  // ── TOAST (notificações flutuantes) ──────────────────────────

  function criarContainer() {
    let c = document.getElementById("toast-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "toast-container";
      document.body.appendChild(c);
    }
    return c;
  }

  /**
   * Exibe uma notificação toast.
   * @param {string} mensagem  - Texto a exibir
   * @param {"success"|"error"|"warning"|"info"} tipo - Tipo visual
   * @param {number} duracao   - Tempo em ms (padrão 3500)
   */
  window.showToast = function (mensagem, tipo = "info", duracao = 3500) {
    const container = criarContainer();

    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
      error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
      info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>`,
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[tipo] || icons.info}</span>
      <span class="toast-msg">${mensagem}</span>
      <button class="toast-close" aria-label="Fechar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <div class="toast-progress"></div>
    `;

    // Fechar ao clicar no X
    toast.querySelector(".toast-close").onclick = () => removerToast(toast);

    container.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => toast.classList.add("toast-show"));

    // Barra de progresso
    const bar = toast.querySelector(".toast-progress");
    bar.style.animationDuration = duracao + "ms";
    bar.classList.add("toast-progress-run");

    // Auto remover
    const timer = setTimeout(() => removerToast(toast), duracao);
    toast._timer = timer;

    // Pausar ao hover
    toast.addEventListener("mouseenter", () => {
      clearTimeout(toast._timer);
      bar.style.animationPlayState = "paused";
    });
    toast.addEventListener("mouseleave", () => {
      bar.style.animationPlayState = "running";
      toast._timer = setTimeout(() => removerToast(toast), 800);
    });

    return toast;
  };

  function removerToast(toast) {
    toast.classList.remove("toast-show");
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 350);
  }


  // ── CONFIRM MODAL ────────────────────────────────────────────

  /**
   * Modal de confirmação elegante (substitui confirm()).
   * Retorna uma Promise<boolean>.
   * @param {object} opcoes
   * @param {string} opcoes.titulo
   * @param {string} opcoes.mensagem
   * @param {string} opcoes.confirmTexto  (padrão "Confirmar")
   * @param {string} opcoes.cancelTexto   (padrão "Cancelar")
   * @param {"danger"|"warning"|"primary"} opcoes.tipo
   */
  window.showConfirm = function ({
    titulo       = "Confirmar ação",
    mensagem     = "Tem certeza?",
    confirmTexto = "Confirmar",
    cancelTexto  = "Cancelar",
    tipo         = "danger",
  } = {}) {
    return new Promise((resolve) => {

      // Remove qualquer confirm anterior
      document.getElementById("confirm-overlay")?.remove();

      const icons = {
        danger:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>`,
        primary: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>`,
      };

      const overlay = document.createElement("div");
      overlay.id = "confirm-overlay";
      overlay.innerHTML = `
        <div class="confirm-box" role="dialog" aria-modal="true">
          <div class="confirm-icon confirm-icon-${tipo}">
            ${icons[tipo] || icons.primary}
          </div>
          <h3 class="confirm-titulo">${titulo}</h3>
          <p class="confirm-msg">${mensagem}</p>
          <div class="confirm-actions">
            <button class="confirm-btn-cancel">${cancelTexto}</button>
            <button class="confirm-btn-ok confirm-btn-${tipo}">${confirmTexto}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add("confirm-show"));

      function fechar(resultado) {
        overlay.classList.remove("confirm-show");
        setTimeout(() => overlay.remove(), 300);
        resolve(resultado);
      }

      overlay.querySelector(".confirm-btn-ok").onclick     = () => fechar(true);
      overlay.querySelector(".confirm-btn-cancel").onclick  = () => fechar(false);

      // Fechar clicando fora
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) fechar(false);
      });

      // Fechar com Escape
      function onKey(e) {
        if (e.key === "Escape") { fechar(false); document.removeEventListener("keydown", onKey); }
        if (e.key === "Enter")  { fechar(true);  document.removeEventListener("keydown", onKey); }
      }
      document.addEventListener("keydown", onKey);

      // Foco no botão de confirmação
      setTimeout(() => overlay.querySelector(".confirm-btn-ok").focus(), 50);
    });
  };

})();