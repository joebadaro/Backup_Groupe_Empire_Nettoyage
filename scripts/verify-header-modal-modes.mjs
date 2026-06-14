/**
 * Vérifie la logique des 4 modes HeaderChoiceModal (Montréal).
 * Usage: node scripts/verify-header-modal-modes.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const AVAILABILITY = {
  weekday: { start: "08:00", end: "21:00", eveningStart: "16:00" },
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
  return {
    weekday: WEEKDAY_TO_KEY[weekdayRaw],
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
    time: `${pick("hour").padStart(2, "0")}:${pick("minute").padStart(2, "0")}`,
  };
}

function parseTimeToMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function getDayWindow(weekday) {
  if (weekday === "saturday") return AVAILABILITY.saturday;
  if (weekday === "sunday") return AVAILABILITY.sunday;
  return AVAILABILITY.weekday;
}

function resolveHeaderModalMode(parts) {
  const window = getDayWindow(parts.weekday);
  const now = parts.hour * 60 + parts.minute;
  const start = parseTimeToMinutes(window.start);
  const end = parseTimeToMinutes(window.end);

  if (now < start || now > end) return "after_hours";
  if (parts.weekday === "saturday" || parts.weekday === "sunday") return "weekend";

  const eveningStart = parseTimeToMinutes(
    window.eveningStart ?? AVAILABILITY.weekday.eveningStart,
  );
  if (now >= eveningStart) return "weekday_evening";
  return "weekday_day";
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
  {
    label: "lundi 10 h → weekday_day",
    date: "2026-05-25T14:00:00Z",
    expect: "weekday_day",
  },
  {
    label: "lundi 17 h 30 → weekday_evening",
    date: "2026-05-25T21:30:00Z",
    expect: "weekday_evening",
  },
  {
    label: "samedi 10 h → weekend (pas soirée)",
    date: "2026-05-23T14:00:00Z",
    expect: "weekend",
  },
  {
    label: "samedi 18 h → weekend",
    date: "2026-05-23T22:00:00Z",
    expect: "weekend",
  },
  {
    label: "dimanche 14 h → weekend",
    date: "2026-05-24T18:00:00Z",
    expect: "weekend",
  },
  {
    label: "dimanche 19 h → weekend",
    date: "2026-05-24T23:00:00Z",
    expect: "weekend",
  },
  {
    label: "mercredi 21 h 01 → after_hours",
    date: "2026-05-28T01:01:00Z",
    expect: "after_hours",
  },
  {
    label: "samedi 22 h → after_hours",
    date: "2026-05-24T02:00:00Z",
    expect: "after_hours",
  },
  {
    label: "lundi 07 h → after_hours (avant ouverture)",
    date: "2026-05-25T11:00:00Z",
    expect: "after_hours",
  },
  {
    label: "DST printemps lundi 17 h → weekday_evening",
    date: "2026-03-09T21:00:00Z",
    expect: "weekday_evening",
  },
  {
    label: "DST automne dimanche 17 h → weekend",
    date: "2026-11-08T22:00:00Z",
    expect: "weekend",
  },
];

for (const testCase of cases) {
  const parts = getMontrealTimeParts(new Date(testCase.date));
  const mode = resolveHeaderModalMode(parts);
  assert(`${testCase.label} (${parts.weekday} ${parts.time})`, mode === testCase.expect);
}

const configPath = join(__dirname, "../src/config/headerChoiceModal.ts");
const configSrc = readFileSync(configPath, "utf8");
assert("Config weekdayDay FR", configSrc.includes("Un représentant est disponible"));
assert("Config weekend FR", configSrc.includes("Nous sommes disponibles la fin de semaine"));
assert("Config afterHours EN", configSrc.includes("How would you like to contact us?"));
assert("Config afterHours FR", configSrc.includes("Comment souhaitez-vous nous joindre?"));
assert("Config HEADER_MODAL_AVAILABILITY", configSrc.includes("HEADER_MODAL_AVAILABILITY"));

const debugPath = join(__dirname, "../src/lib/header-modal-debug.ts");
const debugSrc = readFileSync(debugPath, "utf8");
assert("Debug weekday_day param", debugSrc.includes("weekday_day"));
assert("Debug DEV guard", debugSrc.includes("import.meta.env.DEV"));

console.log(process.exitCode ? "\nSome checks failed." : "\nAll checks passed.");
