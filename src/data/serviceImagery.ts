/**
 * Single source of truth for service imagery (homepage cards + estimation module).
 * Homepage uses plain <img> with these paths; estimation builds <img> HTML from the same entries.
 */

/** Bump when any SERVICE_IMAGES `src` changes so browsers/CDNs don’t keep stale /images/* bytes. */
export const SERVICE_IMAGES_ASSET_VERSION = "10";

export function resolveServiceImageSrc(src: string): string {
  return `${src}?v=${SERVICE_IMAGES_ASSET_VERSION}`;
}

export interface ServiceImageEntry {
  src: string;
  /** Homepage card lighter asset (800px wide). */
  srcHomeCard?: string;
  /** Responsive variants for homepage cards (400 / 480 / 640 / 800 px). */
  srcHomeCardSrcset?: {
    w400: string;
    w480?: string;
    w640: string;
    w800: string;
  };
  altFr: string;
  altEn: string;
  width: number;
  height: number;
  /** Optional CSS object-position for homepage .card-img */
  objectPosition?: string;
}

/** `sizes` for service card images: mobile horizontal strip vs grid. */
export const HOMEPAGE_CARD_IMAGE_SIZES =
  "(max-width: 768px) min(85vw, 360px), min(400px, 33vw)";

export const SERVICE_IMAGES = {
  meubles_tissu: {
    src: "/images/services/services-4.webp",
    srcHomeCard: "/images/services/services-4-home-800.webp",
    srcHomeCardSrcset: {
      w400: "/images/services/services-4-home-400.webp",
      w480: "/images/services/services-4-home-480.webp",
      w640: "/images/services/services-4-home-640.webp",
      w800: "/images/services/services-4-home-800.webp",
    },
    altFr: "Nettoyage de meubles",
    altEn: "Upholstery cleaning",
    width: 400,
    height: 240,
  },
  matelas: {
    src: "/images/catalog/photo-matelas-custom.webp",
    srcHomeCard: "/images/catalog/photo-matelas-custom-home-800.webp",
    srcHomeCardSrcset: {
      w400: "/images/catalog/photo-matelas-custom-home-400.webp",
      w480: "/images/catalog/photo-matelas-custom-home-480.webp",
      w640: "/images/catalog/photo-matelas-custom-home-640.webp",
      w800: "/images/catalog/photo-matelas-custom-home-800.webp",
    },
    altFr: "Nettoyage de matelas",
    altEn: "Mattress cleaning",
    width: 400,
    height: 240,
  },
  meubles_cuir: {
    src: "/images/catalog/photo-leather-final.webp",
    srcHomeCard: "/images/catalog/photo-leather-final-home-800.webp",
    srcHomeCardSrcset: {
      w400: "/images/catalog/photo-leather-final-home-400.webp",
      w480: "/images/catalog/photo-leather-final-home-480.webp",
      w640: "/images/catalog/photo-leather-final-home-640.webp",
      w800: "/images/catalog/photo-leather-final-home-800.webp",
    },
    altFr: "Nettoyage de meubles en cuir",
    altEn: "Leather furniture cleaning",
    width: 400,
    height: 240,
  },
  tapis_residentiel: {
    src: "/images/catalog/tapis-residentiel-service-card.webp",
    srcHomeCard: "/images/catalog/tapis-residentiel-service-card-home-800.webp",
    srcHomeCardSrcset: {
      w400: "/images/catalog/tapis-residentiel-service-card-home-400.webp",
      w480: "/images/catalog/tapis-residentiel-service-card-home-480.webp",
      w640: "/images/catalog/tapis-residentiel-service-card-home-640.webp",
      w800: "/images/catalog/tapis-residentiel-service-card-home-800.webp",
    },
    altFr: "Nettoyage de tapis résidentiel",
    altEn: "Residential carpet cleaning",
    width: 400,
    height: 240,
  },
  tapis_synthetique: {
    src: "/images/catalog/photo-47.webp",
    srcHomeCard: "/images/catalog/photo-47-home.webp",
    srcHomeCardSrcset: {
      w400: "/images/catalog/photo-47-home-400.webp",
      w480: "/images/catalog/photo-47-home-480.webp",
      w640: "/images/catalog/photo-47-home-640.webp",
      w800: "/images/catalog/photo-47-home.webp",
    },
    altFr: "Nettoyage de tapis synthétique",
    altEn: "Synthetic carpet cleaning at home",
    width: 400,
    height: 240,
  },
  tapis_laine: {
    src: "/images/catalog/photo-22.webp",
    srcHomeCard: "/images/catalog/photo-22-home.webp",
    srcHomeCardSrcset: {
      w400: "/images/catalog/photo-22-home-400.webp",
      w480: "/images/catalog/photo-22-home-480.webp",
      w640: "/images/catalog/photo-22-home-640.webp",
      w800: "/images/catalog/photo-22-home.webp",
    },
    altFr: "Nettoyage de tapis en laine",
    altEn: "Wool carpet cleaning at home",
    width: 400,
    height: 240,
  },
  tapis_oriental: {
    src: "/images/catalog/photo-oriental-custom.webp",
    srcHomeCard: "/images/catalog/photo-oriental-custom-home.webp",
    srcHomeCardSrcset: {
      w400: "/images/catalog/photo-oriental-custom-home-400.webp",
      w480: "/images/catalog/photo-oriental-custom-home-480.webp",
      w640: "/images/catalog/photo-oriental-custom-home-640.webp",
      w800: "/images/catalog/photo-oriental-custom-home.webp",
    },
    altFr: "Nettoyage de tapis orientaux",
    altEn: "Oriental carpet cleaning",
    width: 400,
    height: 300,
  },
  tapis_commercial: {
    src: "/images/catalog/tapis-commercial-combo.webp",
    srcHomeCard: "/images/catalog/tapis-commercial-combo-home-800.webp",
    srcHomeCardSrcset: {
      w400: "/images/catalog/tapis-commercial-combo-home-400.webp",
      w480: "/images/catalog/tapis-commercial-combo-home-480.webp",
      w640: "/images/catalog/tapis-commercial-combo-home-640.webp",
      w800: "/images/catalog/tapis-commercial-combo-home-800.webp",
    },
    altFr: "Nettoyage de tapis commercial",
    altEn: "Commercial carpet cleaning",
    width: 400,
    height: 240,
  },
  ceramique: {
    src: "/images/catalog/tuile-card-optimized.webp",
    srcHomeCard: "/images/catalog/tuile-card-optimized-home.webp",
    altFr:
      "Nettoyage professionnel de tuiles et joints de céramique - Montréal Laval Rive-Sud",
    altEn: "Tile and grout cleaning",
    width: 400,
    height: 240,
  },
  protecteur: {
    src: "/images/catalog/photo-20.webp",
    srcHomeCard: "/images/catalog/photo-20-home-800.webp",
    srcHomeCardSrcset: {
      w400: "/images/catalog/photo-20-home-400.webp",
      w480: "/images/catalog/photo-20-home-480.webp",
      w640: "/images/catalog/photo-20-home-640.webp",
      w800: "/images/catalog/photo-20-home-800.webp",
    },
    altFr: "Protecteur anti-taches",
    altEn: "Stain protector application",
    width: 400,
    height: 240,
  },
  /**
   * Estimator "Tapis et carpettes" aggregate — aligned with synthetic rug marketing (photo-47).
   */
  tapis_estimator_aggregate: {
    src: "/images/catalog/photo-47.webp",
    altFr: "Tapis et carpettes",
    altEn: "Area rugs and carpets",
    width: 400,
    height: 240,
  },
  escalier: {
    src: "/images/service-escalier.webp",
    altFr: "Escalier",
    altEn: "Carpet stairs",
    width: 400,
    height: 240,
  },
} as const satisfies Record<string, ServiceImageEntry>;

