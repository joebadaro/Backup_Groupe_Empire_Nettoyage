import { AFTER_HOURS_POPUP_DELAY_MS, AFTER_HOURS_SESSION_INACTIVITY_MS } from "../config/afterHoursPhonePopup";
import { AUTO_POPUP_COPY, HEADER_CHOICE_PHONE } from "../config/headerChoiceModal";
import { navigateToEstimateForm } from "../lib/estimate-navigation";
import { applyPrimaryCallButtonLabels } from "../lib/primary-call-button-labels";
import {
  getAutoPopupMode,
  getAvailabilityStatusForAutoPopup,
  type AutoPopupMode,
} from "../lib/header-modal-availability";
import {
  isHeaderModalDebugActive,
  shouldDebugAutoShowAfterHoursPopup,
} from "../lib/header-modal-debug";
import {
  canAutoShowAfterHoursPopup,
  isHeaderChoiceModalOpen,
  notifyAfterHoursPopupClosed,
  notifyAfterHoursPopupOpen,
  registerAfterHoursController,
} from "../lib/modal-coordination";
import { pushConversionEvent } from "../lib/conversion-tracking";
import {
  bindTelCallLinkHandoff,
  focusModalPanel,
} from "../lib/tel-link-handoff";

const ROOT_ID = "after-hours-phone-popup";
const SESSION_SHOWN_KEY = "empire_ah_popup_shown";
const LAST_ACTIVITY_KEY = "empire_ah_popup_activity";

type CloseMethod =
  | "close_button"
  | "escape_key"
  | "outside_click"
  | "call_click"
  | "form_click";

type PopupCopyKey = "weekdayEvening" | "weekend";

const POPUP_COPY_KEY: Record<AutoPopupMode, PopupCopyKey> = {
  weekday_evening: "weekdayEvening",
  weekend: "weekend",
};

let showTimer: ReturnType<typeof setTimeout> | null = null;
let previouslyFocused: HTMLElement | null = null;
let eventsBound = false;
let currentPopupMode: AutoPopupMode = "weekday_evening";

function isAhPopupDebugParam(): boolean {
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(window.location.search).has("ahPopupDebug");
}

function isEnglishPage(): boolean {
  return (window.location.pathname || "/").startsWith("/en");
}

function setHidden(el: HTMLElement | null, hidden: boolean): void {
  if (!el) return;
  el.hidden = hidden;
  el.style.display = hidden ? "none" : "";
}

function applyPopupContent(mode: AutoPopupMode): void {
  currentPopupMode = mode;
  const locale = isEnglishPage() ? "en" : "fr";
  const copyKey = POPUP_COPY_KEY[mode];
  const copy = AUTO_POPUP_COPY[locale][copyKey];

  const title = document.getElementById("ah-popup-title");
  const body = document.getElementById("ah-popup-body");
  const hoursLine = document.getElementById("ah-popup-hours-line");
  const primaryCall = document.getElementById("ah-popup-primary-call");
  const primaryCallAction = document.getElementById("ah-popup-primary-call-action");
  const primaryCallPhone = document.getElementById("ah-popup-primary-call-phone");
  const secondaryForm = document.getElementById("ah-popup-secondary-form");
  const secondaryFormLabel = document.getElementById("ah-popup-secondary-form-label");
  const primaryForm = document.getElementById("ah-popup-primary-form");
  const secondaryPhone = document.getElementById("ah-popup-secondary-phone");

  setHidden(primaryCall, true);
  setHidden(primaryForm, true);
  setHidden(secondaryForm, true);
  setHidden(secondaryPhone, true);

  title && (title.textContent = copy.title);
  body && (body.textContent = copy.body);

  if (hoursLine && "hoursLine" in copy) {
    hoursLine.textContent = copy.hoursLine;
    setHidden(hoursLine, false);
  } else {
    setHidden(hoursLine, true);
  }

  setHidden(primaryCall, false);
  setHidden(secondaryForm, false);

  if (primaryCall) {
    primaryCall.setAttribute("href", `tel:${HEADER_CHOICE_PHONE.telHref}`);
  }
  applyPrimaryCallButtonLabels(
    primaryCall,
    primaryCallAction,
    primaryCallPhone,
    locale,
  );
  secondaryFormLabel &&
    (secondaryFormLabel.textContent = copy.secondaryForm);
}

function shouldScheduleAutoPopup(): boolean {
  if (isHeaderModalDebugActive()) {
    return shouldDebugAutoShowAfterHoursPopup();
  }
  if (isAhPopupDebugParam()) return true;
  return getAutoPopupMode() !== null;
}

function shouldSkipPage(): boolean {
  const path = window.location.pathname || "/";
  return path.startsWith("/admin");
}

function touchSessionActivity(): void {
  if (isHeaderModalDebugActive() || isAhPopupDebugParam()) return;
  try {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function canShowThisSession(): boolean {
  if (isHeaderModalDebugActive() || isAhPopupDebugParam()) return true;

  try {
    const now = Date.now();
    const lastActivity = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY) || "0");
    if (
      lastActivity &&
      now - lastActivity > AFTER_HOURS_SESSION_INACTIVITY_MS
    ) {
      sessionStorage.removeItem(SESSION_SHOWN_KEY);
    }
    touchSessionActivity();
    return sessionStorage.getItem(SESSION_SHOWN_KEY) !== "1";
  } catch {
    return true;
  }
}

