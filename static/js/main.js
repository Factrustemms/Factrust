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
    console.log("✅ Analyse reçue :", data.analyse);
    
    if (!data) {
      throw new Error("❌ Format JSON invalide");
    }
    if (!data.analyse.comparaison) {
      throw new Error("❌ Champ 'comparaison' manquant.");
    }

    const analyse = data.analyse.comparaison;
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

document.getElementById('exportPDFBtn').addEventListener('click', () => {
  const doc = new jsPDF();

  // 1. LOGO EN HAUT
  const logoImg = new Image();
  logoImg.src = '/static/images/logo_factrust_transparent.png';

  logoImg.onload = function () {
    doc.addImage(logoImg, 'PNG', 150, 10, 40, 25); // (image, format, x, y, width, height)

  // 2. TITRE
    doc.setFontSize(18);
    doc.text("Tableau comparatif des faits", 14, 20);
    doc.setFontSize(12);

  // 3. TABLEAU
    const tableBody = document.getElementById('iaResultsBody');
    const rows = tableBody.querySelectorAll('tr');
    const tableData = [];

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      const rowData = [];

      // ✅ Cellule 1 - Faits reconnus
      rowData.push(cells[0]?.innerText.trim() || '');

      // ✅ Cellule 2 - Faits contestés
      const faitContent = cells[1]?.innerHTML || '';
      const div = document.createElement('div');
      div.innerHTML = faitContent;

      const boldText = div.querySelector('strong')?.innerText || '';
      const reste = div.innerText.replace(boldText, '').trim();

      rowData.push([
        { text: boldText, style: 'bold' },
        { text: reste, style: 'normal' }
      ]);

      // ✅ Cellule 3 - Hypothèses
      rowData.push(cells[2]?.innerText.trim() || '')
      
      tableData.push(rowData);
    });

    doc.autoTable({
      head: [['Faits reconnus', 'Faits contestés', 'Hypothèses probables']],
      body: tableData,
      startY: 40,
      styles: {
        cellPadding: 3,
        fontSize: 10,
        valign: 'top',
        halign: 'left',
      },
      headStyles: {
        fillColor: [42, 117, 188],
        halign: 'center',
        fontStyle: 'bold',
        textColor: 255
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 }
      },
      didParseCell: function (data) {
          // 📝 Appliquer gras aux objets avec style: 'bold'
          if (Array.isArray(data.cell.raw)) {
            const isBold = data.cell.raw.some(chunk => chunk.style === 'bold');
            if (isBold) data.cell.styles.fontStyle = 'bold';
          }
        },
        didDrawCell: function (data) {
          // 🎯 Fusionner les morceaux de texte si tableau (cellule mixte)
          if (Array.isArray(data.cell.raw)) {
            const textChunks = data.cell.raw;
            let cursorY = data.cell.y + 2;

            textChunks.forEach(chunk => {
              doc.setFont(undefined, chunk.style || 'normal');
              doc.text(chunk.text, data.cell.x + 2, cursorY, { maxWidth: data.cell.width - 4 });
              cursorY += 4.5;
            });

            data.cell.text = []; // Ne pas dessiner texte par défaut
          }
        }
    });

    doc.save('Resultats_Factrust.pdf');
  },  
});

