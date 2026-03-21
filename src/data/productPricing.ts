/**
 * Tarification produits (CAD) — source unique pour affichage + schéma Offer.
 * Mettre à jour ici si les prix changent.
 */
export const productPricing = {
  currency: "CAD" as const,
  /** Prix unitaire par produit */
  single: {
    amount: 26.99,
    displayFr: "26,99\u00a0$",
    displayEn: "$26.99",
  },
  /** Odor Break + BioBreak */
  duo: {
    amount: 49.99,
    displayFr: "49,99\u00a0$",
    displayEn: "$49.99",
  },
} as const;

/** Fin de validité indicative pour schema.org (optionnel, renouveler annuellement). */
export const priceValidUntilDefault = "2026-12-31";