function markSessionShown(): void {
  if (isHeaderModalDebugActive() || isAhPopupDebugParam()) return;

  try {
    sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
    touchSessionActivity();
  } catch {
    /* ignore */
  }
}

function getPopupDelayMs(): number {
  return AFTER_HOURS_POPUP_DELAY_MS;
}

function getRoot(): HTMLElement | null {
  return document.getElementById(ROOT_ID);
}

function getPanel(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>(".ah-phone-popup__panel");
}

function getFocusableElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("hidden") && el.offsetParent !== null);
}

function trapFocus(panel: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== "Tab") return;
  const focusable = getFocusableElements(panel);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function closePopupInternal(trackEvent: boolean, method?: CloseMethod): void {
  const root = getRoot();
  if (!root || root.hidden) return;

  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  notifyAfterHoursPopupClosed();

  if (trackEvent && method) {
    pushConversionEvent("phone_popup_close", {
      availability_status: getAvailabilityStatusForAutoPopup(currentPopupMode),
      button_location: "after_hours_popup",
      close_method: method,
    });
  }

  if (previouslyFocused && typeof previouslyFocused.focus === "function") {
    previouslyFocused.focus();
  }
  previouslyFocused = null;
}

function closePopup(method: CloseMethod): void {
  closePopupInternal(true, method);
}

function closePopupSilent(): void {
  closePopupInternal(false);
}

function cancelScheduledPopup(): void {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
}

function resolvePopupModeForOpen(): AutoPopupMode | null {
  if (isHeaderModalDebugActive()) {
    return getAutoPopupMode();
  }
  if (isAhPopupDebugParam()) {
    return getAutoPopupMode() ?? "weekday_evening";
  }
  return getAutoPopupMode();
}

function openPopup(): void {
  if (isHeaderChoiceModalOpen() || !canAutoShowAfterHoursPopup()) return;

  const mode = resolvePopupModeForOpen();
  if (!mode) return;

  const root = getRoot();
  const panel = root ? getPanel(root) : null;
  if (!root || !panel) return;

  applyPopupContent(mode);
  markSessionShown();
  previouslyFocused = document.activeElement as HTMLElement | null;

  root.hidden = false;
  root.setAttribute("aria-hidden", "false");
  notifyAfterHoursPopupOpen();

  pushConversionEvent("phone_popup_view", {
    availability_status: getAvailabilityStatusForAutoPopup(mode),
    button_location: "after_hours_popup",
  });

  focusModalPanel(panel);
}

function bindPopupEvents(root: HTMLElement): void {
  if (eventsBound) return;
  eventsBound = true;

  const panel = getPanel(root);
  if (!panel) return;

  bindTelCallLinkHandoff(
    document.getElementById("ah-popup-primary-call"),
    () =>
      pushConversionEvent("phone_popup_call_click", {
        availability_status: getAvailabilityStatusForAutoPopup(currentPopupMode),
        button_location: "after_hours_popup",
      }),
    () => closePopup("call_click"),
  );

  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePopup("escape_key");
      return;
    }
    trapFocus(panel, event);
  });

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const closeEl = target.closest<HTMLElement>("[data-ah-close]");
    if (closeEl) {
      const method = (closeEl.dataset.ahClose || "close_button") as CloseMethod;
      closePopup(method === "outside" ? "outside_click" : method);
      return;
    }

    const callEl = target.closest<HTMLElement>('[data-ah-action="call"]');
    if (callEl) {
      return;
    }

    const formEl = target.closest<HTMLElement>('[data-ah-action="form"]');
    if (formEl) {
      pushConversionEvent("phone_popup_form_click", {
        availability_status: getAvailabilityStatusForAutoPopup(currentPopupMode),
        button_location: "after_hours_popup",
      });
      closePopup("form_click");
      navigateToEstimateForm();
    }
  });
}

function schedulePopupIfEligible(): void {
  if (shouldSkipPage()) return;
  if (!shouldScheduleAutoPopup()) return;
  if (!canShowThisSession()) return;

  const root = getRoot();
  if (!root) return;

  bindPopupEvents(root);

  if (showTimer) clearTimeout(showTimer);
  showTimer = setTimeout(() => {
    if (!canAutoShowAfterHoursPopup() || isHeaderChoiceModalOpen()) return;
    openPopup();
  }, getPopupDelayMs());
}

function initAfterHoursPhonePopup(): void {
  registerAfterHoursController({
    closeSilent: closePopupSilent,
    cancelTimer: cancelScheduledPopup,
    isOpen: () => {
      const root = getRoot();
      return root != null && !root.hidden;
    },
  });

  if (!isHeaderModalDebugActive() && !isAhPopupDebugParam()) {
    touchSessionActivity();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") touchSessionActivity();
  });
  schedulePopupIfEligible();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAfterHoursPhonePopup);
} else {
  initAfterHoursPhonePopup();
}

export {};
