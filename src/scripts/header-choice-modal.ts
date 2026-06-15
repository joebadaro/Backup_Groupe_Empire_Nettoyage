import {
  HEADER_CHOICE_MODAL_COPY,
  HEADER_CHOICE_PHONE,
} from "../config/headerChoiceModal";
import { navigateToEstimateForm } from "../lib/estimate-navigation";
import { applyPrimaryCallButtonLabels } from "../lib/primary-call-button-labels";
import {
  getAvailabilityStatusForMode,
  getHeaderModalMode,
  type HeaderModalMode,
} from "../lib/header-modal-availability";
import {
  notifyHeaderChoiceModalClosed,
  notifyHeaderChoiceModalOpening,
} from "../lib/modal-coordination";
import { pushConversionEvent } from "../lib/conversion-tracking";
import {
  focusModalForKeyboard,
  trackTelClickAndDeferClose,
} from "../lib/tel-link-handoff";

const ROOT_ID = "header-choice-modal";
const TRIGGER_ID = "btn-open-estimation";
const MOBILE_TRIGGER_ID = "btn-mobile-representative";

type CloseMethod =
  | "close_button"
  | "escape_key"
  | "outside_click"
  | "call_click"
  | "form_click";

let previouslyFocused: HTMLElement | null = null;
let eventsBound = false;
let currentMode: HeaderModalMode = "weekday_day";

function isEnglishPage(): boolean {
  return (window.location.pathname || "/").startsWith("/en");
}

function getCopy() {
  const locale = isEnglishPage() ? "en" : "fr";
  return HEADER_CHOICE_MODAL_COPY[locale];
}

function getRoot(): HTMLElement | null {
  return document.getElementById(ROOT_ID);
}

function getPanel(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>(".header-choice-modal__panel");
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

function setHidden(el: HTMLElement | null, hidden: boolean): void {
  if (!el) return;
  el.hidden = hidden;
  el.style.display = hidden ? "none" : "";
  if (hidden) {
    el.setAttribute("aria-hidden", "true");
  } else {
    el.removeAttribute("aria-hidden");
  }
}

function formatBodyText(
  modeCopy: {
    body: string;
    secondaryLine?: string;
  },
): string {
  if (!modeCopy.secondaryLine) return modeCopy.body;
  return `${modeCopy.body} ${modeCopy.secondaryLine}`;
}

function applyModalContent(mode: HeaderModalMode): void {
  currentMode = mode;
  const copy = getCopy();

  const title = document.getElementById("header-choice-modal-title");
  const body = document.getElementById("header-choice-modal-body");
  const primaryCall = document.getElementById("header-choice-modal-primary-call");
  const primaryCallAction = document.getElementById(
    "header-choice-modal-primary-call-action",
  );
  const primaryCallPhone = document.getElementById(
    "header-choice-modal-primary-call-phone",
  );
  const secondaryForm = document.getElementById("header-choice-modal-secondary-form");
  const secondaryFormLabel = document.getElementById("header-choice-modal-secondary-form-label");

  setHidden(primaryCall, true);
  setHidden(secondaryForm, true);

  if (mode === "after_hours") {
    const afterHours = copy.afterHours;
    title && (title.textContent = afterHours.title);
    body && (body.textContent = "");
    setHidden(body, true);

    setHidden(primaryCall, false);
    setHidden(secondaryForm, false);

    if (primaryCall) {
      primaryCall.setAttribute("href", `tel:${HEADER_CHOICE_PHONE.telHref}`);
    }
    applyPrimaryCallButtonLabels(
      primaryCall,
      primaryCallAction,
      primaryCallPhone,
      isEnglishPage() ? "en" : "fr",
    );
    secondaryFormLabel &&
      (secondaryFormLabel.textContent = afterHours.secondaryForm);
    return;
  }

  setHidden(body, false);

  const availableCopy =
    mode === "weekday_day"
      ? copy.weekdayDay
      : mode === "weekday_evening"
        ? copy.weekdayEvening
        : copy.weekend;

  title && (title.textContent = availableCopy.title);
  body && (body.textContent = formatBodyText(availableCopy));

  setHidden(primaryCall, false);
  setHidden(secondaryForm, false);

  if (primaryCall) {
    primaryCall.setAttribute("href", `tel:${HEADER_CHOICE_PHONE.telHref}`);
  }
  applyPrimaryCallButtonLabels(
    primaryCall,
    primaryCallAction,
    primaryCallPhone,
    isEnglishPage() ? "en" : "fr",
  );
  secondaryFormLabel &&
    (secondaryFormLabel.textContent = availableCopy.secondaryForm);
}

function closeModal(method: CloseMethod): void {
  const root = getRoot();
  if (!root || root.hidden) return;

  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  notifyHeaderChoiceModalClosed();

  pushConversionEvent("header_choice_modal_close", {
    availability_status: getAvailabilityStatusForMode(currentMode),
    button_location: "header_choice_modal",
    close_method: method,
  });

  if (previouslyFocused && typeof previouslyFocused.focus === "function") {
    previouslyFocused.focus();
  }
  previouslyFocused = null;
}

export function openHeaderChoiceModal(): void {
  const root = getRoot();
  const panel = root ? getPanel(root) : null;
  if (!root || !panel) return;

  notifyHeaderChoiceModalOpening();

  const mode = getHeaderModalMode();
  applyModalContent(mode);

  previouslyFocused = document.activeElement as HTMLElement | null;
  root.hidden = false;
  root.setAttribute("aria-hidden", "false");

  pushConversionEvent("header_choice_modal_view", {
    availability_status: getAvailabilityStatusForMode(mode),
    button_location: "header_choice_modal",
  });

  focusModalForKeyboard(panel, "header-choice-modal-primary-call");
}

function bindModalEvents(root: HTMLElement): void {
  if (eventsBound) return;
  eventsBound = true;

  const panel = getPanel(root);
  if (!panel) return;

  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal("escape_key");
      return;
    }
    trapFocus(panel, event);
  });

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const closeEl = target.closest<HTMLElement>("[data-hcm-close]");
    if (closeEl) {
      const raw = closeEl.dataset.hcmClose || "close_button";
      closeModal(raw === "outside" ? "outside_click" : (raw as CloseMethod));
      return;
    }

    const actionEl = target.closest<HTMLElement>("[data-hcm-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.hcmAction;
    const trackingBase = {
      availability_status: getAvailabilityStatusForMode(currentMode),
      button_location: "header_choice_modal",
    };

    if (action === "call") {
      trackTelClickAndDeferClose(
        () => pushConversionEvent("header_choice_call_click", trackingBase),
        () => closeModal("call_click"),
      );
      return;
    }

    if (action === "form") {
      pushConversionEvent("header_choice_form_click", trackingBase);
      closeModal("form_click");
      navigateToEstimateForm();
      return;
    }
  });
}

