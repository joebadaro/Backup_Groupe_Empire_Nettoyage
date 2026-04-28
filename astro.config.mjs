// @ts-check
// v2.0.5 - final authorized synchronization fix
import { defineConfig } from 'astro/config'; // v2.0.2 - manual push required

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// https://astro.build/config
import netlify from '@astrojs/netlify';

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