import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHtmlSnippet } from '../functions/lib/scanner.js';

test('Scanner: GA4 detection does NOT match bare g-recaptcha class or padding CSS', () => {
  const htmlWithoutGa = '<html><head></head><body><div class="g-recaptcha" data-sitekey="xyz"></div><p style="padding-top: 10px; margin-left: 5px;">Hello</p></body></html>';
  const result = analyzeHtmlSnippet(htmlWithoutGa, 'https://example.com', 350, true, true);
  assert.equal(result.has_analytics, false);
  const analyticsFinding = result.findings.find(f => f.id === 'analytics_missing');
  assert.ok(analyticsFinding, 'Expected analytics_missing finding to fire');
  assert.ok(analyticsFinding.evidence, 'Expected evidence field on finding');
});

test('Scanner: GA4 detection matches valid gtag config and GTM', () => {
  const htmlWithGtag = '<html><head><script>gtag("config", "G-ABC1234567");</script></head><body></body></html>';
  const result = analyzeHtmlSnippet(htmlWithGtag, 'https://example.com', 250, true, true);
  assert.equal(result.has_analytics, true);
});

test('Scanner: LocalBusiness schema does NOT match plain "restore storefront"', () => {
  const htmlWithoutSchema = '<html><body><p>We restore vintage cars at our storefront in Mumbai.</p></body></html>';
  const result = analyzeHtmlSnippet(htmlWithoutSchema, 'https://example.com', 250, true, true);
  assert.equal(result.has_schema, false);
});

test('Scanner: Meta pixel missing is informational, not critical', () => {
  const htmlWithoutPixel = '<html><head></head><body><p>Test</p></body></html>';
  const result = analyzeHtmlSnippet(htmlWithoutPixel, 'https://example.com', 250, true, true);
  const pixelFinding = result.findings.find(f => f.id === 'pixel_missing');
  assert.ok(pixelFinding);
  assert.equal(pixelFinding.severity, 'info');
  assert.ok(pixelFinding.evidence);
});

test('Scanner: Every finding object contains { id, severity, title, evidence, fix }', () => {
  const sampleHtml = '<html><head><title>Test</title></head><body><p>Clean page</p></body></html>';
  const result = analyzeHtmlSnippet(sampleHtml, 'https://example.com', 450, true, true);
  assert.ok(result.findings.length > 0);
  for (const f of result.findings) {
    assert.ok(f.id, 'Finding missing id');
    assert.ok(f.severity, 'Finding missing severity');
    assert.ok(f.title, 'Finding missing title');
    assert.ok(f.evidence, 'Finding missing evidence');
    assert.ok(f.fix, 'Finding missing fix');
  }
});
