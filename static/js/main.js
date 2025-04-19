document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("analyzeForm");
    const resultContainer = document.getElementById("result");
    const loader = document.getElementById("loader");

    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // empêche le rechargement de la page
        resultContainer.innerHTML = "";
        loader.style.display = "block";

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

            // On suppose que data.result contient du texte JSON lisible
            try {
                const parsed = JSON.parse(data.result);

                const table = `
                    <table border="1" cellpadding="8">
                        <thead>
                            <tr>
                                <th>Faits Reconnu</th>
                                <th>Divergences</th>
                                <th>Hypothèses</th>
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
            } catch {
                // Si ce n’est pas du JSON structuré, afficher brut
                resultContainer.innerHTML = `<pre>${data.result}</pre>`;
            }

        } catch (error) {
            console.error("Erreur lors de l’analyse :", error);
            resultContainer.innerHTML = "Erreur lors de l’analyse.";
            loader.style.display = "none";
        }
    });
});
