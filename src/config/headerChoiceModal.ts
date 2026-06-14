import { PHONES } from "./phones";

export const HEADER_CTA_BUTTON = {
  fr: "Contactez-nous",
  en: "Contact us",
} as const;

export const MOBILE_STICKY_CTA_BUTTON = {
  fr: "Contactez-nous",
  en: "Contact us",
} as const;

export const HEADER_CHOICE_PHONE = {
  display: "514-893-9939",
  telHref: PHONES.main.telIntl,
  smsHref: `sms:${PHONES.main.telIntl}`,
  displayWithParens: PHONES.main.display,
} as const;

/** Ligne 1 du bouton d'appel principal (modale + pop-up auto). */
export const PRIMARY_CALL_BUTTON = {
  fr: { action: "Appeler maintenant" },
  en: { action: "Call now" },
} as const;

/**
 * Horaires de disponibilité pour la modale en-tête (heure America/Montreal, HH:mm).
 * Modifier start/end par groupe de jours sans toucher à la logique.
 */
export const HEADER_MODAL_AVAILABILITY = {
  /** Lundi au vendredi */
  weekday: {
    start: "08:00",
    end: "21:00",
    /** Début du mode « soirée » en semaine (avant = journée) */
    eveningStart: "16:00",
  },
  /** Samedi */
  saturday: {
    start: "09:00",
    end: "21:00",
  },
  /** Dimanche */
  sunday: {
    start: "09:00",
    end: "21:00",
  },
} as const;

/** Textes du pop-up automatique (distincts de la modale manuelle). */
export const AUTO_POPUP_COPY = {
  fr: {
    closeLabel: "Fermer",
    weekdayEvening: {
      title: "Nous sommes encore disponibles ce soir",
      body:
        "Un représentant est présentement disponible au bureau pour répondre à vos questions ou vous aider à prendre rendez-vous, et ce, jusqu'à 21 h.",
      hoursLine: "Vous pouvez nous appeler maintenant sans hésiter.",
      primaryCall: "Appeler maintenant — 514-893-9939",
      secondaryForm: "Demander une estimation en ligne",
    },
    weekend: {
      title: "Nous sommes disponibles la fin de semaine",
      body:
        "Un représentant est présentement disponible au bureau pour répondre à vos questions ou vous aider à prendre rendez-vous, et ce, jusqu'à 21 h.",
      hoursLine:
        "Nous répondons aux appels sept jours sur sept. Vous pouvez nous appeler maintenant sans hésiter.",
      primaryCall: "Appeler maintenant — 514-893-9939",
      secondaryForm: "Demander une estimation en ligne",
    },
  },
  en: {
    closeLabel: "Close",
    weekdayEvening: {
      title: "We're still available this evening",
      body:
        "A representative is currently available at the office to answer your questions or help you schedule an appointment until 9:00 p.m.",
      hoursLine: "Feel free to call us now.",
      primaryCall: "Call now — 514-893-9939",
      secondaryForm: "Request an online estimate",
    },
    weekend: {
      title: "We're available on weekends",
      body:
        "A representative is currently available at the office to answer your questions or help you schedule an appointment until 9:00 p.m.",
      hoursLine:
        "We answer calls seven days a week. Feel free to call us now.",
      primaryCall: "Call now — 514-893-9939",
      secondaryForm: "Request an online estimate",
    },
  },
} as const;

export const HEADER_CHOICE_MODAL_COPY = {
  fr: {
    closeLabel: "Fermer",
    weekdayDay: {
      title: "Un représentant est disponible",
      body:
        "Appelez-nous maintenant pour poser vos questions, obtenir de l'information ou prendre rendez-vous.",
      primaryCall: "Appeler maintenant — 514-893-9939",
      secondaryForm: "Demander une estimation en ligne",
    },
    weekdayEvening: {
      title: "Nous sommes encore disponibles ce soir",
      body:
        "Un représentant est présentement disponible au bureau pour répondre à vos questions ou vous aider à prendre rendez-vous, et ce, jusqu'à 21 h.",
      secondaryLine: "Vous pouvez nous appeler maintenant sans hésiter.",
      primaryCall: "Appeler maintenant — 514-893-9939",
      secondaryForm: "Demander une estimation en ligne",
    },
    weekend: {
      title: "Nous sommes disponibles la fin de semaine",
      body:
        "Un représentant est présentement disponible au bureau pour répondre à vos questions ou vous aider à prendre rendez-vous, et ce, jusqu'à 21 h.",
      secondaryLine:
        "Nous répondons aux appels sept jours sur sept. Vous pouvez nous appeler maintenant sans hésiter.",
      primaryCall: "Appeler maintenant — 514-893-9939",
      secondaryForm: "Demander une estimation en ligne",
    },
    afterHours: {
      title: "Comment souhaitez-vous nous joindre?",
      secondaryForm: "Demander une estimation en ligne",
    },
  },
  en: {
    closeLabel: "Close",
    weekdayDay: {
      title: "A representative is available",
      body:
        "Call us now to ask your questions, get more information, or schedule an appointment.",
      primaryCall: "Call now — 514-893-9939",
      secondaryForm: "Request an online estimate",
    },
    weekdayEvening: {
      title: "We're still available this evening",
      body:
        "A representative is currently available at the office to answer your questions or help you schedule an appointment until 9:00 p.m.",
      secondaryLine: "Feel free to call us now.",
      primaryCall: "Call now — 514-893-9939",
      secondaryForm: "Request an online estimate",
    },
    weekend: {
      title: "We're available on weekends",
      body:
        "A representative is currently available at the office to answer your questions or help you schedule an appointment until 9:00 p.m.",
      secondaryLine:
        "We answer calls seven days a week. Feel free to call us now.",
      primaryCall: "Call now — 514-893-9939",
      secondaryForm: "Request an online estimate",
    },
    afterHours: {
      title: "How would you like to contact us?",
      secondaryForm: "Request an online estimate",
    },
  },
} as const;

export type HeaderModalMode =
  | "weekday_day"
  | "weekday_evening"
  | "weekend"
  | "after_hours";
