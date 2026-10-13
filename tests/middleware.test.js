import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest, sanitizeReturnTo, constantTimeCompare, resetSitePasswordWarnOnceForTests } from '../functions/_middleware.js';

test('Middleware Gate: Blocks unauthenticated requests with HTTP 401 and lock screen', async () => {
  const request = new Request('http://localhost:8082/');
  let nextCalled = false;
  const context = {
    request,
    env: { SITE_PASSWORD: 'secretpass123' },
    next: async () => {
      nextCalled = true;
      return new Response('site content');
    }
  };

  const response = await onRequest(context);
  assert.equal(nextCalled, false);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
  const body = await response.text();
  assert.ok(body.includes('Preview Authorization'));
  assert.ok(body.includes('action="/_auth_login"'));
});

test('Middleware Gate: Rejects incorrect password on login attempt', async () => {
  const formData = new FormData();
  formData.append('password', 'wrong-pass');
  formData.append('return_to', '/scanner.html');

  const request = new Request('http://localhost:8082/_auth_login', {
    method: 'POST',
    body: formData
  });

  const context = {
    request,
    env: { SITE_PASSWORD: 'secretpass123' },
    next: async () => new Response('should not reach')
  };

  const start = Date.now();
  const response = await onRequest(context);
  const elapsed = Date.now() - start;

  assert.equal(response.status, 401);
  assert.ok(elapsed >= 750, `Expected delay >= 750ms for brute force mitigation, got ${elapsed}ms`);
  const body = await response.text();
  assert.ok(body.includes('Incorrect access passcode'));
});

test('Middleware Gate: Authenticates correct password, sets auth cookie, and redirects', async () => {
  const formData = new FormData();
  formData.append('password', 'secretpass123');
  formData.append('return_to', '/scanner.html');

  const request = new Request('http://localhost:8082/_auth_login', {
    method: 'POST',
    body: formData
  });

  const context = {
    request,
    env: { SITE_PASSWORD: 'secretpass123' },
    next: async () => new Response('should not reach')
  };

  const response = await onRequest(context);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/scanner.html');
  const cookie = response.headers.get('Set-Cookie');
  assert.ok(cookie && cookie.includes('sapvik_auth='));
  assert.ok(cookie.includes('HttpOnly'));
  assert.ok(cookie.includes('SameSite=Lax'));
});

test('Middleware Gate: sanitizeReturnTo strictly prevents open redirects and allows safe relative paths', () => {
  assert.equal(sanitizeReturnTo('//evil.com'), '/');
  assert.equal(sanitizeReturnTo('/\\evil.com'), '/');
  assert.equal(sanitizeReturnTo('/%5Cevil.com'), '/');
  assert.equal(sanitizeReturnTo('/%2Fevil.com'), '/');
  assert.equal(sanitizeReturnTo('https://evil.com'), '/');
  assert.equal(sanitizeReturnTo('//attacker.com'), '/');
  assert.equal(sanitizeReturnTo('///attacker.com'), '/');
  assert.equal(sanitizeReturnTo('/\\attacker.com'), '/');
  assert.equal(sanitizeReturnTo('\\attacker.com'), '/');
  assert.equal(sanitizeReturnTo('javascript:alert(1)'), '/');
  assert.equal(sanitizeReturnTo(''), '/');
  assert.equal(sanitizeReturnTo(null), '/');
  assert.equal(sanitizeReturnTo('/'), '/');

  assert.equal(sanitizeReturnTo('/services/websites-development.html'), '/services/websites-development.html');
  assert.equal(sanitizeReturnTo('/terms.html?tab=privacy'), '/terms.html?tab=privacy');
});

test('Middleware Gate: Prevents open redirect attacks via return_to in login submission', async () => {
  const evilPayloads = ['//evil.com', '/\\evil.com', 'https://evil.com', '//attacker.com/evil', '/%5Cevil.com'];

  for (const evil of evilPayloads) {
    const formData = new FormData();
    formData.append('password', 'secretpass123');
    formData.append('return_to', evil);

    const request = new Request('http://localhost:8082/_auth_login', {
      method: 'POST',
      body: formData
    });

    const context = {
      request,
      env: { SITE_PASSWORD: 'secretpass123' },
      next: async () => new Response()
    };

    const response = await onRequest(context);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), '/', `Expected evil payload "${evil}" to be sanitized to /`);
  }
});

test('Middleware Gate: constantTimeCompare correctly compares strings in constant time', () => {
  assert.equal(constantTimeCompare('abc', 'abc'), true);
  assert.equal(constantTimeCompare('abc', 'abd'), false);
  assert.equal(constantTimeCompare('abc', 'ab'), false);
  assert.equal(constantTimeCompare('', ''), true);
  assert.equal(constantTimeCompare('', 'a'), false);
});

