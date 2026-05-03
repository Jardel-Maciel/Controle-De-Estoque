document.addEventListener("DOMContentLoaded", () => {
  console.log("LOGIN JS OK");

  const API = "https://backend-estoque-fnfc.onrender.com";

  const btn = document.getElementById("btnLogin");

  if (!btn) {
    console.log("Botão de login não encontrado");
    return;
  }

  btn.addEventListener("click", async (event) => {
    event.preventDefault(); // evita recarregar a página

    console.log("clicou no login");

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    if (!email || !senha) {
      alert("Preencha email e senha");
      return;
    }

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
        alert(data.erro || "Erro ao fazer login");
        return;
      }

      // 🔐 salva token corretamente
      localStorage.setItem("token", data.token);

      console.log("Login realizado com sucesso");
      console.log("Token salvo:", data.token);

      // redireciona para sistema
      window.location.href = "index.html";

    } catch (err) {
      console.error("Erro:", err);
      alert("Erro ao conectar com o servidor");
    }
  });
});
async function carregar() {
  try {
    const res = await fetch(`${API}/produtos`, {
  headers: {
    "Authorization": token
  }
});

    const dados = await res.json();

    if (!res.ok) {
      console.log(dados);
      alert(dados.erro || "Erro ao carregar dados");
      return;
    }

    lista.innerHTML = "";

    dados.forEach((item, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${item.produto}</td>
        <td>${item.quantidade}</td>
        <td>
          <button onclick="editar(${index})">Editar</button>
          <button class="btn-danger" onclick="remover(${index})">Excluir</button>
        </td>
      `;

      lista.appendChild(tr);
    });

  } catch (erro) {
    console.error(erro);
    alert("Erro ao carregar dados");
  }
}

const API = "https://backend-estoque-fnfc.onrender.com";
const token = localStorage.getItem("token");