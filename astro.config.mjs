// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// https://astro.build/config
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://groupenettoyageempire.com',
  output: 'server',
  adapter: netlify(),
  integrations: [sitemap()],
  redirects: {
    '/services/tapis-residentiel': '/services/nettoyage-tapis-residentiel'
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