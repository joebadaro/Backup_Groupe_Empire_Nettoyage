/**
 * Vérification locale de la logique horaire Montréal (sans dépendance test runner).
 * Usage: node scripts/verify-montreal-time.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schedule = {
  monday: { start: "08:00", end: "21:00" },
  tuesday: { start: "08:00", end: "21:00" },
  wednesday: { start: "08:00", end: "21:00" },
  thursday: { start: "08:00", end: "21:00" },
  friday: { start: "08:00", end: "21:00" },
  saturday: { start: "09:00", end: "21:00" },
  sunday: { start: "09:00", end: "21:00" },
};

const WEEKDAY_TO_KEY = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday",
};

function getMontrealTimeParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montreal",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const pick = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayRaw = pick("weekday").toLowerCase();
  const weekday = WEEKDAY_TO_KEY[weekdayRaw];
  const hour = Number(pick("hour"));
  const minute = Number(pick("minute"));
  return { weekday, hour, minute, time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

function parseTimeToMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function isWithinDaySchedule(daySchedule, parts) {
  const now = parts.hour * 60 + parts.minute;
  const start = parseTimeToMinutes(daySchedule.start);
  const end = parseTimeToMinutes(daySchedule.end);
  return now >= start && now <= end;
}

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL: ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK: ${name}`);
}

const cases = [
  { label: "07:59 mercredi — hors plage", date: "2026-05-27T11:59:00Z", expect: false },
  { label: "08:00 mercredi — début plage", date: "2026-05-27T12:00:00Z", expect: true },
  { label: "15:59 mercredi — dans plage", date: "2026-05-27T19:59:00Z", expect: true },
  { label: "21:00 mercredi — fin plage", date: "2026-05-28T01:00:00Z", expect: true },
  { label: "21:01 mercredi — après plage", date: "2026-05-28T01:01:00Z", expect: false },
  { label: "17:00 dimanche — actif", date: "2026-05-24T21:00:00Z", expect: true },
  { label: "DST printemps 16h EDT", date: "2026-03-09T20:00:00Z", expect: true },
  { label: "DST automne 16h EST", date: "2026-11-09T21:00:00Z", expect: true },
];

for (const testCase of cases) {
  const parts = getMontrealTimeParts(new Date(testCase.date));
  const day = schedule[parts.weekday];
  const result = isWithinDaySchedule(day, parts);
  assert(`${testCase.label} (${parts.time})`, result === testCase.expect);
}

const configPath = join(__dirname, "../src/config/afterHoursPhonePopup.ts");
const configSrc = readFileSync(configPath, "utf8");
assert("Config contient America/Montreal", configSrc.includes("America/Montreal"));
assert("Config contient le délai 10000 ms", configSrc.includes("AFTER_HOURS_POPUP_DELAY_MS = 10000"));
assert("Config contient le numéro 514-893-9939", configSrc.includes("514-893-9939"));
assert("Config titre FR soir", configSrc.includes("Nous sommes encore disponibles ce soir"));
assert("Config titre EN evening", configSrc.includes("We're still available this evening"));
assert("Config fin 21:00", configSrc.includes('end: "21:00"'));

console.log(process.exitCode ? "\nSome checks failed." : "\nAll checks passed.");
