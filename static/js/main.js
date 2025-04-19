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
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'analyse.');
    }

    const data = await response.json();
    console.log("✅ Analyse reçue :", data.analyse)
    const analyse = data.analyse;

    // Générer le contenu du tableau
    const maxRows = Math.max(
      analyse.faits_reconnus.length,
      analyse.points_divergents.length,
      analyse.hypotheses_sur_la_realite_factuelle.length
    );

    for (let i = 0; i < maxRows; i++) {
      const row = document.createElement('tr');

      // Faits reconnus
      const tdFaits = document.createElement('td');
      tdFaits.textContent = analyse.faits_reconnus[i] || '';
      row.appendChild(tdFaits);

      // Points divergents
      const tdDivergents = document.createElement('td');
      tdDivergents.textContent = analyse.points_divergents[i] || '';
      row.appendChild(tdDivergents);

      // Hypothèses
      const tdHypotheses = document.createElement('td');
      const hyp = analyse.hypotheses_sur_la_realite_factuelle[i];
      if (hyp) {
        tdHypotheses.innerHTML = `<strong>${hyp.hypothese}</strong><br><em>${hyp.fondement}</em>`;
      } else {
        tdHypotheses.textContent = '';
      }
      row.appendChild(tdHypotheses);

      tableBody.appendChild(row);
    }

    // Activer le bouton PDF et cacher le loader
    loader.style.display = 'none';
    exportBtn.style.display = 'block';

  } catch (error) {
    loader.style.display = 'none';
    resultDiv.innerHTML = `<p style="color: red;">❌ ${error.message}</p>`;
  }
});
