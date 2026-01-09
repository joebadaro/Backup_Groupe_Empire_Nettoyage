import { CONFIG } from '../data/estimationConfig';
// Dynamic imports for jsPDF to save bundle size on mobile
import type { jsPDF } from 'jspdf';

export interface EstimationData {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientCity: string;
    clientAddress?: string; // Legacy/Fallback
    clientStreet?: string;
    clientApt?: string;
    clientPostal?: string;
    clientNotes?: string;
    items: {
        label: string;
        price: number;
        details?: string;
        image?: string;
        savings?: number;
    }[];
    total: number;
    lang: 'fr' | 'en';
    serviceImages?: string[];
}

// Helper to load image as Data URL (handling WebP conversion via Canvas if needed)
const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject("Image load timeout"), 5000); // 5s timeout

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    // Use JPEG for better PDF compatibility and smaller size
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                } else {
                    reject('Canvas context failed');
                }
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = (e) => {
            clearTimeout(timeout);
            reject(e);
        };
    });
};

export const generateEstimationPDF = async (data: EstimationData) => {
    console.log("generateEstimationPDF START", data);

    // Dynamic Import of heavy libraries
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.setProperties({
        title: `Estimation (${data.clientName})`,
        subject: "Votre Estimation",
        author: "Groupe Nettoyage Empire",
        creator: "Groupe Nettoyage Empire"
    });
    const isFr = data.lang === 'fr';

    // --- COLORS & FONTS ---
    const colorPrimary = [60, 60, 60] as [number, number, number]; // Elegant Dark Grey
    const colorAccent = [50, 80, 160] as [number, number, number]; // Deep Blue for subtle accents
    const colorHeaderFill = [232, 244, 255] as [number, number, number]; // Premium Pale Blue
    const colorHeaderTx = [40, 40, 40] as [number, number, number];

    // --- IMAGES & ASSETS ---
    let logoSuccess = false;
    let logoData: string | null = null;
    try {
        logoData = await loadImage('/images/logo-empire.webp');
        if (logoData) logoSuccess = true;
    } catch (e) {
        console.warn("Logo load fail", e);
    }

    // Load Watermark
    let watermarkSuccess = false;
    let watermarkData: string | null = null;
    try {
        watermarkData = await loadImage('/images/watermark.jpg');
        if (watermarkData) watermarkSuccess = true;
    } catch (e) {
        console.warn("Watermark load fail", e);
    }

    // --- WATERMARK (Scaled, Faded) ---
    if (watermarkSuccess && watermarkData) {
        // Save state
        doc.saveGraphicsState();
        try {
            // Set opacity (High transparency)
            // @ts-ignore - GState is dynamic
            doc.setGState(new doc.GState({ opacity: 0.08 }));

            // Draw centered
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const imgWidth = 150;
            const imgHeight = 150;
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            doc.addImage(watermarkData, 'JPEG', x, y, imgWidth, imgHeight);
        } catch (e) {
            console.error("Watermark render error", e);
        }
        // Restore opacity
        doc.restoreGraphicsState();
    }

    // --- HEADER LAYOUT (2 Columns) ---
    // Left x=15, Right x=120 (approx)

    // 1. LEFT COLUMN: Logo & Info & Collage
    let leftY = 15;

    // Logo
    if (logoSuccess && logoData) {
        doc.addImage(logoData, 'JPEG', 15, leftY, 55, 18);
        leftY += 20;
    } else {
        doc.setFontSize(20);
        doc.setFont("times", "bold");
        doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
        doc.text("GROUPE EMPIRE", 15, leftY + 8);
        leftY += 15;
    }

    // URL
    doc.setFontSize(9);
    doc.setFont("times", "italic");
    doc.setTextColor(100, 100, 100);
    // URL & Phone
    doc.setFontSize(9);
    doc.setFont("times", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("www.groupenettoyageempire.com", 15, leftY);
    leftY += 5;
    doc.text("514 893 9939", 15, leftY);
    leftY += 2;

    // Service Image Collage (Horizontal Row under Logo)
    // Service Image Collage REMOVED for compactness
    if (data.serviceImages && data.serviceImages.length > 0) {
        // Space saver
        leftY += 2;
    } else {
        leftY += 2;
    }


    // 2. RIGHT COLUMN: Date, Est#, Client
    // Align everything to the Right Margin (195)
    // 2. RIGHT COLUMN: Elegant Box for Client Info
    // Box dimensions
    const boxWidth = 85;
    const boxX = 115; // Right aligned with some margin
    let boxY = 15;
    const padding = 5;

    // Background Box (Rounded)
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(252, 252, 253); // Very subtle off-white/blue
    doc.roundedRect(boxX, boxY, boxWidth, 65, 3, 3, 'FD');

    let textX = boxX + padding + 2;
    let textY = boxY + 8;

    // Date & Number
    const dateStr = new Date().toLocaleDateString(isFr ? 'fr-CA' : 'en-CA');
    const estNum = "EST-" + Date.now().toString().slice(-6);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${isFr ? 'Date' : 'Date'}: ${dateStr}`, textX, textY);

    // Align #EST to right of box? Or just below date.
    // Let's put it on same line, right aligned within box
    doc.text(`# ${estNum}`, boxX + boxWidth - padding - 2, textY, { align: 'right' });

    textY += 8;

    // Client Header
    doc.setFontSize(10);
    doc.setFont("times", "bold");
    doc.setTextColor(colorAccent[0], colorAccent[1], colorAccent[2]);
    doc.text(isFr ? "CLIENT" : "CLIENT", textX, textY);
    textY += 5;

    // Client Details
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(data.clientName, textX, textY);
    textY += 5;

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    if (data.clientStreet) {
        let addrLine = data.clientStreet;
        if (data.clientApt) addrLine += ` (Apt ${data.clientApt})`;
        doc.text(addrLine, textX, textY);
        textY += 5;
    } else if (data.clientAddress) {
        // Fallback
        doc.text(data.clientAddress, textX, textY);
        textY += 5;
    }

    if (data.clientCity) {
        let cityLine = data.clientCity;
        if (data.clientPostal) cityLine += `, QC ${data.clientPostal}`;
        doc.text(cityLine, textX, textY);
        textY += 5;
    }

    if (data.clientPhone) {
        doc.text(data.clientPhone, textX, textY);
        textY += 5;
    }
    if (data.clientEmail) {
        doc.text(data.clientEmail, textX, textY);
        textY += 5;
    }


    // --- TABLE GENERATION ---
    // Start table below the lowest column (Left or Right)
    // --- TABLE GENERATION ---
    // Start table below the lowest column (Left or Right)
    const tableStartY = Math.max(leftY, textY) + 10;

    // Headers: Merge first two columns for the "Item" label
    const tableHeaders = isFr
        ? [[{ content: 'Article / Service', colSpan: 2 }, 'Prix']]
        : [[{ content: 'Item / Service', colSpan: 2 }, 'Price']];

    // Generate Table Data with 3 columns: [Service Label, Discount Info, Price]
    const tableData: any[] = [];

    data.items.forEach(item => {
        let label = item.label;
        if (item.details) label += `\n${item.details}`;

        let discountText = '';
        if (item.savings && item.savings > 0) {
            const finalPrice = item.price;
            const savings = item.savings;
            const originalPrice = finalPrice + savings;
            const percent = Math.round((savings / originalPrice) * 100);

            // Condensed Discount Text
            discountText = isFr
                ? `Rabais ${percent}% (-${savings.toFixed(2)}$)`
                : `Discount ${percent}% (-${savings.toFixed(2)}$)`;

            // Optional: Add Reg/Adj if desired, but user asked for "Condensed". 
            // Let's keep it minimal as per "à côté du service" and "plus petit".
        }

        tableData.push([label, discountText, item.price.toFixed(2) + ' $']);
    });

    autoTable(doc, {
        startY: tableStartY,
        head: tableHeaders,
        body: tableData,
        theme: 'plain',
        headStyles: {
            fillColor: colorHeaderFill,
            textColor: colorHeaderTx,
            fontStyle: 'bold',
            lineColor: 220,
            lineWidth: 0.1,
            valign: 'middle',
            font: 'times',
            fontSize: 11
        },
        styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 5,
            lineColor: 230,
            lineWidth: 0.1,
            valign: 'middle', // Middle alignment looks better for side-by-side
            textColor: [50, 50, 50],
            overflow: 'linebreak'
        },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Service Name - takes available space
            1: {
                cellWidth: 'auto', // Adjusts to text
                textColor: [220, 50, 50], // Red
                fontStyle: 'bold',
                fontSize: 8 // Smaller font
            },
            2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' } // Price
        },
        tableLineColor: 220,
        tableLineWidth: 0.1,
        margin: { left: 15, right: 15 },
        // Remove the didParseCell hook for coloring since we handle it via columnStyles now
    });


    // --- FOOTER & TOTALS ---
    const finalTotal = data.total;
    const rightMargin = 195;
    let finalY = (doc as any).lastAutoTable.finalY + 8;

    // Compact layout check
    if (finalY + 60 > 280) {
        doc.addPage();
        finalY = 20;
    }

    // Total Section - Right Aligned
    doc.setFontSize(14);
    doc.setFont("times", "bold");
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.text(`${isFr ? 'TOTAL' : 'TOTAL'}`, 140, finalY + 5);
    doc.text(`${finalTotal.toFixed(2)} $`, rightMargin, finalY + 5, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(isFr ? "(taxes en sus)" : "(plus taxes)", rightMargin, finalY + 10, { align: 'right' });


    // --- NOTES (Simplified) ---
    // Move notes to left side to balance the Total on right?
    // Or full width box below.

    let notesY = finalY + 20;

    if (data.clientNotes) {
        // If we are close to bottom, break
        if (notesY + 40 > 285) {
            doc.addPage();
            notesY = 20;
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text(isFr ? "NOTES:" : "NOTES:", 15, notesY);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const splitNotes = doc.splitTextToSize(data.clientNotes, 170);
        doc.text(splitNotes, 15, notesY + 5);

        const noteHeight = splitNotes.length * 4;
        notesY += (noteHeight + 15);
    } else {
        notesY += 10;
    }


    // --- DISCLAIMER (Small footer) ---
    // Check space
    if (notesY + 30 > 285) {
        doc.addPage();
        notesY = 20;
    }

    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100); // Slightly darker for readability

    // New Professional Disclaimer from User
    const disclaimer = isFr
        ? "Les prix incluent le nettoyage à la vapeur avec shampoing et le déplacement.\n\nAvant de commencer, le technicien fera une post-inspection, vérifiera votre devis et inspectera les articles. Si un produit spécialisé est nécessaire, il vous en avisera avant le début."
        : "Prices include steam cleaning with shampoo and travel.\n\nBefore starting, the technician will perform a post-inspection, verify your quote, and inspect the items. If a specialized product is necessary, they will advise you before starting.";

    const splitDisclaimer = doc.splitTextToSize(disclaimer, 180);
    doc.text(splitDisclaimer, 15, notesY);


    // --- GENERATE BLOB FOR API ---
    // PDF is NOT saved locally - only sent via email/SMS by backend
    const filename = `Estimation_GroupeEmpire_${estNum}.pdf`;
    console.log("Generating PDF blob:", filename);
    try {
        // Return the Blob for backend API (Email/SMS delivery only)
        return doc.output('blob');
    } catch (err) {
        console.error("Error generating PDF:", err);
        alert("Erreur lors de la création du PDF: " + err);
        throw err;
    }
};
