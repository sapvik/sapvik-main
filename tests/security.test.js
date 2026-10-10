import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml, validateContactPayload, validateOrigin, verifyTurnstileToken, resetTurnstileWarnOnceForTests } from '../functions/lib/security.js';

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

test('Security: validateOrigin permits requests from own host (pages.dev preview deployments)', () => {
  const mockPagesDevReq = {
    url: 'https://sapvik-website-preview.pages.dev/api/contact',
    headers: new Headers({ 'Origin': 'https://sapvik-website-preview.pages.dev' })
  };
  assert.equal(validateOrigin(mockPagesDevReq, ['sapvik.com', 'localhost']), true);
});

test('Security: validateOrigin blocks foreign origins even when request.url is set', () => {
  const mockAttackerReq = {
    url: 'https://sapvik-website-preview.pages.dev/api/contact',
    headers: new Headers({ 'Origin': 'https://malicious-spammer.com' })
  };
  assert.equal(validateOrigin(mockAttackerReq, ['sapvik.com', 'localhost']), false);
});

test('Security: crypto.randomUUID produces standard RFC 4122 v4 UUID format', () => {
  const uuid = crypto.randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(uuid), `Generated UUID ${uuid} did not match standard format`);
});

test('Security: verifyTurnstileToken skips and returns bypassed: true in zero-env mode', async () => {
  resetTurnstileWarnOnceForTests();
  let warned = false;
  const originalWarn = console.warn;
  console.warn = (msg) => {
    if (String(msg).includes('Turnstile secret key not configured')) {
      warned = true;
    }
  };

  try {
    const res = await verifyTurnstileToken('', undefined, '127.0.0.1');
    assert.equal(res.success, true);
    assert.equal(res.bypassed, true);
    assert.equal(warned, true);

    // Verify warn-once: second call should not warn again
    let warnedSecondTime = false;
    console.warn = () => { warnedSecondTime = true; };
    const res2 = await verifyTurnstileToken('', undefined, '127.0.0.1');
    assert.equal(res2.success, true);
    assert.equal(res2.bypassed, true);
    assert.equal(warnedSecondTime, false);
  } finally {
    console.warn = originalWarn;
  }
});

test('Security: verifyTurnstileToken rejects missing token when secretKey is present', async () => {
  const res = await verifyTurnstileToken('', 'real-secret-key-123', '127.0.0.1');
  assert.equal(res.success, false);
  assert.equal(res.error, 'missing_turnstile_token');
});

test('Security: Zero occurrences of dummy Turnstile key 1x00000000000000000000AA in src/ and functions/', () => {
  const dummyKey = '1x00000000000000000000AA';
  const dirsToCheck = ['src', 'functions'];

  function checkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        checkDir(fullPath);
      } else if (entry.isFile() && /\.(js|jsx|ts|tsx|astro|html|json)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(
          !content.includes(dummyKey),
          `Found dummy Turnstile test key ${dummyKey} in file: ${fullPath}`
        );
      }
    }
  }

  for (const dir of dirsToCheck) {
    checkDir(dir);
  }
});

