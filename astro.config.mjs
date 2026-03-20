// @ts-check
// v2.0.5 - final authorized synchronization fix
import { defineConfig } from 'astro/config'; // v2.0.2 - manual push required

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// https://astro.build/config
import netlify from '@astrojs/netlify';

const sitemapFilter = (url) => {
  const excludedSubstrings = [
    "/selection/",
    "/inventaire/",
    "/test-sms/",
    "/services/meubles/",
    "/en/selection/",
    "/en/inventaire/",
    "/en/test-sms/",
    "/en/services/meubles/",
    "/en/tips/",
  ];
  return !excludedSubstrings.some((sub) => url.includes(sub));
};

export default defineConfig({
  site: 'https://groupenettoyageempire.com',
  output: 'server',
  adapter: netlify(),
  integrations: [sitemap({ filter: sitemapFilter })],
  build: {
    inlineStylesheets: 'always'
  },
  redirects: {
    '/services/tapis-residentiel': '/services/nettoyage-tapis-residentiel',
    '/en/tips/erreurs-taches-tapis': '/en/conseils/erreurs-taches-tapis',
    '/en/tips/urine-animaux-tapis': '/en/conseils/urine-animaux-tapis',
    '/en/tips/nettoyage-vapeur-vs-location': '/en/conseils/nettoyage-vapeur-vs-location',
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