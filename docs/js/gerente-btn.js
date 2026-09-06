(function () {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.role !== "gerente" && user.role !== "admin") return;

  // Encontra a nav-section de Ferramentas ou cria uma nova seção
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  const footer = sidebar.querySelector(".sidebar-footer");
  if (!footer) return;

  const secao = document.createElement("div");
  secao.className = "nav-section";
  secao.style.marginTop = "8px";
  secao.innerHTML = `
    <div class="nav-label">Gerência</div>
    <a href="gerente.html" class="nav-link" id="navGerente" style="color:#1677FF">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      Painel do Gerente
    </a>
    <a href="cmv.html" class="nav-link" id="navCmv" style="color:#1677FF">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      CMV
    </a>
  `;

  sidebar.insertBefore(secao, footer);
})();