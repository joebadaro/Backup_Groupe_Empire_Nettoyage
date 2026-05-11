// @ts-check
// v2.0.5 - final authorized synchronization fix
import { defineConfig } from 'astro/config'; // v2.0.2 - manual push required

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// https://astro.build/config
import netlify from '@astrojs/netlify';

/** FR nettoyage-meubles-rembourres-* ↔ EN upholstery-cleaning-* — redirect wrong slug/language combos */
const UPHOLSTERY_CITIES = [
  'boucherville',
  'brossard',
  'candiac',
  'chambly',
  'la-prairie',
  'longueuil',
  'saint-bruno',
  'sainte-julie',
];
const upholsteryRedirects = Object.fromEntries(
  UPHOLSTERY_CITIES.flatMap((city) => [
    [`/en/services/nettoyage-meubles-rembourres-${city}`, `/en/services/upholstery-cleaning-${city}`],
    [`/services/upholstery-cleaning-${city}`, `/services/nettoyage-meubles-rembourres-${city}`],
  ])
);

/** Legacy Ads / bookmarks: explicit 301 only (no wildcards, no homepage). */
const withSlashVariants = (path) => [path, path.endsWith('/') ? path : `${path}/`];
const legacyServiceRedirects = Object.fromEntries(
  [
    // FR /nettoyage/* (Google Ads & anciennes campagnes)
    ['/nettoyage/tapis', '/services/nettoyage-tapis-residentiel'],
    ['/nettoyage/tapis-residentiel', '/services/nettoyage-tapis-residentiel'],
    ['/nettoyage/tapis-commercial', '/services/nettoyage-tapis-commercial'],
    ['/nettoyage/moquette', '/services/nettoyage-tapis-residentiel'],
    ['/nettoyage/carpettes', '/services/tapis'],
    ['/nettoyage/divan', '/services/meubles-tissu'],
    ['/nettoyage/sofa', '/services/meubles-tissu'],
    ['/nettoyage/chaises', '/services/meubles-tissu'],
    ['/nettoyage/meubles', '/services/meubles-tissu'],
    ['/nettoyage/cuir', '/services/meubles-cuir'],
    ['/nettoyage/matelas', '/services/nettoyage-desinfection-matelas'],
    ['/nettoyage/tuiles', '/services/nettoyage-tuiles-ceramique'],
    ['/nettoyage/ceramique', '/services/nettoyage-tuiles-ceramique'],
    ['/nettoyage/céramique', '/services/nettoyage-tuiles-ceramique'],
    // EN /en/nettoyage/*
    ['/en/nettoyage/tapis', '/en/services/nettoyage-tapis-residentiel'],
    ['/en/nettoyage/tapis-residentiel', '/en/services/nettoyage-tapis-residentiel'],
    ['/en/nettoyage/tapis-commercial', '/en/services/nettoyage-tapis-commercial'],
    ['/en/nettoyage/moquette', '/en/services/nettoyage-tapis-residentiel'],
    ['/en/nettoyage/carpettes', '/en/services/tapis'],
    ['/en/nettoyage/divan', '/en/services/meubles-tissu'],
    ['/en/nettoyage/sofa', '/en/services/meubles-tissu'],
    ['/en/nettoyage/chaises', '/en/services/meubles-tissu'],
    ['/en/nettoyage/meubles', '/en/services/meubles-tissu'],
    ['/en/nettoyage/cuir', '/en/services/meubles-cuir'],
    ['/en/nettoyage/matelas', '/en/services/nettoyage-desinfection-matelas'],
    ['/en/nettoyage/tuiles', '/en/services/nettoyage-tuiles-ceramique'],
    ['/en/nettoyage/ceramique', '/en/services/nettoyage-tuiles-ceramique'],
    ['/en/nettoyage/céramique', '/en/services/nettoyage-tuiles-ceramique'],
    // Singulier /service/* (vieux CMS)
    ['/service/tapis', '/services/nettoyage-tapis-residentiel'],
    ['/service/tapis-residentiel', '/services/nettoyage-tapis-residentiel'],
    ['/service/tapis-commercial', '/services/nettoyage-tapis-commercial'],
    ['/service/moquette', '/services/nettoyage-tapis-residentiel'],
    ['/service/carpettes', '/services/tapis'],
    ['/service/divan', '/services/meubles-tissu'],
    ['/service/sofa', '/services/meubles-tissu'],
    ['/service/chaises', '/services/meubles-tissu'],
    ['/service/meubles', '/services/meubles-tissu'],
    ['/service/cuir', '/services/meubles-cuir'],
    ['/service/matelas', '/services/nettoyage-desinfection-matelas'],
    ['/service/tuiles', '/services/nettoyage-tuiles-ceramique'],
    ['/service/ceramique', '/services/nettoyage-tuiles-ceramique'],
    ['/service/céramique', '/services/nettoyage-tuiles-ceramique'],
    // Racine (favoris / pubs courtes)
    ['/tapis', '/services/tapis'],
    ['/divan', '/services/meubles-tissu'],
    ['/sofa', '/services/meubles-tissu'],
    ['/matelas', '/services/nettoyage-desinfection-matelas'],
    ['/meubles', '/services/meubles-tissu'],
    ['/cuir', '/services/meubles-cuir'],
    ['/moquette', '/services/nettoyage-tapis-residentiel'],
    ['/carpettes', '/services/tapis'],
    ['/tuiles', '/services/nettoyage-tuiles-ceramique'],
    ['/ceramique', '/services/nettoyage-tuiles-ceramique'],
    ['/céramique', '/services/nettoyage-tuiles-ceramique'],
    ['/chaises', '/services/meubles-tissu'],
    // Lien menu FR historique (404) → page cuir FR
    ['/services/nettoyage-sofa-cuir', '/services/meubles-cuir'],
  ].flatMap(([from, to]) => withSlashVariants(from).map((src) => [src, to]))
);

