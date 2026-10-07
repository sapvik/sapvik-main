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
  } catch (err) {
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
 */
export function analyzeHtmlSnippet(html, finalUrl, elapsedMs, hasSsl, hasHsts) {
  // Case-insensitive regexes on the raw text (no .toLowerCase() string cloning)
  const hasSchema = /schema\.org|application\/ld\+json/i.test(html);
  const hasLocalSchema = /\b(LocalBusiness|MedicalOrganization|ProfessionalService|LegalService|AutomotiveBusiness|Dentist|Physician)\b/i.test(html);
  
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

  // Scoring (0-100)
  let score = 25;
  if (elapsedMs < 600) score += 25;
  else if (elapsedMs < 1200) score += 15;
  if (hasSsl) score += 20;
  if (hasSchema) score += 15;
  if (hasPixel) score += 5;
  if (hasAnalytics) score += 10;

  const findings = [];

  // 1. Response Time
  if (elapsedMs > 800) {
    findings.push({
      id: "latency_high",
      severity: "warning",
      title: `Server Response Time: ${elapsedMs}ms`,
      fix: "Optimize initial server processing, database queries, and edge CDN delivery."
    });
  } else {
    findings.push({
      id: "latency_fast",
      severity: "good",
      title: `Fast Edge Response Time: ${elapsedMs}ms`,
      fix: "Initial response within recommended performance thresholds."
    });
  }

  // 2. Meta Pixel (Info severity: not critical unless running paid social)
  if (!hasPixel) {
    findings.push({
      id: "pixel_missing",
      severity: "info",
      title: "Meta Conversion Tracking not detected in initial HTML",
      fix: "Add Meta CAPI or Pixel if you run direct-response social advertising."
    });
  }

  // 3. Schema Markup
  if (!hasSchema) {
    findings.push({
      id: "schema_missing",
      severity: "warning",
      title: "Structured Schema.org Entity not detected in initial HTML",
      fix: "Add JSON-LD entity data to improve Google Knowledge Panel and local search visibility."
    });
  } else if (!hasLocalSchema) {
    findings.push({
      id: "local_schema_missing",
      severity: "info",
      title: "LocalBusiness Schema recommended",
      fix: "Include geo-coordinates and business category for local search pack relevance."
    });
  }

  // 4. Analytics
  if (!hasAnalytics) {
    findings.push({
      id: "analytics_missing",
      severity: "warning",
      title: "Google Analytics 4 / GTM container not detected in initial HTML",
      fix: "Deploy unified tracking for cross-channel conversion attribution."
    });
  }

  return {
    success: true,
    url: finalUrl,
    measured_latency_ms: elapsedMs,
    score: Math.min(100, Math.max(15, score)),
    has_ssl: hasSsl,
    has_hsts: hasHsts,
    has_schema: hasSchema,
    has_pixel: hasPixel,
    has_analytics: hasAnalytics,
    has_viewport: hasViewport,
    findings: findings.slice(0, 4)
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
      return {
        success: false,
        error: isAbort ? "scan_timeout" : "network_unreachable",
        message: isAbort ? `Request timed out after ${timeoutSeconds} seconds without response.` : "Target server could not be reached.",
        has_ssl: null // null indicates reachability/timeout issue, not an SSL error
      };
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle Redirects
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
