export type PresentationLocale = "fr" | "en";

export const PRESENTATION_POSTER_URL =
  "/images/videos/video-presentation-groupe-nettoyage-empire-team.webp";
export const PRESENTATION_POSTER_WIDTH = 720;
export const PRESENTATION_POSTER_HEIGHT = 1279;

export interface PresentationVideoEntry {
  id: string;
  title: string;
  category: string;
  posterUrl: string;
  posterAlt: string;
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
  };
}

const PRESENTATION_VIDEOS: Record<PresentationLocale, PresentationVideoEntry> = {
  fr: {
    id: "qN362y2IN_0",
    title: "Présentation officielle de Groupe Nettoyage Empire",
    category: "Entreprise",
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
      title: "Découvrez qui nous sommes et comment nous travaillons",
      text: "Voyez nos équipements, nos méthodes de nettoyage et les services offerts par Groupe Nettoyage Empire.",
      button: "Voir notre présentation",
    },
  },
  en: {
    id: "Ayk97N_OxDQ",
    title: "Official Presentation of Groupe Nettoyage Empire",
    category: "Company",
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
      title: "Discover Who We Are and How We Work",
      text: "See our equipment, our cleaning methods, and the professional services offered by Groupe Nettoyage Empire.",
      button: "Watch Our Presentation",
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
    presentationHref: video.presentationHref,
  };
}
