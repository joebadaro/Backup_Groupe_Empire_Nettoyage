import { createHash } from "node:crypto";

/**
 * Filtrage SMS visiteurs — bots, prefetch, dédup courte par page, rafales Meta auto.
 * Haute intention (appel, formulaire, vidéo, calculateur) reste prioritaire.
 */

export const BOT_UA_FRAGMENTS = [
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
  "facebot",
  "meta-externalagent",
  "meta-externalads",
  "meta-webindexer",
  "instagramexternalhit",
  "facebookcatalog",
  "gptbot",
  "bytespider",
  "petalbot",
  "applebot",
  "slackbot",
  "twitterbot",
  "linkedinbot",
  "telegrambot",
  "discordbot",
  "preview",
  "prerender",
];

export function isMetaInAppBrowser(userAgent: string): boolean {
  const u = userAgent.toLowerCase();
  if (u.includes("fban/") || u.includes("fbav/") || u.includes("fb_iab")) return true;
  if (u.includes("fbios") || u.includes("[fb")) return true;
  if (u.includes("instagram") && !u.includes("externalhit")) {
    if (u.includes("android") || u.includes("iphone") || u.includes("ipad")) return true;
  }
  return false;
}

export function isLikelyBot(userAgent: string): boolean {
  const ua = userAgent || "";
  if (!ua.trim()) return true;
  if (isMetaCrawlerUa(ua)) return true;

  const u = ua.toLowerCase();
  for (const n of BOT_UA_FRAGMENTS) {
    if (u.includes(n)) return true;
  }
  if (u.includes("curl/") || u.includes("wget/") || u.includes("python-requests")) {
    return true;
  }
  if (/\b(bot|crawler|spider|scraper)\b/i.test(ua)) return true;
  return false;
}

function isMetaCrawlerUa(ua: string): boolean {
  const u = ua.toLowerCase();
  return (
    u.includes("facebookexternalhit") ||
    u.includes("facebot") ||
    u.includes("meta-externalagent") ||
    u.includes("meta-externalads") ||
    u.includes("instagramexternalhit") ||
    u.includes("facebookcatalog")
  );
}

export function isPrefetchRequest(req: Request): boolean {
  const purpose = `${req.headers.get("purpose") || ""} ${req.headers.get("sec-purpose") || ""}`.toLowerCase();
  return purpose.includes("prefetch") || purpose.includes("preview");
}

export function extractClientIp(req: Request): string {
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

export function hashValue(value: string, salt: string): string {
  return createHash("sha256")
    .update(`${salt}:${value}`)
    .digest("hex")
    .slice(0, 16);
}

export type NotifyTier = "page_view" | "high_intent";

export type PageViewEventKind = "page_enter" | "service_page_viewed";

const PAGE_BURST_DEDUP_MS =
  Number(process.env.SMS_PAGE_BURST_MS) || 90_000;
const COOLDOWN_HIGH_MS =
  Number(process.env.SMS_COOLDOWN_HIGH_MS) || 4 * 60 * 1000;
const META_BURST_WINDOW_MS = 3 * 60 * 1000;
const META_BURST_CITY_THRESHOLD = 4;
const META_BURST_BLOCK_MS = 30 * 60 * 1000;

const pageBurstDedup = new Map<string, number>();
const notifyCooldown = new Map<string, number>();

type MetaBurstEntry = {
  cities: string[];
  windowStart: number;
  hadRealVisitor: boolean;
  blockedUntil: number;
};

const metaBurstByIp = new Map<string, MetaBurstEntry>();

function pruneMap(map: Map<string, number>, maxAgeMs: number, now: number): void {
  if (map.size < 5000) return;
  for (const [key, t] of map) {
    if (now - t > maxAgeMs) map.delete(key);
  }
}

function logSmsDecision(log: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ log, ...fields }));
}

export function isMetaPaidTraffic(opts: {
  utmSource?: string;
  utmMedium?: string;
  referrer?: string;
  fbclid?: string;
  userAgent?: string;
}): boolean {
  const fbclid = (opts.fbclid || "").trim();
  if (fbclid) return true;
  const src = (opts.utmSource || "").toLowerCase();
  const med = (opts.utmMedium || "").toLowerCase();
  if (
    src.includes("facebook") ||
    src.includes("instagram") ||
    src === "fb" ||
    src === "ig"
  ) {
    return true;
  }
  if (med.includes("facebook") || med.includes("instagram")) return true;
  const ref = (opts.referrer || "").toLowerCase();
  if (ref.includes("facebook.com") || ref.includes("instagram.com")) return true;
  if (opts.userAgent && isMetaInAppBrowser(opts.userAgent)) return true;
  return false;
}

/** Trafic Meta sans signal visiteur humain côté client (previews / tests auto). */
export function isMetaAutomatedTraffic(opts: {
  isMetaTraffic: boolean;
  isMetaRealVisitor?: boolean;
  humanPageView?: boolean;
  userAgent?: string;
}): boolean {
  if (!opts.isMetaTraffic) return false;
  if (opts.userAgent && isMetaCrawlerUa(opts.userAgent)) return true;
  if (opts.isMetaRealVisitor === true && opts.humanPageView === true) return false;
  if (opts.humanPageView !== true) return true;
  if (opts.isMetaRealVisitor !== true) return true;
  return false;
}