test('Middleware Gate: Unset SITE_PASSWORD locks with default password sapvik2026', async () => {
  const request1 = new Request('http://localhost:8082/');
  let nextCalled = false;
  const res1 = await onRequest({
    request: request1,
    env: {}, // No SITE_PASSWORD
    next: async () => {
      nextCalled = true;
      return new Response('open public content');
    }
  });
  assert.equal(nextCalled, false);
  assert.equal(res1.status, 401);
  const body = await res1.text();
  assert.ok(body.includes('Preview Authorization'));
});

test('Middleware Gate: Allows authenticated requests with valid cookie', async () => {
  // First login to get cookie value
  const formData = new FormData();
  formData.append('password', 'secretpass123');
  const loginReq = new Request('http://localhost:8082/_auth_login', {
    method: 'POST',
    body: formData
  });
  const loginRes = await onRequest({
    request: loginReq,
    env: { SITE_PASSWORD: 'secretpass123' },
    next: async () => new Response()
  });
  const cookieVal = loginRes.headers.get('Set-Cookie').split(';')[0]; // sapvik_auth=...

  // Request protected route with valid cookie
  let nextCalled = false;
  const authRequest = new Request('http://localhost:8082/api/health', {
    headers: { 'Cookie': cookieVal }
  });
  const response = await onRequest({
    request: authRequest,
    env: { SITE_PASSWORD: 'secretpass123' },
    next: async () => {
      nextCalled = true;
      return new Response('protected data');
    }
  });

  assert.equal(nextCalled, true);
  assert.equal(await response.text(), 'protected data');
});

test('Middleware Gate: Bypasses gate ONLY when SITE_PASSWORD is "DISABLE" or "disabled"', async () => {
  const disableCases = [
    { SITE_PASSWORD: 'DISABLE' },
    { SITE_PASSWORD: 'disable' },
    { SITE_PASSWORD: 'disabled' },
    { SITE_PASSWORD: '  DISABLE  ' }
  ];

  for (const envObj of disableCases) {
    let nextCalled = false;
    const request = new Request('http://localhost:8082/');
    const response = await onRequest({
      request,
      env: envObj,
      next: async () => {
        nextCalled = true;
        return new Response('public site');
      }
    });

    assert.equal(nextCalled, true, `Expected open access for env ${JSON.stringify(envObj)}`);
    assert.equal(await response.text(), 'public site');
  }
});

test('Middleware: Redirects www.sapvik.com to apex domain sapvik.com with 301', async () => {
  const request = new Request('https://www.sapvik.com/services/website-development?ref=test');
  const response = await onRequest({
    request,
    env: { SITE_PASSWORD: 'DISABLE' },
    next: async () => new Response('should not reach')
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), 'https://sapvik.com/services/website-development?ref=test');
});

test('Middleware: Redirects *.pages.dev hosts to apex domain sapvik.com when REDIRECT_ALLOW is "true"', async () => {
  const request = new Request('https://sapvik-main.pages.dev/services/website-development');
  const response = await onRequest({
    request,
    env: { SITE_PASSWORD: 'DISABLE', REDIRECT_ALLOW: 'true' },
    next: async () => new Response('should not reach')
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), 'https://sapvik.com/services/website-development');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
});

test('Middleware: Does NOT redirect *.pages.dev hosts when REDIRECT_ALLOW is absent, but sets X-Robots-Tag: noindex', async () => {
  let nextCalled = false;
  const request = new Request('https://sapvik-main.pages.dev/services/website-development');
  const response = await onRequest({
    request,
    env: { SITE_PASSWORD: 'DISABLE' },
    next: async () => {
      nextCalled = true;
      return new Response('site on pages.dev');
    }
  });

  assert.equal(nextCalled, true);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Location'), null);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
  assert.equal(await response.text(), 'site on pages.dev');
});

test('Middleware: Redirects .html URLs to clean URLs with 301', async () => {
  const testCases = [
    { from: 'https://sapvik.com/privacy.html', to: 'https://sapvik.com/privacy' },
    { from: 'https://sapvik.com/terms.html', to: 'https://sapvik.com/terms' },
    { from: 'https://sapvik.com/services/website-development.html', to: 'https://sapvik.com/services/website-development' },
    { from: 'https://sapvik.com/services/social-media-management.html', to: 'https://sapvik.com/services/social-media-management' }
  ];

  for (const tc of testCases) {
    const request = new Request(tc.from);
    const response = await onRequest({
      request,
      env: { SITE_PASSWORD: 'DISABLE' },
      next: async () => new Response('should not reach')
    });

    assert.equal(response.status, 301, `Expected 301 redirect for ${tc.from}`);
    assert.equal(response.headers.get('Location'), tc.to, `Expected redirect to ${tc.to} for ${tc.from}`);
  }
});

test('Middleware: Redirects legacy /services/branding to /services/website-development with 301', async () => {
  const request = new Request('https://sapvik.com/services/branding');
  const response = await onRequest({
    request,
    env: { SITE_PASSWORD: 'DISABLE' },
    next: async () => new Response('should not reach')
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), 'https://sapvik.com/services/website-development');
});