export type ServiceImageKey = keyof typeof SERVICE_IMAGES;

/** Maps estimation CONFIG service `id` → SERVICE_IMAGES key */
export const ESTIMATION_SERVICE_IMAGE_KEY: Record<string, ServiceImageKey> = {
  meubles: "meubles_tissu",
  meubles_cuir: "meubles_cuir",
  matelas: "matelas",
  tapis_mur: "tapis_residentiel",
  tapis: "tapis_estimator_aggregate",
  ceramique: "ceramique",
  escalier: "escalier",
  tapis_commercial: "tapis_commercial",
};

/**
 * HTML string for estimation service grid (FR primary alt for consistency with existing UI).
 */
export function getEstimationIconHtml(serviceId: string): string {
  const key = ESTIMATION_SERVICE_IMAGE_KEY[serviceId];
  if (!key) {
    return "";
  }
  const entry = SERVICE_IMAGES[key];
  const src = resolveServiceImageSrc(entry.src);
  const pos = entry.objectPosition
    ? ` style="object-position:${entry.objectPosition}"`
    : "";
  return `<img src="${src}" alt="${entry.altFr.replace(/"/g, "&quot;")}" loading="lazy"${pos} />`;
}

export type ServiceImageResolved = ServiceImageEntry & {
  src: string;
  srcset?: string;
  sizes?: string;
};

