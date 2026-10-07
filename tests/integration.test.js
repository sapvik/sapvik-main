import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

test('Integration: Static files and critical assets exist in public/ directory', () => {
  const criticalFiles = [
    'index.html',
    'privacy.html',
    'terms.html',
    'cookies.html',
    'sitemap.xml',
    'robots.txt',
    '_headers',
    'css/styles.css',
    'css/fonts.css',
    'js/main.js',
    'js/engine.js',
    'js/calculator.js',
    'config/assumptions.json',
    'config/claims.json',
    'config/site-config.json',
    'assets/og-image.png'
  ];

  for (const file of criticalFiles) {
    const fullPath = path.join(publicDir, file);
    assert.ok(fs.existsSync(fullPath), `Critical file "${file}" must exist in public/ for Cloudflare Pages deployment.`);
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size > 0, `File "${file}" must not be empty.`);
  }
});

test('Integration: Zero placeholder numbers (9876543210) across public files', () => {
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
  scan(publicDir);
});

test('Integration: assumptions.json strictly marks every industry source as placeholder_benchmark', () => {
  const assumptionsPath = path.join(publicDir, 'config', 'assumptions.json');
  const assumptions = JSON.parse(fs.readFileSync(assumptionsPath, 'utf8'));

  assert.equal(assumptions.calculator_type, 'illustrative_simulator');
  for (const [key, ind] of Object.entries(assumptions.industries || {})) {
    assert.equal(ind.source, 'placeholder_benchmark', `Industry "${key}" source must be "placeholder_benchmark".`);
  }
});

test('Integration: terms.html contains legal anchors for operational claims', () => {
  const termsPath = path.join(publicDir, 'terms.html');
  const termsHtml = fs.readFileSync(termsPath, 'utf8');

  assert.ok(termsHtml.includes('id="asset-ownership"'), 'terms.html must contain #asset-ownership');
  assert.ok(termsHtml.includes('id="ad-billing"'), 'terms.html must contain #ad-billing');
  assert.ok(termsHtml.includes('id="onboarding-sla"'), 'terms.html must contain #onboarding-sla');
});
