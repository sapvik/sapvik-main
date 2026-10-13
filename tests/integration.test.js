import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

test('Integration: Static files and critical assets exist in dist/ directory with directory format', () => {
  assert.ok(fs.existsSync(distDir), 'dist/ directory must exist after build.');

  const criticalFiles = [
    'index.html',
    'privacy.html',
    'terms.html',
    'cookies.html',
    'sitemap.xml',
    'robots.txt',
    '_headers',
    '_routes.json',
    'favicon.ico',
    'apple-touch-icon.png',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'config/assumptions.json',
    'assets/og-image.png',
    'services/website-development.html',
    'services/google-business-profile-management.html',
    'services/search-engine-optimization.html',
    'services/google-ads-meta-ads.html',
    'services/social-media-management.html',
    'services/application-development.html',
    'blog.html',
    'rss.xml'
  ];

  for (const file of criticalFiles) {
    const fullPath = path.join(distDir, file);
    assert.ok(fs.existsSync(fullPath), `Critical file "${file}" must exist in dist/ for Cloudflare Pages deployment.`);
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size > 0, `File "${file}" must not be empty.`);
  }

  // Ensure internal files are strictly removed from public deployment
  assert.ok(!fs.existsSync(path.join(distDir, 'config', 'claims.json')), 'Internal claims.json must NOT be public in dist/config');
  assert.ok(!fs.existsSync(path.join(distDir, 'config', 'site-config.json')), 'Internal site-config.json must NOT be public in dist/config');

  // Verify compiled assets in _astro/
  const astroDir = path.join(distDir, '_astro');
  assert.ok(fs.existsSync(astroDir), '_astro asset directory must exist');
  const astroFiles = fs.readdirSync(astroDir);
  assert.ok(astroFiles.length > 0, '_astro directory must contain compiled client scripts/styles');
});

test('Integration: Zero placeholder numbers (9876543210) across dist files', () => {
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(html|js|css|json)$/.test(entry.name)) {
        const text = fs.readFileSync(fullPath, 'utf8');
        assert.ok(!text.includes('9876543210'), `Found forbidden placeholder number 9876543210 in ${fullPath}`);
      }
    }
  }
  scan(distDir);
});

test('Integration: assumptions.json strictly marks every industry source as placeholder', () => {
  const assumptionsPath = path.join(distDir, 'config', 'assumptions.json');
  const assumptions = JSON.parse(fs.readFileSync(assumptionsPath, 'utf8'));

  assert.equal(assumptions.calculator_type, 'illustrative_simulator');
  for (const [key, ind] of Object.entries(assumptions.industries || {})) {
    assert.equal(ind.source, 'placeholder', `Industry "${key}" source must be "placeholder".`);
  }
});

test('Integration: terms.html contains legal anchors for operational claims', () => {
  const termsPath = path.join(distDir, 'terms.html');
  assert.ok(fs.existsSync(termsPath), 'dist/terms.html must exist');
  const termsHtml = fs.readFileSync(termsPath, 'utf8');

  assert.ok(termsHtml.includes('id="asset-ownership"'), 'dist/terms.html must contain #asset-ownership');
  assert.ok(termsHtml.includes('id="ad-billing"'), 'dist/terms.html must contain #ad-billing');
  assert.ok(termsHtml.includes('id="onboarding-sla"'), 'dist/terms.html must contain #onboarding-sla');
});

test('Integration: robots.txt disallows /api/ and /config/ and specifies sitemap', () => {
  const robotsPath = path.join(distDir, 'robots.txt');
  const robotsContent = fs.readFileSync(robotsPath, 'utf8');
  assert.ok(robotsContent.includes('Disallow: /api/'), 'robots.txt must disallow /api/');
  assert.ok(robotsContent.includes('Disallow: /config/'), 'robots.txt must disallow /config/');
  assert.ok(robotsContent.includes('Sitemap: https://sapvik.com/sitemap.xml'), 'robots.txt must specify sitemap');
});

test('Integration: _headers enforces strict HTTP security and caching directives', () => {
  const headersPath = path.join(distDir, '_headers');
  const headersContent = fs.readFileSync(headersPath, 'utf8');

  assert.ok(headersContent.includes('X-Frame-Options: DENY'), '_headers must include X-Frame-Options: DENY');
  assert.ok(headersContent.includes('X-Content-Type-Options: nosniff'), '_headers must include X-Content-Type-Options: nosniff');
  assert.ok(headersContent.includes('Strict-Transport-Security: max-age=31536000'), '_headers must include HSTS');
  assert.ok(headersContent.includes('Content-Security-Policy-Report-Only:'), '_headers must include CSP');
  assert.ok(headersContent.includes('/_astro/*'), '_headers must cache /_astro/*');
  assert.ok(headersContent.includes('/assets/*'), '_headers must cache /assets/*');
});
