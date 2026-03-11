// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import partytown from '@astrojs/partytown';

// https://astro.build/config
export default defineConfig({
  site: 'https://teachable.expert',
  vite: {
    plugins: [tailwindcss()]
  },

  markdown: {
    shikiConfig: {
      // 'dracula', 'material-theme-palenight', or 'github-dark' all look great
      theme: 'dracula',
      wrap: true, // Prevents horizontal scrolling on mobile
    },
  },

  integrations: [sitemap(), partytown()],
  redirects: {
    '/teachable-api': '/api-guides/teachable-api'
  }
});