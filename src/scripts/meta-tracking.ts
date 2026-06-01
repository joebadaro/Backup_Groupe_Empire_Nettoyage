/**
 * Meta Pixel Lite — file d’attente, dédup session, bots/prefetch, événements empire:*.
 * Indépendant du SMS (track-visit / video-intent-alert).
 */

import {
  buildMetaPageContext,
  captureMarketingParams,
  toMetaParams,
} from "../lib/meta-page-context";

const VIDEO_PLAY_OPEN_EVENT = "empire:video-play-open";

declare global {
  interface Window {
    __EMPRE_META_PIXEL_ID__?: string;
    __empireMetaInitDone?: boolean;
    __empireMetaScriptInjected?: boolean;
    fbq?: Fbq;
  }
}

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded?: boolean;
};

const BOT_FRAGMENTS = [
  "googlebot",
  "adsbot",
  "bingbot",
  "semrushbot",
  "ahrefsbot",
  "facebookexternalhit",
  "facebot",
  "meta-externalagent",
  "meta-externalads",
  "instagramexternalhit",
  "lighthouse",
  "headlesschrome",
  "gptbot",
  "bytespider",
  "petalbot",
  "applebot",
  "crawler",
  "spider",
];

function getPixelId(): string {
  return (typeof window !== "undefined" && window.__EMPRE_META_PIXEL_ID__) || "";
}

function isMetaInAppBrowser(ua: string): boolean {
  const u = ua.toLowerCase();
  if (u.includes("fban/") || u.includes("fbav/") || u.includes("fb_iab")) return true;
  if (u.includes("instagram") && !u.includes("externalhit")) {
    if (u.includes("android") || u.includes("iphone") || u.includes("ipad")) {
      return true;
    }
  }
  return false;
}

function isLikelyBot(): boolean {
  if (typeof navigator === "undefined") return true;
  if (navigator.webdriver) return true;
  const ua = navigator.userAgent || "";
  if (!ua.trim()) return true;
  if (isMetaInAppBrowser(ua)) return false;
  const u = ua.toLowerCase();
  for (const frag of BOT_FRAGMENTS) {
    if (u.includes(frag)) return true;
  }
  if (u.includes("curl/") || u.includes("wget/")) return true;
  return false;
}

function isTrackingAllowed(): boolean {
  if (!getPixelId()) return false;
  if (isLikelyBot()) return false;
  if (document.visibilityState === "hidden") return false;
  return true;
}

function sessionOnce(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

const pending: Array<() => void> = [];
let pixelReady = false;

function flushPending(): void {
  if (!pixelReady || !window.fbq) return;
  while (pending.length > 0) {
    const fn = pending.shift();
    try {
      fn?.();
    } catch {
      /* ignore */
    }
  }
}

function whenReady(fn: () => void): void {
  if (pixelReady && window.fbq) {
    fn();
    return;
  }
  pending.push(fn);
  if (pending.length > 40) pending.shift();
}

function trackStandard(event: string, params: Record<string, string>): void {
  whenReady(() => {
    window.fbq?.("track", event, params);
  });
}

function trackCustom(event: string, params: Record<string, string>): void {
  whenReady(() => {
    window.fbq?.("trackCustom", event, params);
  });
}

function trackWithContext(
  standardEvent: string | null,
  customEvent: string | null,
  extra: Record<string, string | number | undefined> = {},
  onceKey?: string,
): void {
  if (!isTrackingAllowed()) return;
  if (onceKey && !sessionOnce(onceKey)) return;

  const ctx = buildMetaPageContext();
  const params = toMetaParams(ctx, extra);

  if (standardEvent) trackStandard(standardEvent, params);
  if (customEvent) trackCustom(customEvent, params);
}

function trackPageView(): void {
  if (!isTrackingAllowed()) return;
  const path = location.pathname || "/";
  const onceKey = `meta:pv:${path}`;
  if (!sessionOnce(onceKey)) return;

  const ctx = buildMetaPageContext();
  const params = toMetaParams(ctx);
  trackStandard("PageView", params);
}

function onPixelReady(): void {
  pixelReady = true;
  flushPending();
  trackPageView();
}

function initTelClicks(): void {
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.("a[href^='tel:']");
      if (!a) return;
      trackWithContext("Contact", null, undefined, "meta:tel");
    },
    true,
  );
}

function initEstimatorOpen(): void {
  window.addEventListener("empire:estimator-open", () => {
    trackWithContext("Schedule", "EstimateRequest", { funnel_step: "open" }, "meta:schedule");
  });
}