export function getServiceImage(
  key: ServiceImageKey,
  options?: { forHomepageCard?: boolean },
): ServiceImageResolved {
  const e = SERVICE_IMAGES[key];

  if (options?.forHomepageCard && e.srcHomeCard) {
    const src = resolveServiceImageSrc(e.srcHomeCard);
    if (e.srcHomeCardSrcset) {
      const sc = e.srcHomeCardSrcset;
      const parts: string[] = [
        `${resolveServiceImageSrc(sc.w400)} 400w`,
      ];
      if (sc.w480) {
        parts.push(`${resolveServiceImageSrc(sc.w480)} 480w`);
      }
      parts.push(
        `${resolveServiceImageSrc(sc.w640)} 640w`,
        `${resolveServiceImageSrc(sc.w800)} 800w`,
      );
      return {
        ...e,
        src,
        srcset: parts.join(", "),
        sizes: HOMEPAGE_CARD_IMAGE_SIZES,
      };
    }
    return {
      ...e,
      src,
      sizes: HOMEPAGE_CARD_IMAGE_SIZES,
    };
  }

  return { ...e, src: resolveServiceImageSrc(e.src) };
}

export interface HomepageServiceCard {
  href: string;
  hrefEn: string;
  imageKey: ServiceImageKey;
  delayClass: string;
  iconTone: "icon-blue" | "icon-red";
  emoji: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
}

