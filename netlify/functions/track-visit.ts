import twilio from "twilio";

/** Événements supportés — logs alignés sur la spec utilisateur */
type VisitSmsEvent =
    | "first_visit"
    | "calculator"
    | "call_click"
    | "form_start"
    | "form_submit";

interface TrackPayload {
    event?: VisitSmsEvent;
    pageTitle?: string;
    pagePath?: string;
    clientName?: string;
    /** Obligatoire pour first_visit : le client ne l’envoie qu’après signal humain */
    humanConfirmed?: boolean;
}

interface GeoResult {
    countryCode: string;
    region: string;
    regionName: string;
    city: string;
    source: "ip-api" | "netlify-fallback" | "none";
}

function logStructured(payload: Record<string, unknown>): void {
    console.log(JSON.stringify(payload));
}

/** Fragments UA explicites + termes génériques (insensible à la casse) */
const BOT_NEEDLES = [
    "googlebot",
    "adsbot",
    "bingbot",
    "semrushbot",
    "ahrefsbot",
    "mj12bot",
    "duckduckbot",
    "yandexbot",
    "lighthouse",
    "chrome-lighthouse",
    "pagespeed",
    "gtmetrix",
    "pingdom",
    "headlesschrome",
    "google-inspectiontool",
    "google-inspection",
    "facebookexternalhit",
    "gptbot",
    "bytespider",
];

function isLikelyBot(userAgent: string): boolean {
    const u = userAgent.toLowerCase();
    for (const n of BOT_NEEDLES) {
        if (u.includes(n)) return true;
    }
    if (u.includes("curl/") || u.includes("wget") || u.includes("python-requests"))
        return true;
    if (/\b(bot|crawler|spider)\b/i.test(userAgent)) return true;
    return false;
}

/**
 * IP du visiteur (pas celle d’un nœud interne) : Netlify fournit d’abord
 * `x-nf-client-connection-ip` en prod ; `client-ip` est parfois présent en `netlify dev`.
 * `x-forwarded-for` = chaîne de proxys, le client est en général le **premier** hop.
 */
function extractClientIp(req: Request): string {
    const nf = req.headers.get("x-nf-client-connection-ip")?.trim();
    if (nf) return nf;

    const localDev = req.headers.get("client-ip")?.trim();
    if (localDev) return localDev;

    const xf = req.headers.get("x-forwarded-for");
    if (xf) {
        const first = xf.split(",")[0]?.trim();
        if (first) return first;
    }

    return req.headers.get("x-real-ip")?.trim() || "";
}

function isNonPublicIp(ip: string): boolean {
    if (!ip || ip === "unknown") return true;
    if (ip.includes(":")) {
        return (
            ip === "::1" ||
            ip.toLowerCase().startsWith("fe80:") ||
            ip.toLowerCase().startsWith("fc") ||
            ip.toLowerCase().startsWith("fd")
        );
    }
    return (
        ip.startsWith("127.") ||
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
    );
}

function isQuebecGeo(g: GeoResult): boolean {
    if (g.countryCode !== "CA") return false;
    const reg = (g.region || "").toUpperCase();
    if (reg === "QC") return true;
    const rn = (g.regionName || "").toLowerCase();
    return rn.includes("quebec") || rn === "québec";
}

async function resolveGeo(
    req: Request,
    visitorIp: string,
): Promise<GeoResult> {
    const fallback: GeoResult = {
        countryCode: (req.headers.get("x-nf-geo-country") || "").slice(0, 2)
            .toUpperCase() ||
            req.headers.get("x-nf-client-country")?.slice(0, 2).toUpperCase() ||
            "",
        region: "",
        regionName: req.headers.get("x-nf-geo-region") || "",
        city: req.headers.get("x-nf-geo-city") || "",
        source: "netlify-fallback",
    };

    if (!visitorIp || isNonPublicIp(visitorIp)) {
        logStructured({
            log: "geo_note",
            note: "private_or_missing_ip_using_headers",
            ip: visitorIp || "(empty)",
        });
        return {
            countryCode: fallback.countryCode || "",
            region: "",
            regionName: fallback.regionName,
            city: fallback.city,
            source: fallback.countryCode ? "netlify-fallback" : "none",
        };
    }

    try {
        const geoResponse = await fetch(
            `http://ip-api.com/json/${encodeURIComponent(visitorIp)}?fields=status,countryCode,region,regionName,city`,
        );
        const geoData = (await geoResponse.json()) as {
            status?: string;
            countryCode?: string;
            region?: string;
            regionName?: string;
            city?: string;
        };

        if (geoData.status === "success") {
            return {
                countryCode: geoData.countryCode || "",
                region: geoData.region || "",
                regionName: geoData.regionName || "",
                city: geoData.city || "",
                source: "ip-api",
            };
        }
    } catch (e) {
        logStructured({
            log: "geo_note",
            note: "ip_api_error",
            error: String(e),
        });
    }

    return {
        countryCode: fallback.countryCode,
        region: "",
        regionName: fallback.regionName,
        city: fallback.city,
        source: fallback.countryCode ? "netlify-fallback" : "none",
    };
}

