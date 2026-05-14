const API = "https://backend-estoque-fnfc.onrender.com";

// =========================
// ELEMENTOS
// =========================
const emailInput  = document.getElementById("email");
const senhaInput  = document.getElementById("senha");
const btnLogin    = document.getElementById("btnLogin");
const toggleBtn   = document.getElementById("toggleSenha");
const msgErro     = document.getElementById("msgErro");

// =========================
// VISUALIZAR SENHA
// =========================
let senhaVisivel = false;

toggleBtn.addEventListener("click", () => {
  senhaVisivel = !senhaVisivel;
  senhaInput.type = senhaVisivel ? "text" : "password";
  toggleBtn.textContent = senhaVisivel ? "🙈" : "👁";
});

// =========================
// MENSAGEM DE ERRO INLINE
// =========================
function mostrarErro(msg) {
  msgErro.textContent = msg;
  msgErro.classList.add("show");
}

function limparErro() {
  msgErro.classList.remove("show");
}

emailInput.addEventListener("input", limparErro);
senhaInput.addEventListener("input", limparErro);

// =========================
// LOGIN
// =========================
async function fazerLogin() {
  try {
    const email = emailInput.value.trim().toLowerCase();
    const senha = senhaInput.value.trim();

    if (!email || !senha) {
      mostrarErro("Preencha email e senha");
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Entrando...";
    limparErro();

    const resposta = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarErro(dados.erro || "Email ou senha incorretos");
      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar";
      return;
    }

    localStorage.setItem("token", dados.token);
    localStorage.setItem("user", JSON.stringify(dados.user));
    localStorage.setItem("nome", dados.user.nome || "");
    window.location.href = "dashboard.html";

  } catch (erro) {
    console.error("ERRO LOGIN:", erro);
    mostrarErro("Erro ao conectar com o servidor");
    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
  }
}

btnLogin.addEventListener("click", fazerLogin);
emailInput.addEventListener("keypress", e => { if (e.key === "Enter") fazerLogin(); });
senhaInput.addEventListener("keypress", e => { if (e.key === "Enter") fazerLogin(); });

// =========================
// MODAL REDEFINIR SENHA
// =========================
let emailVerificado = "";

function abrirModal() {
  document.getElementById("modalReset").classList.add("open");
  irStep(1);
}

function fecharModal() {
  document.getElementById("modalReset").classList.remove("open");
  document.getElementById("resetEmail").value     = "";
  document.getElementById("novaSenha").value      = "";
  document.getElementById("confirmarSenha").value = "";
  emailVerificado = "";
  irStep(1);
}

function irStep(n) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`step${i}`).classList.toggle("active", i === n);
    document.getElementById(`dot${i}`).classList.toggle("done", i <= n);
  });
}

function voltarStep1() { irStep(1); }

function erroStep(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3500);
}

function toggleModalSenha(inputId, btn) {
  const inp = document.getElementById(inputId);
  const vis = inp.type === "password";
  inp.type = vis ? "text" : "password";
  btn.textContent = vis ? "🙈" : "👁";
}

async function verificarEmail() {
  const email = document.getElementById("resetEmail").value.trim().toLowerCase();
  if (!email) { erroStep("erroStep1", "Informe o email."); return; }

  try {
    const res = await fetch(`${API}/auth/verificar-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const dados = await res.json();
    if (res.ok) {
      emailVerificado = email;
      irStep(2);
    } else {
      erroStep("erroStep1", dados.erro || "Email não encontrado.");
    }
  } catch {
    erroStep("erroStep1", "Erro ao conectar com o servidor.");
  }
}

async function redefinirSenha() {
  const nova      = document.getElementById("novaSenha").value.trim();
  const confirmar = document.getElementById("confirmarSenha").value.trim();

  if (!nova || nova.length < 6) { erroStep("erroStep2", "Senha deve ter pelo menos 6 caracteres."); return; }
  if (nova !== confirmar)        { erroStep("erroStep2", "As senhas não coincidem."); return; }

  try {
    const res = await fetch(`${API}/auth/redefinir-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailVerificado, nova_senha: nova })
    });
    const dados = await res.json();
    if (res.ok) { irStep(3); }
    else { erroStep("erroStep2", dados.erro || "Erro ao redefinir senha."); }
  } catch {
    erroStep("erroStep2", "Erro ao conectar com o servidor.");
  }
}

// Fechar modal clicando fora
document.getElementById("modalReset").addEventListener("click", e => {
  if (e.target === e.currentTarget) fecharModal();
});