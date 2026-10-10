import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePayload, trackEvent, getScoreBucket, getLatencyBucket } from '../src/lib/analytics.ts';

test('Analytics: sanitizePayload strips banned PII keys', () => {
  const dirty = {
    service: 'websites-development',
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    phone: '+91 98200 12345',
    details: 'Looking for a redesign of our hospital portal',
    budget_tier: '50k-100k'
  };

  const clean = sanitizePayload(dirty);

  assert.equal(clean.service, 'websites-development');
  assert.equal(clean.budget_tier, '50k-100k');
  assert.equal(clean.name, undefined, 'Field "name" must be stripped');
  assert.equal(clean.email, undefined, 'Field "email" must be stripped');
  assert.equal(clean.phone, undefined, 'Field "phone" must be stripped');
  assert.equal(clean.details, undefined, 'Field "details" must be stripped');
});

test('Analytics: sanitizePayload strips target and domain fields to preserve client domain privacy', () => {
  const dirty = {
    target: 'kailashclinic.in',
    domain: 'kailashclinic.in',
    mode: 'audited',
    has_domain: true
  };

  const clean = sanitizePayload(dirty);
  assert.equal(clean.target, undefined, 'Field "target" must be stripped');
  assert.equal(clean.domain, undefined, 'Field "domain" must be stripped');
  assert.equal(clean.mode, 'audited');
  assert.equal(clean.has_domain, true);
});

test('Analytics: sanitizePayload scrubs embedded email and phone patterns in text values', () => {
  const dirty = {
    context: 'User requested contact at test@sample.in with phone 9820012345',
    category: 'inquiry'
  };

  const clean = sanitizePayload(dirty);
  assert.ok(!clean.context.includes('test@sample.in'), 'Email should not appear in sanitized value');
  assert.ok(!clean.context.includes('9820012345'), 'Phone should not appear in sanitized value');
  assert.ok(clean.context.includes('[REDACTED_EMAIL]'));
  assert.ok(clean.context.includes('[REDACTED_PHONE]'));
});

test('Analytics: getScoreBucket maps numeric scores into privacy-safe buckets', () => {
  assert.equal(getScoreBucket(0), '0-49');
  assert.equal(getScoreBucket(35), '0-49');
  assert.equal(getScoreBucket(49), '0-49');
  assert.equal(getScoreBucket(50), '50-79');
  assert.equal(getScoreBucket(65), '50-79');
  assert.equal(getScoreBucket(79), '50-79');
  assert.equal(getScoreBucket(80), '80-100');
  assert.equal(getScoreBucket(95), '80-100');
  assert.equal(getScoreBucket(100), '80-100');
  assert.equal(getScoreBucket(null), '0-49');
  assert.equal(getScoreBucket(undefined), '0-49');
});

test('Analytics: getLatencyBucket maps response times into privacy-safe buckets', () => {
  assert.equal(getLatencyBucket(120), '<500ms');
  assert.equal(getLatencyBucket(499), '<500ms');
  assert.equal(getLatencyBucket(500), '500-1499ms');
  assert.equal(getLatencyBucket(1200), '500-1499ms');
  assert.equal(getLatencyBucket(1499), '500-1499ms');
  assert.equal(getLatencyBucket(1500), '1500ms+');
  assert.equal(getLatencyBucket(3500), '1500ms+');
  assert.equal(getLatencyBucket(null), '<500ms');
  assert.equal(getLatencyBucket(undefined), '<500ms');
});

test('Analytics: trackEvent pushes sanitized event to window.dataLayer', () => {
  // Mock window and dataLayer
  globalThis.window = {
    dataLayer: []
  };

  trackEvent('generate_lead', {
    lead_id: 'UUID-TEST-1234',
    service: 'digital-promotions',
    source: 'calculator',
    email: 'secret@domain.com'
  });

  assert.equal(globalThis.window.dataLayer.length, 1);
  const pushed = globalThis.window.dataLayer[0];

  assert.equal(pushed.event, 'generate_lead');
  assert.equal(pushed.lead_id, 'UUID-TEST-1234');
  assert.equal(pushed.service, 'digital-promotions');
  assert.equal(pushed.source, 'calculator');
  assert.equal(pushed.email, undefined, 'PII email must never reach dataLayer');
  assert.ok(typeof pushed.event_timestamp === 'number');

  // Clean up global mock
  delete globalThis.window;
});

test('Analytics: scan_start sends no target or domain parameter', () => {
  globalThis.window = { dataLayer: [] };

  trackEvent('scan_start');

  assert.equal(globalThis.window.dataLayer.length, 1);
  const event = globalThis.window.dataLayer[0];
  assert.equal(event.event, 'scan_start');
  assert.equal(event.target, undefined, 'scan_start must not include target');
  assert.equal(event.domain, undefined, 'scan_start must not include domain');

  delete globalThis.window;
});

test('Analytics: scan_complete sends score_bucket and latency_bucket without target', () => {
  globalThis.window = { dataLayer: [] };

  trackEvent('scan_complete', {
    score_bucket: getScoreBucket(85),
    latency_bucket: getLatencyBucket(320)
  });

  assert.equal(globalThis.window.dataLayer.length, 1);
  const event = globalThis.window.dataLayer[0];
  assert.equal(event.event, 'scan_complete');
  assert.equal(event.score_bucket, '80-100');
  assert.equal(event.latency_bucket, '<500ms');
  assert.equal(event.target, undefined);
  assert.equal(event.domain, undefined);
  assert.equal(event.score, undefined, 'Raw score should not be sent');

  delete globalThis.window;
});

test('Analytics: scan_error sends error_code only', () => {
  globalThis.window = { dataLayer: [] };

  trackEvent('scan_error', {
    error_code: 'dns_unavailable'
  });

  assert.equal(globalThis.window.dataLayer.length, 1);
  const event = globalThis.window.dataLayer[0];
  assert.equal(event.event, 'scan_error');
  assert.equal(event.error_code, 'dns_unavailable');
  assert.equal(event.target, undefined);
  assert.equal(event.domain, undefined);

  delete globalThis.window;
});
