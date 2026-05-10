const API = "https://backend-estoque-fnfc.onrender.com";

// =========================
// LOGIN
// =========================
document
  .getElementById("loginForm")
  .addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
      document
        .getElementById("email")
        .value
        .trim()
        .toLowerCase();

    const senha =
      document
        .getElementById("senha")
        .value
        .trim();

    try {

      const res = await fetch(
        `${API}/login`,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            email,
            senha
          })
        }
      );

      const texto =
        await res.text();

      let dados = {};

      try {

        dados = JSON.parse(
          texto
        );

      } catch {

        console.error(
          "Resposta inválida:",
          texto
        );

        alert(
          "Erro interno do servidor"
        );

        return;
      }

      // =========================
      // ERRO LOGIN
      // =========================
      if (!res.ok) {

        alert(
          dados.erro ||
          "Erro ao fazer login"
        );

        return;
      }

      // =========================
      // TOKEN
      // =========================
      if (!dados.token) {

        alert(
          "Token não recebido"
        );

        return;
      }

      // =========================
      // SALVAR TOKEN
      // =========================
      localStorage.setItem(
        "token",
        dados.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          dados.user || {}
        )
      );

      console.log(
        "TOKEN SALVO:",
        dados.token
      );

      // =========================
      // REDIRECIONAR
      // =========================
      window.location.href =
        "dashboard.html";

    } catch (err) {

      console.error(
        "Erro login:",
        err
      );

      alert(
        "Erro ao conectar com backend"
      );
    }
  });