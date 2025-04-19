document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("analyzeForm");
    const loader = document.getElementById("loader");
    const exportBtn = document.getElementById("exportPDFBtn");
    const iaResultsBody = document.getElementById("iaResultsBody");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        iaResultsBody.innerHTML = "";
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
                const jsonText = data.result.match(/```json([\s\S]*?)```/);
                const cleanJson = jsonText ? jsonText[1].trim() : data.result;

                const parsed = JSON.parse(cleanJson);
                const comparaison = parsed.comparaison || parsed;

                const maxRows = Math.max(
                    comparaison.faits_reconnus?.length || 0,
                    comparaison.points_divergents?.length || 0,
                    comparaison.hypothèses_sur_la_réalité_factuelle?.length || 0
                );

                for (let i = 0; i < maxRows; i++) {
                    const row = document.createElement("tr");

                    // ✅ Faits reconnus
                    const factCell = document.createElement("td");
                    factCell.textContent = comparaison.faits_reconnus?.[i] || "";
                    row.appendChild(factCell);

                    // ⚠️ Faits contestés
                    const contestedCell = document.createElement("td");
                    if (comparaison.points_divergents?.[i]) {
                        const pd = comparaison.points_divergents[i];
                        contestedCell.innerHTML = `
                            <strong>${pd.fait}</strong><br>
                            <em>Partie A :</em> ${pd.requérant}<br>
                            <em>Partie B :</em> ${pd.défenderesse}
                        `;
                    }
                    row.appendChild(contestedCell);

                    // 💡 Hypothèses
                    const hypoCell = document.createElement("td");
                    if (comparaison.hypothèses_sur_la_réalité_factuelle?.[i]) {
                        const h = comparaison.hypothèses_sur_la_réalité_factuelle[i];
                        hypoCell.innerHTML = `
                            <strong>${h.hypothèse}</strong><br>
                            <em>Fondement :</em> ${h.fondement_juridique}
                        `;
                    }
                    row.appendChild(hypoCell);

                    iaResultsBody.appendChild(row);
                }

                exportBtn.style.display = "inline-block";

            } catch (err) {
                console.error("Erreur parsing JSON IA :", err);
                iaResultsBody.innerHTML = `<tr><td colspan="3"><pre>${data.result}</pre></td></tr>`;
                exportBtn.style.display = "inline-block";
            }

        } catch (error) {
            console.error("Erreur lors de l’analyse :", error);
            iaResultsBody.innerHTML = "<tr><td colspan='3'>Erreur lors de l’analyse.</td></tr>";
            loader.style.display = "none";
            exportBtn.style.display = "none";
        }
    });

    exportBtn.addEventListener("click", async () => {
        const { jsPDF } = window.jspdf;
        const table = document.getElementById("iaResultsTable");

        // Scroll au haut du tableau avant capture
        table.scrollIntoView();

        const canvas = await html2canvas(table, { scale: 2 });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
        pdf.save("analyse_factrust.pdf");
});

