import twilio from "twilio";
import {
    evaluatePageViewSms,
    extractClientIp,
    hashValue,
    isLikelyBot,
    isMetaPaidTraffic,
    isPrefetchRequest,
    isRateLimited,
    logSmsDecision,
    shouldThrottleNotify,
    type NotifyTier,
} from "./lib/sms-guard.ts";

type VisitSmsEvent =
    | "page_enter"
    | "calculator"
    | "call_click"
    | "form_start"
    | "form_submit";

interface TrackPayload {
    event?: VisitSmsEvent;
    pageTitle?: string;
    pageLabel?: string;
    pagePath?: string;
    serviceName?: string;
    clientName?: string;
    visitorId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    fbclid?: string;
    referrer?: string;
    trafficSource?: string;
    isMetaTraffic?: boolean;
    isMetaRealVisitor?: boolean;
    humanPageView?: boolean;
    dwellSeconds?: number;
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

function resolveTrafficSource(
    body: TrackPayload,
    metaTraffic: boolean,
    metaReal: boolean,
): string {
    const fromClient = (body.trafficSource || "").trim();
    if (fromClient) return fromClient.slice(0, 40);
    if (metaReal || metaTraffic) return "Meta";
    const src = (body.utmSource || "").toLowerCase();
    const med = (body.utmMedium || "").toLowerCase();
    if (src === "google" && (med === "cpc" || med === "ppc" || med === "paid")) {
        return "Google Ads";
    }
    if (src.includes("google")) return "Google";
    const ref = (body.referrer || "").toLowerCase();
    if (ref.includes("google.")) return "Google";
    if (ref.includes("facebook.") || ref.includes("instagram.")) return "Meta";
    if (ref.includes("bing.")) return "Bing";
    if (body.utmSource?.trim()) {
        const raw = body.utmSource.trim();
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    return "Direct";
}

function formatCityLine(geo: GeoResult): string {
    return geo.city?.trim() ? geo.city.trim() : "inconnue";
}

function smsBodyForEvent(
    event: VisitSmsEvent,
    geo: GeoResult,
    opts: {
        pageTitle: string;
        pageLabel: string;
        pagePath: string;
        serviceName: string;
        clientName?: string;
        trafficSource: string;
        metaReal: boolean;
    },
): string {
    const timeStr = formatTimeMontreal(new Date());
    const cityLine = formatCityLine(geo);
    const pageDisplay =
        opts.serviceName.trim() ||
        opts.pageLabel.trim() ||
        opts.pageTitle.trim() ||
        "Page";
    const namePart =
        opts.clientName && opts.clientName.trim()
            ? ` (${opts.clientName.trim()})`
            : "";

    switch (event) {
        case "page_enter": {
            if (opts.metaReal || opts.trafficSource === "Meta") {
                return [
                    "Un visiteur provenant de Meta est entré sur le site",
                    `Page : ${pageDisplay}`,
                    `Chemin : ${opts.pagePath}`,
                    `Source : Meta`,
                    `Ville : ${cityLine}`,
                    `Heure : ${timeStr}`,
                ].join("\n");
            }
            return [
                "Nouveau visiteur sur le site",
                `Page : ${pageDisplay}`,
                `Chemin : ${opts.pagePath}`,
                `Source : ${opts.trafficSource}`,
                `Ville : ${cityLine}`,
                `Heure : ${timeStr}`,
            ].join("\n");
        }

        case "calculator":
            return [
                "Action : Ouverture estimateur",
                `Page : ${pageDisplay}`,
                `Chemin : ${opts.pagePath}`,
                `Source : ${opts.trafficSource}`,
                `Ville : ${cityLine}${namePart}`,
                `Heure : ${timeStr}`,
            ].join("\n");

        case "call_click":
            return [
                "Action : Clic pour appeler",
                `Page : ${pageDisplay}`,
                `Chemin : ${opts.pagePath}`,
                `Source : ${opts.trafficSource}`,
                `Ville : ${cityLine}${namePart}`,
                `Heure : ${timeStr}`,
            ].join("\n");

        case "form_start":
            return [
                "Action : Formulaire démarré",
                `Page : ${pageDisplay}`,
                `Chemin : ${opts.pagePath}`,
                `Source : ${opts.trafficSource}`,
                `Ville : ${cityLine}${namePart}`,
                `Heure : ${timeStr}`,
            ].join("\n");

        case "form_submit":
            return [
                "Action : Demande d'estimation envoyée",
                `Page : ${pageDisplay}`,
                `Chemin : ${opts.pagePath}`,
                `Source : ${opts.trafficSource}`,
                `Ville : ${cityLine}${namePart}`,
                `Heure : ${timeStr}`,
            ].join("\n");

        default:
            return `Notification ${event}. Page : ${pageDisplay}. Heure : ${timeStr}.`;
    }
}

function notifyTierForEvent(event: VisitSmsEvent): NotifyTier {
    if (event === "page_enter") return "page_view";
    return "high_intent";
}

function numField(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return undefined;
}

function boolField(value: unknown): boolean {
    return value === true;
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
        "page_enter",
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

    if (isPrefetchRequest(req)) {
        logStructured({ log: "blocked_prefetch", event });
        return new Response(JSON.stringify({ ok: false, reason: "blocked_prefetch" }), {
            status: 200,
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
    const salt = process.env.VISIT_SMS_HASH_SALT || "empire-visit-sms-v1";
    const ipHash = visitorIP ? hashValue(visitorIP, salt) : "unknown";
    const visitorId = (body.visitorId || "").trim().slice(0, 64);
    const visitorHash = visitorId ? hashValue(visitorId, salt) : "unknown";

    const geo = await resolveGeo(req, visitorIP);

    const metaTraffic =
        boolField(body.isMetaTraffic) ||
        isMetaPaidTraffic({
            utmSource: body.utmSource,
            utmMedium: body.utmMedium,
            fbclid: body.fbclid,
            referrer: body.referrer,
            userAgent: ua,
        });
    const metaReal = boolField(body.isMetaRealVisitor);

    if (event === "page_enter") {
        const pageDecision = evaluatePageViewSms({
            kind: "page_enter",
            ipHash,
            visitorHash,
            city: geo.city,
            isMetaTraffic: metaTraffic,
            isMetaRealVisitor: metaReal,
            humanPageView: boolField(body.humanPageView),
            dwellSeconds: numField(body.dwellSeconds),
            userAgent: ua,
        });
        if (!pageDecision.allowed) {
            logSmsDecision("sms_blocked_page_enter", {
                event,
                reason: pageDecision.reason,
                ipHash,
                visitorHash,
                metaTraffic,
                metaReal,
                city: geo.city,
            });
            return new Response(
                JSON.stringify({ ok: false, reason: pageDecision.reason }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                },
            );
        }
    }

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

    const pagePath = (body.pagePath || "").slice(0, 200) || "/";
    const throttle = shouldThrottleNotify({
        ipHash,
        visitorHash,
        tier: notifyTierForEvent(event),
        eventKey: event,
        pagePath,
    });
    if (throttle.blocked) {
        logSmsDecision("sms_blocked_throttle", {
            reason: throttle.reason,
            event,
            ipHash,
            visitorHash,
            tier: notifyTierForEvent(event),
        });
        return new Response(JSON.stringify({ ok: false, reason: throttle.reason }), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }

    const rateMax = event === "page_enter" ? 30 : 12;
    if (ipHash !== "unknown" && isRateLimited(ipHash, rateMax)) {
        logSmsDecision("sms_blocked_rate_limit", { ipHash, event, rateMax });
        return new Response(JSON.stringify({ ok: false, reason: "rate_limited" }), {
            status: 429,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }

    const pageTitle = sanitizeTitle(body.pageTitle || "");
    const pageLabel = sanitizeTitle(body.pageLabel || pageTitle);
    const serviceName = sanitizeTitle(body.serviceName || "");
    const client = (body.clientName || "").trim();
    const trafficSource = resolveTrafficSource(body, metaTraffic, metaReal);

    const messageBody = smsBodyForEvent(event, geo, {
        pageTitle,
        pageLabel,
        pagePath,
        serviceName,
        clientName: client,
        trafficSource,
        metaReal: metaReal && metaTraffic,
    });

    const clientTwilio = twilio(accountSid, authToken);

    const logTag =
        event === "page_enter"
            ? "sms_sent_page_enter"
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
            ipHash,
            visitorHash,
            city: geo.city,
            region: geo.region,
            metaTraffic,
            metaReal,
            pagePath,
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
