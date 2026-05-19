/**
 * SMS d'intention vidéo — client (dry-run via fonction Netlify).
 * Ne bloque jamais l'ouverture des modals vidéo.
 */

import {
  formatVisitEstimate,
  syncVisitCount,
} from "./video-visitor-storage";

const ALERT_URL = "/.netlify/functions/video-intent-alert";

const K_UTM = "empire_vit_utm_v1";

type VideoIntentEvent =
  | "service_video_block_viewed"
  | "service_video_play_clicked";

interface TrackPayload {
  eventType: VideoIntentEvent;
  pagePath: string;
  pageTitle: string;
  serviceName: string;
  videoTitle: string;
  youtubeId: string;
  visitorId: string;
  visitCount: number;
  timestamp: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  deviceType: "mobile" | "desktop";
  referrer: string;
}

function cleanPageTitle(): string {
  let t = document.title || "";
  const pipe = t.indexOf("|");
  if (pipe > 0) t = t.slice(0, pipe).trim();
  return t.trim() || location.pathname || "Page";
}

function getDeviceType(): "mobile" | "desktop" {
  if (typeof window.matchMedia === "function") {
    if (window.matchMedia("(max-width: 768px)").matches) return "mobile";
  }
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

function captureUtm(): void {
  try {
    if (sessionStorage.getItem(K_UTM)) return;
    const params = new URLSearchParams(location.search);
    const utmSource = params.get("utm_source") || "";
    const utmMedium = params.get("utm_medium") || "";
    const utmCampaign = params.get("utm_campaign") || "";
    if (utmSource || utmMedium || utmCampaign) {
      sessionStorage.setItem(
        K_UTM,
        JSON.stringify({ utmSource, utmMedium, utmCampaign }),
      );
    }
  } catch {
    /* ignore */
  }
}

function readUtm(): { utmSource: string; utmMedium: string; utmCampaign: string } {
  try {
    const raw = sessionStorage.getItem(K_UTM);
    if (raw) {
      const p = JSON.parse(raw) as {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
      };
      return {
        utmSource: p.utmSource || "",
        utmMedium: p.utmMedium || "",
        utmCampaign: p.utmCampaign || "",
      };
    }
  } catch {
    /* ignore */
  }
  return { utmSource: "", utmMedium: "", utmCampaign: "" };
}

function pagePath(): string {
  return `${location.pathname}${location.search || ""}`.slice(0, 220);
}

function blockSessionKey(): string {
  return `empire_vit_block:${pagePath()}`;
}

function playSessionKey(youtubeId: string): string {
  return `empire_vit_play:${pagePath()}:${youtubeId}`;
}

function sendPayload(payload: TrackPayload): void {
  const body = JSON.stringify(payload);
  try {
    if (
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(ALERT_URL, new Blob([body], { type: "application/json" }))
    ) {
      return;
    }
  } catch {
    /* fall through */
  }
  void fetch(ALERT_URL, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
}

function buildBasePayload(
  eventType: VideoIntentEvent,
  meta: {
    serviceName: string;
    videoTitle: string;
    youtubeId: string;
  },
): TrackPayload {
  const { visitCount, visitorId } = syncVisitCount();
  const utm = readUtm();
  return {
    eventType,
    pagePath: pagePath(),
    pageTitle: cleanPageTitle(),
    serviceName: meta.serviceName,
    videoTitle: meta.videoTitle,
    youtubeId: meta.youtubeId,
    visitorId,
    visitCount,
    timestamp: new Date().toISOString(),
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
    deviceType: getDeviceType(),
    referrer: (document.referrer || "").slice(0, 300),
  };
}

function resolveServiceName(root: Element): string {
  const fromAttr = root.getAttribute("data-vit-service-name")?.trim();
  if (fromAttr) return fromAttr.slice(0, 120);
  return cleanPageTitle();
}

function trackBlockViewed(root: Element): void {
  try {
    if (sessionStorage.getItem(blockSessionKey())) return;
    sessionStorage.setItem(blockSessionKey(), "1");
  } catch {
    return;
  }

  const trackType = root.getAttribute("data-vit-track") || "single";
  let videoTitle = root.getAttribute("data-vit-video-title")?.trim() || "";
  let youtubeId = root.getAttribute("data-vit-youtube-id")?.trim() || "";

  if (trackType === "duo") {
    videoTitle =
      root.getAttribute("data-vit-video-titles")?.trim() ||
      Array.from(root.querySelectorAll("[data-vit-video-title]"))
        .map((el) => el.getAttribute("data-vit-video-title")?.trim())
        .filter(Boolean)
        .join(" | ");
    youtubeId = "";
  }

  sendPayload(
    buildBasePayload("service_video_block_viewed", {
      serviceName: resolveServiceName(root),
      videoTitle: videoTitle.slice(0, 200),
      youtubeId: youtubeId.slice(0, 32),
    }),
  );
}

function trackPlayClicked(trigger: Element): void {
  const article = trigger.closest(".svp-duo-item");
  const root =
    trigger.closest("[data-vit-track]") ||
    trigger.closest(".service-video-proof") ||
    trigger.closest(".service-video-proof-duo");

  let youtubeId = "";
  let videoTitle = "";

  if (article) {
    youtubeId = article.getAttribute("data-vit-youtube-id")?.trim() || "";
    videoTitle = article.getAttribute("data-vit-video-title")?.trim() || "";
  } else if (root) {
    youtubeId = root.getAttribute("data-vit-youtube-id")?.trim() || "";
    videoTitle = root.getAttribute("data-vit-video-title")?.trim() || "";
  }

  const modalId = trigger.getAttribute("data-svp-open");
  if (!youtubeId && modalId?.startsWith("svp-modal-")) {
    youtubeId = modalId.slice("svp-modal-".length);
  }

  if (!youtubeId) return;

  try {
    if (sessionStorage.getItem(playSessionKey(youtubeId))) return;
    sessionStorage.setItem(playSessionKey(youtubeId), "1");
  } catch {
    return;
  }

  sendPayload(
    buildBasePayload("service_video_play_clicked", {
      serviceName: root ? resolveServiceName(root) : cleanPageTitle(),
      videoTitle: videoTitle.slice(0, 200),
      youtubeId,
    }),
  );
}

const observedBlocks = new WeakSet<Element>();

function observeVideoBlocks(): void {
  const roots = document.querySelectorAll("[data-vit-track]");
  roots.forEach((root) => {
    if (!(root instanceof Element) || observedBlocks.has(root)) return;
    observedBlocks.add(root);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.35) continue;
          trackBlockViewed(entry.target);
          observer.disconnect();
        }
      },
      { threshold: [0.35, 0.5] },
    );
    observer.observe(root);
  });
}

function initPlayCapture(): void {
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const trigger = target.closest("[data-svp-open]");
      if (!trigger) return;
      if (!trigger.closest("[data-vit-track], .service-video-proof, .service-video-proof-duo")) {
        return;
      }
      trackPlayClicked(trigger);
    },
    true,
  );
}

function boot(): void {
  captureUtm();
  observeVideoBlocks();
  initPlayCapture();
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  document.addEventListener("astro:page-load", boot);
}

/** Exposé pour tests manuels en console */
if (typeof window !== "undefined") {
  (window as unknown as { __empireVideoIntent?: object }).__empireVideoIntent = {
    syncVisitCount,
    formatVisitEstimate,
  };
}
