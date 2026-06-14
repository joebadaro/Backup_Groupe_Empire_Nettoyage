import {
  HEADER_CHOICE_PHONE,
  PRIMARY_CALL_BUTTON,
} from "../config/headerChoiceModal";

export function getPrimaryCallButtonLabels(locale: "fr" | "en") {
  const action = PRIMARY_CALL_BUTTON[locale].action;
  const phone = HEADER_CHOICE_PHONE.display;
  return {
    action,
    phone,
    ariaLabel: `${action}, ${phone}`,
  };
}

export function applyPrimaryCallButtonLabels(
  root: HTMLElement | null,
  actionEl: HTMLElement | null,
  phoneEl: HTMLElement | null,
  locale: "fr" | "en",
): void {
  const labels = getPrimaryCallButtonLabels(locale);
  if (actionEl) actionEl.textContent = labels.action;
  if (phoneEl) phoneEl.textContent = labels.phone;
  if (root) root.setAttribute("aria-label", labels.ariaLabel);
}
