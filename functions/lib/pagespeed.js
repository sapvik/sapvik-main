/**
 * Google PageSpeed Insights (PSI) API Integration
 * Queries Google's official Lighthouse engine for SEO, Performance, and Core Web Vitals.
 * Free tier provides 25,000 queries/day and 400 queries/100s.
 */

export const PSI_ENDPOINT = 'https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed';
export const DEFAULT_TIMEOUT_MS = 16000; // 16-second bounded timeout

/**
 * Normalizes an API key by stripping wrapping quotes and whitespace.
 * @param {unknown} key
 * @returns {string}
 */
export function normalizeApiKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key.trim().replace(/^["']|["']$/g, '').trim();
}

/**
 * Evaluates Core Web Vitals status based on official Google thresholds.
 * @param {'lcp'|'cls'|'fcp'|'tbt'} metric
 * @param {number|null} value
 * @returns {'good'|'needs-improvement'|'poor'|'unknown'}
 */
export function getMetricStatus(metric, value) {
  if (value === null || typeof value !== 'number' || isNaN(value)) return 'unknown';
  switch (metric) {
    case 'lcp':
      return value <= 2500 ? 'good' : (value <= 4000 ? 'needs-improvement' : 'poor');
    case 'cls':
      return value <= 0.1 ? 'good' : (value <= 0.25 ? 'needs-improvement' : 'poor');
    case 'fcp':
      return value <= 1800 ? 'good' : (value <= 3000 ? 'needs-improvement' : 'poor');
    case 'tbt':
      return value <= 200 ? 'good' : (value <= 600 ? 'needs-improvement' : 'poor');
    default:
      return 'unknown';
  }
}

/**
 * Maps Lighthouse audit items into standardized SAPVIK findings.
 * @param {Record<string, any>} audits
 * @returns {Array<{ id: string, severity: 'critical'|'warning'|'info'|'good', title: string, evidence: string, fix: string, source: string }>}
 */
export function mapLighthouseFindings(audits) {
  const findings = [];
  if (!audits || typeof audits !== 'object') return findings;

  const AUDIT_DEFINITIONS = [
    {
      id: 'document-title',
      title: 'Page <title> tag issue',
      fix: 'Add a concise, keyword-targeted <title> tag between 30-65 characters.',
      severity: 'warning'
    },
    {
      id: 'meta-description',
      title: 'Meta description missing or suboptimal',
      fix: 'Add a 120-160 character meta description explaining your commercial value proposition.',
      severity: 'info'
    },
    {
      id: 'is-crawlable',
      title: 'Search engine crawling restricted',
      fix: 'Ensure robots directives or X-Robots-Tag do not unintentionally block search indexing.',
      severity: 'critical'
    },
    {
      id: 'robots-txt',
      title: 'Robots.txt configuration issue',
      fix: 'Check robots.txt syntax and verify it permits crawling of key CSS/JS resources.',
      severity: 'warning'
    },
    {
      id: 'link-text',
      title: 'Links lack descriptive anchor text',
      fix: 'Replace generic anchor text like "click here" or bare URLs with descriptive keyword phrases.',
      severity: 'info'
    },
    {
      id: 'image-alt',
      title: 'Images missing alt attributes',
      fix: 'Add meaningful alt attributes to all content images for accessibility and image search indexing.',
      severity: 'info'
    },
    {
      id: 'tap-targets',
      title: 'Mobile tap targets sized or spaced too closely',
      fix: 'Ensure interactive elements (buttons, links) are at least 48x48px with adequate spacing for touch.',
      severity: 'warning'
    },
    {
      id: 'font-size',
      title: 'Document uses illegible font sizes on mobile',
      fix: 'Ensure body text is 12px or larger so mobile visitors can read without pinch-zooming.',
      severity: 'warning'
    },
    {
      id: 'crawlable-anchors',
      title: 'Links are not crawlable by search bots',
      fix: 'Use standard <a href="..."> markup so Googlebot can discover and index linked internal pages.',
      severity: 'warning'
    },
    {
      id: 'canonical',
      title: 'Canonical tag missing or invalid',
      fix: 'Provide a valid self-referencing canonical URL to prevent duplicate content indexing.',
      severity: 'info'
    },
    {
      id: 'render-blocking-resources',
      title: 'Render-blocking CSS or JavaScript detected',
      fix: 'Defer non-critical scripts and preload critical styles to accelerate First Contentful Paint.',
      severity: 'warning'
    }
  ];

  for (const def of AUDIT_DEFINITIONS) {
    const audit = audits[def.id];
    if (
      audit &&
      typeof audit.score === 'number' &&
      audit.score < 1 &&
      audit.scoreDisplayMode !== 'notApplicable' &&
      audit.scoreDisplayMode !== 'informative'
    ) {
      findings.push({
        id: `google_${def.id.replace(/-/g, '_')}`,
        severity: def.severity,
        title: audit.title || def.title,
        evidence: audit.displayValue
          ? `${audit.displayValue} — flagged by Google Lighthouse.`
          : (audit.explanation || `Flagged by Google Lighthouse mobile audit (${def.id}).`),
        fix: def.fix,
        source: 'google_lighthouse'
      });
    }
  }

  // Core Web Vitals checks
  const lcp = audits['largest-contentful-paint'];
  if (lcp && typeof lcp.numericValue === 'number' && lcp.numericValue > 2500) {
    findings.push({
      id: 'google_lcp_high',
      severity: lcp.numericValue > 4000 ? 'critical' : 'warning',
      title: `Largest Contentful Paint (LCP): ${lcp.displayValue || `${Math.round(lcp.numericValue)}ms`}`,
      evidence: `Measured LCP was ${lcp.displayValue || `${Math.round(lcp.numericValue)}ms`} (Google recommended benchmark: <= 2.5s).`,
      fix: 'Optimize hero images with modern formats (AVIF/WebP), compress assets, and leverage edge CDN caching.',
      source: 'google_lighthouse'
    });
  }

  const cls = audits['cumulative-layout-shift'];
  if (cls && typeof cls.numericValue === 'number' && cls.numericValue > 0.1) {
    findings.push({
      id: 'google_cls_high',
      severity: cls.numericValue > 0.25 ? 'critical' : 'warning',
      title: `Cumulative Layout Shift (CLS): ${cls.displayValue || cls.numericValue.toFixed(3)}`,
      evidence: `Measured CLS was ${cls.displayValue || cls.numericValue.toFixed(3)} (Google recommended benchmark: <= 0.1).`,
      fix: 'Specify explicit width and height dimensions on all images and ad slots to prevent layout shifting.',
      source: 'google_lighthouse'
    });
  }

  return findings;
}

/**
 * Runs Google PageSpeed Insights API with bounded timeout.
 * @param {string} targetUrl - Target URL to analyze
 * @param {string} apiKey - Google Cloud API Key
 * @param {{ timeoutMs?: number, strategy?: 'mobile'|'desktop', fetchFn?: typeof fetch }} [options]
 */
export async function runPageSpeedAudit(targetUrl, apiKey, options = {}) {
  const cleanKey = normalizeApiKey(apiKey);
  if (!cleanKey) {
    return {
      success: false,
      error: 'missing_api_key',
      message: 'Google PageSpeed API key is not configured.'
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const strategy = options.strategy ?? 'mobile';
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  const queryParams = new URLSearchParams({
    url: targetUrl,
    key: cleanKey,
    strategy: strategy
  });
  queryParams.append('category', 'seo');
  queryParams.append('category', 'performance');

  const endpoint = `${PSI_ENDPOINT}?${queryParams.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    if (!response.ok) {
      let errBody;
      try { errBody = await response.json(); } catch {}
      const errMsg = errBody?.error?.message || `Google PageSpeed returned HTTP ${response.status}`;
      return {
        success: false,
        status: response.status,
        error: 'psi_api_error',
        message: errMsg
      };
    }

    const data = await response.json();
    const lh = data?.lighthouseResult;
    if (!lh || !lh.categories) {
      return {
        success: false,
        error: 'invalid_psi_response',
        message: 'Lighthouse audit results missing from PageSpeed response.'
      };
    }

    const seoScore = typeof lh.categories?.seo?.score === 'number'
      ? Math.round(lh.categories.seo.score * 100)
      : null;

    const perfScore = typeof lh.categories?.performance?.score === 'number'
      ? Math.round(lh.categories.performance.score * 100)
      : null;

    const audits = lh.audits || {};

    const lcpVal = audits['largest-contentful-paint']?.numericValue ?? null;
    const clsVal = audits['cumulative-layout-shift']?.numericValue ?? null;
    const fcpVal = audits['first-contentful-paint']?.numericValue ?? null;
    const tbtVal = audits['total-blocking-time']?.numericValue ?? null;
    const speedIndexVal = audits['speed-index']?.numericValue ?? null;

    const coreWebVitals = {
      lcp: {
        display: audits['largest-contentful-paint']?.displayValue || null,
        value_ms: typeof lcpVal === 'number' ? Math.round(lcpVal) : null,
        status: getMetricStatus('lcp', lcpVal)
      },
      cls: {
        display: audits['cumulative-layout-shift']?.displayValue || null,
        value: typeof clsVal === 'number' ? Number(clsVal.toFixed(3)) : null,
        status: getMetricStatus('cls', clsVal)
      },
      fcp: {
        display: audits['first-contentful-paint']?.displayValue || null,
        value_ms: typeof fcpVal === 'number' ? Math.round(fcpVal) : null,
        status: getMetricStatus('fcp', fcpVal)
      },
      tbt: {
        display: audits['total-blocking-time']?.displayValue || null,
        value_ms: typeof tbtVal === 'number' ? Math.round(tbtVal) : null,
        status: getMetricStatus('tbt', tbtVal)
      },
      speed_index: {
        display: audits['speed-index']?.displayValue || null,
        value_ms: typeof speedIndexVal === 'number' ? Math.round(speedIndexVal) : null
      }
    };

    const findings = mapLighthouseFindings(audits);

    return {
      success: true,
      seo_score: seoScore,
      performance_score: perfScore,
      core_web_vitals: coreWebVitals,
      findings
    };
  } catch (err) {
    const isTimeout = err?.name === 'AbortError' || (err?.message && err.message.toLowerCase().includes('abort'));
    return {
      success: false,
      error: isTimeout ? 'psi_timeout' : 'psi_network_error',
      message: isTimeout ? 'Google PageSpeed Insights timed out.' : (err?.message || 'Network error querying PageSpeed.')
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Merges a local live scan result with Google PageSpeed Insights data.
 * @param {Record<string, any>} localResult
 * @param {Record<string, any>} psiResult
 * @param {string} targetUrl
 */
export function mergeScanWithPageSpeed(localResult, psiResult, targetUrl) {
  if (!psiResult || !psiResult.success) {
    return {
      ...(localResult || {}),
      google_verified: false,
      psi_fallback_reason: psiResult?.error || 'psi_unavailable'
    };
  }

  // If local scan failed completely but PSI succeeded:
  if (!localResult || !localResult.success) {
    const fallbackScore = (typeof psiResult.performance_score === 'number' && typeof psiResult.seo_score === 'number')
      ? Math.round(psiResult.performance_score * 0.60 + psiResult.seo_score * 0.40)
      : (psiResult.seo_score ?? psiResult.performance_score ?? null);

    return {
      success: true,
      url: targetUrl,
      score: fallbackScore,
      seo_score: psiResult.seo_score ?? null,
      performance_score: psiResult.performance_score ?? null,
      measured_latency_ms: null,
      response_time_ms: null,
      has_ssl: null,
      has_hsts: null,
      google_verified: true,
      core_web_vitals: psiResult.core_web_vitals || null,
      breakdown: null,
      local_signals: null,
      findings: psiResult.findings ? psiResult.findings.slice(0, 8) : []
    };
  }

  // Combine findings: prioritize critical, deduplicate similar IDs
  const combinedFindings = [];
  const seenIds = new Set();

  // 1. Critical local findings first (e.g. noindex, missing SSL)
  for (const f of localResult.findings || []) {
    if (f.severity === 'critical') {
      combinedFindings.push(f);
      seenIds.add(f.id);
    }
  }

  // 2. Google Lighthouse findings
  for (const f of psiResult.findings || []) {
    if (!seenIds.has(f.id)) {
      if (f.id === 'google_document_title' && (seenIds.has('seo_title_missing') || seenIds.has('seo_title_length'))) continue;
      if (f.id === 'google_meta_description' && seenIds.has('seo_desc_missing')) continue;
      if (f.id === 'google_canonical' && seenIds.has('canonical_missing')) continue;
      combinedFindings.push(f);
      seenIds.add(f.id);
    }
  }

  // 3. Remaining local findings (schema, analytics, response time, local readiness)
  for (const f of localResult.findings || []) {
    if (!seenIds.has(f.id)) {
      if (f.id === 'seo_title_missing' && seenIds.has('google_document_title')) continue;
      if (f.id === 'seo_desc_missing' && seenIds.has('google_meta_description')) continue;
      if (f.id === 'canonical_missing' && seenIds.has('google_canonical')) continue;
      combinedFindings.push(f);
      seenIds.add(f.id);
    }
  }

  // Sort by severity (critical -> warning -> info -> good)
  const severityRank = { critical: 0, warning: 1, info: 2, good: 3 };
  combinedFindings.sort((a, b) => (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99));

  // Determine composite score: Google Lighthouse SEO checklist is typically 90-100 for almost all sites,
  // so we combine 60% Mobile Performance (Core Web Vitals & real speed), 25% Google SEO checklist,
  // and 15% On-Page & Schema Architecture to provide a realistic, commercially honest rating.
  let finalScore = localResult.score;
  if (typeof psiResult.performance_score === 'number' && typeof psiResult.seo_score === 'number') {
    const baseLocal = typeof localResult.score === 'number' ? localResult.score : 70;
    finalScore = Math.round(
      psiResult.performance_score * 0.60 +
      psiResult.seo_score * 0.25 +
      baseLocal * 0.15
    );
  } else if (typeof psiResult.performance_score === 'number') {
    const baseLocal = typeof localResult.score === 'number' ? localResult.score : 70;
    finalScore = Math.round(psiResult.performance_score * 0.70 + baseLocal * 0.30);
  } else if (typeof psiResult.seo_score === 'number') {
    finalScore = psiResult.seo_score;
  }

  // Technical breakdown category reflects official Google performance if available
  const techScore = typeof psiResult.performance_score === 'number'
    ? Math.round((psiResult.performance_score / 100) * 25)
    : (localResult.breakdown?.technical?.score ?? 20);

  return {
    ...localResult,
    score: finalScore,
    seo_score: psiResult.seo_score ?? null,
    performance_score: psiResult.performance_score ?? null,
    google_verified: true,
    core_web_vitals: psiResult.core_web_vitals || null,
    breakdown: {
      ...localResult.breakdown,
      technical: {
        score: techScore,
        max: 25,
        label: "Speed & Performance"
      }
    },
    findings: combinedFindings.slice(0, 8)
  };
}

