import { createHash } from "node:crypto";

/**
 * Filtrage partagé SMS visiteurs — bots, prefetch, cooldown visiteur/IP, villes instables.
 * Les navigateurs in-app Facebook/Instagram (vrais clics pub) ne sont pas bloqués.
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

/** Navigateurs in-app Meta (vrais utilisateurs après clic pub) */
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
  if (isMetaInAppBrowser(ua)) return false;

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

const BURST_DEDUP_MS = 90_000;
const COOLDOWN_PAGE_MS =
  Number(process.env.SMS_COOLDOWN_PAGE_MS) || 15 * 60 * 1000;
const COOLDOWN_HIGH_MS =
  Number(process.env.SMS_COOLDOWN_HIGH_MS) || 4 * 60 * 1000;

const burstDedup = new Map<string, number>();
const notifyCooldown = new Map<string, number>();

const cityFlap = new Map<string, { cities: string[]; windowStart: number }>();
const CITY_FLAP_WINDOW_MS = 10 * 60 * 1000;
const CITY_FLAP_MAX_DISTINCT = 2;

function pruneMap(map: Map<string, number>, maxAgeMs: number, now: number): void {
  if (map.size < 4000) return;
  for (const [key, t] of map) {
    if (now - t > maxAgeMs) map.delete(key);
  }
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

  const burstKey = `${opts.ipHash}|${visitorKey}|${opts.eventKey}|${opts.pagePath || ""}`;
  const prevBurst = burstDedup.get(burstKey);
  if (prevBurst && now - prevBurst < BURST_DEDUP_MS) {
    return { blocked: true, reason: "duplicate_burst" };
  }
  burstDedup.set(burstKey, now);

  const cooldownKey =
    opts.tier === "page_view"
      ? `pv:${opts.ipHash}:${visitorKey}`
      : `hi:${opts.ipHash}:${visitorKey}:${opts.eventKey}`;

  const cooldownMs =
    opts.tier === "page_view" ? COOLDOWN_PAGE_MS : COOLDOWN_HIGH_MS;
  const prev = notifyCooldown.get(cooldownKey);
  if (prev && now - prev < cooldownMs) {
    return {
      blocked: true,
      reason:
        opts.tier === "page_view" ? "cooldown_page_view" : "cooldown_high_intent",
    };
  }

  notifyCooldown.set(cooldownKey, now);
  pruneMap(burstDedup, BURST_DEDUP_MS * 3, now);
  pruneMap(notifyCooldown, Math.max(COOLDOWN_PAGE_MS, COOLDOWN_HIGH_MS) * 2, now);
  return { blocked: false };
}

/** Plusieurs villes différentes pour la même IP en peu de temps → prévisualisations / tests pub */
export function isSuspiciousCityFlap(ipHash: string, city: string): boolean {
  if (!ipHash || ipHash === "unknown") return false;
  const c = (city || "").trim();
  if (!c || c.toLowerCase() === "inconnue") return false;

  const now = Date.now();
  let entry = cityFlap.get(ipHash);
  if (!entry || now - entry.windowStart > CITY_FLAP_WINDOW_MS) {
    entry = { cities: [c], windowStart: now };
    cityFlap.set(ipHash, entry);
    return false;
  }
  if (!entry.cities.includes(c)) entry.cities.push(c);
  return entry.cities.length > CITY_FLAP_MAX_DISTINCT;
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
