import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';

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

  const response = await onRequest(context);
  assert.equal(response.status, 401);
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

test('Middleware Gate: Bypasses gate when SITE_PASSWORD is "DISABLE" or empty', async () => {
  let nextCalled = false;
  const request = new Request('http://localhost:8082/');
  const response = await onRequest({
    request,
    env: { SITE_PASSWORD: 'DISABLE' },
    next: async () => {
      nextCalled = true;
      return new Response('public site');
    }
  });

  assert.equal(nextCalled, true);
  assert.equal(await response.text(), 'public site');
});
