/**
 * Visuels produits — chemins et dimensions alignés sur `productImages.meta.json`
 * (mis à jour par `npm run optimize:products` après ajout des sources dans `_source/`).
 */
import meta from "./productImages.meta.json";

export const productImages = {
  hubDuo: {
    ...meta.hubDuo,
    altFr:
      "BioBreak et Odor Break — technologie enzymatique et oxygène actif : détachant puissant et neutralisation des odeurs — Groupe Nettoyage Empire",
    altEn:
      "BioBreak and Odor Break — enzymatic technology and active oxygen: powerful stain removal and odor neutralization — Empire Cleaning Group",
  },
  neutralisant: {
    ...meta.neutralisant,
    altFr:
      "Odor Break — neutralisant professionnel d'odeurs à la source, peroxyde d'hydrogène, tapis et tissus",
    altEn:
      "Odor Break — professional odor neutralizer at the source, hydrogen peroxide, carpets and upholstery",
  },
  /** Visuel complémentaire : contexte avec animal de compagnie. */
  neutralisant2: {
    ...meta.neutralisant2,
    altFr:
      "Odor Break — contexte animal de compagnie ; suivre le mode d'emploi et les consignes du fabricant",
    altEn:
      "Odor Break — pet context illustration; follow label and manufacturer instructions",
  },
  enzymatique: {
    ...meta.enzymatique,
    altFr:
      "BioBreak — détachant enzymatique professionnel pour tapis et tissus d’ameublement — Groupe Nettoyage Empire",
    altEn:
      "BioBreak — professional enzymatic spot cleaner for carpets and upholstery — Empire Cleaning Group",
  },
  /** Visuel complémentaire : exemple de tache sur tissu d'ameublement. */
  enzymatique2: {
    ...meta.enzymatique2,
    altFr:
      "Exemple de tache localisée sur tissu de divan — test sur zone discrète et respect des consignes textile",
    altEn:
      "Example of a localized stain on sofa fabric — test a hidden area and follow fabric care instructions",
  },
} as const;

export type ProductImageKey = keyof typeof productImages;
