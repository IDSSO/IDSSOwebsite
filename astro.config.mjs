// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://idssochi.org',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // /nmo/ is a static mini-site in public/ and is not part of the Astro route tree.
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
