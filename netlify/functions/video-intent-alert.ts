import twilio from "twilio";
import {
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

type VideoIntentEvent =
  | "service_page_viewed"
  | "service_video_play_clicked";

interface VideoIntentPayload {
  eventType?: VideoIntentEvent;
  pagePath?: string;
  pageTitle?: string;
  serviceName?: string;
  videoTitle?: string;
  youtubeId?: string;
  visitorId?: string;
  visitCount?: number;
  timestamp?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: string;
  referrer?: string;
  /** Ville déjà connue côté client (session) — jamais inventée */
  lastKnownCity?: string;
  /** Page service : true seulement après scroll / clic / délai d’engagement */
  humanConfirmed?: boolean;
  isMetaTraffic?: boolean;
  fbclid?: string;
}

function logStructured(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload));
}

function isValidCityName(city: string): boolean {
  const c = (city || "").trim();
  if (!c || c.length > 80) return false;
  if (c.toLowerCase() === "inconnue") return false;
  return /^[\p{L}\s'.-]+$/u.test(c);
}

function resolveCityFromNetlifyHeaders(req: Request): string {
  const candidates = [
    req.headers.get("x-nf-geo-city"),
    req.headers.get("x-nf-client-city"),
  ];
  for (const raw of candidates) {
    const city = (raw || "").trim();
    if (isValidCityName(city)) return city;
  }
  return "";
}

function resolveEffectiveCity(req: Request, lastKnownCity: string): string {
  const fromHeaders = resolveCityFromNetlifyHeaders(req);
  if (fromHeaders) return fromHeaders;
  const known = (lastKnownCity || "").trim();
  if (isValidCityName(known)) return known;
  return "";
}

function formatTimeMontreal(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  const parts = new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Toronto",
  }).formatToParts(safe);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function sanitizeTitle(raw: string): string {
  let t = (raw || "").trim();
  const pipe = t.indexOf("|");
  if (pipe > 0) t = t.slice(0, pipe).trim();
  return t.slice(0, 120) || "Page";
}

function formatVisitLabel(count: number | undefined): string {
  if (!count || count < 1 || !Number.isFinite(count)) return "inconnue";
  if (count === 1) return "1re visite";
  if (count === 2) return "2e visite";
  return `${count}e visite`;
}

function formatSource(
  utmSource: string,
  utmMedium: string,
  referrer: string,
): string {
  const src = utmSource.toLowerCase();
  const med = utmMedium.toLowerCase();
  if (src === "google" && (med === "cpc" || med === "ppc" || med === "paid")) {
    return "Google Ads";
  }
  if (utmSource.trim()) {
    return utmSource.trim().charAt(0).toUpperCase() + utmSource.trim().slice(1);
  }
  const ref = referrer.toLowerCase();
  if (ref.includes("google.")) return "Google";
  if (ref.includes("facebook.") || ref.includes("fb.")) return "Facebook";
  if (ref.includes("bing.")) return "Bing";
  return "direct";
}

function formatDevice(deviceType: string): string {
  return deviceType.toLowerCase() === "mobile" ? "Mobile" : "Desktop";
}

function buildSmsBody(
  event: VideoIntentEvent,
  payload: Required<
    Pick<
      VideoIntentPayload,
      | "pageTitle"
      | "serviceName"
      | "videoTitle"
      | "visitCount"
      | "deviceType"
      | "utmSource"
      | "utmMedium"
      | "referrer"
    >
  > & { timestamp?: string },
  city: string,
): string {
  const page = sanitizeTitle(payload.serviceName || payload.pageTitle);
  const video = (payload.videoTitle || "").trim() || "inconnue";
  const visit = formatVisitLabel(payload.visitCount);
  const timeStr = formatTimeMontreal(payload.timestamp);
  const source = formatSource(
    payload.utmSource || "",
    payload.utmMedium || "",
    payload.referrer || "",
  );
  const cityLine = city ? city : "inconnue";
  const device = formatDevice(payload.deviceType || "desktop");

  if (event === "service_page_viewed") {
    return [
      "Nouveau visiteur probable",
      `Ville : ${cityLine}`,
      `Page : ${page}`,
      "Action : Page visitée",
      `Appareil : ${device}`,
      `Visite estimée : ${visit}`,
      `Source : ${source}`,
      `Heure : ${timeStr}`,
    ].join("\n");
  }

  return [
    "Clic vidéo",
    `Ville : ${cityLine}`,
    `Page : ${page}`,
    `Vidéo : ${video}`,
    `Appareil : ${device}`,
    `Visite estimée : ${visit}`,
    `Source : ${source}`,
    `Heure : ${timeStr}`,
  ].join("\n");
}

