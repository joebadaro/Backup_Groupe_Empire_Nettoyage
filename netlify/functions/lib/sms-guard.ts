import { createHash } from "node:crypto";

/**
 * Filtrage SMS visiteurs — bots, prefetch, cooldown, villes instables, trafic Meta Ads.
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
  /** Crawlers Meta / prefetch publicitaire — jamais SMS */
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

export type PageViewEventKind =
  | "first_visit"
  | "service_page_viewed"
  | "engaged_visit";

const BURST_DEDUP_MS = 120_000;
const COOLDOWN_PAGE_MS =
  Number(process.env.SMS_COOLDOWN_PAGE_MS) || 45 * 60 * 1000;
const COOLDOWN_HIGH_MS =
  Number(process.env.SMS_COOLDOWN_HIGH_MS) || 4 * 60 * 1000;
const SESSION_BLOCK_MS = 60 * 60 * 1000;
const CITY_FLAP_WINDOW_MS = 15 * 60 * 1000;

const burstDedup = new Map<string, number>();
const notifyCooldown = new Map<string, number>();
const sessionPageBlock = new Map<string, number>();

const cityFlapByIp = new Map<string, { cities: string[]; windowStart: number }>();
const cityFlapByVisitor = new Map<string, { cities: string[]; windowStart: number }>();

function pruneMap(map: Map<string, number>, maxAgeMs: number, now: number): void {
  if (map.size < 5000) return;
  for (const [key, t] of map) {
    if (now - t > maxAgeMs) map.delete(key);
  }
}

function sessionBlockKey(ipHash: string, visitorHash: string): string {
  return `${ipHash}|${visitorHash}`;
}

export function isSessionBlockedForPageView(
  ipHash: string,
  visitorHash: string,
): boolean {
  const key = sessionBlockKey(ipHash, visitorHash);
  const until = sessionPageBlock.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    sessionPageBlock.delete(key);
    return false;
  }
  return true;
}

function blockPageViewSession(ipHash: string, visitorHash: string, reason: string): void {
  const key = sessionBlockKey(ipHash, visitorHash);
  sessionPageBlock.set(key, Date.now() + SESSION_BLOCK_MS);
  logSmsDecision("session_page_view_blocked", { ipHash, visitorHash, reason });
}

function logSmsDecision(
  log: string,
  fields: Record<string, unknown>,
): void {
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

function recordCityFlap(
  store: Map<string, { cities: string[]; windowStart: number }>,
  key: string,
  city: string,
): number {
  const c = city.trim();
  if (!c || c.toLowerCase() === "inconnue") return 0;
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || now - entry.windowStart > CITY_FLAP_WINDOW_MS) {
    entry = { cities: [c], windowStart: now };
    store.set(key, entry);
    return entry.cities.length;
  }
  if (!entry.cities.includes(c)) entry.cities.push(c);
  return entry.cities.length;
}

/** Ville change souvent → blocage session page-view (tests pub Meta). */
export function registerCityForPageView(opts: {
  ipHash: string;
  visitorHash: string;
  city: string;
}): { blocked: boolean; reason?: string; distinctCities: number } {
  const city = (opts.city || "").trim();
  if (!city || city.toLowerCase() === "inconnue") {
    return { blocked: false, distinctCities: 0 };
  }

  if (isSessionBlockedForPageView(opts.ipHash, opts.visitorHash)) {
    return { blocked: true, reason: "session_already_blocked", distinctCities: 0 };
  }

  const ipCount =
    opts.ipHash !== "unknown"
      ? recordCityFlap(cityFlapByIp, opts.ipHash, city)
      : 0;
  const visitorCount =
    opts.visitorHash !== "unknown"
      ? recordCityFlap(cityFlapByVisitor, opts.visitorHash, city)
      : 0;

  const distinct = Math.max(ipCount, visitorCount);
  /** 2 villes distinctes en 15 min → blocage complet page-view pour la session */
  if (distinct >= 2) {
    blockPageViewSession(opts.ipHash, opts.visitorHash, "city_flap");
    return { blocked: true, reason: "city_flap", distinctCities: distinct };
  }

  return { blocked: false, distinctCities: distinct };
}

/** @deprecated use registerCityForPageView */
export function isSuspiciousCityFlap(ipHash: string, city: string): boolean {
  const r = registerCityForPageView({
    ipHash,
    visitorHash: "unknown",
    city,
  });
  return r.blocked;
}

