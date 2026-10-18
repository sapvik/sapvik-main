import React, { useState, useEffect, useRef } from 'react';
import { trackEvent, getScoreBucket, getLatencyBucket } from '../../lib/analytics';
import { renderTurnstile, getTurnstileToken, resetTurnstile, isTurnstileConfigured } from '../../lib/turnstile';

export interface CoreWebVitalMetric {
  display: string | null;
  value_ms?: number | null;
  value?: number | null;
  status?: 'good' | 'needs-improvement' | 'poor' | 'unknown';
}

export interface CoreWebVitals {
  lcp?: CoreWebVitalMetric;
  cls?: CoreWebVitalMetric;
  fcp?: CoreWebVitalMetric;
  tbt?: CoreWebVitalMetric;
  speed_index?: CoreWebVitalMetric;
}

interface Finding {
  id: string;
  severity: 'good' | 'warning' | 'info' | 'critical';
  title: string;
  evidence: string;
  fix: string;
  source?: string;
}

export interface ScoreCategory {
  score: number;
  max: number;
  label: string;
}

export interface ScoreBreakdown {
  meta?: ScoreCategory;
  content?: ScoreCategory;
  technical?: ScoreCategory;
  rich_data?: ScoreCategory;
}

export interface LocalSignals {
  has_local_schema?: boolean;
  has_phone?: boolean;
  has_maps_link?: boolean;
  local_readiness?: number;
}

interface ScanResponse {
  success: boolean;
  url?: string;
  score?: number;
  performance_score?: number | null;
  google_verified?: boolean;
  core_web_vitals?: CoreWebVitals | null;
  measured_latency_ms?: number;
  response_time_ms?: number;
  has_ssl?: boolean | null;
  has_hsts?: boolean;
  has_schema?: boolean;
  has_pixel?: boolean;
  has_analytics?: boolean;
  has_viewport?: boolean;
  breakdown?: ScoreBreakdown | null;
  local_signals?: LocalSignals | null;
  findings?: Finding[];
  psi_attempted?: boolean;
  psi_fallback_reason?: string;
  error?: string;
  message?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, any>) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

