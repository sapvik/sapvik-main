/**
 * Cloudflare Pages Function: /api/audit
 * Pure SSRF protection, manual redirect following, bounded stream parsing, Cache API.
 */

import { validateTargetUrl } from '../lib/ssrf.js';
import { executeLiveScan } from '../lib/scanner.js';
import { verifyTurnstileToken } from '../lib/security.js';

export async function onRequest(context) {
  const { request, env } = context;

  // Support both POST (preferred, payload with Turnstile) and GET
  let targetUrl = '';
  let turnstileToken = '';

  if (request.method === 'POST') {
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
  } else if (request.method === 'GET') {
    const url = new URL(request.url);
    targetUrl = (url.searchParams.get('url') || '').trim();
    turnstileToken = url.searchParams.get('turnstileToken') || '';
  } else if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } else {
    return new Response(JSON.stringify({ success: false, error: 'method_not_allowed' }), {
      status: 405,
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

  // 2. Validate URL & Initial SSRF Check
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

  // 3. Cloudflare Edge Cache API Lookup (Normalised Key)
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

  // 4. Execute Live Bounded Scan
  const scanResult = await executeLiveScan(normalizedTarget, 8);

  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  // Cache successful audit scans for 5 minutes (300 seconds)
  if (scanResult.success) {
    responseHeaders['Cache-Control'] = 'public, max-age=300';
  }

  const response = new Response(JSON.stringify(scanResult), {
    status: scanResult.success ? 200 : 200, // Return 200 with success: false for diagnostic error handling
    headers: responseHeaders
  });

  // Store in Edge Cache if successful
  if (scanResult.success && cache) {
    try {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    } catch {
      // waitUntil optional
    }
  }

  return response;
}
