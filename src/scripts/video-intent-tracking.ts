/**
 * SMS d'intention vidéo — client (dry-run via fonction Netlify).
 * Ne bloque jamais l'ouverture des modals vidéo.
 */

import {
  formatVisitEstimate,
  syncVisitCount,
} from "./video-visitor-storage";

const ALERT_URL = "/.netlify/functions/video-intent-alert";

export const VIDEO_PLAY_OPEN_EVENT = "empire:video-play-open";

export interface VideoPlayOpenDetail {
  youtubeId: string;
  videoTitle: string;
  serviceName: string;
}

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

/** Émis par openModal — écouteur enregistré dès le chargement du module. */
export function dispatchVideoPlayOpen(detail: VideoPlayOpenDetail): void {
  if (!detail.youtubeId?.trim()) return;
  window.dispatchEvent(
    new CustomEvent<VideoPlayOpenDetail>(VIDEO_PLAY_OPEN_EVENT, {
      detail: {
        youtubeId: detail.youtubeId.trim(),
        videoTitle: (detail.videoTitle || "").trim(),
        serviceName: (detail.serviceName || "").trim(),
      },
    }),
  );
}

function trackVideoPlayFromDetail(detail: VideoPlayOpenDetail): void {
  const youtubeId = detail.youtubeId.trim();
  if (!youtubeId) return;

  try {
    if (sessionStorage.getItem(playSessionKey(youtubeId))) return;
    sessionStorage.setItem(playSessionKey(youtubeId), "1");
  } catch {
    return;
  }

  const serviceName = detail.serviceName.trim() || cleanPageTitle();

  sendPayload(
    buildBasePayload("service_video_play_clicked", {
      serviceName,
      videoTitle: (detail.videoTitle || "").trim().slice(0, 200),
      youtubeId,
    }),
  );
}

function onVideoPlayOpenEvent(event: Event): void {
  const detail = (event as CustomEvent<VideoPlayOpenDetail>).detail;
  if (!detail?.youtubeId) return;
  trackVideoPlayFromDetail(detail);
}

/** Construit le détail depuis le modal et émet l’événement (appelé par openModal). */
export function emitVideoPlayOpenFromModal(
  dialog: HTMLElement | null,
  trigger?: Element | null,
): void {
  if (!dialog) return;

  const modalId = dialog.id || "";
  let youtubeId = "";
  if (modalId.startsWith("svp-modal-")) {
    youtubeId = modalId.slice("svp-modal-".length);
  }
  if (!youtubeId && trigger) {
    const openId = trigger.getAttribute("data-svp-open");
    if (openId?.startsWith("svp-modal-")) {
      youtubeId = openId.slice("svp-modal-".length);
    }
  }
  if (!youtubeId) return;

  const article = trigger?.closest(".svp-duo-item");
  const root =
    trigger?.closest("[data-vit-track]") ||
    trigger?.closest(".service-video-proof") ||
    trigger?.closest(".service-video-proof-duo");

  let videoTitle = dialog.getAttribute("aria-label")?.trim() || "";
  let serviceName = "";
  if (article) {
    videoTitle =
      article.getAttribute("data-vit-video-title")?.trim() || videoTitle;
  } else if (root) {
    videoTitle =
      root.getAttribute("data-vit-video-title")?.trim() || videoTitle;
    serviceName = root.getAttribute("data-vit-service-name")?.trim() || "";
  }

  dispatchVideoPlayOpen({ youtubeId, videoTitle, serviceName });
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

function boot(): void {
  captureUtm();
  observeVideoBlocks();
}

if (typeof window !== "undefined") {
  window.addEventListener(VIDEO_PLAY_OPEN_EVENT, onVideoPlayOpenEvent);

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
    emitVideoPlayOpenFromModal,
    dispatchVideoPlayOpen,
  };
}
