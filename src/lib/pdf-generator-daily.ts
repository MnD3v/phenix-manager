import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Load DM Sans fonts
const loadFonts = async (doc: jsPDF) => {
    const fontFiles = [
        { url: "/fonts/Arial Narrow/Arialn.ttf", name: "Arial Narrow", style: "normal", filename: "Arialn.ttf" },
        { url: "/fonts/Arial Narrow/arial.ttf", name: "Arial", style: "normal", filename: "arial.ttf" },
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

// Format number simple (sans FCFA)
const formatNumber = (montant: number): string => {
    const parts = montant.toString().split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return intPart;
};

// Format number with separators and FCFA
const formatMontant = (montant: number): string => {
    const parts = montant.toString().split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return intPart + " FCFA";
};

// Generate Daily Report PDF - matches style of other reports
export const generateDailyReportPDF2 = async (
    paiementsDuJour: any[],
    depensesDuJour: any[],
    selectedDate: string,
    totalPaiements: number,
    totalDepenses: number,
    logoBase64: string
) => {
    const doc = new jsPDF();
    await loadFonts(doc);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

    doc.setFont("Arial Narrow", "normal");

    // HEADER
    if (logoBase64) {
        try {
            doc.setFillColor(255, 255, 255);
            doc.rect(margin, currentY, 25, 25, "F");
            doc.addImage(logoBase64, "PNG", margin, currentY, 25, 25);
        } catch (error) {
            console.error("Error adding logo:", error);
        }
    }

    doc.setFontSize(18);
    doc.setFont("Arial Narrow", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("AGENCE IMMOBILIERE PHENIX", logoBase64 ? margin + 30 : margin, currentY + 8);

    doc.setFontSize(12);
    doc.setFont("Arial Narrow", "normal");
    doc.text("Tel: +228 91 77 15 36", logoBase64 ? margin + 30 : margin, currentY + 14);
    doc.text("Email: essoham.aledi@gmail.com", logoBase64 ? margin + 30 : margin, currentY + 19);

    const dateFormatted = new Date(selectedDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    doc.setFontSize(11);
    doc.setFont("Arial Narrow", "normal");
    doc.text("RAPPORT JOURNALIER", pageWidth - margin, currentY + 8, { align: "right" });
    doc.setFontSize(11);
    doc.setFont("Arial Narrow", "normal");
    doc.text(dateFormatted, pageWidth - margin, currentY + 14, { align: "right" });

    currentY += 30;

    // Ligne de séparation
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    // TABLEAU DES PAIEMENTS
    doc.setFontSize(13);
    doc.setFont("Arial Narrow", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("LES PAIEMENTS", margin, currentY);
    currentY += 4;

    const paiementsData = paiementsDuJour.map(p => [
        p.locataire || 'N/A',
        p.bien || 'N/A',
        p.proprietaire || 'N/A',
        p.type,
        formatNumber(p.montant)
    ]);

    // Ajouter ligne de total
    paiementsData.push(['', '', '', 'TOTAL PAIEMENTS', formatNumber(totalPaiements)]);

    autoTable(doc, {
        startY: currentY,
        head: [['Locataire', 'Bien', 'Propriétaire', 'Type', 'Montant']],
        body: paiementsData,
        theme: "grid",
        styles: {
            font: "Arial Narrow",
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            fontSize: 11,
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
            1: { halign: "left", cellWidth: 40 },
            2: { halign: "left", cellWidth: 35 },
            3: { halign: "center", cellWidth: 30 },
            4: { halign: "right", cellWidth: 30 },
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        didParseCell: function (hookData) {
            if (hookData.row.index === paiementsData.length - 1) {
                hookData.cell.styles.fontStyle = 'bold';
            }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // TABLEAU DES DEPENSES
    if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
    }

    doc.setFontSize(13);
    doc.setFont("Arial Narrow", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("LES DÉPENSES", margin, currentY);
    currentY += 4;

    const depensesData = depensesDuJour.map(d => [
        d.description,
        d.proprietaire || 'N/A',
        d.categorie,
        formatNumber(d.montant)
    ]);

    // Ajouter ligne de total
    depensesData.push(['', '', 'TOTAL DÉPENSES', formatNumber(totalDepenses)]);

    autoTable(doc, {
        startY: currentY,
        head: [['Description', 'Propriétaire', 'Catégorie', 'Montant']],
        body: depensesData,
        theme: "grid",
        styles: {
            font: "Arial Narrow",
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            fontSize: 11,
            fontStyle: "bold",
            halign: "center",
            cellPadding: 2,
        },
        bodyStyles: {
            fontSize: 10,
            cellPadding: 2,
        },
        columnStyles: {
            0: { halign: "left", cellWidth: 55 },
            1: { halign: "left", cellWidth: 45 },
            2: { halign: "center", cellWidth: 40 },
            3: { halign: "right", cellWidth: 30 },
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        didParseCell: function (hookData) {
            if (hookData.row.index === depensesData.length - 1) {
                hookData.cell.styles.fontStyle = 'bold';
            }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // RESUME FINANCIER
    if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
    }

    const boxWidth = contentWidth / 3 - 4;

    // Total Paiements
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.roundedRect(margin, currentY, boxWidth, 18, 2, 2);
    doc.setFontSize(10);
    doc.setFont("Arial Narrow", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL PAIEMENTS", margin + boxWidth / 2, currentY + 6, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(formatMontant(totalPaiements), margin + boxWidth / 2, currentY + 13, { align: "center" });

    // Total Dépenses
    doc.setDrawColor(0, 0, 0);
    doc.roundedRect(margin + boxWidth + 6, currentY, boxWidth, 18, 2, 2);
    doc.setFontSize(10);
    doc.setFont("Arial Narrow", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL DÉPENSES", margin + boxWidth + 6 + boxWidth / 2, currentY + 6, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(formatMontant(totalDepenses), margin + boxWidth + 6 + boxWidth / 2, currentY + 13, { align: "center" });

    // Solde Net
    const soldeNet = totalPaiements - totalDepenses;
    doc.setDrawColor(0, 0, 0);
    doc.roundedRect(margin + 2 * (boxWidth + 6), currentY, boxWidth, 18, 2, 2);
    doc.setFontSize(10);
    doc.setFont("Arial Narrow", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("SOLDE NET", margin + 2 * (boxWidth + 6) + boxWidth / 2, currentY + 6, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(formatMontant(soldeNet), margin + 2 * (boxWidth + 6) + boxWidth / 2, currentY + 13, { align: "center" });

    currentY += 25;

    // SIGNATURE
    currentY += 15;
    if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = margin;
    }
    doc.setFontSize(11);
    doc.setFont("Arial Narrow", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`Fait à Kara le, ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - margin, currentY, { align: "right" });
    doc.setFont("Arial Narrow", "bold");
    doc.text("Le Directeur", pageWidth - margin, currentY + 10, { align: "right" });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont("Arial Narrow", "italic");
    doc.text("Rapport genere automatiquement par Phenix Immobilier", pageWidth / 2, pageHeight - 10, { align: "center" });

    const fileName = `Rapport_Journalier_${selectedDate}.pdf`;
    doc.save(fileName);
};