export const HOMEPAGE_SERVICE_CARDS: HomepageServiceCard[] = [
  {
    href: "/services/meubles-tissu",
    hrefEn: "/en/services/meubles-tissu",
    imageKey: "meubles_tissu",
    delayClass: "delay-100",
    iconTone: "icon-blue",
    emoji: "🛋️",
    titleFr: "Sofa, Divan, Fauteuil & Meubles",
    titleEn: "Sofa, Couch, Armchair & Upholstery",
    descriptionFr:
      "Nettoyage en profondeur des tissus. Stop aux taches et odeurs.",
    descriptionEn: "Deep cleaning of upholstery fabrics. Stop stains and odors.",
  },
  {
    href: "/services/nettoyage-desinfection-matelas",
    hrefEn: "/en/services/nettoyage-desinfection-matelas",
    imageKey: "matelas",
    delayClass: "delay-200",
    iconTone: "icon-red",
    emoji: "🛏️",
    titleFr: "Nettoyage & Désinfection Matelas",
    titleEn: "Mattress Cleaning & Disinfection",
    descriptionFr:
      "Élimination certifiée des acariens et bactéries pour un sommeil sain.",
    descriptionEn:
      "Certified elimination of dust mites and bacteria for healthy sleep.",
  },
  {
    href: "/services/meubles-cuir",
    hrefEn: "/en/services/meubles-cuir",
    imageKey: "meubles_cuir",
    delayClass: "delay-300",
    iconTone: "icon-blue",
    emoji: "🛡️",
    titleFr: "Meubles en Cuir",
    titleEn: "Leather Furniture",
    descriptionFr:
      "Nettoyage et hydratation pour protéger votre cuir contre le dessèchement.",
    descriptionEn:
      "Cleaning and moisturizing to protect your leather against drying out.",
  },
  {
    href: "/services/nettoyage-tapis-residentiel",
    hrefEn: "/en/services/nettoyage-tapis-residentiel",
    imageKey: "tapis_residentiel",
    delayClass: "delay-100",
    iconTone: "icon-blue",
    emoji: "🏠",
    titleFr: "Tapis Résidentiel",
    titleEn: "Residential Carpet",
    descriptionFr:
      "Redonnez couleur et hygiène à vos tapis en laine, synthétique ou orientaux.",
    descriptionEn:
      "Restore color and hygiene to your wool, synthetic, or oriental carpets.",
  },
  {
    href: "/services/tapis-synthetique",
    hrefEn: "/en/services/tapis-synthetique",
    imageKey: "tapis_synthetique",
    delayClass: "delay-200",
    iconTone: "icon-blue",
    emoji: "🧹",
    titleFr: "Tapis Synthétique à Domicile",
    titleEn: "Synthetic Carpet Cleaning at Home",
    descriptionFr: "Technique adaptée aux fibres modernes et résistantes.",
    descriptionEn: "Technique adapted to modern and resistant fibers.",
  },
  {
    href: "/services/tapis-laine",
    hrefEn: "/en/services/tapis-laine",
    imageKey: "tapis_laine",
    delayClass: "delay-300",
    iconTone: "icon-blue",
    emoji: "🧶",
    titleFr: "Tapis en Laine",
    titleEn: "Wool Carpets",
    descriptionFr:
      "Traitement délicat et spécialisé pour vos tapis en laine et fibres naturelles.",
    descriptionEn:
      "Delicate and specialized treatment for your wool and natural fiber carpets.",
  },
  {
    href: "/services/tapis-orientaux",
    hrefEn: "/en/services/tapis-orientaux",
    imageKey: "tapis_oriental",
    delayClass: "delay-100",
    iconTone: "icon-blue",
    emoji: "🏺",
    titleFr: "Tapis Orientaux à Domicile",
    titleEn: "Oriental Carpet Cleaning at Home",
    descriptionFr: "Restauration experte pour tapis persans et orientaux.",
    descriptionEn: "Expert restoration for Persian and Oriental rugs.",
  },
  {
    href: "/services/nettoyage-tapis-commercial",
    hrefEn: "/en/services/nettoyage-tapis-commercial",
    imageKey: "tapis_commercial",
    delayClass: "delay-200",
    iconTone: "icon-blue",
    emoji: "🏢",
    titleFr: "Tapis Commercial",
    titleEn: "Commercial Carpet Cleaning",
    descriptionFr: "Solutions pour bureaux et grands espaces.",
    descriptionEn: "Solutions for offices and large spaces.",
  },
  {
    href: "/services/nettoyage-tuiles-ceramique",
    hrefEn: "/en/services/nettoyage-tuiles-ceramique",
    imageKey: "ceramique",
    delayClass: "delay-300",
    iconTone: "icon-blue",
    emoji: "✨",
    titleFr: "Tuiles & Céramique",
    titleEn: "Tiles & Grout",
    descriptionFr:
      "Restaurez l'éclat de vos planchers et joints avec notre nettoyage haute pression.",
    descriptionEn:
      "Restore the shine of your floors and joints with our high-pressure cleaning.",
  },
  {
    href: "/services/protecteur",
    hrefEn: "/en/services/protecteur",
    imageKey: "protecteur",
    delayClass: "delay-100",
    iconTone: "icon-blue",
    emoji: "☔",
    titleFr: "Application de Protecteur",
    titleEn: "Stain Protector Application",
    descriptionFr:
      "Protection Teflon/Scotchgard pour tissus, cuirs et tapis.",
    descriptionEn: "Teflon/Scotchgard protection for fabrics, leather, and carpets.",
  },
];
