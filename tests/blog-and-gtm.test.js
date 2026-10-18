import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

test('GTM Security: Verified container injection and no dummy fallback', () => {
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('GTM-SAPVIK1'), false, 'dist/index.html must not contain dummy GTM-SAPVIK1');
  const configuredGtmId = process.env.PUBLIC_GTM_ID || 'GTM-KWPN6JRN';
  assert.ok(indexHtml.includes('googletagmanager.com/gtm.js'), 'dist/index.html must load GTM script when PUBLIC_GTM_ID is set');
  assert.ok(indexHtml.includes(configuredGtmId), 'dist/index.html must contain configured GTM ID');
  assert.ok(indexHtml.includes(`googletagmanager.com/ns.html?id=${configuredGtmId}`), 'dist/index.html must load GTM noscript iframe');
});

test('Blog Content: "280ms" is removed from blog titles', () => {
  const cwvHtml = fs.readFileSync(path.join(distDir, 'blog', 'core-web-vitals-mobile-india-latency.html'), 'utf8');
  assert.equal(cwvHtml.includes('280ms'), false, 'Blog post must not claim 280ms in title or body');
});

test('Blog Content: Traditional builder payload is explicitly labeled illustrative', () => {
  const cwvMarkdown = fs.readFileSync(path.join(__dirname, '..', 'src', 'content', 'blog', 'core-web-vitals-mobile-india-latency.md'), 'utf8');
  assert.ok(cwvMarkdown.includes('Illustrative Builder Payload'), 'Payload must be labeled illustrative');
  assert.ok(cwvMarkdown.includes('illustrative breakdown'), 'Payload breakdown must be labeled illustrative');
});

test('Blog Content: GBP post does not contain ~60% claim or "mandates video verification for the vast majority"', () => {
  const gbpMarkdown = fs.readFileSync(path.join(__dirname, '..', 'src', 'content', 'blog', 'gbp-verification-guide-india-2026.md'), 'utf8');
  assert.equal(gbpMarkdown.includes('~60%'), false, 'GBP post must not claim ~60%');
  assert.equal(gbpMarkdown.includes('mandates interactive video verification for the vast majority'), false, 'GBP post must soften video verification claim');
  assert.ok(gbpMarkdown.includes('foundational anchor for keyword matching'));
});

test('Blog Structured Data: Every BlogPosting schema contains a valid image property', () => {
  // 1. Check blog index page (CollectionPage hasPart array)
  const blogIndexHtml = fs.readFileSync(path.join(distDir, 'blog.html'), 'utf8');
  const indexMatch = blogIndexHtml.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(indexMatch, 'dist/blog.html must contain JSON-LD');
  const indexJson = JSON.parse(indexMatch[1]);
  const collection = indexJson['@graph'].find(item => item['@type'] === 'CollectionPage');
  assert.ok(collection, 'CollectionPage must exist in @graph');
  assert.ok(Array.isArray(collection.hasPart), 'hasPart must be an array');
  for (const part of collection.hasPart) {
    if (part['@type'] === 'BlogPosting') {
      assert.ok(part.image, `BlogPosting for "${part.headline}" must have an image property`);
      assert.ok(part.image.startsWith('https://'), `BlogPosting image "${part.image}" must be absolute https URL`);
    }
  }

  // 2. Check individual article pages
  const articleFiles = fs.readdirSync(path.join(distDir, 'blog')).filter(f => f.endsWith('.html') && f !== 'index.html');
  assert.ok(articleFiles.length >= 3, 'Must have at least 3 blog post HTML files');

  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(distDir, 'blog', file), 'utf8');
    const match = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(match, `${file} must contain JSON-LD`);
    const json = JSON.parse(match[1]);
    const article = json['@graph'].find(item => item['@type'] === 'BlogPosting');
    assert.ok(article, `${file} must contain a BlogPosting in @graph`);
    assert.ok(article.image, `${file} BlogPosting must have an image property`);
    const imageUrl = Array.isArray(article.image) ? article.image[0] : (typeof article.image === 'object' ? article.image.url : article.image);
    assert.ok(imageUrl.startsWith('https://'), `${file} image must be an absolute URL`);
  }
});

test('Audit Timeout: functions/api/audit.js calls executeLiveScan without 3.5 override and no perimeter fallback comment', () => {
  const auditJs = fs.readFileSync(path.join(__dirname, '..', 'functions', 'api', 'audit.js'), 'utf8');
  assert.equal(auditJs.includes('executeLiveScan(normalizedTarget, 3.5)'), false);
  assert.equal(auditJs.includes('perimeter fallback'), false);
  assert.ok(auditJs.includes('executeLiveScan(normalizedTarget)'));
});

test('Contact Defaults: functions/api/contact.js does not fall back to leads@sapvik.com or growth@sapvik.com when env is empty', () => {
  const contactJs = fs.readFileSync(path.join(__dirname, '..', 'functions', 'api', 'contact.js'), 'utf8');
  assert.equal(contactJs.includes("|| 'leads@sapvik.com'"), false);
  assert.equal(contactJs.includes("|| 'growth@sapvik.com'"), false);
});

test('Public IDs Build Verification: dist/index.html contains GTM container and client bundle contains Turnstile site key', () => {
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('googletagmanager.com/gtm.js'), 'dist/index.html must load GTM script');
  assert.ok(indexHtml.includes('GTM-KWPN6JRN'), 'dist/index.html must contain GTM-KWPN6JRN');

  // Search all client JS files in dist/_astro/ for the Turnstile site key
  const astroAssetsDir = path.join(distDir, '_astro');
  assert.ok(fs.existsSync(astroAssetsDir), 'dist/_astro directory must exist');
  const jsFiles = fs.readdirSync(astroAssetsDir).filter(f => f.endsWith('.js'));
  assert.ok(jsFiles.length > 0, 'dist/_astro must contain client JS bundles');

  let turnstileKeyFound = false;
  for (const jsFile of jsFiles) {
    const content = fs.readFileSync(path.join(astroAssetsDir, jsFile), 'utf8');
    if (content.includes('0x4AAAAAAAFTY0v25vZJ_wPCQ')) {
      turnstileKeyFound = true;
      break;
    }
  }
  assert.ok(turnstileKeyFound, 'Client bundle in dist/_astro must contain Turnstile site key 0x4AAAAAAAFTY0v25vZJ_wPCQ');
});

test('404 Page: dist/404.html exists with links to home, services, and robots noindex', () => {
  const notFoundPath = path.join(distDir, '404.html');
  assert.ok(fs.existsSync(notFoundPath), 'dist/404.html must exist for Cloudflare Pages SPA/soft-404 prevention');
  const html = fs.readFileSync(notFoundPath, 'utf8');
  assert.ok(html.includes('Page Not Found'), '404 page must have Page Not Found heading');
  assert.ok(html.includes('href="/"'), '404 page must link to home');
  assert.ok(html.includes('href="/#services"') || html.includes('href="/services/'), '404 page must link to services');
  assert.ok(html.includes('href="/#contact"'), '404 page must link to contact');
  assert.ok(html.includes('name="robots"') && html.includes('noindex'), '404 page must have robots noindex directive');
});