const sitemapFilter = (url) => {
  const excludedSubstrings = [
    "/promo/",
    "/selection/",
    "/inventaire/",
    "/test-sms/",
    "/services/meubles/",
    "/en/selection/",
    "/en/inventaire/",
    "/en/test-sms/",
    "/en/services/meubles/",
    "/en/tips/",
    "/estimation-print",
    "/estimation-privee",
    // Phase 1: thank-you + short carpet aliases (301 → nettoyage-tapis-*); canonical URLs stay indexed
    "/merci/",
    "/services/tapis-residentiel",
    "/services/tapis-commercial",
    "/en/services/tapis-residentiel",
    "/en/services/tapis-commercial",
    // Legacy EN leather alias → 301 to meubles-cuir; do not index duplicate
    "/en/services/nettoyage-sofa-cuir",
  ];
  return !excludedSubstrings.some((sub) => url.includes(sub));
};

export default defineConfig({
  site: 'https://groupenettoyageempire.com',
  output: 'static',
  adapter: netlify(),
  integrations: [sitemap({ filter: sitemapFilter })],
  build: {
    /**
     * Homepage CSS delivery (measured FR `/` Lighthouse mobile ×3 each):
     * - `auto` → two external render-blocking sheets (`/_astro/allergies-*.css` + `index-*.css`).
     *   The “allergies” filename is Rollup chunk naming — that file is shared global Layout/CSS, not the conseils article.
     * - `always` → styles inlined in HTML; median LCP ~2.89s vs ~4.14s for `auto` on same machine; render-blocking audit: 0 external CSS rows.
     */
    inlineStylesheets: 'always'
  },
  redirects: {
    '/promo/meubles/': '/services/meubles-tissu',
    '/promo/tapis/': '/services/nettoyage-tapis-residentiel',
    '/promo/matelas/': '/services/nettoyage-desinfection-matelas',
    '/promo/tuiles/': '/services/nettoyage-tuiles-ceramique',
    '/promo/merci/': '/merci',
    '/promo/en/furniture/': '/en/services/meubles-tissu',
    '/promo/en/carpets/': '/en/services/nettoyage-tapis-residentiel',
    '/promo/en/mattress/': '/en/services/nettoyage-desinfection-matelas',
    '/promo/en/tiles/': '/en/services/nettoyage-tuiles-ceramique',
    '/promo/en/thank-you/': '/en/merci',
    '/services/tapis-residentiel': '/services/nettoyage-tapis-residentiel',
    '/services/tapis-commercial': '/services/nettoyage-tapis-commercial',
    '/en/services/tapis-residentiel': '/en/services/nettoyage-tapis-residentiel',
    '/en/services/tapis-commercial': '/en/services/nettoyage-tapis-commercial',
    '/en/tips/erreurs-taches-tapis': '/en/conseils/erreurs-taches-tapis',
    '/en/tips/urine-animaux-tapis': '/en/conseils/urine-animaux-tapis',
    '/en/tips/nettoyage-vapeur-vs-location': '/en/conseils/nettoyage-vapeur-vs-location',
    '/soumission-en-ligne': '/contact',
    '/blog': '/conseils',
    '/en/blog': '/en/conseils',
    '/nettoyage-tapis-résidentiel': '/services/nettoyage-tapis-residentiel',
    '/nettoyage-de-sofa': '/services/meubles-tissu',
    // Video gallery FR/EN use different slugs — hreflang symmetry produces legacy aliases; redirect to real routes
    '/video-gallery': '/realisations-video',
    '/en/realisations-video': '/en/video-gallery',
    // /en/services/nettoyage-sofa-cuir → meubles-cuir: forced 301! in public/_redirects (overrides static file)
    ...legacyServiceRedirects,
    ...upholsteryRedirects,
  },
  i18n: {
    defaultLocale: "fr",
    locales: ["fr", "en"],
    routing: {
      prefixDefaultLocale: false
    }
  },
  security: {
    checkOrigin: false
  }
});