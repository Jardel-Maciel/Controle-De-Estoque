document.addEventListener("DOMContentLoaded", () => {
  const API = "https://backend-estoque-fnfc.onrender.com";

  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");
  const btnLogin = document.getElementById("btnLogin");

  if (!btnLogin) {
    console.error("Botão de login não encontrado");
    return;
  }

  btnLogin.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    // 🔒 Validação básica
    if (!email || !senha) {
      alert("Preencha email e senha");
      return;
    }

    try {
      btnLogin.disabled = true;
      btnLogin.textContent = "Entrando...";

      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, senha })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.erro || "Erro no login");
        return;
      }

      // ✅ salva token
      localStorage.setItem("token", data.token);

      // 🚀 redireciona
      window.location.href = "index.html";

    } catch (err) {
      console.error("Erro:", err);
      alert("Erro ao conectar com o servidor (pode estar iniciando no Render)");
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar";
    }
  });
});