export function isLegacyPageViewDisabled(): boolean {
  return process.env.SMS_LEGACY_PAGE_VIEW !== "true";
}

export function validateEngagedPageViewPayload(opts: {
  dwellSeconds?: number;
  scrollPx?: number;
  hasClick?: boolean;
  strongEngagement?: boolean;
  isMetaTraffic?: boolean;
}): { ok: boolean; reason?: string } {
  if (opts.strongEngagement !== true) {
    return { ok: false, reason: "missing_strong_engagement_flag" };
  }
  const dwell = opts.dwellSeconds ?? 0;
  const scroll = opts.scrollPx ?? 0;
  const meta = opts.isMetaTraffic === true;
  const minDwell = meta ? 45 : 28;
  const minScroll = meta ? 220 : 140;
  const deepScroll = meta ? 380 : 280;

  if (dwell < minDwell) {
    return { ok: false, reason: "dwell_too_short" };
  }
  if (scroll < minScroll) {
    return { ok: false, reason: "scroll_too_shallow" };
  }
  if (!opts.hasClick && scroll < deepScroll) {
    return { ok: false, reason: "no_click_and_shallow_scroll" };
  }
  return { ok: true };
}

export function evaluatePageViewSms(opts: {
  kind: PageViewEventKind;
  ipHash: string;
  visitorHash: string;
  city: string;
  isMetaTraffic?: boolean;
  dwellSeconds?: number;
  scrollPx?: number;
  hasClick?: boolean;
  strongEngagement?: boolean;
}): { allowed: boolean; reason?: string } {
  if (isSessionBlockedForPageView(opts.ipHash, opts.visitorHash)) {
    return { allowed: false, reason: "session_page_view_blocked" };
  }

  const cityCheck = registerCityForPageView({
    ipHash: opts.ipHash,
    visitorHash: opts.visitorHash,
    city: opts.city,
  });
  if (cityCheck.blocked) {
    return { allowed: false, reason: cityCheck.reason || "city_flap" };
  }

  if (opts.kind === "first_visit" || opts.kind === "service_page_viewed") {
    if (isLegacyPageViewDisabled()) {
      return { allowed: false, reason: "legacy_page_view_disabled" };
    }
    if (opts.isMetaTraffic) {
      return { allowed: false, reason: "meta_traffic_no_legacy_page_sms" };
    }
    return { allowed: false, reason: "legacy_page_view_disabled" };
  }

  if (opts.kind === "engaged_visit") {
    if (opts.isMetaTraffic) {
      const v = validateEngagedPageViewPayload({
        ...opts,
        isMetaTraffic: true,
      });
      if (!v.ok) return { allowed: false, reason: `meta_engaged_${v.reason}` };
    } else {
      const v = validateEngagedPageViewPayload(opts);
      if (!v.ok) return { allowed: false, reason: `engaged_${v.reason}` };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: "unknown_page_view_kind" };
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

  if (opts.tier === "page_view") {
    const ipKey = `pv:ip:${opts.ipHash}`;
    const visitorCooldownKey = `pv:visitor:${visitorKey}`;
    const ipPrev = notifyCooldown.get(ipKey);
    if (ipPrev && now - ipPrev < COOLDOWN_PAGE_MS) {
      return { blocked: true, reason: "cooldown_page_view_ip" };
    }
    const visPrev = notifyCooldown.get(visitorCooldownKey);
    if (visPrev && now - visPrev < COOLDOWN_PAGE_MS) {
      return { blocked: true, reason: "cooldown_page_view_visitor" };
    }
    notifyCooldown.set(ipKey, now);
    notifyCooldown.set(visitorCooldownKey, now);
  } else {
    const cooldownKey = `hi:${opts.ipHash}:${visitorKey}:${opts.eventKey}`;
    const prev = notifyCooldown.get(cooldownKey);
    if (prev && now - prev < COOLDOWN_HIGH_MS) {
      return { blocked: true, reason: "cooldown_high_intent" };
    }
    notifyCooldown.set(cooldownKey, now);
  }

  pruneMap(burstDedup, BURST_DEDUP_MS * 3, now);
  pruneMap(notifyCooldown, Math.max(COOLDOWN_PAGE_MS, COOLDOWN_HIGH_MS) * 2, now);
  pruneMap(sessionPageBlock, SESSION_BLOCK_MS * 2, now);
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
