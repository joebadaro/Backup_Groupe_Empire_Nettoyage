import type { DaySchedule, WeekdayKey } from "../config/afterHoursPhonePopup";
import { AFTER_HOURS_TIMEZONE } from "../config/afterHoursPhonePopup";

const WEEKDAY_TO_KEY: Record<string, WeekdayKey> = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday",
};

export type MontrealTimeParts = {
  weekday: WeekdayKey;
  hour: number;
  minute: number;
  /** HH:mm (24 h) */
  time: string;
  /** ISO-like local string for analytics */
  localLabel: string;
};

export function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(":").map((part) => Number(part));
  return h * 60 + m;
}

/** Heure civile actuelle à Montréal (America/Montreal), indépendante du fuseau du visiteur. */
export function getMontrealTimeParts(date = new Date()): MontrealTimeParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: AFTER_HOURS_TIMEZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekdayRaw = pick("weekday").toLowerCase();
  const weekday = WEEKDAY_TO_KEY[weekdayRaw];
  if (!weekday) {
    throw new Error(`Unknown Montreal weekday: ${weekdayRaw}`);
  }

  const hour = Number(pick("hour"));
  const minute = Number(pick("minute"));
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    weekday,
    hour,
    minute,
    time: `${pad(hour)}:${pad(minute)}`,
    localLabel: `${weekdayRaw} ${pad(hour)}:${pad(minute)}`,
  };
}

export function isWithinDaySchedule(
  schedule: DaySchedule,
  parts: MontrealTimeParts,
): boolean {
  const now = parts.hour * 60 + parts.minute;
  const start = parseTimeToMinutes(schedule.start);
  const end = parseTimeToMinutes(schedule.end);
  return now >= start && now <= end;
}
