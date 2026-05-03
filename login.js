
document.addEventListener("DOMContentLoaded", () => {
  console.log("LOGIN JS OK");

  const API = "https://backend-estoque-fnfc.onrender.com";

  const btn = document.getElementById("btnLogin");

  if (!btn) {
    console.log("Botão não encontrado");
    return;
  }

  btn.addEventListener("click", async () => {
    console.log("clicou");

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, senha })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.erro);
        return;
      }

      localStorage.setItem("token", data.token);
      window.location.href = "index.html";

    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor");
    }
  });
});