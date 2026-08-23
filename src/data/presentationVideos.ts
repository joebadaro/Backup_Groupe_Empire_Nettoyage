export type PresentationLocale = "fr" | "en";

export const PRESENTATION_POSTER_URL =
  "/images/videos/video-presentation-groupe-nettoyage-empire-team.webp";
export const PRESENTATION_POSTER_WIDTH = 720;
export const PRESENTATION_POSTER_HEIGHT = 1279;

/** Home teaser thumb (~200px CSS / ~34vw) — avoid downloading full 720w poster on mobile. */
export const PRESENTATION_POSTER_SRCSET =
  "/images/videos/video-presentation-groupe-nettoyage-empire-team-200.webp 200w, /images/videos/video-presentation-groupe-nettoyage-empire-team-280.webp 280w, /images/videos/video-presentation-groupe-nettoyage-empire-team-360.webp 360w, /images/videos/video-presentation-groupe-nettoyage-empire-team-400.webp 400w, /images/videos/video-presentation-groupe-nettoyage-empire-team.webp 720w";

export const PRESENTATION_POSTER_SIZES_HOME =
  "(max-width: 768px) min(34vw, 200px), 200px";


export interface PresentationVideoEntry {
  id: string;
  title: string;
  category: string;
  posterUrl: string;
  posterAlt: string;
  /** Date ISO 8601 de publication YouTube (uploadDate Schema.org). */
  uploadDate: string;
  description: string;
  presentationHref: string;
  galleryHref: string;
  pageTitle: string;
  pageIntro: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  playLabel: string;
  allVideosLabel: string;
  closeLabel: string;
  serviceName: string;
  inLanguage: "fr-CA" | "en-CA";
  homeTeaser: {
    title: string;
    text: string;
    button: string;
    duration: string;
  };
}

const PRESENTATION_VIDEOS: Record<PresentationLocale, PresentationVideoEntry> = {
  fr: {
    id: "qN362y2IN_0",
    title: "Présentation officielle de Groupe Nettoyage Empire",
    category: "Entreprise",
    uploadDate: "2026-06-06T18:49:25-07:00",
    posterUrl: PRESENTATION_POSTER_URL,
    posterAlt:
      "Équipe de Groupe Nettoyage Empire et présentation de nos services professionnels",
    description:
      "Découvrez qui est Groupe Nettoyage Empire, nos principaux services, notre équipement professionnel, nos camions-usines et la qualité de notre travail à Montréal et sur la Rive-Sud.",
    presentationHref: "/presentation/",
    galleryHref: "/realisations-video/",
    pageTitle: "Découvrez Groupe Nettoyage Empire",
    pageIntro:
      "Découvrez notre entreprise, nos équipements professionnels et les services de nettoyage que nous offrons à Montréal et sur la Rive-Sud.",
    seoTitle: "Présentation de Groupe Nettoyage Empire | Nettoyage professionnel",
    seoDescription:
      "Découvrez Groupe Nettoyage Empire, nos équipements professionnels et nos services de nettoyage de tapis, meubles, matelas et tuiles à Montréal et sur la Rive-Sud.",
    canonicalPath: "/presentation/",
    playLabel: "Voir la présentation vidéo",
    allVideosLabel: "Voir toutes nos réalisations en vidéo",
    closeLabel: "Fermer la vidéo",
    serviceName: "Présentation entreprise",
    inLanguage: "fr-CA",
    homeTeaser: {
      title: "Découvrez Groupe Nettoyage Empire",
      text: "Voyez notre équipe, nos équipements professionnels et notre façon de travailler en moins de trois minutes.",
      button: "Voir la vidéo de présentation",
      duration: "Vidéo de 2 min 15 s",
    },
  },
  en: {
    id: "Ayk97N_OxDQ",
    title: "Official Presentation of Groupe Nettoyage Empire",
    category: "Company",
    uploadDate: "2026-06-06T18:48:09-07:00",
    posterUrl: PRESENTATION_POSTER_URL,
    posterAlt:
      "Groupe Nettoyage Empire team and professional cleaning services presentation",
    description:
      "Learn more about Groupe Nettoyage Empire, our main services, professional equipment, truck-mount units, experience, and the quality of our work in Montreal and the South Shore.",
    presentationHref: "/en/presentation/",
    galleryHref: "/en/video-gallery/",
    pageTitle: "Discover Groupe Nettoyage Empire",
    pageIntro:
      "Learn more about our company, our professional equipment, and the cleaning services we provide throughout Montreal and the South Shore.",
    seoTitle: "About Groupe Nettoyage Empire | Professional Cleaning Services",
    seoDescription:
      "Discover Groupe Nettoyage Empire, our professional equipment, and our carpet, upholstery, mattress, area rug, and tile cleaning services in Montreal and the South Shore.",
    canonicalPath: "/en/presentation/",
    playLabel: "Watch the presentation video",
    allVideosLabel: "View our full video gallery",
    closeLabel: "Close video",
    serviceName: "Company presentation",
    inLanguage: "en-CA",
    homeTeaser: {
      title: "Discover Groupe Nettoyage Empire",
      text: "Meet our team, see our professional equipment, and discover how we work in less than three minutes.",
      button: "Watch Our Company Video",
      duration: "2 min 15 sec video",
    },
  },
};

export function getPresentationVideo(locale: PresentationLocale): PresentationVideoEntry {
  return PRESENTATION_VIDEOS[locale];
}

export function getPresentationGalleryEntry(locale: PresentationLocale) {
  const video = PRESENTATION_VIDEOS[locale];
  return {
    id: video.id,
    title: video.title,
    category: video.category,
    posterUrl: video.posterUrl,
    posterAlt: video.posterAlt,
    description: video.description,
    uploadDate: video.uploadDate,
    presentationHref: video.presentationHref,
  };
}
