import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

test('Integration: Static files and critical assets exist in dist/ directory', () => {
  assert.ok(fs.existsSync(distDir), 'dist/ directory must exist after build.');

  const criticalFiles = [
    'index.html',
    'privacy.html',
    'terms.html',
    'cookies.html',
    'sitemap.xml',
    'robots.txt',
    '_headers',
    'config/assumptions.json',
    'config/claims.json',
    'config/site-config.json',
    'assets/og-image.png',
    'services/websites-development.html',
    'services/gmb-management.html',
    'services/media-management.html',
    'services/digital-promotions.html',
    'services/application-development.html',
    'services/branding.html'
  ];

  for (const file of criticalFiles) {
    const fullPath = path.join(distDir, file);
    assert.ok(fs.existsSync(fullPath), `Critical file "${file}" must exist in dist/ for Cloudflare Pages deployment.`);
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size > 0, `File "${file}" must not be empty.`);
  }

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
  const termsHtml = fs.readFileSync(termsPath, 'utf8');

  assert.ok(termsHtml.includes('id="asset-ownership"'), 'dist/terms.html must contain #asset-ownership');
  assert.ok(termsHtml.includes('id="ad-billing"'), 'dist/terms.html must contain #ad-billing');
  assert.ok(termsHtml.includes('id="onboarding-sla"'), 'dist/terms.html must contain #onboarding-sla');
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