function strField(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function parsePayload(body: VideoIntentPayload): VideoIntentPayload | null {
  const eventType = body.eventType;
  if (
    eventType !== "service_page_viewed" &&
    eventType !== "service_video_play_clicked"
  ) {
    return null;
  }

  const visitCount =
    typeof body.visitCount === "number" && Number.isFinite(body.visitCount)
      ? Math.min(999, Math.max(1, Math.floor(body.visitCount)))
      : undefined;

  return {
    eventType,
    pagePath: strField(body.pagePath, 220),
    pageTitle: strField(body.pageTitle, 120),
    serviceName: strField(body.serviceName, 120),
    videoTitle: strField(body.videoTitle, 200),
    youtubeId: strField(body.youtubeId, 32),
    visitorId: strField(body.visitorId, 64),
    visitCount,
    timestamp: strField(body.timestamp, 40),
    utmSource: strField(body.utmSource, 80),
    utmMedium: strField(body.utmMedium, 80),
    utmCampaign: strField(body.utmCampaign, 120),
    deviceType: strField(body.deviceType, 16),
    referrer: strField(body.referrer, 300),
    lastKnownCity: strField(body.lastKnownCity, 80),
    humanConfirmed: body.humanConfirmed === true,
    isMetaTraffic: body.isMetaTraffic === true,
    fbclid: strField(body.fbclid, 120),
  };
}

function notifyTier(event: VideoIntentEvent): NotifyTier {
  return event === "service_page_viewed" ? "page_view" : "high_intent";
}

function isDryRunMode(): boolean {
  return process.env.VIDEO_INTENT_DRY_RUN !== "false";
}

function getTwilioConfig(): {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  toNumber: string;
} | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber =
    process.env.TWILIO_FROM_PHONE || process.env.TWILIO_PHONE_NUMBER;
  const toNumber = process.env.ALERT_TO_PHONE || process.env.TO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber || !toNumber) return null;
  return { accountSid, authToken, fromNumber, toNumber };
}

