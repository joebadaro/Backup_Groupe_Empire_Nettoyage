import type { HeaderModalMode } from "../config/headerChoiceModal";

const DEBUG_MODES: HeaderModalMode[] = [
  "weekday_day",
  "weekday_evening",
  "weekend",
  "after_hours",
];

const LEGACY_DEBUG_ALIASES: Record<string, HeaderModalMode> = {
  standard: "weekday_day",
  evening: "weekday_evening",
  after_hours: "after_hours",
};

/** Paramètre `headerModalDebug` actif — DEV uniquement, jamais en production. */
export function getHeaderModalDebugMode(): HeaderModalMode | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;

  const param = new URLSearchParams(window.location.search).get(
    "headerModalDebug",
  );
  if (!param) return null;

  if ((DEBUG_MODES as string[]).includes(param)) {
    return param as HeaderModalMode;
  }

  return LEGACY_DEBUG_ALIASES[param] ?? null;
}

export function isHeaderModalDebugActive(): boolean {
  return getHeaderModalDebugMode() !== null;
}

/** Pop-up auto uniquement en semaine soirée ou fin de semaine disponible. */
export function shouldDebugAutoShowAfterHoursPopup(): boolean {
  const mode = getHeaderModalDebugMode();
  return mode === "weekday_evening" || mode === "weekend";
}

/** Tous les modes de prévisualisation locale (modale + pop-up). */
export function isConversionPreviewDebugActive(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("headerModalDebug") || params.has("ahPopupDebug");
}