function handleHeaderChoiceTriggerFromUser(): void {
  pushConversionEvent("header_call_cta_click", {
    availability_status: getAvailabilityStatusForMode(getHeaderModalMode()),
    button_location: "header_red_cta",
  });
  openHeaderChoiceModal();
}

function handleMobileRepresentativeTriggerFromUser(): void {
  pushConversionEvent("mobile_representative_cta_click", {
    availability_status: getAvailabilityStatusForMode(getHeaderModalMode()),
    button_location: "mobile_sticky_representative",
  });
  openHeaderChoiceModal();
}

function onHeaderTriggerClick(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  handleHeaderChoiceTriggerFromUser();
}

function onMobileRepresentativeClick(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  handleMobileRepresentativeTriggerFromUser();
}

export function bindHeaderChoiceTrigger(trigger: HTMLElement | null): void {
  if (!trigger || trigger.dataset.headerChoiceBound === "1") return;
  trigger.dataset.headerChoiceBound = "1";
  trigger.addEventListener("click", onHeaderTriggerClick);
}

export function bindMobileRepresentativeTrigger(
  trigger: HTMLElement | null,
): void {
  if (!trigger || trigger.dataset.headerChoiceBound === "1") return;
  trigger.dataset.headerChoiceBound = "1";
  trigger.addEventListener("click", onMobileRepresentativeClick);
}

function flushPendingHeaderChoiceOpen(): void {
  if (window.__headerChoiceModalPending) {
    window.__headerChoiceModalPending = false;
    handleHeaderChoiceTriggerFromUser();
    return;
  }
  if (window.__mobileRepresentativeModalPending) {
    window.__mobileRepresentativeModalPending = false;
    handleMobileRepresentativeTriggerFromUser();
  }
}

function initHeaderChoiceModal(): void {
  if ((window.location.pathname || "/").startsWith("/admin")) return;

  const trigger = document.getElementById(TRIGGER_ID);
  const mobileTrigger = document.getElementById(MOBILE_TRIGGER_ID);
  const root = getRoot();
  if (!root) return;

  bindModalEvents(root);
  bindHeaderChoiceTrigger(trigger);
  bindMobileRepresentativeTrigger(mobileTrigger);

  window.__openHeaderChoiceModal = handleHeaderChoiceTriggerFromUser;
  window.__openMobileRepresentativeModal =
    handleMobileRepresentativeTriggerFromUser;
  flushPendingHeaderChoiceOpen();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeaderChoiceModal);
} else {
  initHeaderChoiceModal();
}

declare global {
  interface Window {
    __openHeaderChoiceModal?: () => void;
    __openMobileRepresentativeModal?: () => void;
    __headerChoiceModalPending?: boolean;
    __mobileRepresentativeModalPending?: boolean;
  }
}

export {};
