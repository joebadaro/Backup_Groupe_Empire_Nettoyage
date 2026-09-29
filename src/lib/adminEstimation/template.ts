/** Chemin public de l'image letterhead (remplacer le placeholder par le fichier final). */
export const LETTER_TEMPLATE_IMAGE =
  "/images/admin/estimation-letter-template.webp?v=3";

/** Format lettre US — 8,5 × 11 po */
export const LETTER_ASPECT_RATIO = 8.5 / 11;

/** Dimensions acceptées (ratio 8,5 × 11 exact). */
export const LETTER_ACCEPTED_DIMENSIONS = [
  { width: 1700, height: 2200 },
  { width: 2550, height: 3300 },
] as const;

/** Tolérance relative sur le ratio largeur / hauteur. */
export const LETTER_RATIO_TOLERANCE = 0.005;

/**
 * Zone centrale de contenu (% de la feuille).
 * Calibré sur estimation-letter-template.webp (2550 × 3300) — bordure bleue + marge intérieure.
 */
export const CONTENT_ZONE = {
  top: "35%",
  right: "8.8%",
  bottom: "44.2%",
  left: "7.9%",
} as const;

export const FONT_FIT = {
  basePt: 11,
  minPt: 9,
  stepPt: 0.5,
} as const;

export const OVERFLOW_MESSAGE = {
  fr: "Le texte est trop long pour la feuille. Veuillez raccourcir la description ou les notes.",
  en: "The text is too long for the page. Please shorten the description or notes.",
} as const;

export const TEMPLATE_RATIO_MESSAGE = {
  fr: "L'image du template n'a pas le ratio lettre 8,5 × 11 (ex. 1700 × 2200 ou 2550 × 3300 px). Fournissez un fichier correctement dimensionné avant utilisation en production.",
  en: "The template image is not letter ratio 8.5 × 11 (e.g. 1700 × 2200 or 2550 × 3300 px). Provide a correctly sized file before production use.",
} as const;

export function isLetterAspectRatio(width: number, height: number): boolean {
  if (!width || !height) return false;
  const ratio = width / height;
  const expected = LETTER_ASPECT_RATIO;
  return Math.abs(ratio - expected) / expected <= LETTER_RATIO_TOLERANCE;
}

export function matchesAcceptedDimensions(width: number, height: number): boolean {
  return LETTER_ACCEPTED_DIMENSIONS.some(
    (d) => d.width === width && d.height === height,
  );
}
