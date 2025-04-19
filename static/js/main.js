document.addEventListener("DOMContentLoaded", () => {
    console.log("main.js chargé ✅");

    const form = document.getElementById("analyzeForm");
    const resultContainer = document.getElementById("result");
    const loader = document.getElementById("loader");
    const exportBtn = document.getElementById("exportPDFBtn");
    const tableBody = document.getElementById("iaResultsBody");

    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // ⚠️ Important pour empêcher le rechargement
        console.log("Formulaire soumis 🚀");

        resultContainer.innerHTML = "";
        tableBody.innerHTML = "";
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
                body: formData,
            });

            if (!response.ok) throw new Error("Erreur serveur");

            const data = await response.json();
            loader.style.display = "none";

            try {
                const parsed = JSON.parse(data.result);
                console.log("Données analysées :", parsed);

                const faitsReconnu = parsed.comparaison?.faits_reconnus || [];
                const divergences = parsed.comparaison?.points_divergents || [];
                const hypotheses = parsed.comparaison?.hypothèses_sur_la_réalité_factuelle || [];

                const maxRows = Math.max(faitsReconnu.length, divergences.length, hypotheses.length);

                for (let i = 0; i < maxRows; i++) {
                    const row = document.createElement("tr");

                    // Fait reconnu
                    const fr = document.createElement("td");
                    fr.textContent = faitsReconnu[i] || "";
                    row.appendChild(fr);

                    // Divergence
                    const div = document.createElement("td");
                    if (divergences[i]) {
                        const d = divergences[i];
                        div.innerHTML = `<strong>${d.fait}</strong><br/><em>${d.requérant}</em><br/>${d.défenderesse}`;
                    }
                    row.appendChild(div);

                    // Hypothèse
                    const hypo = document.createElement("td");
                    if (hypotheses[i]) {
                        const h = hypotheses[i];
                        hypo.innerHTML = `<strong>${h.hypothèse}</strong><br/><em>${h.fondement_juridique}</em>`;
                    }
                    row.appendChild(hypo);

                    tableBody.appendChild(row);
                }

                exportBtn.style.display = "inline-block";

            } catch (err) {
                console.error("Erreur parsing JSON : ", err);
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

        // Récupérer le tableau pour export
        const table = document.getElementById("iaResultsTable");
        if (table) {
            doc.autoTable({ html: "#iaResultsTable", startY: 20 });
        } else {
            doc.text("Aucun tableau à exporter.", 10, 20);
        }

        doc.save("analyse_factrust.pdf");
    });
});
