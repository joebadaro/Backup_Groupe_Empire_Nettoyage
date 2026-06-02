/**
 * Notifications SMS — haute intention prioritaire.
 * SMS « page visitée / visiteur probable » : désactivés sauf visiteur fortement engagé (rare).
 * Filtrage bots / Meta Ads côté client + serveur. Indépendant du Meta Pixel.
 */

import { getOrCreateSessionId } from "./video-visitor-storage";
import {
  captureSmsTrafficParams,
  evaluateStrongEngagement,
  readSmsTrafficContext,
  trafficFieldsForPayload,
} from "./sms-client-context";

const TRACK_URL = "/.netlify/functions/track-visit";

const K_ENGAGED = "empire_sms_engaged_v1";
const K_CALC = "empire_sms_calc_v2";
const K_LEAD = "empire_sms_lead_v2";
const K_FORM_START = "empire_sms_form_start_v2";
const K_CLIENT_NAME = "empire_client_display_name_v2";
const K_LAST_CITY = "empire_vit_last_city_v1";

/** SMS au simple chargement de page — désactivé */
const ENABLE_LEGACY_FIRST_VISIT_SMS = false;
/** SMS visiteur engagé (temps + scroll + clic) — activé mais strict */
const ENABLE_ENGAGED_VISIT_SMS = true;

const ENABLE_FORM_START_SMS = false;

type VisitEvent =
  | "first_visit"
  | "engaged_visit"
  | "calculator"
  | "call_click"
  | "form_start"
  | "form_submit";

function cleanPageTitle(): string {
  let t = document.title || "";
  const pipe = t.indexOf("|");
  if (pipe > 0) t = t.slice(0, pipe).trim();
  return t.trim() || document.location.pathname || "Page";
}

function setLastKnownCity(city: string): void {
  const c = (city || "").trim();
  if (!c || c.toLowerCase() === "inconnue") return;
  try {
    sessionStorage.setItem(K_LAST_CITY, c);
  } catch {
    /* ignore */
  }
}

function sendVisitBeacon(payload: Record<string, unknown>): void {
  const body = JSON.stringify({
    ...trafficFieldsForPayload(),
    ...payload,
  });
  void fetch(TRACK_URL, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body,
  })
    .then((res) => res.json())
    .then((data: { city?: string }) => {
      if (data?.city) setLastKnownCity(data.city);
    })
    .catch(() => {});
}

function isVideoIntentServicePage(): boolean {
  return !!document.querySelector("[data-vit-track]");
}

function notify(
  event: VisitEvent,
  options?: {
    clientName?: string;
    engagement?: ReturnType<typeof evaluateStrongEngagement>;
  },
): void {
  const storedName = sessionStorage.getItem(K_CLIENT_NAME)?.trim();
  const clientName = options?.clientName?.trim() || storedName || undefined;
  const payload: Record<string, unknown> = {
    event,
    pageTitle: cleanPageTitle(),
    pagePath: `${location.pathname}${location.search || ""}`.slice(0, 220),
    visitorId: getOrCreateSessionId(),
  };
  if (clientName) payload.clientName = clientName;

  if (event === "engaged_visit" && options?.engagement) {
    payload.strongEngagement = options.engagement.strongEngagement;
    payload.dwellSeconds = options.engagement.dwellSeconds;
    payload.scrollPx = options.engagement.scrollPx;
    payload.hasClick = options.engagement.hasClick;
  }

  sendVisitBeacon(payload);
}

function rememberClientNameFromInputs(): void {
  const sync = (): void => {
    const a = document.getElementById("input-name") as HTMLInputElement | null;
    const b = document.getElementById("mobile-input-name") as HTMLInputElement | null;
    const v = ((a?.value || b?.value) ?? "").trim();
    if (v) sessionStorage.setItem(K_CLIENT_NAME, v);
  };
  document.addEventListener(
    "blur",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.id === "input-name" || t.id === "mobile-input-name") sync();
    },
    true,
  );
}

const pageLoadedAt = performance.now();
let maxScrollPx = 0;
let meaningfulClick = false;
let engagedSmsSent = false;

function updateScroll(): void {
  maxScrollPx = Math.max(maxScrollPx, window.scrollY);
}

function trySendEngagedVisit(): void {
  if (!ENABLE_ENGAGED_VISIT_SMS || engagedSmsSent) return;
  if (sessionStorage.getItem(K_ENGAGED)) return;
  if (isVideoIntentServicePage()) return;
  if (document.visibilityState !== "visible") return;
  if (navigator.webdriver) return;

  const traffic = readSmsTrafficContext();
  const engagement = evaluateStrongEngagement(
    performance.now() - pageLoadedAt,
    maxScrollPx,
    meaningfulClick,
    traffic.isMetaTraffic,
  );

  if (!engagement.strongEngagement) return;

  engagedSmsSent = true;
  sessionStorage.setItem(K_ENGAGED, "1");
  notify("engaged_visit", { engagement });
}

function initEngagementTracking(): void {
  captureSmsTrafficParams();

  window.addEventListener("scroll", updateScroll, { passive: true });

  document.addEventListener(
    "click",
    (e) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("a[href^='tel:']")) return;
      meaningfulClick = true;
      trySendEngagedVisit();
    },
    true,
  );

  window.setInterval(() => {
    updateScroll();
    trySendEngagedVisit();
  }, 5_000);
}

function initCalculatorOpen(): void {
  window.addEventListener("empire:estimator-open", () => {
    if (sessionStorage.getItem(K_CALC)) return;
    sessionStorage.setItem(K_CALC, "1");
    notify("calculator");
  });
}

function initCallClicks(): void {
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.("a[href^='tel:']");
      if (!a) return;
      if (sessionStorage.getItem(K_LEAD)) return;
      sessionStorage.setItem(K_LEAD, "call");
      notify("call_click");
    },
    true,
  );
}

function initLeadFormSubmitted(): void {
  window.addEventListener(
    "empire:lead-form-submitted",
    ((e: CustomEvent<{ clientName?: string }>) => {
      if (sessionStorage.getItem(K_LEAD)) return;
      sessionStorage.setItem(K_LEAD, "form");
      const name = e.detail?.clientName?.trim();
      notify("form_submit", { clientName: name });
    }) as EventListener,
  );
}

function initFormStart(): void {
  if (!ENABLE_FORM_START_SMS) return;

  document.addEventListener(
    "focusin",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const formRoot =
        t.closest("#contact-form") ||
        t.closest("#commercial-request-form") ||
        t.closest("#mobile-contact-form-container");
      if (!formRoot) return;
      if (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA") return;

      if (sessionStorage.getItem(K_FORM_START)) return;
      sessionStorage.setItem(K_FORM_START, "1");
      notify("form_start");
    },
    true,
  );
}

function boot(): void {
  rememberClientNameFromInputs();
  initEngagementTracking();
  initCalculatorOpen();
  initCallClicks();
  initLeadFormSubmitted();
  initFormStart();

  if (ENABLE_LEGACY_FIRST_VISIT_SMS) {
    /* conservé pour tests manuels uniquement — SMS_LEGACY_PAGE_VIEW=true côté serveur */
  }
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  document.addEventListener("astro:page-load", () => {
    maxScrollPx = 0;
    meaningfulClick = false;
    engagedSmsSent = false;
    captureSmsTrafficParams();
  });
}
