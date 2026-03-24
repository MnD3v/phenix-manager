import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Convert image to base64 for PDF embedding
export const imageToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
};

// Load DM Sans fonts
const loadFonts = async (doc: jsPDF) => {
  const fontFiles = [
    { url: "/fonts/DMSans-Regular.ttf", name: "DM Sans", style: "normal", filename: "DMSans-Regular.ttf" },
    { url: "/fonts/DMSans-Bold.ttf", name: "DM Sans", style: "bold", filename: "DMSans-Bold.ttf" },
    { url: "/fonts/DMSans-Italic.ttf", name: "DM Sans", style: "italic", filename: "DMSans-Italic.ttf" },
  ];

  for (const font of fontFiles) {
    try {
      const response = await fetch(font.url);
      if (!response.ok) throw new Error(`Failed to fetch ${font.url}`);
      const blob = await response.blob();
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          doc.addFileToVFS(font.filename, base64);
          doc.addFont(font.filename, font.name, font.style);
          resolve(null);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`Error loading font ${font.url}:`, error);
    }
  }
};

interface PaiementData {
  id: string;
  date_paiement: string;
  montant: number;
  type: string;
  mois_concerne: string | null;
  notes: string | null;
  locataire: {
    nom: string;
    telephone: string;
    email?: string;
    adresse?: string;
  };
  bien: {
    nom: string;
    adresse: string;
    type: string;
  };
  contrat: {
    loyer_mensuel: number;
  };
  nombreMois?: number;
  moisDetails?: { mois: string; montant: number }[];
}

// Format number with separators and FCFA
const formatMontant = (montant: number): string => {
  const parts = montant.toString().split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return intPart + " FCFA";
};

// Format number simple (sans FCFA)
const formatNumber = (montant: number): string => {
  const parts = montant.toString().split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return intPart;
};



// Generate receipt number: PHENIX001/MM/YY
const generateReceiptNumber = (paiementId: string, date: string): string => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const seq = parseInt(paiementId.replace(/-/g, '').slice(0, 6), 16) % 999 + 1;
  const seqStr = String(seq).padStart(3, '0');
  return `phenix${seqStr}/${month}/${year}`;
};

// Truncate text to fit width
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 2) + "..";
};

export type PrintOptions = {
  format?: "a5" | "a4" | "custom";
  orientation?: "portrait" | "landscape";
  margin?: number;
  customSize?: [number, number];
  copies?: 1 | 2;
};

