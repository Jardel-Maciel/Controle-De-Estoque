// =========================
// BOTÃO ADMIN — aparece só para superadmin
// =========================
(function () {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!user.superadmin) return;

  // Cria o botão
  const btn = document.createElement("a");
  btn.href = "admin.html";
  btn.id   = "btnAdmin";
  btn.innerHTML = "⚙️ Admin";
  btn.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: linear-gradient(135deg, #6366f1, #38bdf8);
    color: #fff;
    font-size: 0.78rem;
    font-weight: 700;
    border-radius: 8px;
    text-decoration: none;
    letter-spacing: .02em;
    box-shadow: 0 4px 12px rgba(99,102,241,.35);
    transition: opacity .15s, transform .15s;
    white-space: nowrap;
  `;

  btn.addEventListener("mouseenter", () => {
    btn.style.opacity = "0.85";
    btn.style.transform = "translateY(-1px)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.opacity = "1";
    btn.style.transform = "translateY(0)";
  });

  // Tenta inserir na nav da sidebar
  const nav = document.querySelector("nav, .sidebar nav, aside nav");
  if (nav) {
    const li = document.createElement("div");
    li.style.marginTop = "12px";
    li.appendChild(btn);
    nav.appendChild(li);
    return;
  }

  // Fallback: insere no topo da página
  const topo = document.querySelector(".topo-direita, .topbar, header");
  if (topo) {
    topo.insertBefore(btn, topo.firstChild);
    return;
  }

  // Último recurso: canto fixo na tela
  btn.style.position   = "fixed";
  btn.style.bottom     = "20px";
  btn.style.right      = "20px";
  btn.style.zIndex     = "9999";
  document.body.appendChild(btn);
})();