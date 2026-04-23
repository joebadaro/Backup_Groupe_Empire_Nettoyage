import nodemailer from "nodemailer";

/** Inbox for reservation requests (set DEMANDE_ESTIMATION_EMAIL in Netlify to override) */
const DEFAULT_TO = "info@groupenettoyageempire.com";
/** Must match a Gmail “Send mail as” / Workspace address that SMTP is allowed to use */
const DEFAULT_FROM = "Groupe Nettoyage Empire <info@groupenettoyageempire.com>";

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
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
        console.error("[submit-demande-estimation] Body read error", e);
        return new Response(JSON.stringify({ ok: false, error: "Invalid body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

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

    const firstName = params.get("firstName")?.trim() || "";
    const lastName = params.get("lastName")?.trim() || "";
    const phone = params.get("phone")?.trim() || "";
    const email = params.get("email")?.trim() || "";
    const address = params.get("address")?.trim() || "";
    const city = params.get("city")?.trim() || "";
    const postalCode = params.get("postalCode")?.trim() || "";
    const deliveryMethod = params.get("deliveryMethod")?.trim() || "";
    const callBackRequested = params.get("callBackRequested")?.trim() || "";
    const source = params.get("source")?.trim() || "";
    const message = params.get("message")?.trim() || "";
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

    const subject = `Demande de réservation (estimateur) — ${firstName} ${lastName}`.trim() || "Demande de réservation (estimateur)";

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
      ${message ? `<p><strong>Notes client</strong><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>` : ""}
      <p><strong>Données estimation (JSON)</strong></p>
      <pre style="background:#f5f5f5;padding:12px;overflow:auto;max-height:400px;">${escapeHtml(customDataFormatted)}</pre>
    `;

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
        });
        console.log(`[submit-demande-estimation] Sent to ${toAddress}`);
    } catch (err: unknown) {
        console.error("[submit-demande-estimation] sendMail error", err);
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
