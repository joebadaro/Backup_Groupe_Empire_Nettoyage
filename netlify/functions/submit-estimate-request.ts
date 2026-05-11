import nodemailer from "nodemailer";

const DEFAULT_TO = "info@groupenettoyageempire.com";
const DEFAULT_FROM = "Groupe Nettoyage Empire <info@groupenettoyageempire.com>";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB per file (aligné client + serveur)

const ALLOWED_IMAGE_MIMES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
]);

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

function normalizeMime(raw: string): string {
    return raw.split(";")[0]?.trim().toLowerCase() ?? "";
}

function extFromFilename(name: string): string {
    const m = name.match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : "";
}

const EXT_TO_MIME: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
};

function effectiveMime(file: File): string {
    let m = normalizeMime(file.type || "");
    if (!m || m === "application/octet-stream") {
        const ext = extFromFilename(file.name);
        m = EXT_TO_MIME[ext] || m;
    }
    return m;
}

function isNonEmptyUpload(entry: unknown): entry is File | Blob {
    return typeof entry === "object" && entry !== null && entry instanceof Blob && entry.size > 0;
}

function uploadFilename(entry: File | Blob, index: number): string {
    if (entry instanceof File && entry.name?.trim()) return entry.name.trim();
    return `photo-${index + 1}.jpg`;
}

const ALLOWED_DWELLING = new Set(["maison", "condo", "appartement", "commercial"]);
const ALLOWED_CONTACT = new Set(["telephone", "sms", "courriel"]);
const ALLOWED_SERVICE = new Set([
    "sofa_meubles",
    "tapis",
    "matelas",
    "cuir",
    "tuiles",
    "tapis_commercial",
    "protecteur",
    "autre",
]);

/** Ordre d’affichage dans les courriels (cohérent avec le formulaire) */
const SERVICE_ORDER = [
    "sofa_meubles",
    "tapis",
    "matelas",
    "cuir",
    "tuiles",
    "tapis_commercial",
    "protecteur",
    "autre",
] as const;

