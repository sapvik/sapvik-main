import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeApiKey,
  getMetricStatus,
  mapLighthouseFindings,
  runPageSpeedAudit,
  mergeScanWithPageSpeed
} from '../functions/lib/pagespeed.js';

test('PageSpeed: normalizeApiKey strips whitespace and surrounding quotes', () => {
  assert.equal(normalizeApiKey(''), '');
  assert.equal(normalizeApiKey(null), '');
  assert.equal(normalizeApiKey(undefined), '');
  assert.equal(normalizeApiKey('  AIzaSyD-12345  '), 'AIzaSyD-12345');
  assert.equal(normalizeApiKey('"AIzaSyD-12345"'), 'AIzaSyD-12345');
  assert.equal(normalizeApiKey("'AIzaSyD-12345'"), 'AIzaSyD-12345');
});

test('PageSpeed: getMetricStatus assigns correct thresholds', () => {
  assert.equal(getMetricStatus('lcp', 1200), 'good');
  assert.equal(getMetricStatus('lcp', 3200), 'needs-improvement');
  assert.equal(getMetricStatus('lcp', 4500), 'poor');

  assert.equal(getMetricStatus('cls', 0.05), 'good');
  assert.equal(getMetricStatus('cls', 0.15), 'needs-improvement');
  assert.equal(getMetricStatus('cls', 0.35), 'poor');

  assert.equal(getMetricStatus('fcp', 1200), 'good');
  assert.equal(getMetricStatus('fcp', 2200), 'needs-improvement');
  assert.equal(getMetricStatus('fcp', 3500), 'poor');

  assert.equal(getMetricStatus('tbt', 50), 'good');
  assert.equal(getMetricStatus('tbt', 350), 'needs-improvement');
  assert.equal(getMetricStatus('tbt', 750), 'poor');

  assert.equal(getMetricStatus('lcp', null), 'unknown');
});

test('PageSpeed: mapLighthouseFindings maps audits into actionable items', () => {
  const sampleAudits = {
    'meta-description': {
      id: 'meta-description',
      title: 'Document does not have a meta description',
      score: 0,
      displayValue: null
    },
    'tap-targets': {
      id: 'tap-targets',
      title: 'Tap targets are not sized appropriately',
      score: 0.5,
      displayValue: '2 targets too close'
    },
    'largest-contentful-paint': {
      id: 'largest-contentful-paint',
      numericValue: 3800,
      displayValue: '3.8 s',
      score: 0.5
    }
  };

  const findings = mapLighthouseFindings(sampleAudits);
  assert.ok(findings.length >= 3);

  const metaFinding = findings.find(f => f.id === 'google_meta_description');
  assert.ok(metaFinding);
  assert.equal(metaFinding.severity, 'info');
  assert.equal(metaFinding.source, 'google_lighthouse');

  const tapFinding = findings.find(f => f.id === 'google_tap_targets');
  assert.ok(tapFinding);
  assert.equal(tapFinding.severity, 'warning');

  const lcpFinding = findings.find(f => f.id === 'google_lcp_high');
  assert.ok(lcpFinding);
  assert.equal(lcpFinding.severity, 'warning');
});

test('PageSpeed: runPageSpeedAudit returns missing_api_key when key is absent', async () => {
  const res = await runPageSpeedAudit('https://example.com', '');
  assert.equal(res.success, false);
  assert.equal(res.error, 'missing_api_key');
});

