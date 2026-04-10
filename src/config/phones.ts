/**
 * Source de vérité unique pour les numéros de téléphone
 * Single source of truth for phone numbers
 *
 * Pour changer un numéro : modifier ici seulement.
 * To change a number: edit here only.
 */
export const PHONES = {
  /**
   * Numéro principal public du site internet.
   * Utilisé pour : tous les appels clients, CRM, ligne AI, Meta, boutons "Appeler".
   *
   * Main public phone number for the website.
   * Used for: all client calls, CRM, AI line, Meta, "Call" buttons.
   */
  main: {
    /** Texte affiché / Display text */
    display: "(450) 977-4636",
    /** Format href tel: sans ponctuation */
    tel: "4509774636",
    /** Format href tel: international (pour pages promo) */
    telIntl: "+14509774636",
    /** Format Schema.org JSON-LD */
    schema: "+1-450-977-4636",
  },

  /**
   * Numéro secondaire — ligne de bureau / administrative.
   * NE PAS utiliser sur le site public comme numéro client.
   * Peut apparaître sur Google My Business comme "ligne de bureau".
   *
   * Secondary number — office / administrative line.
   * Do NOT use on the public site as the client number.
   * May appear on Google My Business as "office line".
   */
  office: {
    /** Texte affiché / Display text */
    display: "(514) 893-9939",
    /** Format href tel: sans ponctuation */
    tel: "5148939939",
    /** Format href tel: international */
    telIntl: "+15148939939",
    /** Format Schema.org JSON-LD */
    schema: "+1-514-893-9939",
  },
} as const;