function staffPhotoDisclaimer(isEn: boolean): { html: string; text: string } {
    if (isEn) {
        const text =
            "Photos: some photos could not be attached to this email. If needed, ask the client to send them by text message at 514-893-9939.";
        const html = `<p style="border-left:4px solid #f57c00;padding-left:10px;color:#333;font-size:13px;"><strong>Photos</strong> — ${escapeHtml(
            "Some photos could not be attached to this email. If needed, ask the client to send them by text message at 514-893-9939.",
        )}</p>`;
        return { html, text };
    }
    const text =
        "Photos : certaines photos n'ont pas pu être jointes au courriel. Demander au client de les envoyer par texto au 514-893-9939 si nécessaire.";
    const html = `<p style="border-left:4px solid #f57c00;padding-left:10px;color:#333;font-size:13px;"><strong>Photos</strong> — ${escapeHtml(
        "Certaines photos n'ont pas pu être jointes au courriel. Demander au client de les envoyer par texto au 514-893-9939 si nécessaire.",
    )}</p>`;
    return { html, text };
}

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
        return new Response(JSON.stringify({ ok: true, requestId, photoDelivery: "full" }), {
            status: 200,
            headers: jsonHeaders(requestId),
        });
    }

    const localeRaw = String(formData.get("locale") ?? "fr").toLowerCase();
    const isEn = localeRaw === "en";
    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const otherServiceDetail = String(formData.get("otherServiceDetail") ?? "").trim();
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

    const rawServices = formData.getAll("services").map((v) => String(v ?? "").trim().toLowerCase());
    const servicesSet = new Set<string>();
    for (const s of rawServices) {
        if (!s) continue;
        if (!ALLOWED_SERVICE.has(s)) {
            return new Response(
                JSON.stringify({ ok: false, error: isEn ? "Invalid service selection" : "Sélection de services invalide", requestId }),
                { status: 400, headers: jsonHeaders(requestId) },
            );
        }
        servicesSet.add(s);
    }
    const services = SERVICE_ORDER.filter((k) => servicesSet.has(k));
    if (services.length === 0) {
        return new Response(
            JSON.stringify({ ok: false, error: isEn ? "Select at least one service" : "Cochez au moins un service", requestId }),
            { status: 400, headers: jsonHeaders(requestId) },
        );
    }
    if (services.includes("autre") && (!otherServiceDetail || otherServiceDetail.length > 500)) {
        return new Response(
            JSON.stringify({
                ok: false,
                error: isEn ? "Please specify the other service (max 500 characters)" : "Précisez l’autre service (500 caractères max)",
                requestId,
            }),
            { status: 400, headers: jsonHeaders(requestId) },
        );
    }
    if (!services.includes("autre") && otherServiceDetail.length > 500) {
        return new Response(JSON.stringify({ ok: false, error: isEn ? "Other service text too long" : "Texte trop long", requestId }), {
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
        sofa_meubles: "Nettoyage de sofa, divan, chaises et fauteuils",
        tapis: "Nettoyage de tapis",
        matelas: "Nettoyage de matelas",
        cuir: "Nettoyage de cuir",
        tuiles: "Nettoyage de tuiles et céramique",
        tapis_commercial: "Nettoyage de tapis commercial",
        protecteur: "Application de protecteur anti tache",
        autre: "Autre service",
    };
    const serviceLabelsEn: Record<string, string> = {
        sofa_meubles: "Sofa, couch, chair and armchair cleaning",
        tapis: "Carpet cleaning",
        matelas: "Mattress cleaning",
        cuir: "Leather cleaning",
        tuiles: "Tile and ceramic cleaning",
        tapis_commercial: "Commercial carpet cleaning",
        protecteur: "Stain protector application",
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
        telephone: "Phone",
        sms: "Text message",
        courriel: "Email",
    };

    const serviceLines = services.map((key) => (isEn ? serviceLabelsEn[key] : serviceLabelsFr[key]));
    const servicesBlockPlain = serviceLines.join("\n");
    const servicesBlockHtml = serviceLines.map((line) => `${escapeHtml(line)}`).join("<br>\n");

    const otherDetailBlock =
        services.includes("autre") && otherServiceDetail
            ? isEn
                ? `\nOther service details:\n${otherServiceDetail}`
                : `\nPrécision (autre service) :\n${otherServiceDetail}`
            : "";
    const otherDetailHtml =
        services.includes("autre") && otherServiceDetail
            ? isEn
                ? `<p><strong>Other service details</strong></p><p style="white-space:pre-wrap;">${escapeHtml(otherServiceDetail)}</p>`
                : `<p><strong>Précision (autre service)</strong></p><p style="white-space:pre-wrap;">${escapeHtml(otherServiceDetail)}</p>`
            : "";

    const dwellingLabel = isEn ? dwellingLabelsEn[dwellingType] : dwellingLabelsFr[dwellingType];
    const contactLabel = isEn ? contactLabelsEn[contactPreference] : contactLabelsFr[contactPreference];

    const photoEntries = formData.getAll("photos");
    const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];
    const skippedPhotos: { name: string; reason: string }[] = [];
    let nonEmptyUploadCount = 0;

    console.log(
        `[submit-estimate-request] requestId=${requestId} photo field entries (raw)=${photoEntries.length}`,
    );

    for (let i = 0; i < photoEntries.length; i++) {
        const entry = photoEntries[i];
        if (!isNonEmptyUpload(entry)) continue;

        nonEmptyUploadCount += 1;
        const displayName = uploadFilename(entry, i);
        const declaredMime = entry instanceof File ? normalizeMime(entry.type || "") : normalizeMime(entry.type || "");
        const mime = entry instanceof File ? effectiveMime(entry) : declaredMime;
        const size = entry.size;

        console.log(
            `[submit-estimate-request] requestId=${requestId} photo candidate idx=${i} name=${JSON.stringify(displayName)} mimeDeclared=${JSON.stringify(declaredMime)} mimeEffective=${JSON.stringify(mime)} sizeBytes=${size}`,
        );

        if (attachments.length >= MAX_FILES) {
            skippedPhotos.push({ name: displayName, reason: "max_files_reached" });
            console.warn(
                `[submit-estimate-request] requestId=${requestId} skip photo (max ${MAX_FILES}) name=${JSON.stringify(displayName)}`,
            );
            continue;
        }

        if (!mime.startsWith("image/")) {
            skippedPhotos.push({ name: displayName, reason: "not_image_mime" });
            console.warn(
                `[submit-estimate-request] requestId=${requestId} skip photo (not image/*) name=${JSON.stringify(displayName)}`,
            );
            continue;
        }

        if (!ALLOWED_IMAGE_MIMES.has(mime)) {
            skippedPhotos.push({ name: displayName, reason: `mime_not_allowed:${mime}` });
            console.warn(
                `[submit-estimate-request] requestId=${requestId} skip photo (mime not allowed) name=${JSON.stringify(displayName)} mime=${mime}`,
            );
            continue;
        }

        if (size > MAX_FILE_BYTES) {
            skippedPhotos.push({ name: displayName, reason: `too_large:${size}` });
            console.warn(
                `[submit-estimate-request] requestId=${requestId} skip photo (too large) name=${JSON.stringify(displayName)} sizeBytes=${size} max=${MAX_FILE_BYTES}`,
            );
            continue;
        }

        let buf: Buffer;
        try {
            buf = Buffer.from(await entry.arrayBuffer());
        } catch (readErr) {
            const rmsg = readErr instanceof Error ? readErr.message : String(readErr);
            skippedPhotos.push({ name: displayName, reason: `buffer_read_failed:${rmsg}` });
            console.error(
                `[submit-estimate-request] requestId=${requestId} skip photo (arrayBuffer failed) name=${JSON.stringify(displayName)} err=${rmsg}`,
            );
            continue;
        }

        const rawName = entry instanceof File ? entry.name || `photo-${attachments.length + 1}.jpg` : `photo-${attachments.length + 1}.jpg`;
        const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || `photo-${attachments.length + 1}.jpg`;

        try {
            attachments.push({
                filename: safeName,
                content: buf,
                contentType: mime || undefined,
            });
            console.log(
                `[submit-estimate-request] requestId=${requestId} attachment ok filename=${JSON.stringify(safeName)} bytes=${buf.length} contentType=${mime}`,
            );
        } catch (attErr) {
            const amsg = attErr instanceof Error ? attErr.message : String(attErr);
            skippedPhotos.push({ name: displayName, reason: `attachment_build_failed:${amsg}` });
            console.error(
                `[submit-estimate-request] requestId=${requestId} skip photo (attachment build) name=${JSON.stringify(displayName)} err=${amsg}`,
            );
        }
    }

    console.log(
        `[submit-estimate-request] requestId=${requestId} photos summary nonEmptyUploads=${nonEmptyUploadCount} attached=${attachments.length} skipped=${skippedPhotos.length}`,
    );

    const subject = isEn
        ? `[Estimate request] ${fullName} (${services.length} service${services.length > 1 ? "s" : ""})`
        : `[Demande d'estimation] ${fullName} (${services.length} service${services.length > 1 ? "s" : ""})`;

    const photoDisclaimerNeeded = skippedPhotos.length > 0;
    const disclaimer = photoDisclaimerNeeded ? staffPhotoDisclaimer(isEn) : { html: "", text: "" };

    const baseHtml = isEn
        ? `
      <h2>New estimate request (web form)</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Name</td><td>${escapeHtml(fullName)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Phone</td><td>${escapeHtml(phone)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Email</td><td>${escapeHtml(email || "—")}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;vertical-align:top;">Requested services</td><td>${servicesBlockHtml}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">City</td><td>${escapeHtml(city)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Dwelling</td><td>${escapeHtml(dwellingLabel)}</td></tr>
        ${dwellingType === "condo" || dwellingType === "appartement" ? `<tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Floor</td><td>${escapeHtml(floor)}</td></tr>` : ""}
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Preferred contact method</td><td>${escapeHtml(contactLabel)}</td></tr>
      </table>
      ${otherDetailHtml}
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
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;vertical-align:top;">Services demandés</td><td>${servicesBlockHtml}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Ville</td><td>${escapeHtml(city)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Type de logement</td><td>${escapeHtml(dwellingLabel)}</td></tr>
        ${dwellingType === "condo" || dwellingType === "appartement" ? `<tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Étage</td><td>${escapeHtml(floor)}</td></tr>` : ""}
        <tr><td style="padding:6px 12px 6px 0;font-weight:bold;">Méthode de contact préférée</td><td>${escapeHtml(contactLabel)}</td></tr>
      </table>
      ${otherDetailHtml}
      <p><strong>Description du besoin</strong></p>
      <p style="white-space:pre-wrap;">${escapeHtml(description)}</p>
      <p style="color:#666;font-size:12px;">Photos jointes : ${attachments.length}</p>
    `;

    const enLines = [
        `Name: ${fullName}`,
        `Phone: ${phone}`,
        `Email: ${email || "—"}`,
        "",
        "Requested services:",
        servicesBlockPlain,
    ];
    if (otherDetailBlock.trim()) enLines.push(otherDetailBlock.trim(), "");
    enLines.push(
        `City: ${city}`,
        `Dwelling: ${dwellingLabel}`,
        ...(dwellingType === "condo" || dwellingType === "appartement" ? [`Floor: ${floor}`] : []),
        `Preferred contact method: ${contactLabel}`,
        "",
        "Details:",
        description,
        "",
        `Photos: ${attachments.length}`,
    );

    const frLines = [
        `Nom: ${fullName}`,
        `Téléphone: ${phone}`,
        `Courriel: ${email || "—"}`,
        "",
        "Services demandés :",
        servicesBlockPlain,
    ];
    if (otherDetailBlock.trim()) frLines.push(otherDetailBlock.trim(), "");
    frLines.push(
        `Ville: ${city}`,
        `Type de logement: ${dwellingLabel}`,
        ...(dwellingType === "condo" || dwellingType === "appartement" ? [`Étage: ${floor}`] : []),
        `Méthode de contact préférée: ${contactLabel}`,
        "",
        "Description du besoin:",
        description,
        "",
        `Photos: ${attachments.length}`,
    );

    if (disclaimer.text) {
        enLines.push("", disclaimer.text);
        frLines.push("", disclaimer.text);
    }

    const textPlain = isEn ? enLines.join("\n") : frLines.join("\n");
    const html = `${baseHtml}${disclaimer.html}`;

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmailUser,
            pass: gmailAppPassword.replace(/\s+/g, ""),
        },
    });

    let emailFallbackNoAttachments = false;
    const mailWithAtt = {
        from: fromAddress,
        to: toAddress,
        replyTo: email || undefined,
        subject,
        text: textPlain,
        html,
        attachments: attachments.length ? attachments : undefined,
    };

    try {
        await transporter.sendMail(mailWithAtt);
        console.log(`[submit-estimate-request] requestId=${requestId} sendMail ok withAttachments=${Boolean(attachments.length)}`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : "";
        console.error(
            `[submit-estimate-request] requestId=${requestId} sendMail error (with attachments=${Boolean(attachments.length)})`,
            msg,
            stack,
        );

        if (attachments.length === 0) {
            return new Response(JSON.stringify({ ok: false, error: "Failed to send email", requestId }), {
                status: 502,
                headers: jsonHeaders(requestId),
            });
        }

        const fb = staffPhotoDisclaimer(isEn);
        const photoCountLine = isEn
            ? `<p style="color:#666;font-size:12px;">Photos attached: 0</p>`
            : `<p style="color:#666;font-size:12px;">Photos jointes : 0</p>`;
        const htmlFb = `${baseHtml.replace(
            /<p style="color:#666;font-size:12px;">Photos[^<]+<\/p>/,
            photoCountLine,
        )}${fb.html}`;

        const baseLines = isEn ? enLines : frLines;
        const textRetryLines = baseLines.filter(
            (l) => !l.startsWith("Photos:") && (disclaimer.text ? l !== disclaimer.text : true),
        );
        textRetryLines.push("Photos: 0", "", fb.text);
        const textFallback = textRetryLines.join("\n");

        try {
            await transporter.sendMail({
                from: fromAddress,
                to: toAddress,
                replyTo: email || undefined,
                subject,
                text: textFallback,
                html: htmlFb,
            });
            emailFallbackNoAttachments = true;
            console.log(`[submit-estimate-request] requestId=${requestId} sendMail retry ok without attachments`);
        } catch (err2: unknown) {
            const msg2 = err2 instanceof Error ? err2.message : String(err2);
            console.error(`[submit-estimate-request] requestId=${requestId} sendMail retry error`, msg2);
            return new Response(JSON.stringify({ ok: false, error: "Failed to send email", requestId }), {
                status: 502,
                headers: jsonHeaders(requestId),
            });
        }
    }

    const photoDelivery = skippedPhotos.length > 0 || emailFallbackNoAttachments ? "partial" : "full";

    return new Response(JSON.stringify({ ok: true, requestId, photoDelivery }), {
        status: 200,
        headers: jsonHeaders(requestId),
    });
};
