/**
 * Website Network & HTML Diagnostic Scanner
 * Bounded streaming reader, manual redirect validator, and regex detection.
 */

import { validateTargetUrl } from './ssrf.js';

const MAX_STREAM_BYTES = 500000; // 500KB stream limit to protect Workers 10ms CPU
const MAX_REDIRECTS = 3;

/**
 * Reads a response body stream up to byteLimit bytes and cancels remaining download.
 */
async function readBoundedStream(response, byteLimit = MAX_STREAM_BYTES) {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        totalBytes += value.length;
        if (totalBytes >= byteLimit) {
          await reader.cancel();
          break;
        }
      }
    }
  } catch {
    // Stream closed or canceled
  }

  // Combine collected chunks
  const combined = new Uint8Array(Math.min(totalBytes, byteLimit));
  let offset = 0;
  for (const chunk of chunks) {
    const toCopy = Math.min(chunk.length, byteLimit - offset);
    combined.set(chunk.subarray(0, toCopy), offset);
    offset += toCopy;
    if (offset >= byteLimit) break;
  }

  const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
  return decoder.decode(combined);
}

/**
 * Analyzes HTML text for key tags, schemas, and analytics scripts.
 * Operates without .toLowerCase() on the full document to prevent memory spikes.
 */
export function analyzeHtmlSnippet(html, finalUrl, elapsedMs, hasSsl, hasHsts) {
  // Case-insensitive regexes on the raw text
  const hasSchema = /schema\.org|application\/ld\+json/i.test(html);
  
  // LocalBusiness: exclude "store" to avoid false matches on "restore" or "storefront"
  const hasLocalSchema = /\b(LocalBusiness|MedicalOrganization|ProfessionalService|LegalService|AutomotiveBusiness|Dentist|Physician|Restaurant|HealthAndBeautyBusiness)\b/i.test(html);
  
  // GA4 / GTM: Require GA4 ID near gtag/analytics or official script tags (avoids g-recaptcha class match)
  const hasGtm = /googletagmanager\.com\/(?:gtm\.js|gtag\/js)/i.test(html) || /gtag\s*\(\s*['"]config['"]/i.test(html);
  const hasGa4Id = /(?:googletagmanager|google-analytics|gtag|dataLayer)[\s\S]{0,120}\b(G|GT)-[A-Z0-9]{6,12}\b/.test(html);
  const hasGaLegacy = /google-analytics\.com\/analytics\.js/i.test(html);
  const hasAnalytics = hasGtm || hasGa4Id || hasGaLegacy;

  // Meta Pixel (informational finding, not critical)
  const hasPixel = /fbevents\.js|connect\.facebook\.net/i.test(html);

  // Viewport & Canonical
  const hasViewport = /<meta\s+[^>]*name=["']viewport["']/i.test(html);
  const hasCanonical = /<link\s+[^>]*rel=["']canonical["']/i.test(html);

  // Findings list (each item must have: id, severity, title, evidence, fix)
  const findings = [];

  // 1. Response Time (measured from edge)
  if (elapsedMs > 800) {
    findings.push({
      id: "response_time_slow",
      severity: "warning",
      title: `Response time: ${elapsedMs}ms`,
      evidence: `Measured edge response time was ${elapsedMs}ms (> 800ms threshold).`,
      fix: "Optimize origin processing, database queries, and static asset caching on a global CDN."
    });
  } else {
    findings.push({
      id: "response_time_fast",
      severity: "good",
      title: `Response time: ${elapsedMs}ms`,
      evidence: `Measured edge response time was ${elapsedMs}ms (<= 800ms).`,
      fix: "Edge response is within recommended performance benchmarks."
    });
  }

  // 2. SSL Status
  if (!hasSsl) {
    findings.push({
      id: "ssl_missing",
      severity: "critical",
      title: "Encrypted HTTPS not active on destination",
      evidence: `Destination resolved over unencrypted HTTP: ${finalUrl}`,
      fix: "Install an SSL/TLS certificate and configure automatic HTTPS redirection."
    });
  }

  // 3. Schema Markup
  if (!hasSchema) {
    findings.push({
      id: "schema_missing",
      severity: "warning",
      title: "Structured Schema.org entity not detected in initial HTML",
      evidence: "No schema.org or JSON-LD script blocks identified in the first 500KB of HTML.",
      fix: "Deploy JSON-LD Organization or LocalBusiness schemas to enhance rich search snippet eligibility."
    });
  } else if (!hasLocalSchema) {
    findings.push({
      id: "local_schema_recommended",
      severity: "info",
      title: "LocalBusiness Schema recommended",
      evidence: "General schema detected, but specific LocalBusiness schema was not detected in initial HTML.",
      fix: "Include geo-coordinates and LocalBusiness markup for higher local 3-pack relevance."
    });
  }

  // 4. Analytics
  if (!hasAnalytics) {
    findings.push({
      id: "analytics_missing",
      severity: "warning",
      title: "Google Analytics 4 / GTM container not detected in initial HTML",
      evidence: "No gtag.js, Google Tag Manager container, or GA4 measurement ID detected in initial HTML.",
      fix: "Deploy GTM or GA4 for cross-channel conversion and attribution tracking."
    });
  }

  // 5. Meta Pixel (Info severity: not critical unless running paid social)
  if (!hasPixel) {
    findings.push({
      id: "pixel_missing",
      severity: "info",
      title: "Meta conversion tracking not detected in initial HTML",
      evidence: "No Meta Pixel script (fbevents.js) identified in initial HTML.",
      fix: "Add Meta Conversions API or Pixel if running paid direct-response campaigns on Instagram/Facebook."
    });
  }

  return {
    success: true,
    url: finalUrl,
    response_time_ms: elapsedMs,
    measured_latency_ms: elapsedMs,
    has_ssl: hasSsl,
    has_hsts: hasHsts,
    has_schema: hasSchema,
    has_pixel: hasPixel,
    has_analytics: hasAnalytics,
    has_viewport: hasViewport,
    has_canonical: hasCanonical,
    findings: findings.slice(0, 5)
  };
}

/**
 * Executes a live site inspection with manual redirect validation.
 */
export async function executeLiveScan(targetUrl, timeoutSeconds = 8) {
  let currentUrl = targetUrl;
  let hops = 0;
  const startTime = Date.now();

  while (hops <= MAX_REDIRECTS) {
    // Re-validate SSRF on each hop
    const check = await validateTargetUrl(currentUrl, true);
    if (!check.valid) {
      return {
        success: false,
        error: "ssrf_blocked",
        message: check.error || "Destination blocked by network security policy.",
        has_ssl: null
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    let resp;
    try {
      resp = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SAPVIK-Diagnostic-Probe/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        redirect: 'manual',
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const isCertError = err.message && (
        err.message.includes('certificate') ||
        err.message.includes('CERT_') ||
        err.message.includes('SSL') ||
        err.message.includes('tls')
      );

      if (isCertError) {
        return {
          success: false,
          error: "ssl_certificate_invalid",
          message: "SSL/TLS certificate on target server is invalid, expired, or untrusted.",
          has_ssl: false // Certificate error indicates SSL failure
        };
      }

      return {
        success: false,
        error: isAbort ? "scan_timeout" : "network_unreachable",
        message: isAbort ? `Request timed out after ${timeoutSeconds} seconds without response.` : "Target server could not be reached.",
        has_ssl: null // null indicates reachability or timeout, not an explicit SSL error
      };
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle Redirects (manual hops)
    if ([301, 302, 303, 307, 308].includes(resp.status)) {
      const location = resp.headers.get('location');
      if (!location) {
        return {
          success: false,
          error: "invalid_redirect",
          message: "Target server issued redirect without a Location header.",
          has_ssl: null
        };
      }
      hops++;
      if (hops > MAX_REDIRECTS) {
        return {
          success: false,
          error: "too_many_redirects",
          message: `Target exceeded maximum allowed redirect hops (${MAX_REDIRECTS}).`,
          has_ssl: null
        };
      }
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        return {
          success: false,
          error: "invalid_redirect_url",
          message: "Target server issued an unparseable redirect URL.",
          has_ssl: null
        };
      }
      continue;
    }

    // Success response reached
    const elapsedMs = Date.now() - startTime;
    const finalUrl = resp.url || currentUrl;
    const hasSsl = finalUrl.startsWith('https://');
    const hasHsts = Boolean(resp.headers.get('strict-transport-security'));

    const html = await readBoundedStream(resp, MAX_STREAM_BYTES);
    return analyzeHtmlSnippet(html, finalUrl, elapsedMs, hasSsl, hasHsts);
  }

  return {
    success: false,
    error: "too_many_redirects",
    message: "Exceeded redirect limit.",
    has_ssl: null
  };
}
