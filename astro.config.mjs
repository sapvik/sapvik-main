import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://sapvik.com',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/config/')
    })
  ],
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file'
  }
});
