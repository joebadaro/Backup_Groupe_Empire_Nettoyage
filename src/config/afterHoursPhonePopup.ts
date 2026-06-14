import { PHONES } from "./phones";

/** Fuseau horaire obligatoire pour les horaires d'affichage. */
export const AFTER_HOURS_TIMEZONE = "America/Montreal";

/**
 * Délai fixe avant l'apparition du pop-up (ms).
 * Modifier cette valeur pour ajuster le délai (10 s par défaut).
 */
export const AFTER_HOURS_POPUP_DELAY_MS = 10000;

/** Réinitialisation de la session pop-up après inactivité (ms). */
export const AFTER_HOURS_SESSION_INACTIVITY_MS = 30 * 60 * 1000;

export type WeekdayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DaySchedule = {
  start: string;
  end: string;
};

/**
 * Horaires de disponibilité du pop-up (heure de Montréal, format HH:mm).
 * Modifier start/end ou retirer un jour (mettre null) pour ajuster.
 */
export const AFTER_HOURS_POPUP_SCHEDULE: Record<WeekdayKey, DaySchedule> = {
  monday: { start: "08:00", end: "21:00" },
  tuesday: { start: "08:00", end: "21:00" },
  wednesday: { start: "08:00", end: "21:00" },
  thursday: { start: "08:00", end: "21:00" },
  friday: { start: "08:00", end: "21:00" },
  saturday: { start: "09:00", end: "21:00" },
  sunday: { start: "09:00", end: "21:00" },
};

export const AFTER_HOURS_PHONE = {
  display: "514-893-9939",
  telHref: PHONES.main.telIntl,
} as const;

export const AFTER_HOURS_POPUP_COPY = {
  fr: {
    title: "Nous sommes encore disponibles ce soir",
    body:
      "Un représentant est présentement disponible au bureau pour répondre à votre appel, répondre à vos questions ou effectuer une prise de rendez-vous.",
    secondaryLine: "N'hésitez pas à nous appeler, même en soirée.",
    callButton: "Appeler maintenant — 514-893-9939",
    formButton: "Je préfère demander une estimation en ligne",
    closeLabel: "Fermer",
  },
  en: {
    title: "We're still available this evening",
    body:
      "A representative is currently available at the office to answer your call, answer your questions, or help you schedule an appointment.",
    secondaryLine: "Feel free to call us, even during the evening.",
    callButton: "Call now — 514-893-9939",
    formButton: "I prefer to request an online estimate",
    closeLabel: "Close",
  },
} as const;

/** Textes des boutons principaux (sections CTA du site). */
export const CONVERSION_CTA_COPY = {
  fr: {
    primaryCall: "Appelez maintenant pour une estimation rapide",
    secondaryEstimate: "Vous ne pouvez pas appeler? Demandez une estimation en ligne",
  },
  en: {
    primaryCall: "Call now for a quick estimate",
    secondaryEstimate: "Can't call? Request an online estimate",
  },
} as const;
