import nodemailer from "nodemailer";

/** Inbox for reservation requests (set DEMANDE_ESTIMATION_EMAIL in Netlify to override) */
const DEFAULT_TO = "info@groupenettoyageempire.com";
/** Must match a Gmail “Send mail as” / Workspace address that SMTP is allowed to use */
const DEFAULT_FROM = "Groupe Nettoyage Empire <info@groupenettoyageempire.com>";

function escapeHtml(s: unknown): string {
    const str = String(s ?? "");
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Avoid RFC 5322 / SMTP « line too long » issues in HTML parts (labels with many & etc.). */
function chunkHtmlSafe(s: string, maxChunk = 900): string {
    if (s.length <= maxChunk) return escapeHtml(s);
    let out = "";
    for (let i = 0; i < s.length; i += maxChunk) {
        out += escapeHtml(s.slice(i, i + maxChunk));
        if (i + maxChunk < s.length) out += "&#8203;";
    }
    return out;
}

/** Compact line item from JSON body (built server-side email table). */
interface JsonLineItem {
    id?: string;
    label: string;
    qty: number;
    regularLine: number;
    discount: number;
    lineTotal: number;
}

interface JsonPayload {
    formName?: string;
    botField?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    deliveryMethod?: string;
    callBackRequested?: string;
    source?: string;
    /** From estimation module UI language */
    locale?: "fr" | "en";
    message?: string;
    lineItems?: JsonLineItem[];
    totals?: {
        subtotalBeforeDiscount?: number;
        totalDiscount?: number;
        grandTotal?: number;
    };
    /** CRM / GHL hints only — numbers & short strings, no duplicate prose */
    crmHints?: Record<string, unknown>;
}

function normalizeLineItem(li: Partial<JsonLineItem>): JsonLineItem {
    const label = String(li.label ?? "").slice(0, 500);
    const qty = Math.max(1, Math.min(99999, Math.floor(Number(li.qty) || 1)));
    const regularLine = Number.isFinite(Number(li.regularLine))
        ? Number(li.regularLine)
        : 0;
    const discount = Number.isFinite(Number(li.discount))
        ? Number(li.discount)
        : 0;
    const lineTotal = Number.isFinite(Number(li.lineTotal))
        ? Number(li.lineTotal)
        : 0;
    return {
        id: li.id != null ? String(li.id).slice(0, 120) : "",
        label,
        qty,
        regularLine: Math.round(regularLine * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        lineTotal: Math.round(lineTotal * 100) / 100,
    };
}

function formatMoney(n: number): string {
    const x = Number.isFinite(n) ? n : 0;
    return x.toFixed(2);
}

function buildHtmlTableFromLineItems(items: JsonLineItem[], fr: boolean): string {
    if (!items.length) {
        return fr
            ? `<p><em>(Aucune ligne d’article.)</em></p>`
            : `<p><em>(No line items.)</em></p>`;
    }
    const hArticle = fr ? "Article" : "Item";
    const hBefore = fr ? "Avant rabais" : "Before discount";
    const hDisc = fr ? "Rabais" : "Discount";
    const hLine = fr ? "Total ligne" : "Line total";
    const rows = items
        .map((raw) => {
            const li = normalizeLineItem(raw);
            const qtyDisp =
                li.qty > 1
                    ? ` <span style="color:#666;">×${escapeHtml(li.qty)}</span>`
                    : "";
            return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #ddd;">${chunkHtmlSafe(li.label)}${qtyDisp}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">${formatMoney(li.regularLine)} $</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;color:#2e7d32;">${li.discount > 0 ? `−${formatMoney(li.discount)} $` : "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;font-weight:600;">${formatMoney(li.lineTotal)} $</td>
      </tr>`;
        })
        .join("");
    return `
      <table style="border-collapse:collapse;width:100%;max-width:720px;font-family:sans-serif;font-size:14px;margin-top:12px;">
        <thead>
          <tr style="background:#001f3f;color:#fff;">
            <th style="padding:8px;text-align:left;">${hArticle}</th>
            <th style="padding:8px;text-align:right;">${hBefore}</th>
            <th style="padding:8px;text-align:right;">${hDisc}</th>
            <th style="padding:8px;text-align:right;">${hLine}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
}

function buildTotalsBlock(totals?: JsonPayload["totals"], langFr?: boolean): string {
    if (!totals) return "";
    const t = totals;
    const lblSub = langFr ? "Sous-total (avant rabais)" : "Subtotal (before discounts)";
    const lblDisc = langFr ? "Total rabais" : "Total discounts";
    const lblGrand = langFr ? "Total estimé" : "Estimated total";
    const parts: string[] = [];
    if (typeof t.subtotalBeforeDiscount === "number") {
        parts.push(
            `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>${lblSub}</span><span>${formatMoney(t.subtotalBeforeDiscount)} $</span></div>`,
        );
    }
    if (typeof t.totalDiscount === "number" && t.totalDiscount > 0) {
        parts.push(
            `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#2e7d32;"><span>${lblDisc}</span><span>−${formatMoney(t.totalDiscount)} $</span></div>`,
        );
    }
    if (typeof t.grandTotal === "number") {
        parts.push(
            `<div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:8px;border-top:2px solid #001f3f;font-weight:800;font-size:16px;"><span>${lblGrand}</span><span>${formatMoney(t.grandTotal)} $</span></div>`,
        );
    }
    return parts.length ? `<div style="margin-top:16px;max-width:720px;">${parts.join("")}</div>` : "";
}

export default async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const gmailUser = process.env.GMAIL_SMTP_USER || "joebadaro@gmail.com";
    const toAddress = process.env.DEMANDE_ESTIMATION_EMAIL || DEFAULT_TO;
    const fromAddress = process.env.DEMANDE_ESTIMATION_FROM || DEFAULT_FROM;

    if (!gmailAppPassword) {
        console.error("[submit-demande-estimation] Missing GMAIL_APP_PASSWORD");
        return new Response(
            JSON.stringify({ ok: false, error: "Email transport not configured" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
        );
    }

    let raw: string;
    try {
        raw = await req.text();
    } catch (e) {
        console.error("[submit-demande-estimation] stage=body_read error=", e);
        return new Response(JSON.stringify({ ok: false, error: "Invalid body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const contentType = req.headers.get("content-type") || "";

    console.log("[submit-demande-estimation] stage=received", {
        bodyBytes: raw.length,
        contentTypeSnippet: contentType.slice(0, 80),
    });

    /** Unified fields after parsing either JSON or form */
    let firstName = "";
    let lastName = "";
    let phone = "";
    let email = "";
    let address = "";
    let city = "";
    let postalCode = "";
    let deliveryMethod = "";
    let callBackRequested = "";
    let source = "";
    let message = "";
    let lineItems: JsonLineItem[] = [];
    let totals: JsonPayload["totals"];
    let htmlMainContent = "";
    /** Email section titles for CRM block (legacy form = FR). */
    let emailFr = true;
    /** CRM payload as attachment — avoids giant `<pre>` lines (SMTP / Gmail limits). */
    let mailAttachments: {
        filename: string;
        content: string;
        contentType: string;
    }[] = [];

    try {
        if (contentType.includes("application/json")) {
            let parsed: JsonPayload;
            try {
                parsed = JSON.parse(raw) as JsonPayload;
            } catch (e) {
                console.error(
                    "[submit-demande-estimation] stage=json_parse error=",
                    e instanceof Error ? e.message : e,
                );
                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (parsed.formName !== "demande_estimation") {
                return new Response(JSON.stringify({ ok: false, error: "Invalid form" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (parsed.botField) {
                console.warn("[submit-demande-estimation] Honeypot filled — ignored");
                return new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            firstName = parsed.firstName?.trim() || "";
            lastName = parsed.lastName?.trim() || "";
            phone = parsed.phone?.trim() || "";
            email = parsed.email?.trim() || "";
            address = parsed.address?.trim() || "";
            city = parsed.city?.trim() || "";
            postalCode = parsed.postalCode?.trim() || "";
            deliveryMethod = parsed.deliveryMethod?.trim() || "";
            callBackRequested = parsed.callBackRequested?.trim() || "";
            source = parsed.source?.trim() || "";
            message = parsed.message?.trim() || "";
            lineItems = Array.isArray(parsed.lineItems)
                ? parsed.lineItems.map((x) =>
                      normalizeLineItem(x as Partial<JsonLineItem>),
                  )
                : [];
            totals = parsed.totals;

            const itemCount = lineItems.length;
            let crmHintsCompact = "";
            if (parsed.crmHints && typeof parsed.crmHints === "object") {
                try {
                    crmHintsCompact = JSON.stringify(parsed.crmHints);
                    mailAttachments.push({
                        filename: "crm-hints.json",
                        content: crmHintsCompact,
                        contentType: "application/json; charset=utf-8",
                    });
                } catch {
                    crmHintsCompact = String(parsed.crmHints);
                    mailAttachments.push({
                        filename: "crm-hints.txt",
                        content: crmHintsCompact,
                        contentType: "text/plain; charset=utf-8",
                    });
                }
            }

            console.log("[submit-demande-estimation] stage=json_ok", {
                bodyBytes: raw.length,
                lineItemCount: itemCount,
                firstNameLen: firstName.length,
                messageLen: message.length,
                hasTotals: !!totals,
                crmHintsKeys: parsed.crmHints ? Object.keys(parsed.crmHints).length : 0,
                crmHintsPayloadBytes: crmHintsCompact.length,
            });

            const useFr = parsed.locale !== "en";
            emailFr = useFr;
            htmlMainContent =
                buildHtmlTableFromLineItems(lineItems, useFr) +
                buildTotalsBlock(totals, useFr);
        } else {
            /** Legacy: application/x-www-form-urlencoded */
            const params = new URLSearchParams(raw);
            const formName = params.get("form-name");
            if (formName !== "demande_estimation") {
                return new Response(JSON.stringify({ ok: false, error: "Invalid form" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            const botField = params.get("bot-field");
            if (botField) {
                console.warn("[submit-demande-estimation] Honeypot filled — ignored");
                return new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            firstName = params.get("firstName")?.trim() || "";
            lastName = params.get("lastName")?.trim() || "";
            phone = params.get("phone")?.trim() || "";
            email = params.get("email")?.trim() || "";
            address = params.get("address")?.trim() || "";
            city = params.get("city")?.trim() || "";
            postalCode = params.get("postalCode")?.trim() || "";
            deliveryMethod = params.get("deliveryMethod")?.trim() || "";
            callBackRequested = params.get("callBackRequested")?.trim() || "";
            source = params.get("source")?.trim() || "";
            message = params.get("message")?.trim() || "";
            let customDataRaw = params.get("customData")?.trim() || "";

            let customDataFormatted = customDataRaw;
            try {
                if (customDataRaw) {
                    const parsed = JSON.parse(customDataRaw);
                    customDataFormatted = JSON.stringify(parsed, null, 2);
                }
            } catch {
                customDataFormatted = customDataRaw;
            }

            console.log("[submit-demande-estimation] stage=form_ok", {
                bodyBytes: raw.length,
                customDataChars: customDataRaw.length,
            });

            if (customDataRaw) {
                mailAttachments.push({
                    filename: "crm-hints-legacy.json.txt",
                    content: customDataRaw,
                    contentType: "text/plain; charset=utf-8",
                });
            }
            htmlMainContent = customDataRaw
                ? `
      <p style="font-size:14px;"><strong>Données estimation (format formulaire historique)</strong> — voir pièce jointe <code>crm-hints-legacy.json.txt</code> (${customDataRaw.length} car.).</p>`
                : "";
        }
    } catch (e) {
        console.error("[submit-demande-estimation] stage=normalize error=", e);
        return new Response(JSON.stringify({ ok: false, error: "Bad request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const subject =
        `Demande de réservation (estimateur) — ${firstName} ${lastName}`.trim() ||
        "Demande de réservation (estimateur)";

    const attachmentListHtml =
        mailAttachments.length > 0
            ? mailAttachments
                  .map((a) => `<code>${escapeHtml(a.filename)}</code>`)
                  .join(", ")
            : "";

    const crmAttachNote =
        mailAttachments.length > 0
            ? emailFr
                ? `<p style="font-size:13px;color:#333;margin-top:16px;">Indices CRM (pièces jointes, évite les lignes trop longues pour SMTP) : ${attachmentListHtml}</p>`
                : `<p style="font-size:13px;color:#333;margin-top:16px;">CRM data (attachments; avoids SMTP line-length issues) : ${attachmentListHtml}</p>`
            : "";

    const html = `
      <h2>Nouvelle demande depuis l'estimateur en ligne</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Prénom</td><td>${escapeHtml(firstName)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Nom</td><td>${escapeHtml(lastName)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Téléphone</td><td>${escapeHtml(phone)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Courriel</td><td>${escapeHtml(email)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Adresse</td><td>${escapeHtml(address)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Ville</td><td>${escapeHtml(city)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Code postal</td><td>${escapeHtml(postalCode)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Méthode / livraison</td><td>${escapeHtml(deliveryMethod)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Rappel demandé</td><td>${escapeHtml(callBackRequested)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Source</td><td>${escapeHtml(source)}</td></tr>
      </table>
      ${
          message
              ? `<p><strong>Notes client</strong><br/>${message
                    .split(/\n/)
                    .map((ln) => chunkHtmlSafe(ln))
                    .join("<br/>")}</p>`
              : ""
      }
      ${htmlMainContent}
      ${crmAttachNote}
    `;

    console.log("[submit-demande-estimation] stage=before_sendMail", {
        htmlApproxChars: html.length,
        lineItemsForTable: lineItems.length,
        attachmentCount: mailAttachments.length,
        attachmentTotalBytes: mailAttachments.reduce(
            (n, a) => n + (typeof a.content === "string" ? a.content.length : 0),
            0,
        ),
    });

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmailUser,
            pass: gmailAppPassword.replace(/\s+/g, ""),
        },
    });

    try {
        await transporter.sendMail({
            from: fromAddress,
            to: toAddress,
            replyTo: email || undefined,
            subject,
            html,
            attachments: mailAttachments.length ? mailAttachments : undefined,
        });
        console.log("[submit-demande-estimation] stage=after_sendMail ok to=", toAddress);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : "";
        console.error("[submit-demande-estimation] stage=sendMail_error message=", msg, "stack=", stack);
        return new Response(JSON.stringify({ ok: false, error: "Failed to send email" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
