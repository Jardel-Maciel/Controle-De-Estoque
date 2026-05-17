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

if (toggleBtn) toggleBtn.addEventListener("click", () => {
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

if (emailInput) emailInput.addEventListener("input", limparErro);
if (senhaInput) senhaInput.addEventListener("input", limparErro);

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

    // Salva os dois tokens
    localStorage.setItem("token", dados.token);
    localStorage.setItem("refresh_token", dados.refresh_token);
    localStorage.setItem("user", JSON.stringify(dados.user));
    localStorage.setItem("nome", dados.user.nome || "");

    // Redireciona conforme o role
    const role = dados.user.role || "cliente";
    if (role === "gerente") {
      window.location.href = "gerente.html";
    } else {
      window.location.href = "dashboard.html";
    }

  } catch (erro) {
    console.error("ERRO LOGIN:", erro);
    mostrarErro("Erro ao conectar com o servidor");
    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
  }
}

if (btnLogin)    btnLogin.addEventListener("click", fazerLogin);
if (emailInput)  emailInput.addEventListener("keypress", e => { if (e.key === "Enter") fazerLogin(); });
if (senhaInput)  senhaInput.addEventListener("keypress", e => { if (e.key === "Enter") fazerLogin(); });

// =========================
// MODAL REDEFINIR SENHA
// O HTML usa id="modalSenha" e id="emailReset"
// =========================
async function enviarReset() {
  const email   = document.getElementById("emailReset")?.value.trim().toLowerCase();
  const msgErroR = document.getElementById("msgResetErro");
  const msgOkR   = document.getElementById("msgResetOk");

  if (!email) {
    if (msgErroR) { msgErroR.textContent = "Informe o email."; msgErroR.classList.add("show"); }
    return;
  }

  try {
    const res   = await fetch(`${API}/auth/solicitar-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const dados = await res.json();

    if (msgErroR) msgErroR.classList.remove("show");
    if (msgOkR) {
      msgOkR.textContent = dados.msg || "Se o e-mail estiver cadastrado, você receberá as instruções.";
      msgOkR.classList.add("show");
    }
  } catch {
    if (msgErroR) { msgErroR.textContent = "Erro ao conectar com o servidor."; msgErroR.classList.add("show"); }
  }
}

// Fechar modal clicando fora — usa o ID correto do HTML
const modalSenha = document.getElementById("modalSenha");
if (modalSenha) {
  modalSenha.addEventListener("click", e => {
    if (e.target === e.currentTarget) modalSenha.classList.remove("open");
  });
}

// Botão enviar reset — conecta ao endpoint correto
const btnEnviarReset = document.getElementById("enviarReset");
if (btnEnviarReset) btnEnviarReset.addEventListener("click", enviarReset);