function formatTimeMontreal(d: Date): string {
    const s = d.toLocaleTimeString("fr-CA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Toronto",
    });
    return s.replace(":", " h ");
}

function sanitizeTitle(raw: string): string {
    let t = (raw || "").trim();
    const pipe = t.indexOf("|");
    if (pipe > 0) t = t.slice(0, pipe).trim();
    return t.slice(0, 120) || "Page";
}

function smsBodyForEvent(
    event: VisitSmsEvent,
    geo: GeoResult,
    pageTitle: string,
    pagePath: string,
    clientName?: string,
): string {
    const timeStr = formatTimeMontreal(new Date());
    const cityKnown = !!(geo.city && geo.city.trim());
    const locPhrase = cityKnown
        ? `de ${geo.city.trim()}`
        : "au Québec";
    const provinceHint =
        geo.regionName && geo.regionName.toLowerCase().includes("quebec")
            ? geo.regionName
            : "";

    const namePart =
        clientName && clientName.trim()
            ? ` (${clientName.trim()})`
            : "";

    switch (event) {
        case "first_visit":
            return cityKnown
                ? `Nouveau visiteur probable${namePart} ${locPhrase}. Page visitée : ${pageTitle}. Heure : ${timeStr}.`
                : `Nouveau visiteur probable${namePart} au Québec${provinceHint ? ` (${provinceHint})` : ""}. Page visitée : ${pageTitle}. Heure : ${timeStr}.`;

        case "calculator":
            return `Client actif dans le calculateur${namePart}. Ville estimée : ${cityKnown ? geo.city.trim() : "Québec"}. Page : ${pageTitle}. Heure : ${timeStr}.`;

        case "call_click":
            return `Clic pour appeler${namePart}. Ville estimée : ${cityKnown ? geo.city.trim() : "Québec"}. Page : ${pageTitle}. Heure : ${timeStr}.`;

        case "form_start":
            return `Formulaire démarré${namePart}. Ville estimée : ${cityKnown ? geo.city.trim() : "Québec"}. Page : ${pageTitle}. Chemin : ${pagePath}. Heure : ${timeStr}.`;

        case "form_submit":
            return `Demande d'estimation envoyée${namePart}. Ville estimée : ${cityKnown ? geo.city.trim() : "Québec"}. Page : ${pageTitle}. Heure : ${timeStr}.`;

        default:
            return `Notification ${event}. Page : ${pageTitle}. Heure : ${timeStr}.`;
    }
}

/** Déduplication courte par IP + événement (filet de sécurité si le client double-envoie) */
const recentSends = new Map<string, number>();
const DEDUP_MS = 120_000;

function dedupKey(ip: string, event: VisitSmsEvent): string {
    return `${ip}|${event}`;
}

function shouldDedupe(ip: string, event: VisitSmsEvent): boolean {
    const k = dedupKey(ip, event);
    const now = Date.now();
    const prev = recentSends.get(k);
    if (prev && now - prev < DEDUP_MS) return true;
    recentSends.set(k, now);
    if (recentSends.size > 5000) {
        for (const [key, t] of recentSends) {
            if (now - t > DEDUP_MS * 2) recentSends.delete(key);
        }
    }
    return false;
}

/** Limite anti-abus par IP */
const rateBucket = new Map<string, { n: number; reset: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 8;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    let b = rateBucket.get(ip);
    if (!b || now > b.reset) {
        b = { n: 0, reset: now + RATE_WINDOW_MS };
        rateBucket.set(ip, b);
    }
    b.n += 1;
    return b.n > RATE_MAX;
}

