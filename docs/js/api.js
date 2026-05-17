// =========================
// api.js — coloque em docs/js/api.js
// importe antes dos outros scripts nas páginas HTML:
// <script src="js/api.js"></script>
// =========================

const API = "https://backend-estoque-fnfc.onrender.com";

// =========================
// RENOVAR TOKEN AUTOMATICAMENTE
// =========================
async function renovarToken() {
  const refresh_token = localStorage.getItem("refresh_token");

  if (!refresh_token) {
    deslogar();
    return null;
  }

  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token })
    });

    if (!res.ok) {
      deslogar();
      return null;
    }

    const dados = await res.json();
    localStorage.setItem("token", dados.token);
    localStorage.setItem("refresh_token", dados.refresh_token);
    return dados.token;

  } catch {
    deslogar();
    return null;
  }
}

function deslogar() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  localStorage.removeItem("nome");
  window.location.href = "index.html";
}

// =========================
// FETCH COM RENOVAÇÃO AUTOMÁTICA
// Substitui fetch() em todas as chamadas autenticadas
// =========================
async function apiFetch(url, opcoes = {}) {
  let token = localStorage.getItem("token");

  if (!token) {
    deslogar();
    return null;
  }

  // Injeta o token no header
  opcoes.headers = {
    ...opcoes.headers,
    Authorization: `Bearer ${token}`
  };

  let res = await fetch(`${API}${url}`, opcoes);

  // Se o token expirou, tenta renovar e repetir a chamada uma vez
  if (res.status === 401) {
    token = await renovarToken();
    if (!token) return null;

    opcoes.headers.Authorization = `Bearer ${token}`;
    res = await fetch(`${API}${url}`, opcoes);

    // Se ainda der 401 após renovar, desloga
    if (res.status === 401) {
      deslogar();
      return null;
    }
  }

  return res;
}