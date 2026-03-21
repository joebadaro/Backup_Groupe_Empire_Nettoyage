/**
 * Avis Google — extraits réels, sélection manuelle.
 * `originalLanguage` = langue d’origine sur Google (pour la mention « Traduit de… »).
 */
export type GoogleReviewItem = {
  text: string;
  author: string;
  location: string;
  service?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Langue dans laquelle l’avis a été publié sur Google */
  originalLanguage: "en" | "fr";
};

/** 6 avis — textes entièrement en français (traductions indiquées dans le composant). */
export const googleReviewsFr: GoogleReviewItem[] = [
  {
    text: "Joe connaissait très bien le processus de nettoyage et ce dont j’avais besoin pour que mes tapis retrouvent un état comme neuf. Il a fait un travail formidable. Je ferai certainement appel à lui pour de futurs services et je le recommande à tout le monde.",
    author: "Laura K.",
    location: "Brossard",
    service: "Nettoyage de tapis",
    rating: 5,
    originalLanguage: "en",
  },
  {
    text: "J’ai eu un service incroyable. L’équipe était ponctuelle, professionnelle et très minutieuse. Mon sofa a retrouvé une apparence impeccable, comme neuf. Je recommande ce service sans hésiter à 100 %.",
    author: "Émilie G.",
    location: "Saint-Julie",
    service: "Nettoyage de divan",
    rating: 5,
    originalLanguage: "fr",
  },
  {
    text: "Très compétente, avec de nombreuses années d’expérience. Service rapide et excellent, même à court préavis à cause d’une tache. Le tapis est magnifique. Je recommande vivement.",
    author: "Christina L.",
    location: "Westmount, Montréal",
    service: "Tapis / nettoyage de tapis",
    rating: 5,
    originalLanguage: "en",
  },
  {
    text: "Je ne pensais pas revoir mon divan pâle aussi beau qu’à la livraison initiale, mais c’est chose faite. Avec deux jeunes enfants et des chats, aucune compagnie n’a su faire un aussi beau travail.",
    author: "David et Andreanne L.-R.",
    location: "Chambly",
    service: "Nettoyage de divan",
    rating: 5,
    originalLanguage: "fr",
  },
  {
    text: "Complètement conquise par le service. Nos tapis ont vraiment l’air neufs, et toute la maison sent tellement bon maintenant. Joe était sympathique, rapide, minutieux, et le prix était excellent.",
    author: "Pak F.",
    location: "Montréal",
    service: "Nettoyage de tapis",
    rating: 5,
    originalLanguage: "en",
  },
  {
    text: "J’ai fait nettoyer mes tapis ainsi que mon divan aujourd’hui. Avant l’arrivée de Joe, je croyais sincèrement devoir jeter mes fournitures. Il les a restaurés d’une main de pro.",
    author: "Anne-Sophie R.",
    location: "Longueuil",
    service: "Tapis et divan",
    rating: 5,
    originalLanguage: "fr",
  },
];

/** 6 avis — textes entièrement en anglais. */
export const googleReviewsEn: GoogleReviewItem[] = [
  {
    text: "Joe was very knowledgeable about the cleaning process and what I needed to get my carpets back to brand new. He did an amazing job. I will definitely call him back for future services and recommend him to everyone.",
    author: "Laura K.",
    location: "Brossard",
    service: "Carpet cleaning",
    rating: 5,
    originalLanguage: "en",
  },
  {
    text: "I had incredible service. The team was punctual, professional, and very thorough. My sofa looks flawless, like new. I recommend this service 100% without hesitation.",
    author: "Émilie G.",
    location: "Saint-Julie",
    service: "Sofa cleaning",
    rating: 5,
    originalLanguage: "fr",
  },
  {
    text: "Very knowledgeable with many years of experience. Rapid and excellent service, even on short notice due to a stain. Rug looks excellent. Would highly recommend.",
    author: "Christina L.",
    location: "Westmount, Montreal",
    service: "Rug / carpet cleaning",
    rating: 5,
    originalLanguage: "en",
  },
  {
    text: "I didn’t think I’d ever see my pale sofa look as beautiful as when it was first delivered, but it’s done. With two young children and cats, no other company has done work this good.",
    author: "David et Andreanne L.-R.",
    location: "Chambly",
    service: "Sofa cleaning",
    rating: 5,
    originalLanguage: "fr",
  },
  {
    text: "Absolutely blown away by the service. Our carpets seriously look brand new, and now the whole house smells so fresh. Joe was friendly, fast, thorough, and the price was great.",
    author: "Pak F.",
    location: "Montreal",
    service: "Carpet cleaning",
    rating: 5,
    originalLanguage: "en",
  },
  {
    text: "I had my carpets and sofa cleaned today. Before Joe arrived, I honestly thought I’d have to throw out my furniture. He restored them like a true pro.",
    author: "Anne-Sophie R.",
    location: "Longueuil",
    service: "Carpet and sofa cleaning",
    rating: 5,
    originalLanguage: "fr",
  },
];

/** Réserve — `originalLanguage` à compléter si vous réutilisez ces entrées. */
export const googleReviewsFrReserve: GoogleReviewItem[] = [
  {
    text: "Quel service satisfaisant. Dès le premier contact, j’ai reçu toutes les explications concernant nos besoins, les produits utilisés et les solutions proposées. Je me suis sentie en confiance immédiatement.",
    author: "Sonia C.",
    location: "Candiac",
    service: "Nettoyage de divan",
    rating: 5,
    originalLanguage: "fr",
  },
  {
    text: "Service rapide et convivial. Joe a fait un travail incroyable sur mon divan beige 6 places. Il a été flexible avec mon budget et son souci principal était ma satisfaction. Je recommande à 100 %.",
    author: "Alessia F.",
    location: "Plateau-Mont-Royal",
    service: "Divan 6 places",
    rating: 5,
    originalLanguage: "en",
  },
  {
    text: "Je suis tellement ravie du service et de la qualité du travail. Honnêtement, je ne reconnais plus mes divans et tapis. Un service incroyable que je recommande au plus haut point.",
    author: "Judy D.",
    location: "Saint-Constant",
    service: "Divan et tapis",
    rating: 5,
    originalLanguage: "fr",
  },
];

export const googleReviewsEnReserve: GoogleReviewItem[] = [
  {
    text: "Such satisfying service. From the first contact, I got clear explanations about our needs, the products used, and the solutions offered. I felt confident right away.",
    author: "Sonia C.",
    location: "Candiac",
    service: "Sofa cleaning",
    rating: 5,
    originalLanguage: "fr",
  },
  {
    text: "Quick and friendly service. Joe did an amazing job cleaning my beige 6-seater sofa. He was flexible with my budget and his main concern was making me happy. 100% recommend.",
    author: "Alessia F.",
    location: "Plateau-Mont-Royal",
    service: "6-seater sofa cleaning",
    rating: 5,
    originalLanguage: "en",
  },
  {
    text: "I’m so happy with the service and the quality of the work. Honestly, I barely recognize my sofas and carpets. An incredible service I recommend in the strongest terms.",
    author: "Judy D.",
    location: "Saint-Constant",
    service: "Sofa and carpet cleaning",
    rating: 5,
    originalLanguage: "fr",
  },
];

export const googleReviewsMapsUrl =
  "https://www.google.com/maps/search/?api=1&query=Groupe+Nettoyage+Empire";