export default function Scanner() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Ready for live SEO inspection.');
  const [scoreVal, setScoreVal] = useState('—');
  const [scoreColor, setScoreColor] = useState('var(--c-text-primary)');
  const [ttfbVal, setTtfbVal] = useState('—');
  const [sslVal, setSslVal] = useState('—');
  const [sslColor, setSslColor] = useState('var(--c-text-muted)');
  const [googleVerified, setGoogleVerified] = useState(false);
  const [performanceScore, setPerformanceScore] = useState<number | null>(null);
  const [coreWebVitals, setCoreWebVitals] = useState<CoreWebVitals | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [psiUnavailable, setPsiUnavailable] = useState(false);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [findings, setFindings] = useState<Array<{ severity: string; title: string; fix?: string; evidence?: string; source?: string }>>([
    {
      severity: 'info',
      title: 'SEO Diagnostic Standby',
      evidence: 'Enter any live website domain above to inspect real SEO score, response latency, SSL certificate health, Schema entities, and meta indexability.'
    }
  ]);

  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const turnstileLoadedRef = useRef(false);

  const initTurnstile = () => {
    if (turnstileLoadedRef.current) return;
    turnstileLoadedRef.current = true;
    const id = renderTurnstile(
      turnstileContainerRef.current,
      (token: string) => setTurnstileToken(token),
      (id: string) => { widgetIdRef.current = id; }
    );
    if (id) {
      widgetIdRef.current = id;
    }
  };

  useEffect(() => {
    initTurnstile();
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawTarget = url.trim();
    if (!rawTarget) {
      document.getElementById('scannerUrlInput')?.focus();
      return;
    }

    setIsLoading(true);
    setHasScanned(true);
    setScanError(null);
    setPsiUnavailable(false);
    setProgress(20);
    setStatusMsg('Dispatching network probe & SSL security handshake...');

    trackEvent('scan_start');

    const progressTimer1 = setTimeout(() => {
      setProgress(50);
      setStatusMsg('Inspecting HTML headers, Schema entity, & tracking pixels...');
    }, 1200);

    const progressTimer2 = setTimeout(() => {
      setProgress(75);
      setStatusMsg('Analyzing page structure, latency & performance signals...');
    }, 3800);

    try {
      let token = turnstileToken;
      if (!token && widgetIdRef.current) {
        token = getTurnstileToken(widgetIdRef.current);
      }

      if (!token && isTurnstileConfigured()) {
        setStatusMsg('Completing security verification...');
        for (let i = 0; i < 25; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          token = turnstileToken || (widgetIdRef.current ? getTurnstileToken(widgetIdRef.current) : '');
          if (token) break;
        }
      }

      const controller = new AbortController();
      const clientTimeout = setTimeout(() => controller.abort(), 18000);

      const resp = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawTarget, turnstileToken: token }),
        signal: controller.signal
      });
      clearTimeout(clientTimeout);

      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      setProgress(100);

      const data: ScanResponse = await resp.json();

      if (resp.ok && data.success) {
        setStatusMsg(data.google_verified
          ? `Google Lighthouse & SEO Probe Complete for ${data.url || rawTarget}`
          : `Live Probe Complete for ${data.url || rawTarget}`
        );

        setGoogleVerified(Boolean(data.google_verified));
        setPerformanceScore(typeof data.performance_score === 'number' ? data.performance_score : null);
        setCoreWebVitals(data.core_web_vitals || null);

        const psiFailed = Boolean(data.psi_fallback_reason || (data.psi_attempted && !data.google_verified));
        setPsiUnavailable(psiFailed);

        const computedScore = typeof data.score === 'number' ? data.score : null;
        if (computedScore !== null) {
          setScoreVal(`${computedScore}/100`);
          setScoreColor(computedScore >= 80 ? 'var(--c-success)' : (computedScore >= 50 ? 'var(--c-warning)' : 'var(--c-vermilion)'));
        } else {
          setScoreVal('—');
          setScoreColor('var(--c-text-muted)');
        }

        const latency = data.measured_latency_ms ?? data.response_time_ms;
        if (typeof latency === 'number') {
          setTtfbVal(`${latency}ms`);
        } else {
          setTtfbVal('—');
        }

        if (data.has_ssl === true) {
          setSslVal('VALID');
          setSslColor('var(--c-success)');
        } else if (data.has_ssl === false) {
          setSslVal('FAILED');
          setSslColor('var(--c-vermilion)');
        } else {
          setSslVal('—');
          setSslColor('var(--c-text-muted)');
        }

        if (data.findings && data.findings.length > 0) {
          setFindings(data.findings);
        } else {
          setFindings([
            {
              severity: 'good',
              title: 'Server Active & Reachable',
              fix: 'Response latency within acceptable range. SSL active.'
            }
          ]);
        }

        trackEvent('scan_complete', {
          score_bucket: getScoreBucket(computedScore),
          latency_bucket: getLatencyBucket(latency)
        });

        setBreakdown(data.breakdown || null);

        // Broadcast audit result so Heatmap immediately reflects this specific domain
        const domainClean = (data.url || rawTarget).replace(/^https?:\/\//, '').split('/')[0];
        const auditPayload = {
          domain: domainClean,
          score: computedScore,
          latency: latency ?? null,
          has_ssl: data.has_ssl,
          breakdown: data.breakdown || null,
          local_signals: data.local_signals || null,
          google_verified: Boolean(data.google_verified),
          core_web_vitals: data.core_web_vitals || null
        };
        try {
          sessionStorage.setItem('sapvik_latest_audit', JSON.stringify(auditPayload));
        } catch {}
        window.dispatchEvent(new CustomEvent('sapvik:audit-complete', {
          detail: auditPayload
        }));
      } else {
        setGoogleVerified(false);
        setPerformanceScore(null);
        setCoreWebVitals(null);
        const errorMsg = data.message || "Couldn't complete the check. Please try again.";
        setScanError(errorMsg);
        setStatusMsg(`Probe halted: ${errorMsg}`);
        setScoreVal('N/A');
        setScoreColor('var(--c-text-muted)');
        setTtfbVal('—');
        setSslVal(data.has_ssl === false ? 'FAILED' : '—');
        setSslColor(data.has_ssl === false ? 'var(--c-vermilion)' : 'var(--c-text-muted)');
        setBreakdown(null);
        setFindings([
          {
            severity: 'critical',
            title: errorMsg,
            fix: 'Target may block external crawlers, is experiencing downtime, or firewall restricted. Request a manual audit below.'
          }
        ]);

        trackEvent('scan_error', { error_code: data.error || 'scan_failed' });
      }
    } catch (err: any) {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      setGoogleVerified(false);
      setPerformanceScore(null);
      setCoreWebVitals(null);
      const errorMsg = "Couldn't complete the check. Please try again.";
      setScanError(errorMsg);
      setStatusMsg(errorMsg);
      setScoreVal('N/A');
      setScoreColor('var(--c-text-muted)');
      setTtfbVal('—');
      setSslVal('—');
      setSslColor('var(--c-text-muted)');
      setBreakdown(null);
      setFindings([
        {
          severity: 'critical',
          title: "Couldn't complete the check",
          fix: 'The target website may be unreachable or blocking automated checks. Request a manual audit below.'
        }
      ]);

      trackEvent('scan_error', { error_code: err?.name === 'AbortError' ? 'timeout' : 'client_fetch_error' });
    } finally {
      setIsLoading(false);
      resetTurnstile(widgetIdRef.current);
      setTimeout(() => {
        setProgress(0);
      }, 1200);
    }
  };

  return (
    <div className="frame-box hero-audit-deck" id="scanner">
      <div className="audit-deck-header">
        <div className="mono-label" style={{ color: 'var(--c-vermilion)', marginBottom: '0.35rem' }}>
          Quick SEO Diagnostic
        </div>
        <h2 className="audit-deck-title">Quick SEO Score Check</h2>
        <p className="audit-deck-subtitle">
          Enter your domain to inspect on-page SEO readiness: Title tags, meta descriptions, SSL security, schema markup, and response latency.
        </p>
      </div>

      {/* Input Area */}
      <form onSubmit={handleScan} className="scanner-input-group" onPointerDown={initTurnstile}>
        <label
          htmlFor="scannerUrlInput"
          className="visually-hidden"
          style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}
        >
          Target Website URL
        </label>
        <input
          type="text"
          id="scannerUrlInput"
          className="scanner-input"
          placeholder="e.g. kailashclinic.in"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={initTurnstile}
          disabled={isLoading}
          inputMode="url"
          autoComplete="url"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          type="submit"
          id="runScanBtn"
          className="btn btn-primary btn-sm scanner-btn"
          disabled={isLoading}
        >
          {isLoading ? 'ANALYZING SEO...' : (hasScanned ? 'RE-CHECK SEO' : 'RUN SEO CHECK')}
        </button>
      </form>

      {/* Turnstile Bot Challenge (only if configured) */}
      {isTurnstileConfigured() && (
        <div
          ref={turnstileContainerRef}
          id="scannerTurnstile"
          className="cf-turnstile"
          style={{ minHeight: '65px', marginTop: '0.75rem' }}
        ></div>
      )}

      {/* Progress Bar */}
      <div
        className="scanner-progress-track"
        id="scannerProgressTrack"
        style={{ display: isLoading ? 'block' : 'none' }}
      >
        <div
          className="scanner-progress-bar"
          id="scannerProgressBar"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Status Message */}
      <div
        id="scannerStatusMsg"
        className="mono-label"
        style={{ marginBottom: '1rem', color: 'var(--c-text-primary)' }}
        aria-live="polite"
      >
        {statusMsg}
      </div>

      {/* PSI Fallback Notice if Google PageSpeed failed or timed out */}
      {psiUnavailable && (
        <div className="psi-fallback-alert" style={{
          margin: '0.75rem 0',
          padding: '0.65rem 0.85rem',
          background: 'var(--c-surface-subdued)',
          borderLeft: '3px solid var(--c-warning)',
          fontSize: '0.82rem',
          color: 'var(--c-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ color: 'var(--c-warning)', fontWeight: 700 }}>Notice:</span>
          <span>Google PageSpeed data unavailable for this check.</span>
        </div>
      )}

      {/* Error Panel if Probe Failed */}
      {scanError && (
        <div className="scanner-error-panel" style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(230, 57, 70, 0.08)', border: '1px solid var(--c-vermilion)' }}>
          <div style={{ fontWeight: 700, color: 'var(--c-vermilion)', marginBottom: '0.35rem' }}>
            {scanError}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', marginBottom: '0.75rem' }}>
            Target host may be blocking automated probes, experiencing downtime, or does not exist.
          </p>
          <a href="#contact" className="btn btn-secondary btn-sm">
            Request Manual Diagnostic &rarr;
          </a>
        </div>
      )}

      {/* Metrics Readout */}
      <div className="scanner-results-deck">
        <div className="scanner-metric-cell readout-card">
          <div className="scanner-metric-val readout-value" id="scanScoreVal" style={{ color: scoreColor }}>
            {scoreVal}
          </div>
          <div className="scanner-metric-lbl">
            {googleVerified ? 'Google SEO' : 'On-page checks (not a Google score)'}
          </div>
        </div>
        {googleVerified && (
          <div className="scanner-metric-cell readout-card">
            <div className="scanner-metric-val readout-value" id="scanPerfVal" style={{
              color: performanceScore !== null
                ? (performanceScore >= 90 ? 'var(--c-success)' : (performanceScore >= 50 ? 'var(--c-warning)' : 'var(--c-vermilion)'))
                : 'var(--c-text-muted)'
            }}>
              {performanceScore !== null ? `${performanceScore}/100` : '—'}
            </div>
            <div className="scanner-metric-lbl">Google Lighthouse Speed</div>
          </div>
        )}
        <div className="scanner-metric-cell readout-card">
          <div className="scanner-metric-val readout-value" id="scanTtfbVal">
            {ttfbVal}
          </div>
          <div className="scanner-metric-lbl">Response Time</div>
        </div>
        <div className="scanner-metric-cell readout-card">
          <div className="scanner-metric-val readout-value" id="scanSslVal" style={{ color: sslColor }}>
            {sslVal}
          </div>
          <div className="scanner-metric-lbl">TLS / SSL Status</div>
        </div>
      </div>

      {/* Google PageSpeed & Core Web Vitals Panel */}
      {googleVerified && coreWebVitals && (
        <div className="scanner-cwv-container" id="scannerCwvDeck">
          <div className="scanner-cwv-header">
            <div className="google-badge-pill">
              <span className="google-dot" aria-hidden="true"></span>
              Google PageSpeed &amp; Lighthouse Verified (Mobile)
            </div>
          </div>

          <div className="scanner-cwv-grid">
            <div className={`cwv-card ${coreWebVitals.lcp?.status || 'unknown'}`}>
              <div className="cwv-label">LCP (Largest Contentful)</div>
              <div className="cwv-value">{coreWebVitals.lcp?.display || '—'}</div>
              <div className="cwv-status-tag">
                {coreWebVitals.lcp?.status === 'good' ? 'Good (<= 2.5s)' : (coreWebVitals.lcp?.status === 'needs-improvement' ? 'Needs Work' : 'Poor (> 4.0s)')}
              </div>
            </div>

            <div className={`cwv-card ${coreWebVitals.cls?.status || 'unknown'}`}>
              <div className="cwv-label">CLS (Layout Shift)</div>
              <div className="cwv-value">{coreWebVitals.cls?.display || '—'}</div>
              <div className="cwv-status-tag">
                {coreWebVitals.cls?.status === 'good' ? 'Good (<= 0.1)' : (coreWebVitals.cls?.status === 'needs-improvement' ? 'Needs Work' : 'Poor (> 0.25)')}
              </div>
            </div>

            <div className={`cwv-card ${coreWebVitals.fcp?.status || 'unknown'}`}>
              <div className="cwv-label">FCP (First Paint)</div>
              <div className="cwv-value">{coreWebVitals.fcp?.display || '—'}</div>
              <div className="cwv-status-tag">
                {coreWebVitals.fcp?.status === 'good' ? 'Good (<= 1.8s)' : (coreWebVitals.fcp?.status === 'needs-improvement' ? 'Needs Work' : 'Poor (> 3.0s)')}
              </div>
            </div>

            <div className={`cwv-card ${coreWebVitals.tbt?.status || 'unknown'}`}>
              <div className="cwv-label">TBT (Blocking Time)</div>
              <div className="cwv-value">{coreWebVitals.tbt?.display || '—'}</div>
              <div className="cwv-status-tag">
                {coreWebVitals.tbt?.status === 'good' ? 'Good (<= 200ms)' : (coreWebVitals.tbt?.status === 'needs-improvement' ? 'Needs Work' : 'Poor (> 600ms)')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Defensible Category Breakdown */}
      {breakdown && (
        <div style={{ margin: '1rem 0', padding: '0.85rem 1rem', background: 'var(--c-surface-subdued)', border: '1px solid var(--c-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.35rem' }}>
            <span className="mono-label" style={{ color: 'var(--c-vermilion)', fontSize: '0.72rem' }}>
              SAPVIK on-page checks
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--c-text-muted)' }}>
              {googleVerified
                ? 'Rule-based on-page signals verified by SAPVIK. Independent of Google Lighthouse audits.'
                : 'A rule-based check of on-page signals found in the page\'s initial HTML. It is not a Google score.'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
            {breakdown.meta && (
              <div style={{ padding: '0.5rem 0.65rem', background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--c-text-muted)', fontWeight: 600 }}>META &amp; INDEXING</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--c-text-primary)', marginTop: '2px' }}>
                  {typeof breakdown.meta.score === 'number' ? breakdown.meta.score : '—'}
                  {typeof breakdown.meta.max === 'number' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-text-muted)' }}>/{breakdown.meta.max}</span>
                  )}
                </div>
              </div>
            )}
            {breakdown.content && (
              <div style={{ padding: '0.5rem 0.65rem', background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--c-text-muted)', fontWeight: 600 }}>CONTENT STRUCTURE</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--c-text-primary)', marginTop: '2px' }}>
                  {typeof breakdown.content.score === 'number' ? breakdown.content.score : '—'}
                  {typeof breakdown.content.max === 'number' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-text-muted)' }}>/{breakdown.content.max}</span>
                  )}
                </div>
              </div>
            )}
            {breakdown.technical && (
              <div style={{ padding: '0.5rem 0.65rem', background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--c-text-muted)', fontWeight: 600 }}>SPEED &amp; SECURITY</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--c-text-primary)', marginTop: '2px' }}>
                  {typeof breakdown.technical.score === 'number' ? breakdown.technical.score : '—'}
                  {typeof breakdown.technical.max === 'number' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-text-muted)' }}>/{breakdown.technical.max}</span>
                  )}
                </div>
              </div>
            )}
            {breakdown.rich_data && (
              <div style={{ padding: '0.5rem 0.65rem', background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--c-text-muted)', fontWeight: 600 }}>SCHEMA &amp; SOCIAL</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--c-text-primary)', marginTop: '2px' }}>
                  {typeof breakdown.rich_data.score === 'number' ? breakdown.rich_data.score : '—'}
                  {typeof breakdown.rich_data.max === 'number' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-text-muted)' }}>/{breakdown.rich_data.max}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Findings List */}
      <ul className="scanner-findings-list" id="scannerFindingsContainer">
        {findings.map((f, i) => (
          <li key={i} className={`scanner-finding-item ${f.severity || 'info'}`}>
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span>{f.title}</span>
                {f.source === 'google_lighthouse' && (
                  <span className="google-audit-tag">Google Lighthouse</span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--c-text-muted)', marginTop: '2px' }}>
                {f.fix || f.evidence}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '1.25rem', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={() => {
            document.getElementById('heatmap')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', minHeight: '34px' }}
        >
          <span>View Heatmap for {url ? url.replace(/^https?:\/\//, '').split('/')[0] : 'Domain'} &darr;</span>
        </button>
        <a href="#contact" style={{ color: 'var(--c-vermilion)', fontWeight: 600 }}>
          Request comprehensive discovery audit report &rarr;
        </a>
      </div>
    </div>
  );
}
