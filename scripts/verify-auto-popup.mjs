/**
 * Vérifie la logique des pop-ups automatiques (Montréal).
 * Usage: node scripts/verify-auto-popup.mjs
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
    time: `${String(Number(pick("hour"))).padStart(2, "0")}:${String(Number(pick("minute"))).padStart(2, "0")}`,
  };
}

function parseTimeToMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function resolveAutoPopupMode(parts) {
  const now = parts.hour * 60 + parts.minute;
  const globalEnd = parseTimeToMinutes(AVAILABILITY.weekday.end);

  if (now > globalEnd) return null;

  if (parts.weekday === "saturday" || parts.weekday === "sunday") {
    const weekendStart = parseTimeToMinutes(AVAILABILITY.saturday.start);
    if (now < weekendStart) return null;
    return "weekend";
  }

  const weekdayStart = parseTimeToMinutes(AVAILABILITY.weekday.start);
  if (now < weekdayStart) return null;

  const eveningStart = parseTimeToMinutes(AVAILABILITY.weekday.eveningStart);
  if (now >= eveningStart) return "weekday_evening";

  return null;
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
  { label: "lundi 15 h 59 — aucun pop-up", date: "2026-05-26T19:59:00Z", expect: null },
  { label: "lundi 16 h — soirée", date: "2026-05-26T20:00:00Z", expect: "weekday_evening" },
  { label: "lundi 21 h — soirée", date: "2026-05-27T01:00:00Z", expect: "weekday_evening" },
  { label: "lundi 21 h 01 — fermé", date: "2026-05-27T01:01:00Z", expect: null },
  { label: "samedi 8 h 59 — fermé", date: "2026-05-23T12:59:00Z", expect: null },
  { label: "samedi 9 h — week-end", date: "2026-05-23T13:00:00Z", expect: "weekend" },
  { label: "samedi 18 h — week-end", date: "2026-05-23T22:00:00Z", expect: "weekend" },
  { label: "samedi 21 h — week-end", date: "2026-05-24T01:00:00Z", expect: "weekend" },
  { label: "samedi 21 h 01 — fermé", date: "2026-05-24T01:01:00Z", expect: null },
  { label: "dimanche 9 h — week-end", date: "2026-05-24T13:00:00Z", expect: "weekend" },
  { label: "dimanche 21 h — week-end", date: "2026-05-25T01:00:00Z", expect: "weekend" },
  { label: "dimanche 21 h 01 — fermé", date: "2026-05-25T01:01:00Z", expect: null },
  { label: "samedi 18 h — week-end (priorité sur soirée)", date: "2026-05-23T22:00:00Z", expect: "weekend" },
];

for (const testCase of cases) {
  const parts = getMontrealTimeParts(new Date(testCase.date));
  const mode = resolveAutoPopupMode(parts);
  assert(`${testCase.label} (${parts.weekday} ${parts.time})`, mode === testCase.expect);
}

const configSrc = readFileSync(
  join(__dirname, "../src/config/headerChoiceModal.ts"),
  "utf8",
);
assert("Modale hors heures FR", configSrc.includes("Comment souhaitez-vous nous joindre?"));
assert("Week-end FR titre", configSrc.includes("Nous sommes disponibles la fin de semaine"));
assert("Corps disponibilité FR 21 h", configSrc.includes("jusqu'à 21 h"));
assert("Phrase soirée FR", configSrc.includes("Vous pouvez nous appeler maintenant sans hésiter"));
assert("Phrase week-end FR", configSrc.includes("Nous répondons aux appels sept jours sur sept"));
assert("Corps disponibilité EN 9 p.m.", configSrc.includes("until 9:00 p.m."));
assert("Phrase week-end EN", configSrc.includes("We answer calls seven days a week"));
assert("Week-end start 09:00", configSrc.includes('start: "09:00"'));
assert("Fin journée 21:00", configSrc.includes('end: "21:00"'));

console.log(process.exitCode ? "\nSome checks failed." : "\nAll checks passed.");
