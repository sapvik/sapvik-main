import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

async function generate() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const renderIconHtml = (size) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${size}px;
      height: ${size}px;
      overflow: hidden;
      background: #12161C;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-svg {
      width: ${Math.round(size * 0.76)}px;
      height: ${Math.round(size * 0.76)}px;
    }
  </style>
</head>
<body>
  <svg class="icon-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Vertex V blades meeting at one point (Strategy + Execution) -->
    <path d="M36 156L100 36L164 156L100 126L36 156Z" fill="#FFFFFF" />
    <path d="M100 36L164 156L100 126L100 36Z" fill="#DFE3E8" />
    <!-- Vermilion focal square (The point of focus above the noise) -->
    <rect x="91" y="146" width="18" height="18" fill="#C93A22" />
  </svg>
</body>
</html>`;

  // Render 512x512
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(renderIconHtml(512));
  const buf512 = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), buf512);

  // Render 192x192
  await page.setViewportSize({ width: 192, height: 192 });
  await page.setContent(renderIconHtml(192));
  const buf192 = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), buf192);

  // Render 180x180 (Apple Touch Icon)
  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(renderIconHtml(180));
  const buf180 = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buf180);

  // Render 32x32
  await page.setViewportSize({ width: 32, height: 32 });
  await page.setContent(renderIconHtml(32));
  const buf32 = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), buf32);

  // Render 16x16
  await page.setViewportSize({ width: 16, height: 16 });
  await page.setContent(renderIconHtml(16));
  const buf16 = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), buf16);

  await browser.close();
  console.log('Successfully generated PNG icons: 512, 192, apple-touch-icon (180), 32, 16');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