function recordMetaBurst(opts: {
  ipHash: string;
  city: string;
  isMetaRealVisitor: boolean;
}): { blocked: boolean; reason?: string } {
  if (opts.ipHash === "unknown") return { blocked: false };

  const now = Date.now();
  let entry = metaBurstByIp.get(opts.ipHash);

  if (entry && entry.blockedUntil > now) {
    return { blocked: true, reason: "meta_automated_burst_blocked" };
  }

  const city = (opts.city || "").trim();
  if (!entry || now - entry.windowStart > META_BURST_WINDOW_MS) {
    entry = {
      cities: city && city.toLowerCase() !== "inconnue" ? [city] : [],
      windowStart: now,
      hadRealVisitor: opts.isMetaRealVisitor,
      blockedUntil: 0,
    };
    metaBurstByIp.set(opts.ipHash, entry);
    return { blocked: false };
  }

  if (opts.isMetaRealVisitor) entry.hadRealVisitor = true;
  if (
    city &&
    city.toLowerCase() !== "inconnue" &&
    !entry.cities.includes(city)
  ) {
    entry.cities.push(city);
  }

  if (
    !entry.hadRealVisitor &&
    entry.cities.length >= META_BURST_CITY_THRESHOLD
  ) {
    entry.blockedUntil = now + META_BURST_BLOCK_MS;
    logSmsDecision("meta_automated_burst_detected", {
      ipHash: opts.ipHash,
      distinctCities: entry.cities.length,
    });
    return { blocked: true, reason: "meta_automated_city_burst" };
  }

  return { blocked: false };
}

export function evaluatePageViewSms(opts: {
  kind: PageViewEventKind;
  ipHash: string;
  visitorHash: string;
  city: string;
  isMetaTraffic?: boolean;
  isMetaRealVisitor?: boolean;
  humanPageView?: boolean;
  dwellSeconds?: number;
  userAgent?: string;
}): { allowed: boolean; reason?: string } {
  if (opts.kind === "service_page_viewed") {
    return { allowed: false, reason: "service_page_view_disabled" };
  }

  if (opts.humanPageView !== true) {
    return { allowed: false, reason: "missing_human_page_view" };
  }

  const dwell = opts.dwellSeconds ?? 0;
  if (dwell < 3) {
    return { allowed: false, reason: "dwell_too_short" };
  }

  const metaTraffic = opts.isMetaTraffic === true;

  if (
    metaTraffic &&
    isMetaAutomatedTraffic({
      isMetaTraffic: true,
      isMetaRealVisitor: opts.isMetaRealVisitor,
      humanPageView: opts.humanPageView,
      userAgent: opts.userAgent,
    })
  ) {
    const burst = recordMetaBurst({
      ipHash: opts.ipHash,
      city: opts.city,
      isMetaRealVisitor: false,
    });
    if (burst.blocked) {
      return { allowed: false, reason: burst.reason || "meta_automated" };
    }
    return { allowed: false, reason: "meta_automated_no_real_visitor" };
  }

  if (metaTraffic) {
    const burst = recordMetaBurst({
      ipHash: opts.ipHash,
      city: opts.city,
      isMetaRealVisitor: true,
    });
    if (burst.blocked) {
      return { allowed: false, reason: burst.reason || "meta_burst_blocked" };
    }
  }

  return { allowed: true };
}

export function shouldThrottleNotify(opts: {
  ipHash: string;
  visitorHash: string;
  tier: NotifyTier;
  eventKey: string;
  pagePath?: string;
}): { blocked: boolean; reason?: string } {
  const now = Date.now();
  const visitorKey =
    opts.visitorHash && opts.visitorHash !== "unknown"
      ? opts.visitorHash
      : "no-visitor";

  if (opts.tier === "page_view") {
    const pageKey = (opts.pagePath || "/").slice(0, 200);
    const burstKey = `pv:${visitorKey}:${pageKey}`;
    const prevBurst = pageBurstDedup.get(burstKey);
    if (prevBurst && now - prevBurst < PAGE_BURST_DEDUP_MS) {
      return { blocked: true, reason: "duplicate_page_burst" };
    }
    pageBurstDedup.set(burstKey, now);
    pruneMap(pageBurstDedup, PAGE_BURST_DEDUP_MS * 3, now);
    return { blocked: false };
  }

  const burstKey = `${opts.ipHash}|${visitorKey}|${opts.eventKey}|${opts.pagePath || ""}`;
  const prevBurst = pageBurstDedup.get(burstKey);
  if (prevBurst && now - prevBurst < PAGE_BURST_DEDUP_MS) {
    return { blocked: true, reason: "duplicate_burst" };
  }
  pageBurstDedup.set(burstKey, now);

  const cooldownKey = `hi:${opts.ipHash}:${visitorKey}:${opts.eventKey}`;
  const prev = notifyCooldown.get(cooldownKey);
  if (prev && now - prev < COOLDOWN_HIGH_MS) {
    return { blocked: true, reason: "cooldown_high_intent" };
  }
  notifyCooldown.set(cooldownKey, now);

  pruneMap(pageBurstDedup, PAGE_BURST_DEDUP_MS * 3, now);
  pruneMap(notifyCooldown, COOLDOWN_HIGH_MS * 2, now);
  return { blocked: false };
}

const rateBucket = new Map<string, { n: number; reset: number }>();

export function isRateLimited(
  ipHash: string,
  maxPerHour: number,
  windowMs = 60 * 60 * 1000,
): boolean {
  if (!ipHash || ipHash === "unknown") return false;
  const now = Date.now();
  let b = rateBucket.get(ipHash);
  if (!b || now > b.reset) {
    b = { n: 0, reset: now + windowMs };
    rateBucket.set(ipHash, b);
  }
  b.n += 1;
  return b.n > maxPerHour;
}

export { logSmsDecision };
