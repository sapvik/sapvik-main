import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, validateContactPayload, validateOrigin } from '../functions/lib/security.js';

test('Security: escapeHtml properly neutralizes markup injection', () => {
  const unsafe = '<script>alert("XSS & danger")</script>\'test\'';
  const safe = escapeHtml(unsafe);
  assert.equal(safe, '&lt;script&gt;alert(&quot;XSS &amp; danger&quot;)&lt;/script&gt;&#039;test&#039;');
});

test('Security: validateContactPayload enforces name, phone, email, and consent', () => {
  // Valid payload
  const valid = validateContactPayload({
    name: 'Rahul Sharma',
    phone: '+91 98200 12345',
    email: 'rahul@brand.com',
    consent: true
  });
  assert.equal(valid.valid, true);

  // Missing consent
  const noConsent = validateContactPayload({
    name: 'Rahul Sharma',
    phone: '+91 98200 12345',
    email: 'rahul@brand.com',
    consent: false
  });
  assert.equal(noConsent.valid, false);

  // Invalid email
  const badEmail = validateContactPayload({
    name: 'Rahul Sharma',
    phone: '+91 98200 12345',
    email: 'not-an-email',
    consent: true
  });
  assert.equal(badEmail.valid, false);

  // Too short name
  const shortName = validateContactPayload({
    name: 'A',
    phone: '+91 98200 12345',
    email: 'a@example.com',
    consent: true
  });
  assert.equal(shortName.valid, false);
});

test('Security: validateOrigin permits allowed hosts and rejects foreign origins', () => {
  const mockReqSapvik = { headers: new Headers({ 'Origin': 'https://sapvik.com' }) };
  assert.equal(validateOrigin(mockReqSapvik, ['sapvik.com', 'localhost']), true);

  const mockReqLocal = { headers: new Headers({ 'Origin': 'http://localhost:8082' }) };
  assert.equal(validateOrigin(mockReqLocal, ['sapvik.com', 'localhost']), true);

  const mockReqEvil = { headers: new Headers({ 'Origin': 'https://attacker.evil.com' }) };
  assert.equal(validateOrigin(mockReqEvil, ['sapvik.com', 'localhost']), false);

  const mockReqNoOrigin = { headers: new Headers({}) };
  assert.equal(validateOrigin(mockReqNoOrigin, ['sapvik.com', 'localhost']), true);
});

test('Security: crypto.randomUUID produces standard RFC 4122 v4 UUID format', () => {
  const uuid = crypto.randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(uuid), `Generated UUID ${uuid} did not match standard format`);
});
