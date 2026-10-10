import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest as auditHandler } from '../functions/api/audit.js';
import { onRequestPost as contactHandler } from '../functions/api/contact.js';

test('API /api/audit: Rejects non-POST methods with 405', async () => {
  const getReq = new Request('http://localhost:8082/api/audit', { method: 'GET' });
  const res = await auditHandler({ request: getReq, env: {} });
  assert.equal(res.status, 405);
  const data = await res.json();
  assert.equal(data.error, 'method_not_allowed');
});

test('API /api/audit: Rejects empty or malformed payload with 400', async () => {
  const badReq = new Request('http://localhost:8082/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const res = await auditHandler({ request: badReq, env: {} });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'missing_url');
});

test('API /api/audit: Blocks loopback and SSRF targets with 400', async () => {
  const ssrfReq = new Request('http://localhost:8082/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'http://127.0.0.1' })
  });
  const res = await auditHandler({ request: ssrfReq, env: {} });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'invalid_target');
  assert.equal(data.has_ssl, null);
});

test('API /api/contact: Rejects cross-origin requests with 403', async () => {
  const evilReq = new Request('http://localhost:8082/api/contact', {
    method: 'POST',
    headers: {
      'Origin': 'https://malicious-site.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'Test', phone: '+91 98765 00000', email: 'test@brand.com', consent: true })
  });
  const res = await contactHandler({ request: evilReq, env: {} });
  assert.equal(res.status, 403);
});

test('API /api/contact: Rejects payload exceeding 50KB with 413', async () => {
  const hugePayload = 'A'.repeat(51000);
  const hugeReq = new Request('http://localhost:8082/api/contact', {
    method: 'POST',
    headers: {
      'Content-Length': '52000',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: hugePayload })
  });
  const res = await contactHandler({ request: hugeReq, env: {} });
  assert.equal(res.status, 413);
});

test('API /api/contact: Silently discards honeypot bots', async () => {
  const botReq = new Request('http://localhost:8082/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bot User',
      website_url_hp: 'http://spam.org',
      consent: true
    })
  });
  const res = await contactHandler({ request: botReq, env: {} });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.lead_id, 'SUB-BOT-DISCARD');
});

test('API /api/contact: Requires consent and mandatory fields', async () => {
  const noConsentReq = new Request('http://localhost:8082/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Valid Name',
      phone: '+91 98765 43210',
      email: 'valid@brand.com',
      consent: false
    })
  });
  const res = await contactHandler({ request: noConsentReq, env: {} });
  assert.equal(res.status, 400);
});

test('API /api/contact: Returns delivery_offline and WhatsApp fallback when no delivery configured', async () => {
  const validReq = new Request('http://localhost:8082/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Business Lead',
      phone: '+91 98765 11111',
      email: 'lead@business.com',
      consent: true
    })
  });
  // No BREVO_API_KEY and no LEAD_WEBHOOK_URL
  const res = await contactHandler({ request: validReq, env: {} });
  assert.equal(res.status, 503);
  const json = await res.json();
  assert.equal(json.ok, false);
  assert.equal(json.error, 'delivery_offline');
  assert.equal(json.whatsapp_fallback, true);
  // Verify standard UUID was generated
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(json.lead_id));
});

test('API /api/contact: Silently discards contact_ref_code honeypot bots', async () => {
  const botReq = new Request('http://localhost:8082/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bot User',
      contact_ref_code: 'spam-bot-value',
      phone: '+91 98765 00000',
      email: 'bot@spam.org',
      consent: true
    })
  });
  const res = await contactHandler({ request: botReq, env: {} });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.lead_id, 'SUB-BOT-DISCARD');
});

test('API /api/contact: Accepts aligned payload fields (details, marketing_consent, utm, audit)', async () => {
  const fullReq = new Request('http://localhost:8082/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Real Lead',
      phone: '+91 98765 22222',
      email: 'real@company.com',
      business: 'Enterprise Corp',
      website: 'enterprise.com',
      service: 'websites',
      details: 'Needs redesign and faster TTFB',
      consent: true,
      marketing_consent: true,
      utm: { utm_source: 'google', utm_campaign: 'spring' },
      audit: { domain: 'enterprise.com', score: 72 }
    })
  });
  // Should process without validation error, returning 503 only because zero delivery env is wired
  const res = await contactHandler({ request: fullReq, env: {} });
  assert.equal(res.status, 503);
  const json = await res.json();
  assert.equal(json.error, 'delivery_offline');
});

test('API /api/audit: Rejects payload exceeding 50KB with 413', async () => {
  const hugePayload = 'A'.repeat(52000);
  const hugeReq = new Request('http://localhost:8082/api/audit', {
    method: 'POST',
    headers: {
      'Content-Length': '53000',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: 'https://example.com', padding: hugePayload })
  });
  const res = await auditHandler({ request: hugeReq, env: {} });
  assert.equal(res.status, 413);
});

test('API /api/audit: Rejects cross-origin requests with 403', async () => {
  const evilReq = new Request('http://localhost:8082/api/audit', {
    method: 'POST',
    headers: {
      'Origin': 'https://attacker.evil.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: 'https://example.com' })
  });
  const res = await auditHandler({ request: evilReq, env: {} });
  assert.equal(res.status, 403);
  const json = await res.json();
  assert.equal(json.error, 'cross_origin_blocked');
});


