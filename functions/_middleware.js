/**
 * Cloudflare Pages Root Middleware: Edge Password Gate
 * Protects staging/production deployments from unauthorized bots, scrapers, and visitors.
 * Enforces authentication before serving any static asset or executing functions.
 */

async function getAuthToken(password) {
  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(`sapvik-gate:${password}`));
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function renderLockScreen(errorMessage = '', returnTo = '/') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Private Access | SAPVIK</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #F4F5F6;
      color: #12161C;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .lock-card {
      background: #FFFFFF;
      border: 1px solid #DDE2E7;
      max-width: 440px;
      width: 100%;
      padding: 2.75rem 2.25rem;
      position: relative;
      box-shadow: 0 4px 20px rgba(18, 22, 28, 0.06);
    }
    .lock-card::before, .lock-card::after {
      content: '';
      position: absolute;
      width: 12px;
      height: 12px;
      pointer-events: none;
    }
    .lock-card::before {
      top: -1px; left: -1px;
      border-top: 2px solid #12161C;
      border-left: 2px solid #12161C;
    }
    .lock-card::after {
      bottom: -1px; right: -1px;
      border-bottom: 2px solid #12161C;
      border-right: 2px solid #12161C;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.75rem;
    }
    .brand-logo-text {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #12161C;
    }
    .mono-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.72rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #C93A22;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    .lock-title {
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1.25;
      color: #12161C;
      margin-bottom: 0.75rem;
    }
    .lock-desc {
      font-size: 0.88rem;
      color: #4A5668;
      line-height: 1.5;
      margin-bottom: 1.75rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-label {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #12161C;
      margin-bottom: 0.4rem;
    }
    .form-input {
      width: 100%;
      padding: 0.85rem 1rem;
      font-size: 16px;
      border: 1px solid #BDC6D0;
      background: #F8F9FA;
      color: #12161C;
      outline: none;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }
    .form-input:focus {
      border-color: #C93A22;
      background: #FFFFFF;
    }
    .error-banner {
      background: rgba(201, 58, 34, 0.08);
      border-left: 3px solid #C93A22;
      padding: 0.65rem 0.85rem;
      font-size: 0.82rem;
      color: #C93A22;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    .btn-submit {
      width: 100%;
      background: #C93A22;
      color: #FFFFFF;
      border: 1px solid #C93A22;
      padding: 0.85rem 1.5rem;
      font-size: 0.88rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 44px;
      transition: background 0.15s ease;
    }
    .btn-submit:hover {
      background: #B2301A;
      border-color: #B2301A;
    }
    .security-note {
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px dashed #DDE2E7;
      font-size: 0.75rem;
      color: #718096;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <div class="lock-card">
    <div class="brand-row">
      <svg width="28" height="28" viewBox="0 0 200 200" fill="none">
        <path d="M40 160L100 40L160 160L100 130L40 160Z" fill="#C93A22"/>
      </svg>
      <span class="brand-logo-text">SAPVIK</span>
    </div>

    <div class="mono-badge">Restricted Deployment</div>
    <h1 class="lock-title">Preview Authorization</h1>
    <p class="lock-desc">
      This environment is currently protected against unauthorized inspection. Enter the authorization password to proceed.
    </p>

    ${errorMessage ? `<div class="error-banner">${errorMessage}</div>` : ''}

    <form method="POST" action="/_auth_login">
      <input type="hidden" name="return_to" value="${escapeHtml(returnTo)}">
      <div class="form-group">
        <label for="password" class="form-label">Access Passcode</label>
        <input type="password" id="password" name="password" class="form-input" placeholder="Enter password..." autofocus required>
      </div>

      <button type="submit" class="btn-submit">
        <span>Unlock Access</span>
        <span>&rarr;</span>
      </button>
    </form>

    <div class="security-note">
      Protected by Cloudflare Edge Gateway. Automated crawlers, search indexers, and public probes are strictly blocked.
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let sitePasswordWarnedOnce = false;

export function resetSitePasswordWarnOnceForTests() {
  sitePasswordWarnedOnce = false;
}

export function sanitizeReturnTo(rawReturnTo) {
  if (!rawReturnTo || typeof rawReturnTo !== 'string') {
    return '/';
  }
  let decoded = rawReturnTo;
  try {
    decoded = decodeURIComponent(rawReturnTo);
  } catch {
    return '/';
  }
  const trimmed = decoded.trim();
  if (trimmed === '/') {
    return '/';
  }
  // Must match ^/(?![/\\]), after URL-decoding; reject //, /\ and anything with a scheme or host
  if (/^\/(?![/\\])/.test(trimmed) && !trimmed.includes('\\') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed;
  }
  return '/';
}

export function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let mismatch = 0;
  for (let i = 0; i < aBytes.length; i++) {
    mismatch |= aBytes[i] ^ bBytes[i];
  }
  return mismatch === 0;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Canonical Host Enforcement: Redirect www to apex domain
  if (url.hostname === 'www.sapvik.com') {
    url.hostname = 'sapvik.com';
    return Response.redirect(url.toString(), 301);
  }

  // 2. Prevent Indexing & Duplicate Content on Cloudflare Pages (*.pages.dev)
  // Only redirect if REDIRECT_ALLOW / redirect_allow is explicitly set to 'true'.
  // If not present or not true, do not redirect, but attach X-Robots-Tag to avoid duplicate indexing.
  const rawRedirectAllow = env && (env.REDIRECT_ALLOW ?? env.redirect_allow);
  const redirectAllow = typeof rawRedirectAllow === 'string'
    ? rawRedirectAllow.trim().toLowerCase() === 'true'
    : Boolean(rawRedirectAllow);

  if (url.hostname.endsWith('.pages.dev') && redirectAllow) {
    const targetUrl = new URL(url.pathname + url.search, 'https://sapvik.com');
    const headers = new Headers();
    headers.set('Location', targetUrl.toString());
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return new Response(null, { status: 301, headers });
  }

  const finalizeResponse = (res) => {
    if (url.hostname.endsWith('.pages.dev')) {
      const headers = new Headers(res.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers
      });
    }
    return res;
  };

  // 3. Drop .html extensions (301 Permanent Redirect)
  let cleanPath = url.pathname;
  if (cleanPath.endsWith('.html') && !cleanPath.startsWith('/_')) {
    cleanPath = cleanPath.slice(0, -5);
    const targetUrl = new URL(cleanPath + url.search, url.origin);
    return Response.redirect(targetUrl.toString(), 301);
  }

  // If SITE_PASSWORD is explicitly set to 'DISABLE' or '', allow open public access
  let sitePassword = 'sapvik2026';
  if (env && env.SITE_PASSWORD) {
    sitePassword = env.SITE_PASSWORD.trim();
  } else {
    if (!sitePasswordWarnedOnce) {
      console.warn('SITE_PASSWORD environment variable not set; using temporary default password. Set SITE_PASSWORD in Cloudflare dashboard.');
      sitePasswordWarnedOnce = true;
    }
  }

  if (!sitePassword || sitePassword.toLowerCase() === 'disable') {
    return finalizeResponse(await context.next());
  }

  const expectedToken = await getAuthToken(sitePassword);

  // 1. Handle Login Form POST Submission
  if (request.method === 'POST' && url.pathname === '/_auth_login') {
    try {
      const formData = await request.formData();
      const enteredPass = (formData.get('password') || '').trim();
      const rawReturnTo = formData.get('return_to') || '/';
      const safeReturnTo = sanitizeReturnTo(rawReturnTo);

      const enteredToken = await getAuthToken(enteredPass);

      if (constantTimeCompare(enteredToken, expectedToken)) {
        const headers = new Headers();
        headers.set('Location', safeReturnTo);
        const isSecure = url.protocol === 'https:';
        headers.set('Set-Cookie', `sapvik_auth=${expectedToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isSecure ? '; Secure' : ''}`);
        return new Response(null, { status: 302, headers });
      }

      // Brute-force mitigation: deliberate delay before responding with 401
      await new Promise(resolve => setTimeout(resolve, 800));

      // Incorrect password entered
      return new Response(renderLockScreen('Incorrect access passcode. Please try again.', safeReturnTo), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } catch {
      await new Promise(resolve => setTimeout(resolve, 800));
      return new Response(renderLockScreen('Invalid login submission.', '/'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  }

  // 2. Check for Valid Auth Cookie
  const userToken = getCookie(request, 'sapvik_auth');
  if (userToken && constantTimeCompare(userToken, expectedToken)) {
    return finalizeResponse(await context.next());
  }

  // 3. User is not authenticated: Render Lock Screen
  // Return HTTP 401 so search engine bots immediately drop indexing
  const safeCurrentPath = sanitizeReturnTo(url.pathname + url.search);
  return new Response(renderLockScreen('', safeCurrentPath), {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow, noarchive'
    }
  });
}
