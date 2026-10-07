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
});