export default async (req: Request): Promise<Response> => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const toNumber = process.env.TO_PHONE_NUMBER;

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
        logStructured({ log: "error", reason: "missing_twilio_env" });
        return new Response(JSON.stringify({ ok: false, error: "configuration" }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }

    let body: TrackPayload = {};
    try {
        const text = await req.text();
        if (text) body = JSON.parse(text) as TrackPayload;
    } catch {
        logStructured({ log: "error", reason: "invalid_json_body" });
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
            status: 400,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }

    const event = body.event;
    const allowed: VisitSmsEvent[] = [
        "first_visit",
        "calculator",
        "call_click",
        "form_start",
        "form_submit",
    ];
    if (!event || !allowed.includes(event)) {
        logStructured({ log: "error", reason: "missing_or_invalid_event", event });
        return new Response(JSON.stringify({ ok: false, error: "invalid_event" }), {
            status: 400,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }

    const ua = req.headers.get("user-agent") || "";
    if (isLikelyBot(ua)) {
        logStructured({
            log: "blocked_bot",
            ua: ua.slice(0, 200),
            event,
        });
        return new Response(JSON.stringify({ ok: false, reason: "blocked_bot" }), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }

    const visitorIP = extractClientIp(req);

    if (event === "first_visit" && !body.humanConfirmed) {
        logStructured({
            log: "blocked_no_human_signal",
            event,
            ip: visitorIP,
        });
        return new Response(
            JSON.stringify({ ok: false, reason: "blocked_no_human_signal" }),
            {
                status: 200,
                headers: { "Content-Type": "application/json; charset=utf-8" },
            },
        );
    }

    const geo = await resolveGeo(req, visitorIP);

    if (!geo.countryCode || geo.countryCode !== "CA") {
        logStructured({
            log: "blocked_country",
            countryCode: geo.countryCode || "(unknown)",
            event,
            ip: visitorIP,
        });
        return new Response(JSON.stringify({ ok: false, reason: "blocked_country" }), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }

    if (!isQuebecGeo(geo)) {
        logStructured({
            log: "blocked_not_quebec",
            region: geo.region,
            regionName: geo.regionName,
            event,
            ip: visitorIP,
        });
        return new Response(
            JSON.stringify({ ok: false, reason: "blocked_not_quebec" }),
            {
                status: 200,
                headers: { "Content-Type": "application/json; charset=utf-8" },
            },
        );
    }

    if (shouldDedupe(visitorIP || "unknown", event)) {
        logStructured({
            log: "sms_skipped_duplicate",
            event,
            ip: visitorIP,
        });
        return new Response(JSON.stringify({ ok: false, reason: "duplicate" }), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }

    if (visitorIP && isRateLimited(visitorIP)) {
        logStructured({ log: "blocked_rate_limit", ip: visitorIP, event });
        return new Response(JSON.stringify({ ok: false, reason: "rate_limited" }), {
            status: 429,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }

    const pageTitle = sanitizeTitle(body.pageTitle || "");
    const pagePath = (body.pagePath || "").slice(0, 200) || "/";
    const client = (body.clientName || "").trim();

    const messageBody = smsBodyForEvent(event, geo, pageTitle, pagePath, client);

    const clientTwilio = twilio(accountSid, authToken);

    const logTag =
        event === "first_visit"
            ? "sms_sent_real_visitor"
            : event === "calculator"
              ? "sms_sent_calculator"
              : event === "call_click"
                ? "sms_sent_call_click"
                : event === "form_start"
                  ? "sms_sent_form_start"
                  : "sms_sent_form_submit";

    try {
        await clientTwilio.messages.create({
            body: messageBody,
            from: fromNumber,
            to: toNumber,
        });

        logStructured({
            log: logTag,
            event,
            ip: visitorIP,
            city: geo.city,
            region: geo.region,
        });

        return new Response(
            JSON.stringify({
                ok: true,
                event,
                city: geo.city,
                region: geo.region,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json; charset=utf-8" },
            },
        );
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logStructured({
            log: "twilio_error",
            error: msg,
            event,
        });
        return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }
};
