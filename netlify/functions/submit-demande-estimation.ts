import nodemailer from "nodemailer";

/** Inbox for reservation requests (set DEMANDE_ESTIMATION_EMAIL in Netlify to override) */
const DEFAULT_TO = "info@groupenettoyageempire.com";
/** Must match a Gmail “Send mail as” / Workspace address that SMTP is allowed to use */
const DEFAULT_FROM = "Groupe Nettoyage Empire <info@groupenettoyageempire.com>";

function newRequestId(): string {
    try {
        const c = globalThis.crypto as Crypto | undefined;
        if (c?.randomUUID) return c.randomUUID();
    } catch {
        /* ignore */
    }
    return `r${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function jsonHeaders(
    requestId: string,
    status: number,
    extra?: Record<string, string>,
): HeadersInit {
    const h: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Request-Id": requestId,
        ...(extra || {}),
    };
    return h;
}

/** Longest single “line” in the string (by \n). SMTP often limits ~1000 octets/line in unencoded form. */
function longestLineLength(s: string): number {
    if (!s) return 0;
    const lines = s.split(/\r?\n/);
    let m = 0;
    for (const ln of lines) {
        if (ln.length > m) m = ln.length;
    }
    return m;
}

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
    locale?: "fr" | "en";
    message?: string;
    lineItems?: JsonLineItem[];
    totals?: {
        subtotalBeforeDiscount?: number;
        totalDiscount?: number;
        grandTotal?: number;
    };
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

/** Plain-text mirror: short lines (wrap label) for multipart/alternative. */
function buildPlainTextEmail(
    fr: boolean,
    fields: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
        address: string;
        city: string;
        postalCode: string;
        deliveryMethod: string;
        callBackRequested: string;
        message: string;
    },
    lineItems: JsonLineItem[],
    totals?: JsonPayload["totals"],
): string {
    const lines: string[] = [];
    const L = (a: string, b: string) => lines.push(`${a}: ${b}`);
    L(fr ? "Prénom" : "First", fields.firstName);
    L(fr ? "Nom" : "Last", fields.lastName);
    L(fr ? "Tél" : "Phone", fields.phone);
    L("Email", fields.email);
    L(fr ? "Adresse" : "Address", fields.address);
    L(fr ? "Ville" : "City", fields.city);
    L(fr ? "CP" : "Postal", fields.postalCode);
    L(fr ? "Livraison" : "Delivery", fields.deliveryMethod);
    lines.push("");
    if (fields.message) {
        lines.push(fr ? "Notes:" : "Notes:");
        for (const ln of fields.message.split(/\n/)) {
            lines.push(ln.length > 78 ? ln.replace(/(.{78})/g, "$1\n") : ln);
        }
        lines.push("");
    }
    lines.push(fr ? "Articles:" : "Items:");
    for (const raw of lineItems) {
        const li = normalizeLineItem(raw);
        const lab =
            li.label.length > 70 ? li.label.slice(0, 67) + "..." : li.label;
        lines.push(
            `- ${lab} | qty ${li.qty} | ${formatMoney(li.lineTotal)} $`,
        );
    }
    lines.push("");
    if (totals) {
        if (typeof totals.subtotalBeforeDiscount === "number") {
            lines.push(
                `${fr ? "Sous-total" : "Subtotal"}: ${formatMoney(totals.subtotalBeforeDiscount)} $`,
            );
        }
        if (typeof totals.totalDiscount === "number" && totals.totalDiscount > 0) {
            lines.push(
                `${fr ? "Rabais" : "Discount"}: -${formatMoney(totals.totalDiscount)} $`,
            );
        }
        if (typeof totals.grandTotal === "number") {
            lines.push(
                `${fr ? "Total" : "Total"}: ${formatMoney(totals.grandTotal)} $`,
            );
        }
    }
    return lines.join("\n");
}

export default async (req: Request): Promise<Response> => {
    const requestId = newRequestId();

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, error: "Method not allowed", requestId }), {
            status: 405,
            headers: jsonHeaders(requestId),
        });
    }

    const exposeMailErr = process.env.ESTIMATION_RETURN_MAIL_ERROR === "true";
    const diagKeyEnv = process.env.ESTIMATION_DIAG_KEY || "";
    const diagUrl = new URL(req.url);
    const diagStep = diagUrl.searchParams.get("diag");
    const diagHeader = req.headers.get("x-estimation-diag-key") || "";
    const diagOk =
        !!diagStep &&
        !!diagKeyEnv &&
        diagHeader === diagKeyEnv &&
        diagStep.length > 0;

    if (diagStep && !diagOk) {
        console.warn(`[submit-demande-estimation] requestId=${requestId} diag rejected (missing/wrong secret)`);
        return new Response(
            JSON.stringify({
                ok: false,
                error: "Diagnostic requires valid x-estimation-diag-key and ESTIMATION_DIAG_KEY",
                requestId,
            }),
            { status: 403, headers: jsonHeaders(requestId, { "X-Submit-Stage": "diag_forbidden" }) },
        );
    }

    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const gmailUser = process.env.GMAIL_SMTP_USER || "joebadaro@gmail.com";
    const toAddress = process.env.DEMANDE_ESTIMATION_EMAIL || DEFAULT_TO;
    const fromAddress = process.env.DEMANDE_ESTIMATION_FROM || DEFAULT_FROM;

    if (!gmailAppPassword) {
        console.error(`[submit-demande-estimation] requestId=${requestId} Missing GMAIL_APP_PASSWORD`);
        return new Response(
            JSON.stringify({ ok: false, error: "Email transport not configured", requestId }),
            { status: 503, headers: jsonHeaders(requestId, { "X-Submit-Stage": "config_error" }) },
        );
    }

    const contentLengthHeader = req.headers.get("content-length") ?? "";

    let raw: string;
    try {
        raw = await req.text();
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[submit-demande-estimation] requestId=${requestId} stage=body_read error=`, msg);
        return new Response(JSON.stringify({ ok: false, error: "Invalid body", requestId, detail: msg }), {
            status: 400,
            headers: jsonHeaders(requestId, { "X-Submit-Stage": "body_read_error" }),
        });
    }

    const contentType = req.headers.get("content-type") || "";

    console.log(`[submit-demande-estimation] requestId=${requestId} stage=received`, {
        bodyBytes: raw.length,
        contentLengthHeader: contentLengthHeader || "(missing)",
        contentLengthParsed: contentLengthHeader ? parseInt(contentLengthHeader, 10) : NaN,
        contentTypeSnippet: contentType.slice(0, 80),
        diagStep: diagOk ? diagStep : "(off)",
    });

    if (contentLengthHeader && !Number.isNaN(parseInt(contentLengthHeader, 10))) {
        const cl = parseInt(contentLengthHeader, 10);
        if (cl !== raw.length) {
            console.warn(`[submit-demande-estimation] requestId=${requestId} Content-Length mismatch`, {
                header: cl,
                actual: raw.length,
            });
        }
    }

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
    let emailFr = true;
    try {
        if (!contentType.includes("application/json")) {
            console.error(`[submit-demande-estimation] requestId=${requestId} unsupported content-type`);
            return new Response(
                JSON.stringify({
                    ok: false,
                    error: "Expected application/json",
                    requestId,
                }),
                { status: 415, headers: jsonHeaders(requestId, { "X-Submit-Stage": "unsupported_media" }) },
            );
        }

        let parsed: JsonPayload;
        try {
            parsed = JSON.parse(raw) as JsonPayload;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[submit-demande-estimation] requestId=${requestId} stage=json_parse error=`, msg);
            return new Response(JSON.stringify({ ok: false, error: "Invalid JSON", requestId, detail: msg }), {
                status: 400,
                headers: jsonHeaders(requestId, { "X-Submit-Stage": "json_parse_error" }),
            });
        }

        if (parsed.formName !== "demande_estimation") {
            return new Response(JSON.stringify({ ok: false, error: "Invalid form", requestId }), {
                status: 400,
                headers: jsonHeaders(requestId, { "X-Submit-Stage": "invalid_form" }),
            });
        }

        if (parsed.botField) {
            console.warn(`[submit-demande-estimation] requestId=${requestId} honeypot`);
            return new Response(JSON.stringify({ ok: true, requestId }), {
                status: 200,
                headers: jsonHeaders(requestId),
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
            ? parsed.lineItems.map((x) => normalizeLineItem(x as Partial<JsonLineItem>))
            : [];
        totals = parsed.totals;

        const itemCount = lineItems.length;
        console.log(`[submit-demande-estimation] requestId=${requestId} stage=json_ok`, {
            payloadJsonBytes: raw.length,
            lineItemCount: itemCount,
            firstNameLen: firstName.length,
            messageLen: message.length,
            hasTotals: !!totals,
        });

        const useFr = parsed.locale !== "en";
        emailFr = useFr;
        htmlMainContent =
            buildHtmlTableFromLineItems(lineItems, useFr) + buildTotalsBlock(totals, useFr);

        const subject =
            `Demande de réservation (estimateur) — ${firstName} ${lastName}`.trim() ||
            "Demande de réservation (estimateur)";

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
    `;

        const textPlain = buildPlainTextEmail(
            useFr,
            {
                firstName,
                lastName,
                phone,
                email,
                address,
                city,
                postalCode,
                deliveryMethod,
                callBackRequested,
                message,
            },
            lineItems,
            totals,
        );

        const longestHtmlLine = longestLineLength(html);
        const longestTextLine = longestLineLength(textPlain);
        console.log(`[submit-demande-estimation] requestId=${requestId} stage=before_sendMail`, {
            htmlCharCount: html.length,
            textCharCount: textPlain.length,
            longestHtmlLine,
            longestTextLine,
            subjectCharCount: subject.length,
            lineItemsForTable: lineItems.length,
        });

        if (longestHtmlLine > 990) {
            console.warn(`[submit-demande-estimation] requestId=${requestId} WARNING longestHtmlLine>990`, {
                longestHtmlLine,
            });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: gmailUser,
                pass: gmailAppPassword.replace(/\s+/g, ""),
            },
        });

        /** Isolation tests — same POST body; ?diag=a|b|c|d|e + header x-estimation-diag-key */
        if (diagOk) {
            if (diagStep === "a") {
                console.log(`[submit-demande-estimation] requestId=${requestId} stage=diag_a no_sendMail`);
                return new Response(
                    JSON.stringify({
                        ok: true,
                        diagnostic: "a",
                        requestId,
                        stage: "parsed_no_sendMail",
                        bodyBytes: raw.length,
                        lineItemCount: lineItems.length,
                        payloadJsonBytes: raw.length,
                        htmlCharCount: html.length,
                        longestHtmlLine,
                        longestTextLine,
                    }),
                    { status: 200, headers: jsonHeaders(requestId, { "X-Submit-Stage": "diag_a" }) },
                );
            }

            if (diagStep === "b") {
                console.log(`[submit-demande-estimation] requestId=${requestId} stage=diag_b minimal_text_only`);
                try {
                    await transporter.sendMail({
                        from: fromAddress,
                        to: toAddress,
                        subject: `[diag-b] ${requestId}`,
                        text: `diag-b OK\nrequestId=${requestId}\nlineItems=${lineItems.length}`,
                    });
                    console.log(`[submit-demande-estimation] requestId=${requestId} stage=after_sendMail diag_b`);
                    return new Response(
                        JSON.stringify({ ok: true, diagnostic: "b", requestId }),
                        { status: 200, headers: jsonHeaders(requestId, { "X-Submit-Stage": "diag_b_ok" }) },
                    );
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    const stack = err instanceof Error ? err.stack : "";
                    console.error(`[submit-demande-estimation] requestId=${requestId} stage=sendMail_error diag_b`, msg, stack);
                    return new Response(
                        JSON.stringify({
                            ok: false,
                            diagnostic: "b",
                            requestId,
                            smtpError: exposeMailErr ? msg : undefined,
                            error: "sendMail failed (diag-b)",
                        }),
                        { status: 502, headers: jsonHeaders(requestId, { "X-Submit-Stage": "diag_b_sendMail_error" }) },
                    );
                }
            }

            if (diagStep === "c") {
                console.log(`[submit-demande-estimation] requestId=${requestId} stage=diag_c minimal_html`);
                try {
                    await transporter.sendMail({
                        from: fromAddress,
                        to: toAddress,
                        subject: `[diag-c] ${requestId}`,
                        text: `diag-c ${requestId}`,
                        html: `<p>diag-c OK (${requestId})</p>`,
                    });
                    return new Response(
                        JSON.stringify({ ok: true, diagnostic: "c", requestId }),
                        { status: 200, headers: jsonHeaders(requestId, { "X-Submit-Stage": "diag_c_ok" }) },
                    );
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error(`[submit-demande-estimation] requestId=${requestId} stage=sendMail_error diag_c`, msg);
                    return new Response(
                        JSON.stringify({
                            ok: false,
                            diagnostic: "c",
                            requestId,
                            smtpError: exposeMailErr ? msg : undefined,
                        }),
                        { status: 502, headers: jsonHeaders(requestId, { "X-Submit-Stage": "diag_c_sendMail_error" }) },
                    );
                }
            }

            if (diagStep === "d") {
                console.log(`[submit-demande-estimation] requestId=${requestId} stage=diag_d html_no_table_no_attach`);
                const htmlNoTable = `
      <h2>diag-d (sans tableau articles)</h2>
      <p>${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
      <p>lineItemCount=${lineItems.length}</p>`;
                try {
                    await transporter.sendMail({
                        from: fromAddress,
                        to: toAddress,
                        replyTo: email || undefined,
                        subject: `[diag-d] ${requestId}`,
                        text: textPlain.split("\n").slice(0, 30).join("\n"),
                        html: htmlNoTable,
                    });
                    return new Response(
                        JSON.stringify({ ok: true, diagnostic: "d", requestId }),
                        { status: 200, headers: jsonHeaders(requestId, { "X-Submit-Stage": "diag_d_ok" }) },
                    );
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error(`[submit-demande-estimation] requestId=${requestId} stage=sendMail_error diag_d`, msg);
                    return new Response(
                        JSON.stringify({
                            ok: false,
                            diagnostic: "d",
                            requestId,
                            smtpError: exposeMailErr ? msg : undefined,
                        }),
                        { status: 502, headers: jsonHeaders(requestId, { "X-Submit-Stage": "diag_d_sendMail_error" }) },
                    );
                }
            }

            if (diagStep === "e") {
                console.log(`[submit-demande-estimation] requestId=${requestId} stage=diag_e full_same_as_prod`);
                try {
                    await transporter.sendMail({
                        from: fromAddress,
                        to: toAddress,
                        replyTo: email || undefined,
                        subject: `[diag-e] ${subject}`,
                        text: textPlain,
                        html,
                    });
                    console.log(`[submit-demande-estimation] requestId=${requestId} stage=after_sendMail diag_e`);
                    return new Response(
                        JSON.stringify({ ok: true, diagnostic: "e", requestId }),
                        { status: 200, headers: jsonHeaders(requestId, { "X-Submit-Stage": "diag_e_ok" }) },
                    );
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    const stack = err instanceof Error ? err.stack : "";
                    console.error(`[submit-demande-estimation] requestId=${requestId} stage=sendMail_error diag_e`, msg, stack);
                    return new Response(
                        JSON.stringify({
                            ok: false,
                            diagnostic: "e",
                            requestId,
                            smtpError: exposeMailErr ? msg : undefined,
                            longestHtmlLine,
                        }),
                        { status: 502, headers: jsonHeaders(requestId, { "X-Submit-Stage": "diag_e_sendMail_error" }) },
                    );
                }
            }

            return new Response(
                JSON.stringify({
                    ok: false,
                    error: "Unknown diag step",
                    requestId,
                    valid: ["a", "b", "c", "d", "e"],
                }),
                { status: 400, headers: jsonHeaders(requestId) },
            );
        }

        /** Production path */
        try {
            await transporter.sendMail({
                from: fromAddress,
                to: toAddress,
                replyTo: email || undefined,
                subject,
                text: textPlain,
                html,
            });
            console.log(`[submit-demande-estimation] requestId=${requestId} stage=after_sendMail ok to=${toAddress}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            const stack = err instanceof Error ? err.stack : "";
            const code =
                err && typeof err === "object" && "code" in err
                    ? String((err as { code?: string }).code)
                    : "";
            const responseCode =
                err && typeof err === "object" && "response" in err
                    ? String((err as { response?: string }).response).slice(0, 500)
                    : "";
            console.error(`[submit-demande-estimation] requestId=${requestId} stage=sendMail_error`, {
                message: msg,
                code,
                responseSnippet: responseCode,
                stack,
            });
            return new Response(
                JSON.stringify({
                    ok: false,
                    error: "Failed to send email",
                    requestId,
                    stage: "sendMail_error",
                    ...(exposeMailErr
                        ? { smtpMessage: msg, smtpCode: code, smtpResponse: responseCode }
                        : {}),
                }),
                {
                    status: 502,
                    headers: jsonHeaders(requestId, { "X-Submit-Stage": "sendMail_error" }),
                },
            );
        }

        return new Response(JSON.stringify({ ok: true, requestId }), {
            status: 200,
            headers: jsonHeaders(requestId, { "X-Submit-Stage": "after_sendMail" }),
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[submit-demande-estimation] requestId=${requestId} stage=normalize error=`, msg);
        return new Response(JSON.stringify({ ok: false, error: "Bad request", requestId, detail: msg }), {
            status: 400,
            headers: jsonHeaders(requestId, { "X-Submit-Stage": "normalize_error" }),
        });
    }
};
