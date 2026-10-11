import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://sapvik.com',
  integrations: [react()],
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'directory'
  }
});