export default async (req: Request): Promise<Response> => {
  const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const rawText = await req.text();
  if (rawText.length > 4096) {
    return new Response(JSON.stringify({ ok: false, error: "payload_too_large" }), {
      status: 413,
      headers: jsonHeaders,
    });
  }

  let body: VideoIntentPayload = {};
  try {
    if (rawText) body = JSON.parse(rawText) as VideoIntentPayload;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const payload = parsePayload(body);
  if (!payload?.eventType) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_event" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  if (isPrefetchRequest(req)) {
    logStructured({ log: "video_intent_blocked_prefetch", event: payload.eventType });
    return new Response(JSON.stringify({ ok: false, reason: "blocked_prefetch" }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  const ua = req.headers.get("user-agent") || "";
  if (isLikelyBot(ua)) {
    logStructured({ log: "video_intent_blocked_bot", event: payload.eventType });
    return new Response(JSON.stringify({ ok: false, reason: "blocked_bot" }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  if (payload.eventType === "service_page_viewed") {
    logSmsDecision("video_intent_page_view_disabled", {
      event: payload.eventType,
      note: "page_enter handled by track-visit",
    });
    return new Response(
      JSON.stringify({ ok: false, reason: "service_page_view_disabled" }),
      { status: 200, headers: jsonHeaders },
    );
  }

  const salt = process.env.VIDEO_INTENT_HASH_SALT || "empire-video-intent-v1";
  const clientIp = extractClientIp(req);
  const ipHash = clientIp ? hashValue(clientIp, salt) : "unknown";
  const visitorHash = payload.visitorId
    ? hashValue(payload.visitorId, salt)
    : "unknown";

  const city = resolveEffectiveCity(req, payload.lastKnownCity || "");
  const metaTraffic =
    payload.isMetaTraffic === true ||
    isMetaPaidTraffic({
      utmSource: payload.utmSource,
      utmMedium: payload.utmMedium,
      referrer: payload.referrer,
      fbclid: payload.fbclid,
      userAgent: ua,
    });

  const tier = notifyTier(payload.eventType);
  const throttle = shouldThrottleNotify({
    ipHash,
    visitorHash,
    tier,
    eventKey: payload.eventType,
    pagePath: payload.pagePath,
  });
  if (throttle.blocked) {
    logSmsDecision("video_intent_blocked_throttle", {
      reason: throttle.reason,
      ipHash,
      event: payload.eventType,
    });
    return new Response(JSON.stringify({ ok: false, reason: throttle.reason }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  const cityLine = city || "inconnue";
  const rateMax =
    payload.eventType === "service_page_viewed" ? 1 : 12;
  if (ipHash !== "unknown" && isRateLimited(ipHash, rateMax)) {
    logSmsDecision("video_intent_blocked_rate_limit", {
      ipHash,
      event: payload.eventType,
      rateMax,
    });
    return new Response(JSON.stringify({ ok: false, reason: "rate_limited" }), {
      status: 429,
      headers: jsonHeaders,
    });
  }

  const smsBody = buildSmsBody(
    payload.eventType,
    {
      pageTitle: payload.pageTitle || "",
      serviceName: payload.serviceName || "",
      videoTitle: payload.videoTitle || "",
      visitCount: payload.visitCount,
      deviceType: payload.deviceType || "desktop",
      utmSource: payload.utmSource || "",
      utmMedium: payload.utmMedium || "",
      utmCampaign: payload.utmCampaign || "",
      referrer: payload.referrer || "",
      timestamp: payload.timestamp,
    },
    cityLine === "inconnue" ? "" : cityLine,
  );

  const cleanPayload = {
    eventType: payload.eventType,
    pagePath: payload.pagePath,
    pageTitle: payload.pageTitle,
    serviceName: payload.serviceName,
    videoTitle: payload.videoTitle,
    youtubeId: payload.youtubeId,
    visitCount: payload.visitCount,
    timestamp: payload.timestamp,
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
    deviceType: payload.deviceType,
    referrer: payload.referrer,
  };

  const dryRun = isDryRunMode();
  const twilioConfig = getTwilioConfig();

  if (dryRun || !twilioConfig) {
    logStructured({
      log: "video_intent_dry_run",
      dryRun: true,
      event: payload.eventType,
      visitorHash,
      ipHash,
      youtubeId: payload.youtubeId || "",
      referrer: payload.referrer || "",
      payload: cleanPayload,
      smsBody,
      city: cityLine,
    });
    return new Response(
      JSON.stringify({
        ok: true,
        dryRun: true,
        event: payload.eventType,
        city: cityLine,
      }),
      { status: 200, headers: jsonHeaders },
    );
  }

  try {
    const client = twilio(twilioConfig.accountSid, twilioConfig.authToken);
    await client.messages.create({
      body: smsBody,
      from: twilioConfig.fromNumber,
      to: twilioConfig.toNumber,
    });

    logStructured({
      log: "video_intent_sms_sent",
      event: payload.eventType,
      visitorHash,
      ipHash,
      city: cityLine,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        dryRun: false,
        event: payload.eventType,
        city: cityLine,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logStructured({
      log: "video_intent_twilio_error",
      error: msg,
      event: payload.eventType,
      visitorHash,
      ipHash,
    });
    return new Response(JSON.stringify({ ok: false, error: "twilio_error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
