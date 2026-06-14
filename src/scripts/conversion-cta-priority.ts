import {
  CONVERSION_CTA_COPY,
  AFTER_HOURS_POPUP_SCHEDULE,
} from "../config/afterHoursPhonePopup";
import { pushConversionEvent } from "../lib/conversion-tracking";
import { getMontrealTimeParts, isWithinDaySchedule } from "../lib/montreal-time";

/** Sélecteur explicite — uniquement les groupes marqués côté serveur. */
export const CONVERSION_CTA_PRIORITY_SELECTOR = ".conversion-cta-priority";

function getAvailabilityStatus(): "available" | "unavailable" {
  const parts = getMontrealTimeParts();
  const schedule = AFTER_HOURS_POPUP_SCHEDULE[parts.weekday];
  if (!schedule) return "unavailable";
  return isWithinDaySchedule(schedule, parts) ? "available" : "unavailable";
}

function bindConversionGroup(group: Element): void {
  if (group.getAttribute("data-conversion-bound") === "1") return;

  const telLink = group.querySelector<HTMLAnchorElement>(
    "a.conversion-cta-primary[href^='tel:']",
  );
  const estimateControl = group.querySelector<HTMLElement>(
    "[data-conversion-estimate-trigger], .conversion-cta-secondary",
  );

  if (!telLink || !estimateControl) return;

  group.setAttribute("data-conversion-bound", "1");

  const location =
    telLink.dataset.conversionLocation ||
    estimateControl.dataset.conversionLocation ||
    "cta_group";

  telLink.addEventListener("click", () => {
    pushConversionEvent("main_call_button_click", {
      availability_status: getAvailabilityStatus(),
      button_location: location,
    });
  });

  estimateControl.addEventListener("click", (event) => {
    pushConversionEvent("secondary_estimate_form_click", {
      availability_status: getAvailabilityStatus(),
      button_location: location,
    });

    if (estimateControl instanceof HTMLButtonElement) {
      event.preventDefault();
      if (typeof window.openEstimationWidget === "function") {
        window.openEstimationWidget();
      }
    }
  });
}

function initConversionCtaPriority(): void {
  if ((window.location.pathname || "/").startsWith("/admin")) return;

  document
    .querySelectorAll(CONVERSION_CTA_PRIORITY_SELECTOR)
    .forEach((group) => bindConversionGroup(group));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initConversionCtaPriority);
} else {
  initConversionCtaPriority();
}

declare global {
  interface Window {
    openEstimationWidget?: () => void;
  }
}

export {};
