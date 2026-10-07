import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePayload, trackEvent } from '../src/lib/analytics.ts';

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