test('PageSpeed: runPageSpeedAudit successfully parses mock Lighthouse response', async () => {
  const mockFetch = async () => {
    return new Response(JSON.stringify({
      lighthouseResult: {
        categories: {
          seo: { score: 0.92 },
          performance: { score: 0.88 }
        },
        audits: {
          'largest-contentful-paint': { numericValue: 1400, displayValue: '1.4 s' },
          'cumulative-layout-shift': { numericValue: 0.02, displayValue: '0.02' },
          'first-contentful-paint': { numericValue: 900, displayValue: '0.9 s' },
          'total-blocking-time': { numericValue: 50, displayValue: '50 ms' },
          'speed-index': { numericValue: 1200, displayValue: '1.2 s' }
        }
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const res = await runPageSpeedAudit('https://example.com', 'test-key', { fetchFn: mockFetch });
  assert.equal(res.success, true);
  assert.equal(res.seo_score, 92);
  assert.equal(res.performance_score, 88);
  assert.equal(res.core_web_vitals.lcp.display, '1.4 s');
  assert.equal(res.core_web_vitals.lcp.status, 'good');
  assert.equal(res.core_web_vitals.cls.status, 'good');
});

test('PageSpeed: runPageSpeedAudit handles HTTP errors gracefully', async () => {
  const mockFetch = async () => {
    return new Response(JSON.stringify({
      error: { message: 'Quota exceeded for API' }
    }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  };

  const res = await runPageSpeedAudit('https://example.com', 'test-key', { fetchFn: mockFetch });
  assert.equal(res.success, false);
  assert.equal(res.status, 429);
  assert.equal(res.error, 'psi_api_error');
  assert.ok(res.message.includes('Quota exceeded'));
});

test('PageSpeed: mergeScanWithPageSpeed merges local and Google findings without duplicates', () => {
  const localScan = {
    success: true,
    url: 'https://example.com',
    score: 75,
    measured_latency_ms: 220,
    has_ssl: true,
    breakdown: {
      meta: { score: 20, max: 30, label: 'Meta' },
      content: { score: 20, max: 25, label: 'Content' },
      technical: { score: 20, max: 25, label: 'Technical' },
      rich_data: { score: 15, max: 20, label: 'Rich' }
    },
    findings: [
      { id: 'ssl_missing', severity: 'critical', title: 'SSL missing', evidence: '', fix: '' },
      { id: 'seo_title_missing', severity: 'warning', title: 'Title missing', evidence: '', fix: '' },
      { id: 'analytics_missing', severity: 'warning', title: 'GA4 missing', evidence: '', fix: '' }
    ]
  };

  const psiScan = {
    success: true,
    seo_score: 90,
    performance_score: 95,
    core_web_vitals: {
      lcp: { display: '1.2 s', value_ms: 1200, status: 'good' }
    },
    findings: [
      { id: 'google_document_title', severity: 'warning', title: 'Google: Title missing', evidence: '', fix: '', source: 'google_lighthouse' },
      { id: 'google_tap_targets', severity: 'warning', title: 'Tap targets', evidence: '', fix: '', source: 'google_lighthouse' }
    ]
  };

  const merged = mergeScanWithPageSpeed(localScan, psiScan, 'https://example.com');
  assert.equal(merged.google_verified, true);
  // Math.round(95 * 0.60 + 90 * 0.25 + 75 * 0.15) = Math.round(57 + 22.5 + 11.25) = 91
  assert.equal(merged.score, 91, 'Google score should reflect weighted composite: 60% mobile perf, 25% Google SEO, 15% local');
  assert.equal(merged.performance_score, 95);
  assert.equal(merged.seo_score, 90);
  assert.equal(merged.measured_latency_ms, 220);

  // Findings should deduplicate title issue
  const titleFindings = merged.findings.filter(f => f.id === 'google_document_title' || f.id === 'seo_title_missing');
  assert.equal(titleFindings.length, 1, 'Duplicate title finding should be deduplicated');

  // Critical SSL finding must be retained and sorted first
  assert.equal(merged.findings[0].severity, 'critical');
});

test('PageSpeed: harsh composite score penalizes slow sites even if Google SEO checklist is 100', () => {
  const localScan = {
    success: true,
    url: 'https://example.com',
    score: 70,
    has_ssl: true,
    findings: []
  };

  const slowPsi = {
    success: true,
    seo_score: 100, // Common 100 on Google checklist
    performance_score: 35, // Sluggish mobile CWV
    core_web_vitals: {
      lcp: { display: '5.2 s', value_ms: 5200, status: 'poor' }
    },
    findings: []
  };

  const merged = mergeScanWithPageSpeed(localScan, slowPsi, 'https://example.com');
  // Math.round(35 * 0.60 + 100 * 0.25 + 70 * 0.15) = Math.round(21 + 25 + 10.5) = 57
  assert.equal(merged.score, 57, 'Harsh weighting must prevent 100 score on slow mobile site');
  assert.equal(merged.google_verified, true);
  assert.equal(merged.seo_score, 100);
  assert.equal(merged.performance_score, 35);
});

test('PageSpeed: mergeScanWithPageSpeed handles failed PSI with graceful fallback', () => {
  const localScan = {
    success: true,
    url: 'https://example.com',
    score: 82,
    has_ssl: true,
    findings: []
  };

  const failedPsi = {
    success: false,
    error: 'psi_timeout',
    message: 'PageSpeed timed out'
  };

  const merged = mergeScanWithPageSpeed(localScan, failedPsi, 'https://example.com');
  assert.equal(merged.google_verified, false);
  assert.equal(merged.score, 82);
  assert.equal(merged.psi_fallback_reason, 'psi_timeout');
});

test('PageSpeed: local failure + PSI success returns no invented values and null breakdown', () => {
  const failedLocalScan = {
    success: false,
    error: 'unreachable',
    message: 'Target host is unreachable'
  };

  const successfulPsi = {
    success: true,
    seo_score: 88,
    performance_score: 72,
    core_web_vitals: {
      lcp: { display: '2.1 s', value_ms: 2100, status: 'good' }
    },
    findings: [
      { id: 'google_document_title', severity: 'warning', title: 'Title issue', evidence: '', fix: '', source: 'google_lighthouse' }
    ]
  };

  const merged = mergeScanWithPageSpeed(failedLocalScan, successfulPsi, 'https://example.com');
  assert.equal(merged.success, true);
  // Math.round(72 * 0.60 + 88 * 0.40) = Math.round(43.2 + 35.2) = 78
  assert.equal(merged.score, 78, 'Composite score combines PSI performance and SEO when local probe fails');
  assert.equal(merged.performance_score, 72);
  assert.equal(merged.seo_score, 88);
  assert.equal(merged.google_verified, true);

  // Assert no invented values
  assert.equal(merged.has_ssl, null, 'has_ssl must be null when local probe fails');
  assert.equal(merged.has_hsts, null, 'has_hsts must be null');
  assert.equal(merged.measured_latency_ms, null, 'measured_latency_ms must be null');
  assert.equal(merged.response_time_ms, null, 'response_time_ms must be null');
  assert.equal(merged.breakdown, null, 'breakdown must be null when local scan fails');
  assert.equal(merged.local_signals, null, 'local_signals must be null when local scan fails');
});
