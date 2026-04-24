import { PHONES } from "../config/phones";

export const ESTIMATION_PRINT_STORAGE_KEY = "gne:estimation-print-v1";

export type EstimationPrintLang = "fr" | "en";

export type EstimationPrintClient = {
    displayName: string;
    email: string;
    phone: string;
    city: string;
    street: string;
    apt: string;
    postal: string;
    notes: string;
    deliveryMethod: string;
};

export type EstimationPrintLineItem = {
    label: string;
    price: number;
    savings?: number;
};

export type EstimationPrintPayloadV1 = {
    v: 1;
    lang: EstimationPrintLang;
    items: EstimationPrintLineItem[];
    total: number;
    client: EstimationPrintClient | null;
};

export function escapeHtmlPrint(s: string): string {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Server-safe save (e.g. from estimation-main in browser after submit).
 */
export function saveEstimationPrintPayload(
    payload: EstimationPrintPayloadV1,
): void {
    if (typeof sessionStorage === "undefined") return;
    try {
        sessionStorage.setItem(ESTIMATION_PRINT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        /* quota / private mode */
    }
}

export function readEstimationPrintPayload(): EstimationPrintPayloadV1 | null {
    if (typeof sessionStorage === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(ESTIMATION_PRINT_STORAGE_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as EstimationPrintPayloadV1;
        if (p && p.v === 1 && (p.lang === "fr" || p.lang === "en")) return p;
    } catch {
        /* invalid */
    }
    return null;
}

/**
 * Feuille client : logo, téléphone, coordonnées, articles, totaux, inspection.
 * Utilisé par la fenêtre d’impression desktop et la page /estimation-print (mobile).
 */
export function buildEstimatePrintSheetHtml(
    items: EstimationPrintLineItem[],
    grandTotal: number,
    client: EstimationPrintClient | null | undefined,
    lang: EstimationPrintLang,
): string {
    const isFr = lang === "fr";
    const title = isFr ? "Demande d'estimation" : "Estimate request";
    const sent = isFr
        ? "Votre demande a bien été envoyée."
        : "Your request has been sent successfully.";
    const thArticle = isFr ? "Article" : "Item";
    const thDiscount = isFr ? "Rabais" : "Discount";
    const thPrice = isFr ? "Prix" : "Price";
    const subtotalLbl = isFr
        ? "Sous-total (avant rabais)"
        : "Subtotal (before discounts)";
    const totalDiscLbl = isFr ? "Rabais appliqués" : "Discounts applied";
    const totalLbl = isFr ? "Total estimé" : "Estimated total";
    const taxNote = isFr ? "Taxes en sus." : "Taxes extra.";
    const inspection = isFr
        ? "Avant de commencer les travaux, le technicien inspectera les tissus, tapis ou surfaces à nettoyer et vous informera si des traitements spécialisés sont nécessaires ou optionnels selon le matériau ou l'état. Vous pourrez alors décider sur place des suites à donner."
        : "Before work begins, your technician will inspect the fabrics, carpets, or surfaces to be cleaned and will let you know if any specialized treatments are required or optional, based on the material and its condition. You may then decide on site how you wish to proceed.";

    let subtotalBefore = 0;
    let totalSavings = 0;
    for (const it of items) {
        const p = Number(it.price) || 0;
        const sv = Number(it.savings) || 0;
        subtotalBefore += p + sv;
        totalSavings += sv;
    }

    const rows = items
        .map((it) => {
            const lab = escapeHtmlPrint(it.label);
            const p = (Number(it.price) || 0).toFixed(2);
            const svNum = Number(it.savings) || 0;
            const sv = svNum > 0 ? `−${svNum.toFixed(2)} $` : "—";
            return `<tr>
  <td class="eps-td">${lab}</td>
  <td class="eps-td eps-td-num eps-td-disc">${sv}</td>
  <td class="eps-td eps-td-num">${p} $</td>
</tr>`;
        })
        .join("");

    const emptyRow = `<tr><td colspan="3" class="eps-td">${
        isFr ? "Aucun article." : "No items."
    }</td></tr>`;

    const phoneDisplay = PHONES.main.display;
    const phoneTel = PHONES.main.tel;
    const logoSrc = "/images/logo-officiel.svg";

    let deliveryLine = "";
    if (client?.deliveryMethod) {
        const dm = client.deliveryMethod.toLowerCase();
        let dmLab = client.deliveryMethod;
        if (dm === "email") dmLab = isFr ? "Courriel" : "Email";
        else if (dm === "sms") dmLab = "SMS";
        deliveryLine = `<div class="eps-client-row"><span class="eps-client-k">${
            isFr ? "Réception" : "Delivery"
        }</span><span class="eps-client-v">${escapeHtmlPrint(dmLab)}</span></div>`;
    }

    let clientBlock = "";
    if (client && client.displayName) {
        const addrParts = [
            client.street + (client.apt ? " #" + client.apt : ""),
            [client.city, client.postal].filter(Boolean).join(", "),
        ].filter(Boolean);
        const addrLine = addrParts.join(" · ");
        clientBlock = `
  <section class="eps-client" aria-label="${isFr ? "Coordonnées client" : "Client details"}">
    <h2 class="eps-section-title">${isFr ? "Vos coordonnées" : "Your details"}</h2>
    <div class="eps-client-grid">
      <div class="eps-client-row"><span class="eps-client-k">${isFr ? "Nom" : "Name"}</span><span class="eps-client-v">${escapeHtmlPrint(client.displayName)}</span></div>
      <div class="eps-client-row"><span class="eps-client-k">${isFr ? "Téléphone" : "Phone"}</span><span class="eps-client-v">${escapeHtmlPrint(client.phone)}</span></div>
      <div class="eps-client-row"><span class="eps-client-k">${isFr ? "Courriel" : "Email"}</span><span class="eps-client-v">${escapeHtmlPrint(client.email)}</span></div>
      ${addrLine ? `<div class="eps-client-row eps-client-row--block"><span class="eps-client-k">${isFr ? "Adresse" : "Address"}</span><span class="eps-client-v">${escapeHtmlPrint(addrLine)}</span></div>` : ""}
      ${deliveryLine}
      ${client.notes ? `<div class="eps-client-row eps-client-row--block"><span class="eps-client-k">${isFr ? "Notes" : "Notes"}</span><span class="eps-client-v">${escapeHtmlPrint(client.notes)}</span></div>` : ""}
    </div>
  </section>`;
    }

    return `
<div class="eps-inner">
  <header class="eps-brand">
    <div class="eps-brand-row">
      <img class="eps-logo" src="${logoSrc}" alt="Groupe Nettoyage Empire" />
      <div class="eps-brand-meta">
        <p class="eps-brand-name">Groupe Nettoyage Empire</p>
        <p class="eps-brand-phone"><a href="tel:${escapeHtmlPrint(phoneTel)}">${escapeHtmlPrint(phoneDisplay)}</a></p>
      </div>
    </div>
  </header>
  <div class="eps-doc-head">
    <h1 class="eps-doc-title">${escapeHtmlPrint(title)}</h1>
    <p class="eps-sent"><span class="eps-sent-badge">${isFr ? "Demande envoyée" : "Request sent"}</span></p>
    <p class="eps-sent-sub">${escapeHtmlPrint(sent)}</p>
  </div>
  ${clientBlock}
  <section class="eps-articles" aria-label="${isFr ? "Articles" : "Line items"}">
    <h2 class="eps-section-title">${isFr ? "Articles et tarifs" : "Items & pricing"}</h2>
    <table class="eps-table">
      <thead>
        <tr>
          <th scope="col">${thArticle}</th>
          <th scope="col" class="eps-th-num">${thDiscount}</th>
          <th scope="col" class="eps-th-num">${thPrice}</th>
        </tr>
      </thead>
      <tbody>${rows || emptyRow}</tbody>
    </table>
  </section>
  <div class="eps-totals">
    <div class="eps-total-line"><span>${subtotalLbl}</span><span>${subtotalBefore.toFixed(2)} $</span></div>
    <div class="eps-total-line eps-total-line--disc"><span>${totalDiscLbl}</span><span>−${totalSavings.toFixed(2)} $</span></div>
    <div class="eps-total-line eps-total-line--grand"><span>${totalLbl}</span><span>${grandTotal.toFixed(2)} $</span></div>
    <p class="eps-tax-note">${taxNote}</p>
  </div>
  <div class="eps-inspection">
    ${escapeHtmlPrint(inspection)}
  </div>
</div>`;
}

/** Même feuille que l’impression desktop (popup). */
export const ESTIMATE_PRINT_SHEET_CSS = `
* { box-sizing: border-box; }
body { margin: 0; padding: 14mm 12mm; font-family: "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; background: #fff;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10.5pt; line-height: 1.4; }
.eps-inner { max-width: 680px; margin: 0 auto; }
.eps-brand { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 2px solid #001f3f; }
.eps-brand-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.eps-logo { height: 144px; width: auto; max-width: min(100%, 660px); object-fit: contain; object-position: left top; display: block; }
.eps-brand-meta { text-align: right; flex: 1; min-width: 160px; }
.eps-brand-name { margin: 0 0 4px; font-size: 10pt; font-weight: 700; color: #001f3f; letter-spacing: 0.02em; text-transform: uppercase; }
.eps-brand-phone { margin: 0; font-size: 11pt; font-weight: 600; }
.eps-brand-phone a { color: #001f3f; text-decoration: none; }
.eps-doc-head { margin-bottom: 14px; }
.eps-doc-title { margin: 0 0 8px; font-size: 17pt; font-weight: 800; color: #001f3f; letter-spacing: -0.02em; line-height: 1.2; }
.eps-sent { margin: 0 0 4px; }
.eps-sent-badge { display: inline-block; padding: 3px 10px; font-size: 9pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #fff; background: #001f3f; border-radius: 3px; }
.eps-sent-sub { margin: 8px 0 0; font-size: 10pt; color: #444; }
.eps-section-title { margin: 0 0 8px; font-size: 9.5pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #001f3f; border-bottom: 1px solid #bdbdbd; padding-bottom: 4px; }
.eps-client { margin-bottom: 14px; }
.eps-client-grid { font-size: 10pt; }
.eps-client-row { display: flex; gap: 10px; padding: 4px 0; border-bottom: 1px solid #eee; }
.eps-client-row--block { flex-wrap: wrap; }
.eps-client-k { flex: 0 0 110px; color: #555; font-weight: 600; }
.eps-client-v { flex: 1; color: #111; word-break: break-word; }
.eps-articles { margin-bottom: 12px; }
.eps-table { width: 100%; border-collapse: collapse; margin: 8px 0 0; font-size: 10pt; }
.eps-table thead tr { border-bottom: 2px solid #001f3f; }
.eps-table th { text-align: left; padding: 8px 10px 6px 8px; font-weight: 700; color: #001f3f; }
.eps-th-num { text-align: right; white-space: nowrap; }
.eps-td { padding: 7px 10px 7px 8px; border-bottom: 1px solid #e8e8e8; vertical-align: top; }
.eps-td-num { text-align: right; white-space: nowrap; }
.eps-td-disc { color: #2e7d32; font-weight: 600; }
.eps-totals { margin-top: 12px; padding: 12px 14px; border: 1px solid #ccc; border-radius: 6px; background: #fafafa; font-size: 10pt; }
.eps-total-line { display: flex; justify-content: space-between; padding: 4px 0; gap: 16px; }
.eps-total-line--disc { color: #2e7d32; font-weight: 600; }
.eps-total-line--grand { margin-top: 8px; padding-top: 10px; border-top: 2px solid #001f3f; font-weight: 800; font-size: 12pt; color: #001f3f; }
.eps-tax-note { margin: 8px 0 0; font-size: 8.5pt; color: #666; }
.eps-inspection { margin-top: 14px; padding-top: 12px; border-top: 1px solid #bdbdbd; font-size: 9pt; line-height: 1.45; color: #333; orphans: 3; widows: 3; }
.gne-estimation-print-bar { text-align: center; padding: 14px 12px; background: #f0f0f0; border-bottom: 1px solid #ccc; }
.gne-estimation-print-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 22px; font-size: 1rem; font-weight: 600; color: #fff; background: #001f3f; border: none; border-radius: 8px; cursor: pointer; }
.gne-estimation-print-btn:hover { filter: brightness(1.05); }
@media print {
  @page { margin: 10mm 12mm; size: auto; }
  body { padding: 0; margin: 0; }
  .gne-estimation-print-bar,
  .gne-print-hint { display: none !important; }
  .eps-brand-phone a { color: #001f3f !important; }
}`;

export const ESTIMATION_PRINT_PAGE_TOOLBAR_CSS = `
.gne-estimation-print-bar { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.gne-estimation-print-btn { touch-action: manipulation; -webkit-tap-highlight-color: rgba(0, 31, 63, 0.12); cursor: pointer; }
.gne-print-hint { margin: 12px auto 0; max-width: 34rem; padding: 0 14px; font-size: 0.875rem; line-height: 1.5; color: #555; text-align: center; }
.gne-estimation-error { max-width: 520px; margin: 32px auto; padding: 20px; font-family: system-ui, sans-serif; line-height: 1.5; }
`;

export function buildPrintWindowDocumentHtml(
    fragment: string,
    lang: EstimationPrintLang,
): string {
    const isFr = lang === "fr";
    const titlePlain = isFr
        ? "Estimation — Groupe Nettoyage Empire"
        : "Estimate — Groupe Nettoyage Empire";
    return `<!DOCTYPE html><html lang="${isFr ? "fr-CA" : "en-CA"}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtmlPrint(
        titlePlain,
    )}</title><style>${ESTIMATE_PRINT_SHEET_CSS}</style></head><body>${fragment}</body></html>`;
}

/**
 * Résout l’URL de la page d’impression (même onglet, pas de popup).
 */
export function getEstimationPrintPageUrl(): string {
    if (typeof window === "undefined") return "/estimation-print";
    return new URL("/estimation-print", window.location.origin).pathname;
}
