// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://teachable.expert',
  vite: {
    plugins: [tailwindcss()]
  },

  markdown: {
    shikiConfig: {
      theme: 'dracula',
      wrap: true,
    },
  },

  integrations: [
    sitemap(),
  ],
  redirects: {
    '/teachable-api': '/api-guides/teachable-api'
  }
});