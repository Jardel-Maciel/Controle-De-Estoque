// =========================
// IMPORTAR EXCEL
// =========================
const inputExcel = document.getElementById("inputExcel");

["btnImportarExcel", "navImportarExcel"].forEach(function(id) {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      if (inputExcel) inputExcel.click();
    });
  }
});

if (inputExcel) {
  inputExcel.addEventListener("change", async function(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    showToast("Importando planilha...", "info");

    try {
      const resposta = await fetch(`${API}/excel/importar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const dados = await resposta.json();
      if (!resposta.ok) { showToast(dados.erro || "Erro ao importar planilha", "error"); return; }
      showToast(`Planilha importada! ${dados.total_importados} produto(s) adicionados.`, "success");
      carregar();
    } catch (erro) {
      console.error(erro);
      showToast("Erro ao importar planilha", "error");
    } finally {
      inputExcel.value = "";
    }
  });
}