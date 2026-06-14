import type { WeekdayKey } from "../config/afterHoursPhonePopup";
import { HEADER_MODAL_AVAILABILITY } from "../config/headerChoiceModal";
import { getHeaderModalDebugMode } from "./header-modal-debug";
import {
  getMontrealTimeParts,
  parseTimeToMinutes,
  type MontrealTimeParts,
} from "./montreal-time";

export type HeaderModalMode =
  | "weekday_day"
  | "weekday_evening"
  | "weekend"
  | "after_hours";

/** Modes du pop-up automatique (uniquement pendant les heures disponibles). */
export type AutoPopupMode = "weekday_evening" | "weekend";

type DayWindow = {
  start: string;
  end: string;
  eveningStart?: string;
};

function getDayWindow(weekday: WeekdayKey): DayWindow {
  if (weekday === "saturday") return HEADER_MODAL_AVAILABILITY.saturday;
  if (weekday === "sunday") return HEADER_MODAL_AVAILABILITY.sunday;
  return HEADER_MODAL_AVAILABILITY.weekday;
}

function isWeekend(weekday: WeekdayKey): boolean {
  return weekday === "saturday" || weekday === "sunday";
}

function isWithinWindow(parts: MontrealTimeParts, window: DayWindow): boolean {
  const now = parts.hour * 60 + parts.minute;
  const start = parseTimeToMinutes(window.start);
  const end = parseTimeToMinutes(window.end);
  return now >= start && now <= end;
}

function getGlobalEndMinutes(): number {
  return parseTimeToMinutes(HEADER_MODAL_AVAILABILITY.weekday.end);
}

/**
 * Priorité modale manuelle :
 * 1. after_hours; 2. weekend; 3. weekday_evening; 4. weekday_day.
 */
export function resolveHeaderModalMode(parts: MontrealTimeParts): HeaderModalMode {
  const window = getDayWindow(parts.weekday);

  if (!isWithinWindow(parts, window)) {
    return "after_hours";
  }

  if (isWeekend(parts.weekday)) {
    return "weekend";
  }

  const now = parts.hour * 60 + parts.minute;
  const eveningStart = parseTimeToMinutes(
    window.eveningStart ?? HEADER_MODAL_AVAILABILITY.weekday.eveningStart,
  );

  if (now >= eveningStart) {
    return "weekday_evening";
  }

  return "weekday_day";
}

/**
 * Pop-up automatique uniquement pendant les heures disponibles :
 * - lun–ven 16 h–21 h → weekday_evening;
 * - sam–dim 9 h–21 h → weekend;
 * - sinon → null (aucun pop-up, y compris après fermeture).
 */
export function resolveAutoPopupMode(
  parts: MontrealTimeParts,
): AutoPopupMode | null {
  const now = parts.hour * 60 + parts.minute;
  const globalEnd = getGlobalEndMinutes();

  if (now > globalEnd) {
    return null;
  }

  if (isWeekend(parts.weekday)) {
    const weekendStart = parseTimeToMinutes(
      HEADER_MODAL_AVAILABILITY.saturday.start,
    );
    if (now < weekendStart) {
      return null;
    }
    return "weekend";
  }

  const weekday = HEADER_MODAL_AVAILABILITY.weekday;
  const weekdayStart = parseTimeToMinutes(weekday.start);
  if (now < weekdayStart) {
    return null;
  }

  const eveningStart = parseTimeToMinutes(weekday.eveningStart);
  if (now >= eveningStart) {
    return "weekday_evening";
  }

  return null;
}

export function getHeaderModalMode(date = new Date()): HeaderModalMode {
  const debugMode = getHeaderModalDebugMode();
  if (debugMode) return debugMode;

  const parts = getMontrealTimeParts(date);
  return resolveHeaderModalMode(parts);
}

export function getAutoPopupMode(date = new Date()): AutoPopupMode | null {
  const debugMode = getHeaderModalDebugMode();
  if (debugMode) {
    if (debugMode === "weekday_evening" || debugMode === "weekend") {
      return debugMode;
    }
    return null;
  }

  const parts = getMontrealTimeParts(date);
  return resolveAutoPopupMode(parts);
}

export function getAvailabilityStatusForMode(
  mode: HeaderModalMode,
): "available" | "unavailable" | "closed" {
  if (mode === "after_hours") return "closed";
  return "available";
}

export function getAvailabilityStatusForAutoPopup(
  _mode: AutoPopupMode,
): "available" {
  return "available";
}