export const generateReceiptPDF = async (
  paiement: PaiementData,
  logoBase64?: string,
  options?: PrintOptions,
) => {
  const orientation = options?.orientation || "portrait";
  let formatOption: any = [148, 210];
  if (options?.format === "a4") formatOption = "a4";
  if (options?.format === "a5") formatOption = [148, 210];
  if (options?.format === "custom" && options?.customSize) formatOption = options.customSize;

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: formatOption,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = typeof options?.margin === "number" ? options!.margin : (options?.format === "a4" ? 15 : 10);
  const contentWidth = pageWidth - 2 * margin;

  let nombreMois = paiement.nombreMois || 1;
  const loyerMensuel = paiement.contrat?.loyer_mensuel || paiement.montant;

  if (!paiement.nombreMois && paiement.contrat?.loyer_mensuel > 0 && paiement.montant > 0) {
    nombreMois = Math.max(1, Math.round(paiement.montant / paiement.contrat.loyer_mensuel));
  }

  const drawReceipt = (startY: number) => {
    let currentY = startY;

    doc.setFont("Times", "normal");

    // HEADER
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "JPEG", margin, currentY, 18, 18);
      } catch (error) {
        console.error("Error adding logo:", error);
      }
    }

    doc.setFontSize(12);
    doc.setFont("Times", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("AGENCE IMMOBILIERE PHENIX", logoBase64 ? margin + 22 : margin, currentY + 5);

    doc.setFontSize(10);
    doc.setFont("Times", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("Tel: +228 92 18 40 65", logoBase64 ? margin + 22 : margin, currentY + 10);
    doc.text("www.pheniximmobilier.tech", logoBase64 ? margin + 22 : margin, currentY + 14);

    const receiptNumber = generateReceiptNumber(paiement.id, paiement.date_paiement);
    doc.setFontSize(11);
    doc.setFont("Times", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("FACTURE", pageWidth - margin, currentY + 4, { align: "right" });

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont("Times", "normal");
    doc.text(`N°: ${receiptNumber}`, pageWidth - margin, currentY + 8, { align: "right" });
    doc.text(`Date: ${new Date(paiement.date_paiement).toLocaleDateString("fr-FR")}`, pageWidth - margin, currentY + 12, { align: "right" });

    currentY += 20;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;

    // LOCATAIRE + BIEN
    const colWidth = (contentWidth - 4) / 2;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.rect(margin, currentY, colWidth, 18);

    doc.setFontSize(9);
    doc.setFont("Times", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("LOCATAIRE", margin + 2, currentY + 4);
    doc.setTextColor(0, 0, 0);
    doc.setFont("Times", "normal");
    doc.text(truncateText(paiement.locataire.nom, 28), margin + 2, currentY + 8);
    doc.text(`Tel: ${paiement.locataire.telephone}`, margin + 2, currentY + 12);
    if (paiement.locataire.adresse) {
      doc.setFontSize(8);
      doc.text(truncateText(paiement.locataire.adresse, 30), margin + 2, currentY + 16);
    }

    const col2X = margin + colWidth + 4;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.rect(col2X, currentY, colWidth, 18);

    doc.setFontSize(9);
    doc.setFont("Times", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("BIEN LOUÉ", col2X + 2, currentY + 4);
    doc.setTextColor(0, 0, 0);
    doc.setFont("Times", "normal");
    doc.text(truncateText(paiement.bien.nom, 28), col2X + 2, currentY + 8);
    doc.setFontSize(8);
    doc.text(truncateText(paiement.bien.adresse, 30), col2X + 2, currentY + 12);
    doc.text(`Type: ${paiement.bien.type}`, col2X + 2, currentY + 16);

    currentY += 21;

    // TYPE PAIEMENT
    const typeLabels: { [key: string]: string } = {
      loyer: "PAIEMENT DE LOYER",
      avance: "AVANCE SUR LOYER",
      caution: "DEPOT DE GARANTIE",
      arrieres: "ARRIERES DE LOYER"
    };

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.rect(margin, currentY, contentWidth, 6);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("Times", "bold");
    doc.text(typeLabels[paiement.type] || "PAIEMENT", pageWidth / 2, currentY + 4, { align: "center" });
    doc.setTextColor(0, 0, 0);

    currentY += 8;

    // TABLE
    const tableData: string[][] = [];

    if (paiement.type === "loyer" || paiement.type === "avance" || paiement.type === "arrieres") {
      if (paiement.moisDetails && paiement.moisDetails.length > 0) {
        paiement.moisDetails.forEach((detail, index) => {
          const moisLabel = new Date(detail.mois).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
          tableData.push([
            String(index + 1),
            moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1),
            formatMontant(detail.montant)
          ]);
        });
      } else if (paiement.mois_concerne && nombreMois >= 1) {
        const startDate = new Date(paiement.mois_concerne);
        for (let i = 0; i < nombreMois; i++) {
          const moisDate = new Date(startDate);
          moisDate.setMonth(moisDate.getMonth() + i);
          const moisLabel = moisDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
          tableData.push([
            String(i + 1),
            moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1),
            formatMontant(loyerMensuel)
          ]);
        }
      } else {
        tableData.push(["1", "Loyer mensuel", formatMontant(paiement.montant)]);
      }
    } else if (paiement.type === "caution") {
      if (paiement.moisDetails && paiement.moisDetails.length > 0) {
        paiement.moisDetails.forEach((detail, index) => {
          tableData.push([
            String(index + 1),
            detail.mois,
            formatMontant(detail.montant)
          ]);
        });
      } else {
        tableData.push(["1", "Depot de garantie", formatMontant(paiement.montant)]);
      }
    }

    const fontSize = tableData.length > 8 ? 8 : 10;
    const col0Width = Math.max(10, Math.round(contentWidth * 0.09));
    const col2Width = Math.max(24, Math.round(contentWidth * 0.28));
    const col1Width = contentWidth - col0Width - col2Width - 2;

    autoTable(doc, {
      startY: currentY,
      head: [["N°", "Periode / Description", "Montant"]],
      body: tableData,
      theme: "grid",
      styles: {
        font: "Times",
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        fontSize: fontSize,
        fontStyle: "bold",
        halign: "center",
        cellPadding: 1.5,
      },
      bodyStyles: {
        fontSize: fontSize,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: col0Width, halign: "center" },
        1: { cellWidth: col1Width, halign: "left" },
        2: { cellWidth: col2Width, halign: "right" },
      },
      margin: { left: margin, right: margin },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      tableWidth: contentWidth,
    });

    currentY = (doc as any).lastAutoTable.finalY + 2;

    // TOTAL
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.rect(margin, currentY, contentWidth, 8);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("Times", "bold");
    doc.text("TOTAL PAYE:", margin + 3, currentY + 5);
    doc.text(formatMontant(paiement.montant), pageWidth - margin - 3, currentY + 5, { align: "right" });
    doc.setTextColor(0, 0, 0);

    currentY += 10;

    // PERIODE
    if (nombreMois > 1 && (paiement.type === "loyer" || paiement.type === "avance" || paiement.type === "arrieres")) {
      const startMois = paiement.mois_concerne ? new Date(paiement.mois_concerne) : new Date();
      const endMois = new Date(startMois);
      endMois.setMonth(endMois.getMonth() + nombreMois - 1);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.rect(margin, currentY, contentWidth, 7);

      doc.setFontSize(8);
      doc.setFont("Times", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("PERIODE:", margin + 2, currentY + 4);
      doc.setTextColor(0, 0, 0);
      doc.setFont("Times", "normal");
      const periodeText = `${startMois.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} au ${endMois.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} (${nombreMois} mois)`;
      doc.text(periodeText, margin + 18, currentY + 4);

      currentY += 8;
    }

    // PROCHAIN PAIEMENT
    if ((paiement.type === "loyer" || paiement.type === "avance") && paiement.mois_concerne) {
      const nextMonth = new Date(paiement.mois_concerne);
      nextMonth.setMonth(nextMonth.getMonth() + nombreMois);
      nextMonth.setDate(10);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.rect(margin, currentY, contentWidth, 7);

      doc.setFontSize(8);
      doc.setFont("Times", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("PROCHAIN PAIEMENT:", margin + 2, currentY + 4);
      doc.setFont("Times", "normal");
      const nextPaymentText = `AVANT LE 10 ${nextMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
      doc.text(nextPaymentText, pageWidth - margin - 2, currentY + 4, { align: "right" });
      doc.setTextColor(0, 0, 0);

      currentY += 8;
    }

    // FOOTER
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("Times", "italic");
    doc.text("Ce document fait foi de paiement. Merci. - Phenix Immobilier",
      pageWidth / 2, currentY + 5, { align: "center" });
  };

  if (options?.copies === 2) {
    drawReceipt(margin);

    // Draw cut line
    const middleY = pageHeight / 2;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    (doc as any).setLineDash([3, 3], 0);
    doc.line(0, middleY, pageWidth, middleY);
    doc.setFontSize(12);
    doc.text("✂", 5, middleY - 2);
    (doc as any).setLineDash([], 0);

    // Second copy
    drawReceipt(middleY + 10); // +10 margin for the second receipt relative to middle
  } else {
    drawReceipt(margin);
  }

  const fileName = `Facture_${paiement.locataire.nom.replace(/\s+/g, "_")}_${new Date(paiement.date_paiement).toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};

// ========== RAPPORT PROPRIETAIRE (Format inspiré du document Word) ==========
interface ProprietaireReportData {
  proprietaire: {
    id: string;
    nom: string;
    telephone?: string;
    email?: string;
  };
  biens: Array<{
    id: string;
    nom: string;
    adresse: string;
    type: string;
    loyer_mensuel: number;
    commission_pourcentage: number;
    statut: string;
  }>;
  locataires: Array<{
    nom: string;
    bien_nom: string;
    loyer: number;
    loyers_payes: string;
    montant_paye: number;
    arrieres: number;
    arrieres_details: string;
    caution_payee: number;
    caution_nb_mois: string;
  }>;
  depenses: Array<{
    description: string;
    montant: number;
    categorie: string;
    bien_nom: string;
  }>;
  totals: {
    nombre_chambres: number;
    nombre_libres: number;
    total_loyers: number;
    total_arrieres: number;
    total_cautions: number;
    total_depenses: number;
    commission: number;
    somme_a_verser: number;
  };
}

export const generateProprietaireRapportPDF = async (
  data: ProprietaireReportData,
  selectedMonth: string,
  logoBase64?: string
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // await loadFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  const monthDate = new Date(selectedMonth + "-01");
  const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // HEADER avec style du document Word
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, margin, 18, 18);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(16);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("AGENCE IMMOBILIERE PHENIX", logoBase64 ? margin + 22 : margin, margin + 5);

  doc.setFontSize(10);
  doc.setFont("Times", "normal");
  doc.text("Tel: +228 92 18 40 65", logoBase64 ? margin + 22 : margin, margin + 10);
  doc.text("www.pheniximmobilier.tech", logoBase64 ? margin + 22 : margin, margin + 14);

  currentY = margin + 22;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 8;

  // TITRE DU RAPPORT
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.rect(margin, currentY, contentWidth, 12);
  doc.setFontSize(14);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`SITUATION DU MOIS DE ${monthLabel.toUpperCase()}`, pageWidth / 2, currentY + 8, { align: "center" });

  currentY += 16;

  // NOM DU PROPRIETAIRE
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.rect(margin, currentY, contentWidth, 10);
  doc.setFontSize(13);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`PROPRIETAIRE: ${data.proprietaire.nom.toUpperCase()}`, pageWidth / 2, currentY + 7, { align: "center" });

  currentY += 14;

  // STATISTIQUES CHAMBRES
  const statWidth = contentWidth / 2 - 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.roundedRect(margin, currentY, statWidth, 14, 2, 2);
  doc.setFontSize(11);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Nombre de biens", margin + statWidth / 2, currentY + 5, { align: "center" });
  doc.setFontSize(16);
  doc.text(String(data.totals.nombre_chambres).padStart(2, '0'), margin + statWidth / 2, currentY + 11, { align: "center" });

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.roundedRect(margin + statWidth + 4, currentY, statWidth, 14, 2, 2);
  doc.setFontSize(11);
  doc.text("Biens libres", margin + statWidth + 4 + statWidth / 2, currentY + 5, { align: "center" });
  doc.setFontSize(16);
  doc.text(String(data.totals.nombre_libres).padStart(2, '0'), margin + statWidth + 4 + statWidth / 2, currentY + 11, { align: "center" });

  currentY += 18;

  // TABLEAU DES ENTREES (Locataires)
  doc.setFontSize(13);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("LES ENTRÉES", margin, currentY);
  currentY += 4;

  const locatairesData = data.locataires.map(loc => [
    loc.nom,
    formatNumber(loc.loyer),
    loc.loyers_payes || "-",
    loc.montant_paye > 0 ? formatNumber(loc.montant_paye) : "-",
    loc.arrieres > 0 ? loc.arrieres_details : "-",
    loc.caution_payee > 0 ? loc.caution_nb_mois : "-",
    loc.caution_payee > 0 ? formatNumber(loc.caution_payee) : "-"
  ]);

  // Ajouter ligne total
  locatairesData.push([
    "TOTAL",
    formatNumber(data.locataires.reduce((sum, l) => sum + l.loyer, 0)),
    "",
    formatNumber(data.totals.total_loyers),
    formatNumber(data.totals.total_arrieres),
    "",
    formatNumber(data.totals.total_cautions)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Noms des locataires", "Prix", "Loyer payé", "Montant", "Arriérés", "Caution (Nb)", "Caution (Mnt)"]],
    body: locatairesData,
    theme: "grid",
    styles: {
      font: "Times",
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      fontSize: 10,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 35 },
      1: { halign: "right", cellWidth: 20 },
      2: { halign: "center", cellWidth: 28 },
      3: { halign: "right", cellWidth: 22 },
      4: { halign: "right", cellWidth: 25 },
      5: { halign: "center", cellWidth: 20 },
      6: { halign: "right", cellWidth: 22 },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    didParseCell: function (hookData) {
      if (hookData.row.index === locatairesData.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        // hookData.cell.styles.fillColor = [220, 220, 220];
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // TABLEAU DES DEPENSES ET RECAPITULATIF
  // Check if we need a new page
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = margin;
  }

  // Preparer les données pour le tableau unique
  const depensesEtRecapData = [];

  // 1. Dépenses individuelles
  data.depenses.forEach(dep => {
    depensesEtRecapData.push([
      dep.description,
      formatNumber(dep.montant)
    ]);
  });

  // 2. Total des dépenses (Sous-total avant commission)
  depensesEtRecapData.push([
    "Total Dépenses",
    formatNumber(data.totals.total_depenses)
  ]);

  // 3. Commission
  depensesEtRecapData.push([
    "COMMISSION",
    formatNumber(data.totals.commission)
  ]);

  // 4. Somme à verser
  // Format: SOMME A VERSER =(Montant encaissé - commissions - total des dépenses)
  const totalEncaisse = data.totals.total_loyers + data.totals.total_cautions;
  const totalEncaisseStr = formatNumber(totalEncaisse);
  const commissionStr = formatNumber(data.totals.commission);
  const depensesStr = formatNumber(data.totals.total_depenses);

  const sommeAVerserLabel = `SOMME A VERSER = (${totalEncaisseStr} - ${commissionStr} - ${depensesStr})`;

  depensesEtRecapData.push([
    sommeAVerserLabel,
    formatNumber(data.totals.somme_a_verser)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [{ content: 'Les Dépenses', colSpan: 2, styles: { halign: 'center', fontSize: 13, fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      ['Motifs', 'Mts']
    ],
    body: depensesEtRecapData,
    theme: "grid",
    styles: {
      font: "Times",
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      fontSize: 11,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      fontSize: 11,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 120 }, // Center alignment for Motifs distinct from previous left
      1: { halign: "center", cellWidth: 40 }, // Center alignment for Amounts to match image
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    didParseCell: function (hookData) {
      const rowCount = depensesEtRecapData.length;
      const rowIndex = hookData.row.index;

      // Style "Total Dépenses" row (3rd to last)
      if (rowIndex === rowCount - 3) {
        hookData.cell.styles.fontStyle = 'bold';
      }

      // Style "COMMISSION" row (2nd to last)
      if (rowIndex === rowCount - 2) {
        hookData.cell.styles.fontStyle = 'bold';
      }

      // Style "SOMME A VERSER" row (last)
      if (rowIndex === rowCount - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fontSize = 12;
        hookData.cell.styles.fillColor = [230, 230, 230];
      }
    }
  });

  // Mise à jour de la position Y pour le footer (si besoin d'ajouter autre chose avant)
  currentY = (doc as any).lastAutoTable.finalY + 10;


  // FOOTER
  doc.setFontSize(9);
  doc.setFont("Times", "italic");
  doc.setTextColor(0, 0, 0);
  doc.text(`Rapport généré le ${new Date().toLocaleDateString("fr-FR")} - Phenix Immobilier`, pageWidth / 2, pageHeight - 8, { align: "center" });

  const fileName = `Rapport_${data.proprietaire.nom.replace(/\s+/g, "_")}_${selectedMonth}.pdf`;
  doc.save(fileName);

  return {
    proprietaire_id: data.proprietaire.id,
    proprietaire_nom: data.proprietaire.nom,
    mois_concerne: selectedMonth,
    total_revenus: data.totals.total_loyers,
    total_depenses: data.totals.total_depenses + data.totals.commission,
    somme_a_verser: data.totals.somme_a_verser
  };
};

// ========== RAPPORT GENERAL AGENCE ==========
interface AgenceReportData {
  proprietaires: Array<{
    nom: string;
    total_loyers: number;
    total_depenses: number;
    commission: number;
    somme_versee: number;
  }>;
  totals: {
    total_loyers: number;
    total_depenses: number;
    total_commissions: number;
    benefice_net: number;
    nombre_biens: number;
    nombre_occupes: number;
    nombre_locataires: number;
  };
}

export const generateAgenceRapportPDF = async (
  data: AgenceReportData,
  selectedMonth: string,
  logoBase64?: string
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // await loadFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  const monthDate = new Date(selectedMonth + "-01");
  const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // HEADER
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, margin, 18, 18);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(16);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("AGENCE IMMOBILIERE PHENIX", logoBase64 ? margin + 22 : margin, margin + 5);

  doc.setFontSize(10);
  doc.setFont("Times", "normal");
  doc.text("Tel: +228 92 18 40 65", logoBase64 ? margin + 22 : margin, margin + 10);
  doc.text("www.pheniximmobilier.tech", logoBase64 ? margin + 22 : margin, margin + 14);

  currentY = margin + 22;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 8;

  // TITRE
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.rect(margin, currentY, contentWidth, 14);
  doc.setFontSize(14);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`BILAN DU MOIS DE ${monthLabel.toUpperCase()}`, pageWidth / 2, currentY + 9, { align: "center" });

  currentY += 20;

  // STATISTIQUES GENERALES
  const statW = (contentWidth - 12) / 4;

  const stats = [
    { label: "Biens gérés", value: data.totals.nombre_biens },
    { label: "Occupés", value: data.totals.nombre_occupes },
    { label: "Libres", value: data.totals.nombre_biens - data.totals.nombre_occupes },
    { label: "Locataires", value: data.totals.nombre_locataires },
  ];

  stats.forEach((stat, i) => {
    const x = margin + i * (statW + 4);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.roundedRect(x, currentY, statW, 20, 2, 2);
    doc.setFontSize(8);
    doc.setFont("Times", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(stat.label, x + statW / 2, currentY + 7, { align: "center" });
    doc.setFontSize(14);
    doc.text(String(stat.value), x + statW / 2, currentY + 16, { align: "center" });
  });

  currentY += 28;

  // TABLEAU PAR PROPRIETAIRE
  doc.setFontSize(11);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("RÉCAPITULATIF PAR PROPRIÉTAIRE", margin, currentY);
  currentY += 5;

  const propData = data.proprietaires.map(p => [
    p.nom,
    formatNumber(p.total_loyers),
    formatNumber(p.total_depenses),
    formatNumber(p.commission),
    formatNumber(p.somme_versee)
  ]);

  propData.push([
    "TOTAL",
    formatNumber(data.totals.total_loyers),
    formatNumber(data.totals.total_depenses),
    formatNumber(data.totals.total_commissions),
    formatNumber(data.totals.total_loyers - data.totals.total_depenses - data.totals.total_commissions)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Propriétaire", "Loyers", "Dépenses", "Commission", "Versé"]],
    body: propData,
    theme: "grid",
    styles: {
      font: "Times",
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 50 },
      1: { halign: "right", cellWidth: 30 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "right", cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    didParseCell: function (hookData) {
      if (hookData.row.index === propData.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        // hookData.cell.styles.fillColor = [220, 220, 220];
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // RESUME FINANCIER AGENCE
  // Check if we need a new page for the summary
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFontSize(11);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("BILAN FINANCIER DE L'AGENCE", margin, currentY);
  currentY += 6;

  const financeBox = contentWidth / 2 - 5;

  // Commission gagnée
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.roundedRect(margin, currentY, financeBox, 25, 3, 3);
  doc.setFontSize(10);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("COMMISSIONS GAGNÉES", margin + financeBox / 2, currentY + 8, { align: "center" });
  doc.setFontSize(16);
  doc.text(formatMontant(data.totals.total_commissions), margin + financeBox / 2, currentY + 19, { align: "center" });

  // Bénéfice net
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.roundedRect(margin + financeBox + 10, currentY, financeBox, 25, 3, 3);
  doc.setFontSize(10);
  doc.text("BÉNÉFICE NET GLOBAL", margin + financeBox + 10 + financeBox / 2, currentY + 8, { align: "center" });
  doc.setFontSize(16);
  doc.text(formatMontant(data.totals.benefice_net), margin + financeBox + 10 + financeBox / 2, currentY + 19, { align: "center" });

  // FOOTER
  doc.setFontSize(7);
  doc.setFont("Times", "italic");
  doc.setTextColor(0, 0, 0);
  doc.text(`Rapport interne généré le ${new Date().toLocaleDateString("fr-FR")} - CONFIDENTIEL - Phenix Immobilier`, pageWidth / 2, pageHeight - 8, { align: "center" });

  const fileName = `Rapport_Agence_${selectedMonth}.pdf`;
  doc.save(fileName);

  return {
    mois_concerne: selectedMonth,
    total_revenus: data.totals.total_loyers,
    total_depenses: data.totals.total_depenses,
    total_commissions: data.totals.total_commissions,
    benefice_net: data.totals.benefice_net
  };
};

// ========== CONTRAT PDF ==========
export const generateContratPDF = async (contrat: any, logoBase64?: string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  const maxY = pageHeight - 25;
  let currentY = margin;

  const proprietaireNom = contrat.biens?.proprietaires?.nom || "Non renseigne";

  const checkNewPage = (neededSpace: number = 15) => {
    if (currentY + neededSpace > maxY) {
      addPageFooter();
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  const addPageFooter = () => {
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Document genere le ${new Date().toLocaleDateString("fr-FR")} par Phenix Immobilier`, pageWidth / 2, pageHeight - 8, { align: "center" });
  };

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 18, 18);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(15);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("AGENCE IMMOBILIERE PHENIX", logoBase64 ? margin + 22 : margin, currentY + 5);

  doc.setFontSize(10);
  doc.setFont("Times", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Tel: +228 92 18 40 65", logoBase64 ? margin + 22 : margin, currentY + 10);
  doc.text("www.pheniximmobilier.tech", logoBase64 ? margin + 22 : margin, currentY + 14);

  currentY += 22;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  doc.setFontSize(18);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  const titleType = contrat.biens?.type === "boutique" || contrat.biens?.type === "magasin"
    ? "CONTRAT DE BAIL A USAGE COMMERCIAL"
    : "CONTRAT DE BAIL A USAGE D'HABITATION";
  doc.text(titleType, pageWidth / 2, currentY, { align: "center" });

  currentY += 10;

  doc.setFontSize(14);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("ENTRE LES SOUSSIGNES", margin, currentY);
  currentY += 6;



  doc.setFontSize(12);
  doc.setFont("Times", "bold");
  doc.text("LE BAILLEUR:", margin + 2, currentY + 3);
  doc.setFont("Times", "normal");
  doc.text(`Mr/Mme ${proprietaireNom}`, margin + 50, currentY + 3);
  currentY += 8;

  doc.setFont("Times", "bold");
  doc.text("Represente par:", margin + 2, currentY + 3);
  doc.setFont("Times", "normal");
  doc.text("L'AGENCE IMMOBILIERE PHENIX - Tel: 92 18 40 65", margin + 50, currentY + 3);
  currentY += 10;



  doc.setFont("Times", "bold");
  doc.text("LE PRENEUR:", margin + 2, currentY + 3);
  doc.setFont("Times", "normal");
  const preneurInfo = `${contrat.locataires?.nom || ""}${contrat.locataires?.telephone ? " - Tel: " + contrat.locataires.telephone : ""}`;
  doc.text(preneurInfo, margin + 50, currentY + 3);
  currentY += 8;

  if (contrat.locataires?.piece_identite) {
    doc.setFont("Times", "bold");
    doc.text("Piece d'identite:", margin + 2, currentY + 3);
    doc.setFont("Times", "normal");
    doc.text(contrat.locataires.piece_identite, margin + 50, currentY + 3);
    currentY += 8;
  }

  if (contrat.locataires?.adresse) {
    doc.setFont("Times", "bold");
    doc.text("Adresse:", margin + 2, currentY + 3);
    doc.setFont("Times", "normal");
    doc.text(contrat.locataires.adresse, margin + 30, currentY + 3);
  }
  currentY += 12;

  doc.setFontSize(11);
  doc.setFont("Times", "italic");
  doc.setTextColor(0, 0, 0);
  doc.text("Conformement aux dispositions du Code Civil Togolais relatives au louage de choses", margin, currentY);
  currentY += 8;

  doc.setFontSize(14);
  doc.setFont("Times", "bold");
  doc.text("IL A ETE CONVENU CE QUI SUIT:", margin, currentY);
  currentY += 8;

  // ETAT DES LIEUX
  checkNewPage(25);
  doc.setFontSize(12);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("ETAT DES LIEUX", margin, currentY);
  currentY += 5;

  doc.setFontSize(11);
  doc.setFont("Times", "normal");
  const etatDesLieuxText = contrat.biens?.etat_des_lieux || "Non precise";
  const etatLines = doc.splitTextToSize(etatDesLieuxText, contentWidth);
  for (const line of etatLines) {
    checkNewPage(5);
    doc.text(line, margin, currentY);
    currentY += 6;
  }
  currentY += 8;

  const articles = [
    {
      title: "ARTICLE 1 - DESIGNATION DU BIEN",
      content: `Le Bailleur donne a bail au Preneur qui accepte, le bien immobilier suivant:\n- Designation: ${contrat.biens?.nom || "Non renseigne"}\n- Type: ${contrat.biens?.type || "Non renseigne"}\n- Adresse: ${contrat.biens?.adresse || "Non renseignee"}`
    },
    {
      title: "ARTICLE 2 - OBJET DU BAIL",
      content: `Le present bail est consenti et accepte pour l'usage exclusif d'${contrat.biens?.type === "boutique" || contrat.biens?.type === "magasin" ? "activite commerciale" : "habitation personnelle"} du Preneur.`
    },
    {
      title: "ARTICLE 3 - DUREE DU BAIL",
      content: `Le present bail est consenti pour une duree indeterminee a compter du ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")}${contrat.date_fin ? ` jusqu'au ${new Date(contrat.date_fin).toLocaleDateString("fr-FR")}` : ""}.`
    },
    {
      title: "ARTICLE 4 - CONDITIONS FINANCIERES",
      content: `Le present bail est consenti moyennant:\n- Loyer mensuel: ${formatMontant(contrat.loyer_mensuel)}\n- Caution (depot de garantie): ${formatMontant(contrat.caution || 0)}\n- Avance sur loyer: ${contrat.avance_mois || 0} mois\n\nLe loyer est payable d'avance le 10 de chaque mois.`
    },
    {
      title: "ARTICLE 5 - OBLIGATIONS DU PRENEUR",
      content: "Le Preneur s'engage a:\n- Payer regulierement le loyer aux echeances convenues\n- Entretenir le bien en bon pere de famille\n- Ne pas sous-louer sans accord ecrit du Bailleur\n- Signaler immediatement tout dommage au bien\n- Respecter le reglement interieur et le voisinage"
    },
    {
      title: "ARTICLE 6 - OBLIGATIONS DU BAILLEUR",
      content: "Le Bailleur s'engage a:\n- Delivrer le bien en bon etat\n- Assurer la jouissance paisible du bien\n- Effectuer les grosses reparations\n- Restituer la caution en fin de bail, deduction faite des eventuels degats"
    },
    {
      title: "ARTICLE 7 - RESILIATION",
      content: "Le bail peut etre resilie:\n- Par le Preneur avec un preavis de 1 mois\n- Par le Bailleur avec un preavis de 3 mois\n- De plein droit en cas de non-paiement de 2 mois de loyer consecutifs"
    },
    {
      title: "ARTICLE 8 - CLAUSE PENALE",
      content: "Tout retard de paiement du loyer au-dela de 10 jours entrainera une penalite de 10% du montant du."
    },
    {
      title: "ARTICLE 9 - ELECTION DE DOMICILE",
      content: "Pour l'execution des presentes, les parties elisent domicile:\n- Le Bailleur: a l'Agence Phenix Immobilier\n- Le Preneur: au lieu loue"
    }
  ];

  for (const article of articles) {
    checkNewPage(25);

    doc.setFontSize(12);
    doc.setFont("Times", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(article.title, margin, currentY);
    currentY += 5;

    doc.setFontSize(11);
    doc.setFont("Times", "normal");
    const lines = doc.splitTextToSize(article.content, contentWidth);
    for (const line of lines) {
      checkNewPage(6);
      doc.text(line, margin, currentY);
      currentY += 6;
    }
    currentY += 4;
  }

  checkNewPage(50);

  const sigWidth = (contentWidth - 10) / 2;

  // PREMIERE SECTION - DEBUT DE BAIL
  doc.setFontSize(12);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("DEBUT DE BAIL - SIGNATURES", pageWidth / 2, currentY, { align: "center" });
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("Times", "bold");
  doc.text("L'AGENCE", margin + sigWidth / 2, currentY, { align: "center" });
  doc.text("LE PRENEUR", margin + sigWidth + 10 + sigWidth / 2, currentY, { align: "center" });
  currentY += 3;

  doc.setFont("Times", "normal");
  doc.setFontSize(9);
  doc.text("(Cachet + Signature)", margin + sigWidth / 2, currentY, { align: "center" });
  doc.text("(Signature)", margin + sigWidth + 10 + sigWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, currentY, sigWidth, 25);
  doc.rect(margin + sigWidth + 10, currentY, sigWidth, 25);

  currentY += 35;
  checkNewPage(50);

  // DEUXIEME SECTION - FIN DE BAIL
  doc.setFontSize(12);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("FIN DE BAIL - SIGNATURES", pageWidth / 2, currentY, { align: "center" });
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("Times", "bold");
  doc.text("L'AGENCE", margin + sigWidth / 2, currentY, { align: "center" });
  doc.text("LE PRENEUR", margin + sigWidth + 10 + sigWidth / 2, currentY, { align: "center" });
  currentY += 3;

  doc.setFont("Times", "normal");
  doc.setFontSize(9);
  doc.text("(Cachet + Signature)", margin + sigWidth / 2, currentY, { align: "center" });
  doc.text("(Signature)", margin + sigWidth + 10 + sigWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, currentY, sigWidth, 25);
  doc.rect(margin + sigWidth + 10, currentY, sigWidth, 25);

  currentY += 38;

  doc.setFontSize(10);
  doc.setFont("Times", "italic");
  doc.text(`Fait en double exemplaire a KARA, le ${new Date().toLocaleDateString("fr-FR")}`, pageWidth / 2, currentY, { align: "center" });

  addPageFooter();

  const fileName = `Contrat_${contrat.locataires?.nom?.replace(/\s+/g, "_") || "locataire"}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};

// ========== RAPPORT FINANCIER SIMPLE (existant) ==========
export const generateRapportPDF = async (financialData: any, selectedMonth: string, logoBase64?: string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  const monthDate = new Date(selectedMonth + "-01");
  const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 18, 18);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(16);
  doc.setFont("Times", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("Phenix Immobilier", logoBase64 ? margin + 22 : margin, currentY + 6);

  doc.setFontSize(10);
  doc.setFont("Times", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Rapport Financier Mensuel", logoBase64 ? margin + 22 : margin, currentY + 11);
  doc.text("+228 92 18 40 65 | www.pheniximmobilier.tech", logoBase64 ? margin + 22 : margin, currentY + 15);

  doc.setFontSize(12);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`Mois: ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`, pageWidth - margin, currentY + 8, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("Times", "normal");
  doc.text(`Genere le ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - margin, currentY + 13, { align: "right" });

  currentY += 22;

  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  doc.setFontSize(18);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("RAPPORT FINANCIER", pageWidth / 2, currentY, { align: "center" });
  currentY += 10;

  const cardWidth = (contentWidth - 10) / 3;

  doc.setFillColor(220, 252, 231);
  doc.roundedRect(margin, currentY, cardWidth, 22, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("Times", "normal");
  doc.setTextColor(34, 197, 94);
  doc.text("REVENUS TOTAUX", margin + cardWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(13);
  doc.setFont("Times", "bold");
  doc.text(formatMontant(financialData.totals.revenus), margin + cardWidth / 2, currentY + 15, { align: "center" });

  doc.setFillColor(254, 226, 226);
  doc.roundedRect(margin + cardWidth + 5, currentY, cardWidth, 22, 3, 3, "F");
  doc.setTextColor(239, 68, 68);
  doc.setFontSize(10);
  doc.setFont("Times", "normal");
  doc.text("DEPENSES TOTALES", margin + cardWidth + 5 + cardWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(13);
  doc.setFont("Times", "bold");
  doc.text(formatMontant(financialData.totals.depenses), margin + cardWidth + 5 + cardWidth / 2, currentY + 15, { align: "center" });

  const beneficeColor = financialData.totals.benefice >= 0 ? [59, 130, 246] : [239, 68, 68];
  doc.setFillColor(beneficeColor[0] >= 100 ? 219 : 254, beneficeColor[0] >= 100 ? 234 : 226, beneficeColor[0] >= 100 ? 254 : 226);
  doc.roundedRect(pageWidth - margin - cardWidth, currentY, cardWidth, 22, 3, 3, "F");
  doc.setTextColor(beneficeColor[0], beneficeColor[1], beneficeColor[2]);
  doc.setFontSize(10);
  doc.setFont("Times", "normal");
  doc.text("BENEFICE NET", pageWidth - margin - cardWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(13);
  doc.setFont("Times", "bold");
  doc.text(formatMontant(financialData.totals.benefice), pageWidth - margin - cardWidth / 2, currentY + 15, { align: "center" });

  currentY += 30;

  doc.setFontSize(13);
  doc.setFont("Times", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("DETAIL PAR PROPRIETAIRE", margin, currentY);
  currentY += 6;

  const tableData = financialData.byProprietaire.map((prop: any) => [
    prop.nom,
    formatMontant(prop.revenus),
    formatMontant(prop.depenses),
    formatMontant(prop.benefice)
  ]);

  tableData.push([
    "TOTAL",
    formatMontant(financialData.totals.revenus),
    formatMontant(financialData.totals.depenses),
    formatMontant(financialData.totals.benefice)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Proprietaire", "Revenus", "Depenses", "Benefice"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [52, 73, 94],
      fontSize: 9,
      fontStyle: "bold",
      halign: "center"
    },
    bodyStyles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    didParseCell: function (hookData) {
      if (hookData.row.index === tableData.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont("Times", "italic");
  doc.text("Rapport genere automatiquement par Phenix Immobilier", pageWidth / 2, pageHeight - 10, { align: "center" });

  const fileName = `Rapport_Financier_${selectedMonth}.pdf`;
  doc.save(fileName);

  return {
    mois_concerne: selectedMonth,
    total_revenus: financialData.totals.revenus,
    total_depenses: financialData.totals.depenses,
    benefice_net: financialData.totals.benefice,
    donnees_json: financialData
  };
};

// Generate Daily Report PDF
export const generateDailyReportPDF = async (
  proprietairesData: any[],
  selectedDate: string,
  totalPaiements: number,
  totalDepenses: number,
  logoBase64: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header with logo
  if (logoBase64) {
    doc.addImage(logoBase64, "JPEG", 15, 10, 30, 15);
  }

  doc.setFontSize(6);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("AGENCE IMMOBILIERE PHENIX", 15, 28);

  doc.setFontSize(20);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 102, 204);
  doc.text("RAPPORT JOURNALIER", pageWidth / 2, 40, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("Times", "normal");
  doc.setTextColor(80, 80, 80);
  const dateFormatted = new Date(selectedDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  doc.text(dateFormatted, pageWidth / 2, 48, { align: "center" });

  // Summary boxes
  let yPos = 60;

  doc.setFillColor(220, 240, 255);
  doc.rect(15, yPos, 60, 20, 'F');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text("Total Paiements", 45, yPos + 7, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 102, 204);
  doc.text(`${totalPaiements.toLocaleString('fr-FR')} FCFA`, 45, yPos + 15, { align: "center" });

  doc.setFillColor(255, 220, 220);
  doc.rect(80, yPos, 60, 20, 'F');
  doc.setFontSize(10);
  doc.setFont("Times", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("Total Depenses", 110, yPos + 7, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("Times", "bold");
  doc.setTextColor(204, 0, 0);
  doc.text(`${totalDepenses.toLocaleString('fr-FR')} FCFA`, 110, yPos + 15, { align: "center" });

  doc.setFillColor(220, 255, 220);
  doc.rect(145, yPos, 50, 20, 'F');
  doc.setFontSize(10);
  doc.setFont("Times", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("Solde Net", 170, yPos + 7, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("Times", "bold");
  doc.setTextColor(0, 153, 0);
  doc.text(`${(totalPaiements - totalDepenses).toLocaleString('fr-FR')} FCFA`, 170, yPos + 15, { align: "center" });

  yPos = 70;

  // Details by owner
  for (const propData of proprietairesData) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Owner header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos, pageWidth - 30, 10, 'F');
    doc.setFontSize(14);
    doc.setFont("Times", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(propData.proprietaire.nom, 20, yPos + 7);

    doc.setFont("Times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 153, 0);
    doc.text(`+${propData.totalPaiements.toLocaleString('fr-FR')} FCFA`, pageWidth - 80, yPos + 7);
    if (propData.totalDepenses > 0) {
      doc.setTextColor(204, 0, 0);
      doc.text(`-${propData.totalDepenses.toLocaleString('fr-FR')} FCFA`, pageWidth - 20, yPos + 7, { align: "right" });
    }

    yPos += 15;

    // Payments
    if (propData.paiements.length > 0) {
      doc.setFontSize(12);
      doc.setFont("Times", "bold");
      doc.setTextColor(0, 102, 0);
      doc.text(`Paiements (${propData.paiements.length})`, 20, yPos);
      yPos += 5;

      const paiementsData = propData.paiements.map((p: any) => [
        p.locataire || 'N/A',
        p.bien || 'N/A',
        p.type,
        `${Number(p.montant).toLocaleString('fr-FR')} FCFA`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Locataire', 'Bien', 'Type', 'Montant']],
        body: paiementsData,
        margin: { left: 20, right: 20 },
        styles: { fontSize: 11, cellPadding: 3 },
        headStyles: { fillColor: [220, 255, 220], textColor: [0, 102, 0], fontStyle: 'bold', font: 'Times' },
        theme: 'grid'
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Expenses
    if (propData.depenses.length > 0) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont("Times", "bold");
      doc.setTextColor(153, 0, 0);
      doc.text(`Depenses (${propData.depenses.length})`, 20, yPos);
      yPos += 5;

      const depensesData = propData.depenses.map((d: any) => [
        d.description,
        d.bien || 'N/A',
        d.categorie,
        `${Number(d.montant).toLocaleString('fr-FR')} FCFA`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Description', 'Bien', 'Categorie', 'Montant']],
        body: depensesData,
        margin: { left: 20, right: 20 },
        styles: { fontSize: 11, cellPadding: 3 },
        headStyles: { fillColor: [255, 220, 220], textColor: [153, 0, 0], fontStyle: 'bold', font: 'Times' },
        theme: 'grid'
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont("Times", "italic");
  doc.text("Rapport genere automatiquement par Phenix Immobilier", pageWidth / 2, pageHeight - 10, { align: "center" });

  const fileName = `Rapport_Journalier_${selectedDate}.pdf`;
  doc.save(fileName);
};

