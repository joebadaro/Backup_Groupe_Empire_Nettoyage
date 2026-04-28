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
     * `auto` externalizes large per-page CSS so the main thread is not stuck parsing a 90k+ character `<style>` in one task (homepage LCP element render delay in Lighthouse).
     * Keeps smaller chunks inlined where beneficial.
     */
    inlineStylesheets: 'auto'
  },
  redirects: {
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