function initLeadSubmitted(): void {
  window.addEventListener(
    "empire:lead-form-submitted",
    ((e: CustomEvent<{ clientName?: string }>) => {
      if (!isTrackingAllowed()) return;
      if (!sessionOnce("meta:lead")) return;
      const name = e.detail?.clientName?.trim();
      const params = toMetaParams(buildMetaPageContext(), {
        funnel_step: "submit",
        ...(name ? { customer_name: name } : {}),
      });
      whenReady(() => {
        window.fbq?.("track", "Lead", params);
        window.fbq?.("trackCustom", "EstimateRequest", params);
        window.fbq?.("trackCustom", "SubmitForm", params);
      });
    }) as EventListener,
  );
}

function initVideoPlay(): void {
  window.addEventListener(
    VIDEO_PLAY_OPEN_EVENT,
    ((e: CustomEvent<{ youtubeId?: string; videoTitle?: string }>) => {
      const id = e.detail?.youtubeId?.trim() || "";
      const title = e.detail?.videoTitle?.trim() || "";
      const onceKey = id ? `meta:video:${id}` : "meta:video:unknown";
      trackWithContext(
        "ViewContent",
        "VideoPlay",
        {
          content_ids: id,
          video_title: title,
        },
        onceKey,
      );
    }) as EventListener,
  );
}

/** Pages service vidéo — ViewContent après engagement (aligné SMS vidéo). */
function initServiceViewContent(): void {
  const roots = document.querySelectorAll("[data-vit-track]");
  if (roots.length === 0) return;

  const path = location.pathname || "/";
  const onceKey = `meta:viewcontent:${path}`;
  if (sessionStorage.getItem(onceKey)) return;

  const loadedAt = performance.now();
  let engaged = false;
  let sent = false;

  const markEngaged = (): void => {
    if (window.scrollY >= 80) engaged = true;
  };

  const fire = (): void => {
    if (sent || !engaged) return;
    if (!sessionOnce(onceKey)) return;
    sent = true;
    const ctx = buildMetaPageContext();
    trackStandard("ViewContent", toMetaParams(ctx, { engagement: "scroll_or_dwell" }));
  };

  window.setTimeout(fire, 12_000);
  window.addEventListener(
    "scroll",
    () => {
      markEngaged();
      if (performance.now() - loadedAt >= 8_000) fire();
    },
    { passive: true },
  );
  document.addEventListener(
    "click",
    () => {
      engaged = true;
      if (performance.now() - loadedAt >= 8_000) fire();
    },
    true,
  );
}

let highEngTimer: ReturnType<typeof setInterval> | null = null;

/** Temps passé + scroll profond — une fois par page. */
function initHighEngagement(): void {
  if (highEngTimer) {
    clearInterval(highEngTimer);
    highEngTimer = null;
  }

  const path = location.pathname || "/";
  const onceKey = `meta:high_eng:${path}`;

  let maxScroll = 0;
  const started = performance.now();

  const check = (): void => {
    if (sentHighEngagement(onceKey)) {
      if (highEngTimer) clearInterval(highEngTimer);
      return;
    }
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    if (scrollable > 0) {
      maxScroll = Math.max(maxScroll, window.scrollY / scrollable);
    }
    const elapsed = performance.now() - started;
    if (elapsed >= 50_000 && maxScroll >= 0.45) {
      markHighEngagement(onceKey);
      if (highEngTimer) clearInterval(highEngTimer);
      trackCustom(
        "HighEngagement",
        toMetaParams(buildMetaPageContext(), {
          dwell_seconds: Math.round(elapsed / 1000),
          scroll_depth: Math.round(maxScroll * 100),
        }),
      );
    }
  };

  highEngTimer = window.setInterval(check, 5_000);
  window.addEventListener("scroll", check, { passive: true });
}

function sentHighEngagement(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markHighEngagement(key: string): void {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

/** Route formulaire estimation (navigation directe). */
function initEstimatePageLanding(): void {
  const type = buildMetaPageContext().pageType;
  if (type !== "estimate") return;
  trackWithContext("Schedule", "EstimateRequest", { funnel_step: "landing" }, "meta:estimate_landing");
}

function boot(): void {
  if (!getPixelId()) return;
  captureMarketingParams();
  initTelClicks();
  initEstimatorOpen();
  initLeadSubmitted();
  initVideoPlay();
  initServiceViewContent();
  initHighEngagement();
  initEstimatePageLanding();

  if (pixelReady) {
    trackPageView();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("empire:meta-pixel-ready", onPixelReady);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  document.addEventListener("astro:page-load", () => {
    captureMarketingParams();
    trackPageView();
    initServiceViewContent();
    initHighEngagement();
    initEstimatePageLanding();
  });
}
