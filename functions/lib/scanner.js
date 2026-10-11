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
  try {
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';
      let bytesReceived = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesReceived += value.length;
        if (bytesReceived > byteLimit) {
          const excess = bytesReceived - byteLimit;
          const allowed = value.length - excess;
          if (allowed > 0) {
            result += decoder.decode(value.subarray(0, allowed));
          }
          try { await reader.cancel(); } catch {}
          break;
        }
        result += decoder.decode(value, { stream: true });
      }
      return result;
    }
    const text = await response.text();
    return text.length > byteLimit ? text.slice(0, byteLimit) : text;
  } catch {
    return '';
  }
}

/**
 * Analyzes HTML text for key tags, schemas, and analytics scripts.
 * Operates without .toLowerCase() on the full document to prevent memory spikes.
 */
export function analyzeHtmlSnippet(html, finalUrl, elapsedMs, hasSsl, hasHsts) {
  // 1. Meta & Indexability Signals (Max 30)
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].trim() : '';
  const hasTitle = titleText.length > 0;
  const titleLength = titleText.length;
  
  const descMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || 
                    html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const descText = descMatch ? descMatch[1].trim() : '';
  const hasDescription = descText.length > 0;
  const descLength = descText.length;

  const hasCanonical = /<link\s+[^>]*rel=["']canonical["']/i.test(html);
  const robotsMatch = html.match(/<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  const hasNoindex = Boolean(robotsMatch && /noindex/i.test(robotsMatch[1]));

  let metaScore = 0;
  if (hasTitle) {
    metaScore += (titleLength >= 30 && titleLength <= 65) ? 10 : 6;
  }
  if (hasDescription) {
    metaScore += (descLength >= 70 && descLength <= 160) ? 10 : 6;
  }
  if (hasCanonical) metaScore += 5;
  if (!hasNoindex) metaScore += 5;

  // 2. Content & Mobile Structure Signals (Max 25)
  const hasViewport = /<meta\s+[^>]*name=["']viewport["']/i.test(html);
  const h1Matches = html.match(/<h1\b[^>]*>/gi) || [];
  const h1Count = h1Matches.length;
  const hasH2 = /<h2\b[^>]*>/i.test(html);

  let contentScore = 0;
  if (hasViewport) contentScore += 10;
  if (h1Count === 1) contentScore += 10;
  else if (h1Count > 1) contentScore += 5;
  if (hasH2) contentScore += 5;

  // 3. Technical Performance & Security (Max 25)
  let techScore = 0;
  if (hasSsl) techScore += 15;
  if (elapsedMs <= 600) techScore += 10;
  else if (elapsedMs <= 1200) techScore += 6;
  else techScore += 2;

  // 4. Schema & Social Entities (Max 20)
  const hasSchema = /schema\.org|application\/ld\+json/i.test(html);
  const hasLocalSchema = /\b(LocalBusiness|MedicalOrganization|ProfessionalService|LegalService|AutomotiveBusiness|Dentist|Physician|Restaurant|HealthAndBeautyBusiness)\b/i.test(html);
  const hasOg = /<meta\s+[^>]*property=["']og:(?:title|image|description)["']/i.test(html);
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const imgWithAlt = imgTags.filter(img => /alt=["'][^"']*["']/i.test(img)).length;
  const hasImageAlt = imgTags.length === 0 || (imgWithAlt / imgTags.length >= 0.7);

  let richScore = 0;
  if (hasSchema) richScore += 10;
  if (hasOg) richScore += 5;
  if (hasImageAlt) richScore += 5;

  // Analytics & Pixel Tracking
  const hasGtm = /googletagmanager\.com\/(?:gtm\.js|gtag\/js)/i.test(html) || /gtag\s*\(\s*['"]config['"]/i.test(html);
  const hasGa4Id = /(?:googletagmanager|google-analytics|gtag|dataLayer)[\s\S]{0,120}\b(G|GT)-[A-Z0-9]{6,12}\b/.test(html);
  const hasGaLegacy = /google-analytics\.com\/analytics\.js/i.test(html);
  const hasAnalytics = hasGtm || hasGa4Id || hasGaLegacy;
  const hasPixel = /fbevents\.js|connect\.facebook\.net/i.test(html);

  // Local Search Readiness Signals (for Heatmap connection)
  const hasPhone = /(?:\+?91[\s-]?)?[6-9]\d{9}|\b\d{3,5}[-\s]\d{6,8}\b|tel:/i.test(html);
  const hasMapsLink = /maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl|<iframe[^>]*google\.com\/maps/i.test(html);
  let localReadiness = 0;
  if (hasLocalSchema) localReadiness += 35;
  if (hasPhone) localReadiness += 20;
  if (hasMapsLink) localReadiness += 15;

  const totalScore = Math.min(100, Math.max(0, metaScore + contentScore + techScore + richScore));

  // Build Comprehensive Actionable Findings
  const findings = [];

  // Performance finding
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

  // SSL finding
  if (!hasSsl) {
    findings.push({
      id: "ssl_missing",
      severity: "critical",
      title: "Encrypted HTTPS not active on destination",
      evidence: `Destination resolved over unencrypted HTTP: ${finalUrl}`,
      fix: "Install an SSL/TLS certificate and configure automatic HTTPS redirection."
    });
  }

  // Title tag finding
  if (!hasTitle) {
    findings.push({
      id: "seo_title_missing",
      severity: "warning",
      title: "Missing <title> tag in HTML head",
      evidence: "No valid HTML <title> tag detected in initial markup.",
      fix: "Add a concise, keyword-targeted <title> tag between 30-65 characters for search snippet ranking."
    });
  } else if (titleLength < 30 || titleLength > 65) {
    findings.push({
      id: "seo_title_length",
      severity: "info",
      title: `Title length (${titleLength} chars) outside optimal range`,
      evidence: `Page title "${titleText.slice(0, 40)}..." is ${titleLength < 30 ? 'too brief' : 'longer than 65 chars and may be truncated'}.`,
      fix: "Target 50-60 characters with primary commercial keywords and brand identity."
    });
  }

  // Meta description finding
  if (!hasDescription) {
    findings.push({
      id: "seo_desc_missing",
      severity: "info",
      title: "Missing Meta Description tag",
      evidence: "No meta name=\"description\" tag identified in initial HTML.",
      fix: "Add an engaging 120-160 character meta description to maximize organic click-through rates."
    });
  }

  // H1 heading finding
  if (h1Count === 0) {
    findings.push({
      id: "h1_missing",
      severity: "warning",
      title: "Missing primary <h1> heading",
      evidence: "No <h1> element detected in page markup.",
      fix: "Ensure each page has a single clear <h1> defining the core topic and value proposition."
    });
  } else if (h1Count > 1) {
    findings.push({
      id: "h1_multiple",
      severity: "info",
      title: `Multiple <h1> headings detected (${h1Count})`,
      evidence: "Search engines prefer a single unified <h1> hierarchy per page.",
      fix: "Demote secondary headings to <h2> or <h3> for clean semantic structure."
    });
  }

  // Canonical tag finding
  if (!hasCanonical) {
    findings.push({
      id: "canonical_missing",
      severity: "info",
      title: "Self-referencing canonical URL missing",
      evidence: "No <link rel=\"canonical\"> tag detected in head.",
      fix: "Add canonical link to protect against duplicate content indexing across www/non-www."
    });
  }

  // Schema finding
  if (!hasSchema) {
    findings.push({
      id: "schema_missing",
      severity: "warning",
      title: "Structured Schema.org entity not detected",
      evidence: "No schema.org or JSON-LD script blocks identified in the initial HTML.",
      fix: "Deploy JSON-LD Organization or LocalBusiness schemas to enhance rich search snippet eligibility."
    });
  } else if (!hasLocalSchema) {
    findings.push({
      id: "local_schema_recommended",
      severity: "info",
      title: "LocalBusiness Schema recommended for territory ranking",
      evidence: "General schema detected, but specific LocalBusiness schema was not detected in initial HTML.",
      fix: "Include geo-coordinates and LocalBusiness markup for higher local 3-pack relevance."
    });
  }

  // Analytics finding
  if (!hasAnalytics) {
    findings.push({
      id: "analytics_missing",
      severity: "warning",
      title: "Google Analytics 4 / GTM container not detected",
      evidence: "No gtag.js, Google Tag Manager container, or GA4 measurement ID detected in initial HTML.",
      fix: "Deploy GTM or GA4 for cross-channel conversion and attribution tracking."
    });
  }

  // Meta Pixel finding
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
    score: totalScore,
    response_time_ms: elapsedMs,
    measured_latency_ms: elapsedMs,
    has_ssl: hasSsl,
    has_hsts: hasHsts,
    has_schema: hasSchema,
    has_pixel: hasPixel,
    has_analytics: hasAnalytics,
    has_viewport: hasViewport,
    has_canonical: hasCanonical,
    has_title: hasTitle,
    has_description: hasDescription,
    breakdown: {
      meta: { score: metaScore, max: 30, label: "Meta & Indexability" },
      content: { score: contentScore, max: 25, label: "Content Structure" },
      technical: { score: techScore, max: 25, label: "Speed & Security" },
      rich_data: { score: richScore, max: 20, label: "Rich Snippets & Social" }
    },
    local_signals: {
      has_local_schema: hasLocalSchema,
      has_phone: hasPhone,
      has_maps_link: hasMapsLink,
      local_readiness: localReadiness
    },
    findings: findings.slice(0, 8)
  };
}

/**
 * Executes a network fetch through a manual redirect loop with SSRF checks on every hop.
 */
export async function fetchWithValidatedRedirects(initialUrl, { timeoutMs = 3500 } = {}) {
  let currentUrl = initialUrl;
  let hops = 0;

  while (hops <= MAX_REDIRECTS) {
    // Validate target URL on EVERY hop (hop 0 and redirects)
    const check = await validateTargetUrl(currentUrl, false);
    if (!check.valid) {
      return {
        ok: false,
        error: 'ssrf_blocked',
        message: check.error || 'Destination blocked by network security policy.'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let resp;
    try {
      resp = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        redirect: 'manual',
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);

      const errName = err ? err.name : '';
      const errMsg = err && err.message ? err.message.toLowerCase() : '';

      if (errName === 'AbortError' || errMsg.includes('abort') || errMsg.includes('timeout')) {
        return {
          ok: false,
          error: 'timeout',
          message: 'Target server timed out while waiting for a response.'
        };
      }

      if (
        errMsg.includes('enotfound') ||
        errMsg.includes('eai_again') ||
        errMsg.includes('dns') ||
        errMsg.includes('getaddrinfo')
      ) {
        return {
          ok: false,
          error: 'dns_unavailable',
          message: 'Domain name could not be resolved.'
        };
      }

      return {
        ok: false,
        error: 'unreachable',
        message: err && err.message ? err.message : 'Target server could not be reached.'
      };
    } finally {
      clearTimeout(timeoutId);
    }

    // Check redirect status codes (manual hops)
    if ([301, 302, 303, 307, 308].includes(resp.status)) {
      const location = resp.headers.get('location');
      if (!location) {
        return {
          ok: false,
          error: 'unreachable',
          message: 'Target server issued a redirect without a Location header.'
        };
      }

      hops++;
      if (hops > MAX_REDIRECTS) {
        return {
          ok: false,
          error: 'too_many_redirects',
          message: `Target exceeded maximum allowed redirect hops (${MAX_REDIRECTS}).`
        };
      }

      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        return {
          ok: false,
          error: 'unreachable',
          message: 'Target server issued an unparseable redirect URL.'
        };
      }

      continue;
    }

    // Target returned error status
    if ([403, 429, 503].includes(resp.status)) {
      return {
        ok: false,
        error: 'blocked_by_target',
        status: resp.status,
        message: `Target server returned HTTP ${resp.status} (automated probes may be blocked).`
      };
    }

    if (resp.status >= 400) {
      return {
        ok: false,
        error: 'unreachable',
        status: resp.status,
        message: `Target server returned HTTP ${resp.status}.`
      };
    }

    // Success response reached
    return {
      ok: true,
      response: resp,
      finalUrl: resp.url || currentUrl,
      hops
    };
  }

  return {
    ok: false,
    error: 'too_many_redirects',
    message: `Target exceeded maximum allowed redirect hops (${MAX_REDIRECTS}).`
  };
}

/**
 * Executes a live site inspection using fetchWithValidatedRedirects.
 */
export async function executeLiveScan(targetUrl, timeoutSeconds = 3.5) {
  const startTime = Date.now();
  const isHttps = targetUrl.toLowerCase().startsWith('https://');

  if (isHttps) {
    const httpsResult = await fetchWithValidatedRedirects(targetUrl, { timeoutMs: timeoutSeconds * 1000 });

    if (httpsResult.ok) {
      const elapsedMs = Date.now() - startTime;
      const finalUrl = httpsResult.finalUrl;
      const hasSsl = finalUrl.toLowerCase().startsWith('https://');
      const hasHsts = Boolean(httpsResult.response.headers.get('strict-transport-security'));
      const html = await readBoundedStream(httpsResult.response, MAX_STREAM_BYTES);
      return analyzeHtmlSnippet(html, finalUrl, elapsedMs, hasSsl, hasHsts);
    }

    // If SSRF blocked or too many redirects, do not attempt HTTP fallback
    if (httpsResult.error === 'ssrf_blocked' || httpsResult.error === 'too_many_redirects') {
      return {
        success: false,
        error: httpsResult.error,
        message: httpsResult.message,
        has_ssl: null
      };
    }

    // Attempt plain HTTP fallback via the same fetchWithValidatedRedirects function
    const httpUrl = targetUrl.replace(/^https:\/\//i, 'http://');
    const httpResult = await fetchWithValidatedRedirects(httpUrl, { timeoutMs: 2000 });

    if (httpResult.ok) {
      const elapsedMs = Date.now() - startTime;
      const finalUrl = httpResult.finalUrl;
      const html = await readBoundedStream(httpResult.response, MAX_STREAM_BYTES);
      // HTTPS failed and plain HTTP succeeded => has_ssl: false
      return analyzeHtmlSnippet(html, finalUrl, elapsedMs, false, false);
    }

    // Both HTTPS and HTTP failed: return honest failure
    return {
      success: false,
      error: httpsResult.error || 'unreachable',
      message: httpsResult.message || 'Target website took too long or refused connection.',
      has_ssl: null
    };
  }

  // Plain HTTP requested directly
  const httpResult = await fetchWithValidatedRedirects(targetUrl, { timeoutMs: timeoutSeconds * 1000 });
  if (httpResult.ok) {
    const elapsedMs = Date.now() - startTime;
    const finalUrl = httpResult.finalUrl;
    const hasSsl = finalUrl.toLowerCase().startsWith('https://');
    const hasHsts = Boolean(httpResult.response.headers.get('strict-transport-security'));
    const html = await readBoundedStream(httpResult.response, MAX_STREAM_BYTES);
    return analyzeHtmlSnippet(html, finalUrl, elapsedMs, hasSsl, hasHsts);
  }

  return {
    success: false,
    error: httpResult.error || 'unreachable',
    message: httpResult.message || 'Target website took too long or refused connection.',
    has_ssl: null
  };
}
