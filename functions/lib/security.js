/**
 * Security and Input Validation Helpers
 * HTML escaping, Turnstile verification, and Origin protection.
 */

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function validateOrigin(request, allowedOrigins = ['sapvik.com', 'localhost', '127.0.0.1']) {
  const origin = request.headers.get('Origin') || request.headers.get('Referer');
  if (!origin) return true; // Direct non-browser or same-origin without header

  try {
    const originUrl = new URL(origin);
    const host = originUrl.hostname.toLowerCase();

    // 1. Check against explicit allowedOrigins whitelist
    if (allowedOrigins.some(allowed => host === allowed || host.endsWith('.' + allowed))) {
      return true;
    }

    // 2. Allow same-origin / self-host requests (e.g. *.pages.dev staging URLs)
    if (request && request.url) {
      try {
        const reqUrl = new URL(request.url);
        const reqHost = reqUrl.hostname.toLowerCase();
        if (host === reqHost) {
          return true;
        }
      } catch {}
    }

    return false;
  } catch {
    return false;
  }
}

let turnstileWarnedOnce = false;

export function resetTurnstileWarnOnceForTests() {
  turnstileWarnedOnce = false;
}

export async function verifyTurnstileToken(token, secretKey, remoteIp) {
  if (!secretKey) {
    if (!turnstileWarnedOnce) {
      console.warn('Turnstile secret key not configured; skipping challenge verification (zero-env mode).');
      turnstileWarnedOnce = true;
    }
    return { success: true, bypassed: true };
  }
  if (!token) return { success: false, error: 'missing_turnstile_token' };

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) formData.append('remoteip', remoteIp);

    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    if (!resp.ok) return { success: false, error: 'turnstile_http_error' };
    const data = await resp.json();
    return { success: Boolean(data.success), errorCodes: data['error-codes'] };
  } catch (err) {
    return { success: false, error: 'turnstile_network_error' };
  }
}

export function validateContactPayload(data) {
  const name = (data.name || '').trim();
  const phone = (data.phone || '').trim();
  const email = (data.email || '').trim();
  const consent = data.consent === true;

  if (name.length < 2 || name.length > 100) {
    return { valid: false, error: 'Please provide your full name (2-100 characters).' };
  }

  // E.164 or Indian/international phone: 8 to 20 digits, optional leading +
  const phoneRegex = /^\+?[0-9\s\-()]{8,20}$/;
  if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 8) {
    return { valid: false, error: 'Please provide a valid direct phone or WhatsApp number.' };
  }

  // Strict email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email) || email.length > 120) {
    return { valid: false, error: 'Please provide a valid business email address.' };
  }

  if (!consent) {
    return { valid: false, error: 'Consent to privacy policy and audit processing is required.' };
  }

  return { valid: true };
}

/**
 * Reads and parses JSON from a request body stream, strictly bounding total bytes to maxBytes (default 50KB = 51200 bytes).
 * Protects against large payloads and unbounded streaming attacks.
 */
export async function readBoundedJson(request, maxBytes = 51200) {
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > maxBytes) {
    return { ok: false, status: 413, error: 'payload_too_large', message: 'Request payload exceeds allowable limit.' };
  }

  let text = '';
  if (request.body && typeof request.body.getReader === 'function') {
    const reader = request.body.getReader();
    const chunks = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.length;
        if (totalBytes > maxBytes) {
          try { await reader.cancel(); } catch {}
          return { ok: false, status: 413, error: 'payload_too_large', message: 'Request payload exceeds allowable limit.' };
        }
        chunks.push(value);
      }
    } catch {
      return { ok: false, status: 400, error: 'stream_read_error', message: 'Error reading request stream.' };
    }

    const allBytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      allBytes.set(chunk, offset);
      offset += chunk.length;
    }
    text = new TextDecoder('utf-8').decode(allBytes);
  } else {
    try {
      text = await request.text();
      if (new TextEncoder().encode(text).length > maxBytes) {
        return { ok: false, status: 413, error: 'payload_too_large', message: 'Request payload exceeds allowable limit.' };
      }
    } catch {
      return { ok: false, status: 400, error: 'malformed_json', message: 'Malformed JSON payload.' };
    }
  }

  if (!text || !text.trim()) {
    return { ok: false, status: 400, error: 'missing_body', message: 'Empty request payload.' };
  }

  try {
    const data = JSON.parse(text);
    return { ok: true, data };
  } catch {
    return { ok: false, status: 400, error: 'malformed_json', message: 'Malformed JSON payload.' };
  }
}

