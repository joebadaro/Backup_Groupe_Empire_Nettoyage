import nodemailer from "nodemailer";

const DEFAULT_TO = "info@groupenettoyageempire.com";
const DEFAULT_FROM = "Groupe Nettoyage Empire <info@groupenettoyageempire.com>";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB per file

function newRequestId(): string {
    try {
        const c = globalThis.crypto as Crypto | undefined;
        if (c?.randomUUID) return c.randomUUID();
    } catch {
        /* ignore */
    }
    return `er-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(s: unknown): string {
    const str = String(s ?? "");
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function jsonHeaders(requestId: string, status = 200, extra?: Record<string, string>): HeadersInit {
    return {
        "Content-Type": "application/json; charset=utf-8",
        "X-Request-Id": requestId,
        ...(extra || {}),
    };
}

const ALLOWED_DWELLING = new Set(["maison", "condo", "appartement", "commercial"]);
const ALLOWED_CONTACT = new Set(["telephone", "sms", "courriel"]);
const ALLOWED_SERVICE = new Set([
    "divan",
    "tapis",
    "matelas",
    "carpettes",
    "chaises",
    "cuir",
    "autre",
]);

export default async (req: Request): Promise<Response> => {
    const requestId = newRequestId();

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, error: "Method not allowed", requestId }), {
            status: 405,
            headers: jsonHeaders(requestId),
        });
    }

    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const gmailUser = process.env.GMAIL_SMTP_USER || "joebadaro@gmail.com";
    const toAddress = process.env.DEMANDE_ESTIMATION_EMAIL || DEFAULT_TO;
    const fromAddress = process.env.DEMANDE_ESTIMATION_FROM || DEFAULT_FROM;

    if (!gmailAppPassword) {
        console.error(`[submit-estimate-request] requestId=${requestId} Missing GMAIL_APP_PASSWORD`);
        return new Response(
            JSON.stringify({ ok: false, error: "Email transport not configured", requestId }),
            { status: 503, headers: jsonHeaders(requestId) },
        );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
        return new Response(JSON.stringify({ ok: false, error: "Expected multipart/form-data", requestId }), {
            status: 415,
            headers: jsonHeaders(requestId),
        });
    }

    let formData: FormData;
    try {
        formData = await req.formData();
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[submit-estimate-request] requestId=${requestId} formData error`, msg);
        return new Response(JSON.stringify({ ok: false, error: "Invalid body", requestId }), {
            status: 400,
            headers: jsonHeaders(requestId),
        });
    }

    const honeypot = String(formData.get("website") ?? "").trim();
    if (honeypot) {
        return new Response(JSON.stringify({ ok: true, requestId }), {
            status: 200,
            headers: jsonHeaders(requestId),
        });
    }

    const localeRaw = String(formData.get("locale") ?? "fr").toLowerCase();
    const isEn = localeRaw === "en";
    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const service = String(formData.get("service") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const dwellingType = String(formData.get("dwellingType") ?? "").trim().toLowerCase();
    const floor = String(formData.get("floor") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const contactPreference = String(formData.get("contactPreference") ?? "").trim().toLowerCase();

    if (!fullName || fullName.length > 200) {
        return new Response(JSON.stringify({ ok: false, error: isEn ? "Name required" : "Nom requis", requestId }), {
            status: 400,
            headers: jsonHeaders(requestId),
        });
    }
    if (!phone || phone.length > 40) {
        return new Response(
            JSON.stringify({ ok: false, error: isEn ? "Phone required" : "Téléphone requis", requestId }),
            { status: 400, headers: jsonHeaders(requestId) },
        );
    }
    if (email.length > 120) {
        return new Response(JSON.stringify({ ok: false, error: "Email too long", requestId }), {
            status: 400,
            headers: jsonHeaders(requestId),
        });
    }
    if (!ALLOWED_SERVICE.has(service)) {
        return new Response(JSON.stringify({ ok: false, error: isEn ? "Invalid service" : "Service invalide", requestId }), {
            status: 400,
            headers: jsonHeaders(requestId),
        });
    }
    if (!city || city.length > 120) {
        return new Response(JSON.stringify({ ok: false, error: isEn ? "City required" : "Ville requise", requestId }), {
            status: 400,
            headers: jsonHeaders(requestId),
        });
    }
    if (!ALLOWED_DWELLING.has(dwellingType)) {
        return new Response(
            JSON.stringify({ ok: false, error: isEn ? "Invalid dwelling type" : "Type de logement invalide", requestId }),
            { status: 400, headers: jsonHeaders(requestId) },
        );
    }
    if ((dwellingType === "condo" || dwellingType === "appartement") && !floor) {
        return new Response(JSON.stringify({ ok: false, error: isEn ? "Floor required" : "Étage requis", requestId }), {
            status: 400,
            headers: jsonHeaders(requestId),
        });
    }
    if (!description || description.length > 8000) {
        return new Response(
            JSON.stringify({ ok: false, error: isEn ? "Description required" : "Description requise", requestId }),
            { status: 400, headers: jsonHeaders(requestId) },
        );
    }
    if (!ALLOWED_CONTACT.has(contactPreference)) {
        return new Response(
            JSON.stringify({ ok: false, error: isEn ? "Invalid contact preference" : "Préférence invalide", requestId }),
            { status: 400, headers: jsonHeaders(requestId) },
        );
    }

    const serviceLabelsFr: Record<string, string> = {
        divan: "Nettoyage de divan",
        tapis: "Nettoyage de tapis",
        matelas: "Nettoyage de matelas",
        carpettes: "Nettoyage de carpettes",
        chaises: "Nettoyage de chaises",
        cuir: "Nettoyage de cuir",
        autre: "Autre service",
    };
    const serviceLabelsEn: Record<string, string> = {
        divan: "Upholstery / sofa cleaning",
        tapis: "Carpet cleaning",
        matelas: "Mattress cleaning",
        carpettes: "Area rug cleaning",
        chaises: "Chair cleaning",
        cuir: "Leather cleaning",
        autre: "Other service",
    };
    const dwellingLabelsFr: Record<string, string> = {
        maison: "Maison",
        condo: "Condo",
        appartement: "Appartement",
        commercial: "Commercial",
    };
    const dwellingLabelsEn: Record<string, string> = {
        maison: "House",
        condo: "Condo",
        appartement: "Apartment",
        commercial: "Commercial",
    };
    const contactLabelsFr: Record<string, string> = {
        telephone: "Téléphone",
        sms: "Texto",
        courriel: "Courriel",
    };
    const contactLabelsEn: Record<string, string> = {
        telephone: "Phone call",
        sms: "Text message",
        courriel: "Email",
    };

    const serviceLabel = isEn ? serviceLabelsEn[service] : serviceLabelsFr[service];
    const dwellingLabel = isEn ? dwellingLabelsEn[dwellingType] : dwellingLabelsFr[dwellingType];
    const contactLabel = isEn ? contactLabelsEn[contactPreference] : contactLabelsFr[contactPreference];

    const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];
    const photoEntries = formData.getAll("photos");
    let fileCount = 0;
    for (const entry of photoEntries) {
        if (fileCount >= MAX_FILES) break;
        if (!(entry instanceof File) || entry.size === 0) continue;
        if (entry.size > MAX_FILE_BYTES) {
            return new Response(
                JSON.stringify({
                    ok: false,
                    error: isEn ? `Each photo must be under ${MAX_FILE_BYTES / 1024 / 1024} MB` : `Chaque photo doit faire moins de ${MAX_FILE_BYTES / 1024 / 1024} Mo`,
                    requestId,
                }),
                { status: 400, headers: jsonHeaders(requestId) },
            );
        }
        const buf = Buffer.from(await entry.arrayBuffer());
        const rawName = entry.name || `photo-${fileCount + 1}.jpg`;
        const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
        attachments.push({
            filename: safeName || `photo-${fileCount + 1}.jpg`,
            content: buf,
            contentType: entry.type || undefined,
        });
        fileCount++;
    }

    const subject = isEn
        ? `[Estimate request] ${fullName} — ${serviceLabel}`
        : `[Demande d'estimation] ${fullName} — ${serviceLabel}`;

    const html = isEn
        ? `
      <h2>New estimate request (web form)</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Name</td><td>${escapeHtml(fullName)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Phone</td><td>${escapeHtml(phone)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Email</td><td>${escapeHtml(email || "—")}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Service</td><td>${escapeHtml(serviceLabel)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">City</td><td>${escapeHtml(city)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Dwelling</td><td>${escapeHtml(dwellingLabel)}</td></tr>
        ${dwellingType === "condo" || dwellingType === "appartement" ? `<tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Floor</td><td>${escapeHtml(floor)}</td></tr>` : ""}
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Contact preference</td><td>${escapeHtml(contactLabel)}</td></tr>
      </table>
      <p><strong>Details</strong></p>
      <p style="white-space:pre-wrap;">${escapeHtml(description)}</p>
      <p style="color:#666;font-size:12px;">Photos attached: ${attachments.length}</p>
    `
        : `
      <h2>Nouvelle demande d'estimation (formulaire web)</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Nom complet</td><td>${escapeHtml(fullName)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Téléphone</td><td>${escapeHtml(phone)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Courriel</td><td>${escapeHtml(email || "—")}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Service</td><td>${escapeHtml(serviceLabel)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Ville</td><td>${escapeHtml(city)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Type de logement</td><td>${escapeHtml(dwellingLabel)}</td></tr>
        ${dwellingType === "condo" || dwellingType === "appartement" ? `<tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Étage</td><td>${escapeHtml(floor)}</td></tr>` : ""}
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Préférence de contact</td><td>${escapeHtml(contactLabel)}</td></tr>
      </table>
      <p><strong>Description du besoin</strong></p>
      <p style="white-space:pre-wrap;">${escapeHtml(description)}</p>
      <p style="color:#666;font-size:12px;">Photos jointes : ${attachments.length}</p>
    `;

    const textPlain = isEn
        ? [
              `Name: ${fullName}`,
              `Phone: ${phone}`,
              `Email: ${email || "—"}`,
              `Service: ${serviceLabel}`,
              `City: ${city}`,
              `Dwelling: ${dwellingLabel}`,
              ...(dwellingType === "condo" || dwellingType === "appartement" ? [`Floor: ${floor}`] : []),
              `Contact preference: ${contactLabel}`,
              "",
              "Details:",
              description,
              "",
              `Photos: ${attachments.length}`,
          ].join("\n")
        : [
              `Nom: ${fullName}`,
              `Téléphone: ${phone}`,
              `Courriel: ${email || "—"}`,
              `Service: ${serviceLabel}`,
              `Ville: ${city}`,
              `Logement: ${dwellingLabel}`,
              ...(dwellingType === "condo" || dwellingType === "appartement" ? [`Étage: ${floor}`] : []),
              `Contact: ${contactLabel}`,
              "",
              "Description:",
              description,
              "",
              `Photos: ${attachments.length}`,
          ].join("\n");

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
            text: textPlain,
            html,
            attachments: attachments.length ? attachments : undefined,
        });
        console.log(`[submit-estimate-request] requestId=${requestId} sent ok`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[submit-estimate-request] requestId=${requestId} sendMail error`, msg);
        return new Response(JSON.stringify({ ok: false, error: "Failed to send email", requestId }), {
            status: 502,
            headers: jsonHeaders(requestId),
        });
    }

    return new Response(JSON.stringify({ ok: true, requestId }), {
        status: 200,
        headers: jsonHeaders(requestId),
    });
};
