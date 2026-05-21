/**
 * ESTOQUE FÁCIL — Mobile Enhancements
 * Script complementar: adiciona data-labels nas tabelas,
 * bottom navigation e overlay da sidebar.
 *
 * Inclua este script ao final do <body> em todas as páginas:
 * <script src="js/mobile-enhancements.js"></script>
 */

(function () {
  'use strict';

  /* ---- Detecta mobile ---- */
  function isMobile() {
    return window.innerWidth <= 768;
  }

  /* ================================================
     1. DATA-LABELS nas tabelas
     Lê os <th> e adiciona data-label em cada <td>
     para o CSS mostrar o label antes do valor.
  ================================================ */
  function applyTableDataLabels() {
    document.querySelectorAll('table').forEach(function (table) {
      const headers = Array.from(table.querySelectorAll('thead th')).map(th =>
        th.textContent.trim()
      );

      table.querySelectorAll('tbody tr').forEach(function (row) {
        const cells = row.querySelectorAll('td');
        cells.forEach(function (td, i) {
          if (headers[i]) {
            td.setAttribute('data-label', headers[i]);
          }
        });
      });
    });
  }

  /* ================================================
     2. BOTTOM NAVIGATION BAR
     Detecta a página atual e injeta a nav bar no mobile.
  ================================================ */
  const NAV_ITEMS = [
    {
      href: 'dashboard.html',
      label: 'Dashboard',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>`,
    },
    {
      href: 'produtos.html',
      label: 'Produtos',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>`,
    },
    {
      href: 'movimentacoes.html',
      label: 'Movim.',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>`,
    },
    {
      href: 'historico.html',
      label: 'Histórico',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>`,
    },
    {
      href: 'logs.html',
      label: 'Logs',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>`,
    },
  ];

  function injectBottomNav() {
    // Não duplicar
    if (document.querySelector('.bottom-nav')) return;

    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Navegação principal');

    NAV_ITEMS.forEach(function (item) {
      const isActive = currentPage === item.href || currentPage === item.href.replace('.html', '');
      const a = document.createElement('a');
      a.href = item.href;
      a.className = 'bottom-nav-item' + (isActive ? ' active' : '');
      a.setAttribute('aria-label', item.label);
      a.innerHTML = item.icon + `<span>${item.label}</span>`;
      nav.appendChild(a);
    });

    document.body.appendChild(nav);
  }

  /* ================================================
     3. SIDEBAR OVERLAY (fecha ao clicar fora)
  ================================================ */
  function injectSidebarOverlay() {
    if (document.querySelector('.sidebar-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.insertBefore(overlay, document.body.firstChild);

    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menuToggle');

    if (!sidebar) return;

    // Observa mudança de classe na sidebar para sincronizar o overlay
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === 'class') {
          overlay.classList.toggle('open', sidebar.classList.contains('open'));
        }
      });
    });

    observer.observe(sidebar, { attributes: true });

    // Clique no overlay fecha a sidebar
    overlay.addEventListener('click', function () {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  /* ================================================
     4. COLUNAS OPCIONAIS — esconde colunas pouco
     importantes no mobile (CNPJ, Emissão, Contato)
  ================================================ */
  function hideUnimportantColumns() {
    if (!isMobile()) return;

    // Nomes de colunas para esconder no mobile (case-insensitive)
    const HIDE_COLS = ['cnpj', 'emissão', 'emissao', 'contato', 'nota fiscal', 'nf'];

    document.querySelectorAll('table').forEach(function (table) {
      const headers = Array.from(table.querySelectorAll('thead th'));
      const hideIndexes = [];

      headers.forEach(function (th, i) {
        const label = th.textContent.trim().toLowerCase();
        if (HIDE_COLS.some(h => label.includes(h))) {
          hideIndexes.push(i);
          th.style.display = 'none';
        }
      });

      table.querySelectorAll('tbody tr').forEach(function (row) {
        const cells = row.querySelectorAll('td');
        hideIndexes.forEach(function (i) {
          if (cells[i]) cells[i].style.display = 'none';
        });
      });
    });
  }

  /* ================================================
     5. TOUCH FEEDBACK nos botões
  ================================================ */
  function addTouchFeedback() {
    document.querySelectorAll('.btn, .nav-link, .bottom-nav-item').forEach(function (el) {
      el.addEventListener('touchstart', function () {
        this.style.opacity = '0.75';
      }, { passive: true });
      el.addEventListener('touchend', function () {
        this.style.opacity = '';
      }, { passive: true });
    });
  }

  /* ================================================
     6. SCROLL TO TOP ao trocar de seção
  ================================================ */
  function smoothScrollContent() {
    const content = document.querySelector('.content');
    if (content) {
      content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ================================================
     INICIALIZAÇÃO
  ================================================ */
  function init() {
    applyTableDataLabels();
    injectSidebarOverlay();
    addTouchFeedback();

    // Bottom nav só no mobile
    if (isMobile()) {
      injectBottomNav();
      hideUnimportantColumns();
    }

    // Re-aplicar quando o conteúdo da tabela mudar (listagem dinâmica)
    const tableObserver = new MutationObserver(function () {
      applyTableDataLabels();
      if (isMobile()) hideUnimportantColumns();
    });

    document.querySelectorAll('tbody').forEach(function (tbody) {
      tableObserver.observe(tbody, { childList: true, subtree: true });
    });

    // Observar tabelas adicionadas dinamicamente
    const bodyObserver = new MutationObserver(function () {
      applyTableDataLabels();
      addTouchFeedback();
      if (isMobile()) {
        hideUnimportantColumns();
        if (!document.querySelector('.bottom-nav')) injectBottomNav();
      }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-checar ao redimensionar (ex.: rotação do dispositivo)
  window.addEventListener('resize', function () {
    if (isMobile()) {
      if (!document.querySelector('.bottom-nav')) injectBottomNav();
      hideUnimportantColumns();
    }
  });

})();
