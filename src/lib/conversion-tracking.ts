import { getMontrealTimeParts } from "./montreal-time";
import { isConversionPreviewDebugActive } from "./header-modal-debug";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type ConversionTrackingContext = {
  language: "fr" | "en";
  page_path: string;
  page_url: string;
  availability_status: "available" | "unavailable" | "closed";
  button_location?: string;
  close_method?:
    | "close_button"
    | "escape_key"
    | "outside_click"
    | "call_click"
    | "form_click";
  device_type?: "mobile" | "tablet" | "desktop";
  session_visit_type?: "first_in_tab" | "return_in_tab";
  montreal_time?: string;
  montreal_weekday?: string;
};

function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

let sessionVisitTypeCached: "first_in_tab" | "return_in_tab" | null = null;

function detectSessionVisitType(): "first_in_tab" | "return_in_tab" {
  if (isConversionPreviewDebugActive()) return "first_in_tab";
  if (sessionVisitTypeCached) return sessionVisitTypeCached;
  const key = "empire_conversion_visit_count";
  try {
    const count = Number(sessionStorage.getItem(key) || "0") + 1;
    sessionStorage.setItem(key, String(count));
    sessionVisitTypeCached = count <= 1 ? "first_in_tab" : "return_in_tab";
    return sessionVisitTypeCached;
  } catch {
    sessionVisitTypeCached = "first_in_tab";
    return sessionVisitTypeCached;
  }
}

export function buildConversionTrackingContext(
  overrides: Partial<ConversionTrackingContext> = {},
): ConversionTrackingContext {
  const path = typeof window !== "undefined" ? window.location.pathname || "/" : "/";
  const language: "fr" | "en" = path.startsWith("/en") ? "en" : "fr";
  const montreal = getMontrealTimeParts();

  return {
    language,
    page_path: path,
    page_url: typeof window !== "undefined" ? window.location.href : path,
    availability_status: overrides.availability_status ?? "unavailable",
    device_type: detectDeviceType(),
    session_visit_type: detectSessionVisitType(),
    montreal_time: montreal.time,
    montreal_weekday: montreal.weekday,
    ...overrides,
  };
}

/** Pousse un événement GTM sans modifier les tags existants. */
export function pushConversionEvent(
  event: string,
  overrides: Partial<ConversionTrackingContext> = {},
): void {
  if (typeof window === "undefined") return;

  if (isConversionPreviewDebugActive()) {
    console.debug("[conversion-preview]", {
      debug_mode: true,
      event,
      ...overrides,
    });
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...buildConversionTrackingContext(overrides),
  });
}
