document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("analyzeForm");
    const resultContainer = document.getElementById("result");
    const loader = document.getElementById("loader");
    const exportBtn = document.getElementById("exportPDFBtn");

    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // Empêche le rechargement
        resultContainer.innerHTML = "";
        loader.style.display = "block";
        exportBtn.style.display = "none";

        const pdfA = document.getElementById("pdfA").files[0];
        const pdfB = document.getElementById("pdfB").files[0];

        if (!pdfA || !pdfB) {
            alert("Merci d’importer les deux fichiers PDF.");
            loader.style.display = "none";
            return;
        }

        const formData = new FormData();
        formData.append("pdfA", pdfA);
        formData.append("pdfB", pdfB);

        try {
            const response = await fetch("/analyze", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Erreur serveur");

            const data = await response.json();
            loader.style.display = "none";

            try {
                const parsed = JSON.parse(data.result);

                const table = `
                    <table border="1" cellpadding="8">
                        <thead>
                            <tr>
                                <th>Faits Reconnu</th>
                                <th>Faits Contestés</th>
                                <th>Hypothèses Plausibles</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${parsed.faits_reconnus || "N/A"}</td>
                                <td>${parsed.divergences || "N/A"}</td>
                                <td>${parsed.hypothèses || "N/A"}</td>
                            </tr>
                        </tbody>
                    </table>
                `;
                resultContainer.innerHTML = table;
                exportBtn.style.display = "inline-block";

            } catch {
                resultContainer.innerHTML = `<pre>${data.result}</pre>`;
                exportBtn.style.display = "inline-block";
            }

        } catch (error) {
            console.error("Erreur lors de l’analyse :", error);
            resultContainer.innerHTML = "Erreur lors de l’analyse.";
            loader.style.display = "none";
            exportBtn.style.display = "none";
        }
    });

    exportBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.text("Résultats de l’analyse Factrust", 10, 10);

        // Capture brut du HTML — attention, mise en forme limitée
        doc.fromHTML(resultContainer.innerHTML, 10, 20);
        doc.save("analyse_factrust.pdf");
    });
});
