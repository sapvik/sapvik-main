/**
 * Cloudflare Pages Function: /api/audit
 * Strict POST endpoint, Turnstile verification, SSRF protection,
 * bounded stream parsing, and Edge Cache API caching.
 */

import { validateTargetUrl } from '../lib/ssrf.js';
import { executeLiveScan } from '../lib/scanner.js';
import { verifyTurnstileToken } from '../lib/security.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let targetUrl = '';
  let turnstileToken = '';

  try {
    const body = await request.json();
    targetUrl = (body.url || '').trim();
    turnstileToken = body.turnstileToken || body['cf-turnstile-response'] || '';
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'invalid_json', message: 'Malformed JSON payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!targetUrl) {
    return new Response(JSON.stringify({ success: false, error: 'missing_url', message: 'Target website URL is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 1. Turnstile Bot Challenge Verification
  const clientIp = request.headers.get('CF-Connecting-IP') || '';
  if (env && env.TURNSTILE_SECRET_KEY) {
    const turnstileResult = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY, clientIp);
    if (!turnstileResult.success && !turnstileResult.bypassed) {
      return new Response(JSON.stringify({
        success: false,
        error: 'turnstile_failed',
        message: 'Security verification failed. Please complete the captcha verification.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 2. Validate URL & Initial SSRF Pre-check
  const validation = await validateTargetUrl(targetUrl, true);
  if (!validation.valid) {
    return new Response(JSON.stringify({
      success: false,
      error: 'invalid_target',
      message: validation.error,
      has_ssl: null
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const normalizedTarget = validation.url;

  // 3. Edge Cache API Lookup (Keyed by Normalized Target URL, 5 min TTL)
  const cacheUrl = new URL(`https://cache.sapvik.internal/api/audit?url=${encodeURIComponent(normalizedTarget)}`);
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  let cache;
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      cache = caches.default;
      const cachedResp = await cache.match(cacheKey);
      if (cachedResp) {
        return cachedResp;
      }
    }
  } catch {
    // Cache API unavailable in some local runtime mocks
  }

  // 4. Execute Live Bounded Scan (3.5s origin timeout with rapid perimeter fallback)
  const scanResult = await executeLiveScan(normalizedTarget, 3.5);

  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (scanResult.success) {
    responseHeaders['Cache-Control'] = 'public, max-age=300';
  }

  const response = new Response(JSON.stringify(scanResult), {
    status: 200,
    headers: responseHeaders
  });

  // Store successful scans in Cloudflare Edge Cache API (~5 min)
  if (scanResult.success && cache) {
    try {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    } catch {
      // waitUntil optional
    }
  }

  return response;
}

// Reject other HTTP methods (e.g. GET) with 405 Method Not Allowed
export async function onRequest(context) {
  if (context.request.method === 'POST') {
    return await onRequestPost(context);
  }
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  return new Response(JSON.stringify({ success: false, error: 'method_not_allowed', message: 'Endpoint requires POST.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
