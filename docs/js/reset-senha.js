const API = "https://backend-estoque-fnfc.onrender.com";

// =========================
// ELEMENTOS
// =========================
const novaSenhaInput      = document.getElementById("novaSenha");
const confirmarSenhaInput = document.getElementById("confirmarSenha");
const btnRedefinir        = document.getElementById("btnRedefinir");
const toggleBtn           = document.getElementById("toggleNovaSenha");
const msgErro             = document.getElementById("msgErro");
const msgOk               = document.getElementById("msgOk");
const formRedefinir       = document.getElementById("formRedefinir");
const subtitulo           = document.getElementById("subtitulo");

// =========================
// LER O TOKEN DA URL
// =========================
const params      = new URLSearchParams(window.location.search);
const resetToken   = params.get("token");

if (!resetToken) {
  formRedefinir.style.display = "none";
  subtitulo.textContent = "Link inválido";
  msgErro.textContent = "Este link de redefinição está incompleto. Solicite um novo link na tela de login.";
  msgErro.classList.add("show");
}

// =========================
// VISUALIZAR SENHA
// =========================
let senhaVisivel = false;
if (toggleBtn) toggleBtn.addEventListener("click", () => {
  senhaVisivel = !senhaVisivel;
  novaSenhaInput.type = senhaVisivel ? "text" : "password";
  toggleBtn.textContent = senhaVisivel ? "🙈" : "👁";
});

// =========================
// MENSAGENS
// =========================
function mostrarErro(msg) {
  msgOk.classList.remove("show");
  msgErro.textContent = msg;
  msgErro.classList.add("show");
}

function limparMsgs() {
  msgErro.classList.remove("show");
  msgOk.classList.remove("show");
}

if (novaSenhaInput)      novaSenhaInput.addEventListener("input", limparMsgs);
if (confirmarSenhaInput) confirmarSenhaInput.addEventListener("input", limparMsgs);

// =========================
// REDEFINIR SENHA
// =========================
async function redefinirSenha() {
  const novaSenha  = novaSenhaInput.value.trim();
  const confirmar  = confirmarSenhaInput.value.trim();

  if (!novaSenha || !confirmar) {
    mostrarErro("Preencha os dois campos.");
    return;
  }

  if (novaSenha.length < 8) {
    mostrarErro("A senha deve ter pelo menos 8 caracteres.");
    return;
  }

  if (novaSenha !== confirmar) {
    mostrarErro("As senhas não coincidem.");
    return;
  }

  btnRedefinir.disabled = true;
  btnRedefinir.textContent = "Redefinindo...";
  limparMsgs();

  try {
    const resposta = await fetch(`${API}/auth/redefinir-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset_token: resetToken, nova_senha: novaSenha })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarErro(dados.erro || "Não foi possível redefinir a senha.");
      btnRedefinir.disabled = false;
      btnRedefinir.textContent = "Redefinir senha";
      return;
    }

    formRedefinir.style.display = "none";
    msgOk.textContent = "Senha redefinida com sucesso! Redirecionando para o login...";
    msgOk.classList.add("show");

    setTimeout(() => { window.location.href = "index.html"; }, 2000);

  } catch (erro) {
    console.error("ERRO REDEFINIR SENHA:", erro);
    mostrarErro("Erro ao conectar com o servidor.");
    btnRedefinir.disabled = false;
    btnRedefinir.textContent = "Redefinir senha";
  }
}

if (btnRedefinir) btnRedefinir.addEventListener("click", redefinirSenha);
if (confirmarSenhaInput) confirmarSenhaInput.addEventListener("keypress", e => {
  if (e.key === "Enter") redefinirSenha();
});
