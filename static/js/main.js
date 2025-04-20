const { jsPDF } = window.jspdf;

document.getElementById('analyzeForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const pdfA = document.getElementById('pdfA').files[0];
  const pdfB = document.getElementById('pdfB').files[0];
  const loader = document.getElementById('loader');
  const resultDiv = document.getElementById('result');
  const exportBtn = document.getElementById('exportPDFBtn');
  const tableBody = document.getElementById('iaResultsBody');

  resultDiv.innerHTML = '';
  tableBody.innerHTML = '';
  exportBtn.style.display = 'none';
  loader.style.display = 'block';

  const formData = new FormData();
  formData.append('pdfA', pdfA);
  formData.append('pdfB', pdfB);

  try {
    const response = await fetch('/analyze', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'analyse.');
    }

    const data = await response.json();
    console.log("✅ Analyse reçue :", data.result);

    // ✅ Fonction robuste d’extraction du bloc JSON
    function extractJSONFromText(text) {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonString = text.slice(jsonStart, jsonEnd + 1).trim();
        try {
          return JSON.parse(jsonString);
        } catch (e) {
          console.error("❌ Erreur de parsing JSON :", e);
          return null;
        }
      } else {
        console.warn("⚠️ Aucun bloc JSON détecté.");
        return null;
      }
    }

    const parsed = extractJSONFromText(data.result);
    if (!parsed || !parsed.comparaison) {
      throw new Error("❌ Format JSON invalide ou champ 'comparaison' manquant.");
    }

    const analyse = parsed.comparaison;
    const faits = analyse.faits_reconnus || [];
    const divergents = analyse.points_divergents || [];
    const hypotheses = analyse.hypotheses_sur_la_realite_factuelle || [];

    const maxRows = Math.max(faits.length, divergents.length, hypotheses.length);

    for (let i = 0; i < maxRows; i++) {
      const row = document.createElement('tr');

      // Faits reconnus
      const tdFaits = document.createElement('td');
      tdFaits.textContent = faits[i] || '';
      row.appendChild(tdFaits);

      // Points divergents
      const tdDivergents = document.createElement('td');
      const div = divergents[i];
      if (div) {
        tdDivergents.innerHTML = `<strong>${div.fait}</strong><br><em>Partie A : ${div.partie_a}</em><br><em>Partie B : ${div.partie_b}</em>`;
      } else {
        tdDivergents.textContent = '';
      }
      row.appendChild(tdDivergents);

      // Hypothèses
      const tdHypotheses = document.createElement('td');
      const hyp = hypotheses[i];
      if (hyp) {
        tdHypotheses.innerHTML = `<strong>${hyp.hypothese}</strong><br><em>${hyp.fondement}</em>`;
      } else {
        tdHypotheses.textContent = '';
      }
      row.appendChild(tdHypotheses);

      tableBody.appendChild(row);
    }

    loader.style.display = 'none';
    exportBtn.style.display = 'block';

  } catch (error) {
    loader.style.display = 'none';
    resultDiv.innerHTML = `<p style="color: red;">❌ ${error.message}</p>`;
  }
});
