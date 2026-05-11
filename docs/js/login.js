const API = "https://backend-estoque-fnfc.onrender.com";

// =========================
// ELEMENTOS
// =========================
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const btnLogin = document.getElementById("btnLogin");

// =========================
// VERIFICA ELEMENTOS
// =========================
if (!emailInput || !senhaInput || !btnLogin) {
  console.error("Elementos do login não encontrados");
}

// =========================
// LOGIN
// =========================
async function fazerLogin() {
  try {

    const email = emailInput.value.trim().toLowerCase();
    const senha = senhaInput.value.trim();

    // =========================
    // VALIDAÇÃO
    // =========================
    if (!email || !senha) {
      alert("Preencha email e senha");
      return;
    }

    // =========================
    // BOTÃO LOADING
    // =========================
    btnLogin.disabled = true;
    btnLogin.textContent = "Entrando...";

    // =========================
    // REQUEST
    // =========================
    const resposta = await fetch(`${API}/login`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        email,
        senha
      })
    });

    // =========================
    // JSON
    // =========================
    const dados = await resposta.json();

    // =========================
    // ERRO
    // =========================
    if (!resposta.ok) {

      alert(dados.erro || "Erro ao fazer login");

      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar";

      return;
    }

    // =========================
    // SALVAR TOKEN
    // =========================
    localStorage.setItem("token", dados.token);

    // =========================
    // SALVAR USER
    // =========================
    localStorage.setItem(
      "user",
      JSON.stringify(dados.user)
    );

    // =========================
    // REDIRECIONAR
    // =========================
    window.location.href = "dashboard.html";

  } catch (erro) {

    console.error("ERRO LOGIN:", erro);

    alert("Erro ao conectar com servidor");

    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
  }
}

// =========================
// CLICK BOTÃO
// =========================
btnLogin.addEventListener("click", fazerLogin);

// =========================
// ENTER
// =========================
senhaInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    fazerLogin();
  }
});

emailInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    fazerLogin();
  }
});