import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

function getBlogLastmods() {
  const blogDir = path.resolve('./src/content/blog');
  const dates = new Map();
  if (!fs.existsSync(blogDir)) return dates;
  for (const file of fs.readdirSync(blogDir)) {
    if (!file.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
    const slug = file.replace(/\.md$/, '');
    const mUp = content.match(/updatedDate:\s*([^\r\n]+)/);
    const mPub = content.match(/pubDate:\s*([^\r\n]+)/);
    const dateStr = (mUp ? mUp[1] : (mPub ? mPub[1] : '')).trim().replace(/['"]/g, '');
    if (dateStr) {
      dates.set(`/blog/${slug}`, new Date(dateStr));
    }
  }
  return dates;
}

const blogDates = getBlogLastmods();

const draftRoutes = ['/audit', '/bengaluru', '/about', '/pricing', '/case-studies'];

// https://astro.build/config
export default defineConfig({
  site: 'https://sapvik.com',
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        if (page.includes('/config/')) return false;
        if (page.includes('/404') || page.endsWith('/404.html')) return false;
        if (draftRoutes.some(d => page.includes(d))) return false;
        return true;
      },
      serialize(item) {
        for (const [route, date] of blogDates.entries()) {
          if (item.url.endsWith(route)) {
            item.lastmod = date;
            break;
          }
        }
        return item;
      }
    })
  ],
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file'
  }
});

