document.addEventListener("DOMContentLoaded", () => {
  console.log("JS OK");

  const API = "https://backend-estoque-fnfc.onrender.com";
  const token = localStorage.getItem("token");

  const lista = document.getElementById("lista");

  if (!token) {
    alert("Você não está logado");
    window.location.href = "login.html";
    return;
  }

  carregar();

  async function carregar() {
    try {
      const res = await fetch(`${API}/produtos`, {
        headers: {
          "Authorization": token
        }
      });

      const dados = await res.json();

      // 🔥 TRATAMENTO DO ERRO 401
      if (!res.ok) {
        console.log("Erro backend:", dados);
        alert(dados.erro || "Não autorizado");
        return;
      }

      // 🔥 GARANTE QUE É ARRAY
      if (!Array.isArray(dados)) {
        console.error("Resposta inválida:", dados);
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
            <button onclick="remover(${index})">Excluir</button>
          </td>
        `;

        lista.appendChild(tr);
      });

    } catch (err) {
      console.error(err);
      alert("Erro ao carregar dados");
    }
  }

  // EXEMPLO DE CREATE (POST)
  window.adicionar = async function (produto, quantidade) {
    try {
      const res = await fetch(`${API}/produtos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ produto, quantidade })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.erro || "Erro ao adicionar");
        return;
      }

      carregar();

    } catch (err) {
      console.error(err);
    }
  };
});