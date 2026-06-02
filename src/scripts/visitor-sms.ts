/**
 * Notifications SMS visiteurs — entrée rapide par page + haute intention.
 * Indépendant du Meta Pixel.
 */

import { getOrCreateSessionId } from "./video-visitor-storage";
import {
  captureSmsTrafficParams,
  getPageLabel,
  getServiceFromPage,
  isMetaRealVisitor,
  isQuickHumanPageView,
  trafficFieldsForPayload,
} from "./sms-client-context";

const TRACK_URL = "/.netlify/functions/track-visit";

const K_PAGE_ENTER = "empire_sms_page_enter_v1";
const K_CALC = "empire_sms_calc_v2";
const K_CALL = "empire_sms_call_v2";
const K_FORM = "empire_sms_form_v2";
const K_FORM_START = "empire_sms_form_start_v2";
const K_CLIENT_NAME = "empire_client_display_name_v2";
const K_LAST_CITY = "empire_vit_last_city_v1";

const PAGE_ENTER_DELAY_MS = 5_000;
const PAGE_ENTER_CLIENT_DEDUP_MS = 90_000;

const ENABLE_FORM_START_SMS = false;

type VisitEvent =
  | "page_enter"
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

function pagePathKey(): string {
  return `${location.pathname}${location.search || ""}`.slice(0, 220);
}

function wasPageEnterSentRecently(path: string): boolean {
  try {
    const raw = sessionStorage.getItem(`${K_PAGE_ENTER}:${path}`);
    if (!raw) return false;
    const sentAt = Number(raw);
    if (!Number.isFinite(sentAt)) return false;
    return Date.now() - sentAt < PAGE_ENTER_CLIENT_DEDUP_MS;
  } catch {
    return false;
  }
}

function markPageEnterSent(path: string): void {
  try {
    sessionStorage.setItem(`${K_PAGE_ENTER}:${path}`, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function notify(
  event: VisitEvent,
  options?: { clientName?: string; dwellSeconds?: number },
): void {
  const storedName = sessionStorage.getItem(K_CLIENT_NAME)?.trim();
  const clientName = options?.clientName?.trim() || storedName || undefined;
  const serviceName = getServiceFromPage();
  const payload: Record<string, unknown> = {
    event,
    pageTitle: cleanPageTitle(),
    pageLabel: getPageLabel(),
    pagePath: pagePathKey(),
    visitorId: getOrCreateSessionId(),
    humanPageView: true,
    isMetaRealVisitor: isMetaRealVisitor(),
  };
  if (serviceName) payload.serviceName = serviceName;
  if (clientName) payload.clientName = clientName;
  if (options?.dwellSeconds !== undefined) {
    payload.dwellSeconds = options.dwellSeconds;
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

let pageEnterTimer: ReturnType<typeof setTimeout> | null = null;
let pageEnterStartedAt = performance.now();

function clearPageEnterTimer(): void {
  if (pageEnterTimer !== null) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
  }
}

function trySendPageEnter(): void {
  if (document.visibilityState !== "visible") return;
  if (!isQuickHumanPageView()) return;

  const path = pagePathKey();
  if (wasPageEnterSentRecently(path)) return;

  const dwellSeconds = Math.max(
    3,
    Math.floor((performance.now() - pageEnterStartedAt) / 1000),
  );

  markPageEnterSent(path);
  notify("page_enter", { dwellSeconds });
}

function schedulePageEnter(): void {
  clearPageEnterTimer();
  pageEnterStartedAt = performance.now();

  pageEnterTimer = window.setTimeout(() => {
    pageEnterTimer = null;
    trySendPageEnter();
  }, PAGE_ENTER_DELAY_MS);
}

function initPageEnterTracking(): void {
  captureSmsTrafficParams();
  schedulePageEnter();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      trySendPageEnter();
    }
  });
}

function initCalculatorOpen(): void {
  window.addEventListener("empire:estimator-open", () => {
    if (sessionStorage.getItem(K_CALC)) return;
    sessionStorage.setItem(K_CALC, "1");
    notify("calculator", {
      dwellSeconds: Math.floor((performance.now() - pageEnterStartedAt) / 1000),
    });
  });
}

function initCallClicks(): void {
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.("a[href^='tel:']");
      if (!a) return;
      if (sessionStorage.getItem(K_CALL)) return;
      sessionStorage.setItem(K_CALL, "1");
      notify("call_click", {
        dwellSeconds: Math.floor((performance.now() - pageEnterStartedAt) / 1000),
      });
    },
    true,
  );
}

function initLeadFormSubmitted(): void {
  window.addEventListener(
    "empire:lead-form-submitted",
    ((e: CustomEvent<{ clientName?: string }>) => {
      if (sessionStorage.getItem(K_FORM)) return;
      sessionStorage.setItem(K_FORM, "1");
      const name = e.detail?.clientName?.trim();
      notify("form_submit", {
        clientName: name,
        dwellSeconds: Math.floor((performance.now() - pageEnterStartedAt) / 1000),
      });
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
  initPageEnterTracking();
  initCalculatorOpen();
  initCallClicks();
  initLeadFormSubmitted();
  initFormStart();
}

function onAstroPageLoad(): void {
  captureSmsTrafficParams();
  pageEnterStartedAt = performance.now();
  schedulePageEnter();
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  document.addEventListener("astro:page-load", onAstroPageLoad);
}
