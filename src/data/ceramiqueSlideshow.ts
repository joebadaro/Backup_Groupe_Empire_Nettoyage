import meta from "./ceramiqueSlideshow.meta.json";

export type CeramiqueSlide = {
  id: string;
  src: string;
  srcset: string;
  sizes: string;
  width: number;
  height: number;
  alt: string;
};

/** Ordre : 1c, 1b, 2, 3, 7.png, 5.png, WhatsApp, 20, 6.png, 10 */
const ALT_FR = [
  "Machine bleue Nettoyage Empire montrant le contraste avant-après sur un plancher de tuiles de céramique encrassé",
  "Avant-après nettoyage de joints de coulis : contraste entre zone sale et zone nettoyée sur carrelage",
  "Résultat avant-après du nettoyage professionnel de tuiles et coulis dans un hall carrelé",
  "Plancher de céramique beige motif losange et joints de coulis propres après nettoyage",
  "Technicien Empire nettoyant à la vapeur les murs de douche en céramique texturée",
  "Technicien Empire nettoyant un plancher de tuiles dans une salle de bain moderne",
  "Technicien Empire nettoyant à la vapeur un dosseret de cuisine en céramique derrière une cuisinière",
  "Comparaison avant-après des joints de coulis d'une cuisine en céramique",
  "Technicien Empire avec équipement turbo sur plancher de céramique dans une cuisine moderne",
  "Machine bleue Nettoyage Empire montrant un contraste avant-après net sur un plancher de tuiles en diagonal",
];

const ALT_EN = [
  "Nettoyage Empire blue machine showing before-and-after contrast on a dirty ceramic tile floor",
  "Before-and-after grout cleaning: dirty vs cleaned ceramic tile floor",
  "Before-and-after professional tile and grout cleaning in a tiled hall",
  "Clean beige diamond-pattern ceramic floor with bright grout lines after cleaning",
  "Empire technician steam-cleaning textured ceramic shower wall tiles",
  "Empire technician cleaning a tile floor in a modern bathroom",
  "Empire technician steam-cleaning a ceramic kitchen backsplash behind a stove",
  "Before-and-after ceramic kitchen floor grout cleaning comparison",
  "Empire technician with turbo equipment on ceramic flooring in a modern kitchen",
  "Nettoyage Empire blue machine showing a sharp before-and-after clean on a diagonal ceramic tile floor",
];

/** Hero split: mobile full width / desktop half viewport */
const SIZES = "(max-width: 1024px) 100vw, 50vw";

export function getCeramiqueSlideshowSlides(locale: "fr" | "en" = "fr"): CeramiqueSlide[] {
  const alts = locale === "en" ? ALT_EN : ALT_FR;
  return meta.slides.map((slide, i) => {
    const srcset = slide.variants.map((v) => `${v.path} ${v.width}w`).join(", ");
    return {
      id: slide.id,
      src: slide.primary,
      srcset,
      sizes: SIZES,
      width: slide.width,
      height: slide.height,
      alt: alts[i] ?? alts[0],
    };
  });
}
