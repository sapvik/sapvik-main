import React, { useState, useEffect, useRef } from 'react';
import { trackEvent, getScoreBucket, getLatencyBucket } from '../../lib/analytics';
import { renderTurnstile, getTurnstileToken, resetTurnstile, isTurnstileConfigured, waitForTurnstileToken } from '../../lib/turnstile';

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
  const tokenRef = useRef<string>('');
  const turnstileErrorRef = useRef<string | null>(null);

  // Google Deep Scan State & Telemetry
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleProgress, setGoogleProgress] = useState(0);
  const [googleStatusMsg, setGoogleStatusMsg] = useState('');
  const [googleError, setGoogleError] = useState<string | null>(null);

  const onTurnstileToken = (token: string) => {
    tokenRef.current = token;
    setTurnstileToken(token);
  };

  const onTurnstileError = (err?: string) => {
    turnstileErrorRef.current = err || 'turnstile_error';
  };

  const initTurnstile = () => {
    if (turnstileLoadedRef.current) return;
    turnstileLoadedRef.current = true;
    const id = renderTurnstile(
      turnstileContainerRef.current,
      onTurnstileToken,
      (id: string) => { widgetIdRef.current = id; },
      onTurnstileError
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
    setGoogleError(null);
    setProgress(20);
    setStatusMsg('Dispatching network probe & SSL security handshake...');

    trackEvent('scan_start');

    const progressTimer1 = setTimeout(() => {
      setProgress(50);
      setStatusMsg('Inspecting HTML headers, Schema entity, & tracking pixels...');
    }, 600);

    const progressTimer2 = setTimeout(() => {
      setProgress(80);
      setStatusMsg('Analyzing page structure, latency & performance signals...');
    }, 1200);

    try {
      const isPreview = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.pages.dev')
      );

      // Read token from ref (always up-to-date, no stale closure)
      let token = tokenRef.current;
      if (!token && widgetIdRef.current) {
        token = getTurnstileToken(widgetIdRef.current);
        if (token) tokenRef.current = token;
      }

      // Wait for Turnstile to solve if token isn't ready yet (up to 3.5s)
      if (!token && isTurnstileConfigured()) {
        if (!turnstileErrorRef.current) {
          setStatusMsg('Completing security verification...');
          token = await waitForTurnstileToken(
            () => widgetIdRef.current,
            () => tokenRef.current,
            3500,
            () => turnstileErrorRef.current
          );
          if (token) tokenRef.current = token;
        }
      }

      // Only block if on production (not preview / pages.dev) and token is missing
      if (!token && isTurnstileConfigured() && !isPreview) {
        clearTimeout(progressTimer1);
        clearTimeout(progressTimer2);
        setProgress(0);
        const verificationMsg = turnstileErrorRef.current
          ? 'Security challenge failed to load (ad-blocker or domain restriction). Please check your browser settings.'
          : 'Security verification could not be completed in time. Please complete the captcha verification above.';
        setScanError(verificationMsg);
        setStatusMsg(`Probe halted: ${verificationMsg}`);
        setScoreVal('N/A');
        setScoreColor('var(--c-text-muted)');
        setTtfbVal('—');
        setSslVal('—');
        setSslColor('var(--c-text-muted)');
        setBreakdown(null);
        setFindings([
          {
            severity: 'critical',
            title: 'Security Verification Required',
            fix: 'Please complete the Cloudflare security verification checkbox above or check your connection/ad-blocker, then re-check.'
          }
        ]);
        trackEvent('scan_error', { error_code: 'turnstile_timeout' });
        return;
      }

      const controller = new AbortController();
      const clientTimeout = setTimeout(() => controller.abort(), 18000);

      // Fast initial scan (includePsi: false) runs in <1s
      const resp = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawTarget, turnstileToken: token, includePsi: false }),
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
            fix: data.error === 'turnstile_failed'
              ? 'Cloudflare security challenge verification failed. Please complete the captcha checkbox above or refresh the page.'
              : 'Target may block external crawlers, is experiencing downtime, or firewall restricted. Request a manual audit below.'
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
      tokenRef.current = '';
      setTurnstileToken('');
      resetTurnstile(widgetIdRef.current);
      setTimeout(() => {
        setProgress(0);
      }, 1200);
    }
  };

  const handleGoogleDeepScan = async () => {
    const rawTarget = url.trim();
    if (!rawTarget || isGoogleLoading) return;

    setIsGoogleLoading(true);
    setGoogleError(null);
    setGoogleProgress(15);
    setGoogleStatusMsg('Connecting to Google PageSpeed Insights in Google Cloud...');

    const t1 = setTimeout(() => {
      setGoogleProgress(35);
      setGoogleStatusMsg('Spinning up headless Chrome container in Google datacenter...');
    }, 2500);

    const t2 = setTimeout(() => {
      setGoogleProgress(60);
      setGoogleStatusMsg('Simulating mobile 4G network & measuring Core Web Vitals (LCP, CLS, TBT)...');
    }, 6500);

    const t3 = setTimeout(() => {
      setGoogleProgress(85);
      setGoogleStatusMsg('Auditing 70+ Lighthouse SEO, Performance & Accessibility rules...');
    }, 13000);

    try {
      const controller = new AbortController();
      const clientTimeout = setTimeout(() => controller.abort(), 35000);

      const resp = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: rawTarget,
          turnstileToken: tokenRef.current,
          includePsi: true
        }),
        signal: controller.signal
      });
      clearTimeout(clientTimeout);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setGoogleProgress(100);

      const data: ScanResponse = await resp.json();

      if (resp.ok && data.success && data.google_verified) {
        setGoogleVerified(true);
        setPerformanceScore(typeof data.performance_score === 'number' ? data.performance_score : null);
        setCoreWebVitals(data.core_web_vitals || null);

        if (typeof data.score === 'number') {
          setScoreVal(`${data.score}/100`);
          setScoreColor(data.score >= 80 ? 'var(--c-success)' : (data.score >= 50 ? 'var(--c-warning)' : 'var(--c-vermilion)'));
        }

        if (data.findings && data.findings.length > 0) {
          setFindings(data.findings);
        }

        setGoogleStatusMsg(`Google Lighthouse & Core Web Vitals Verified for ${data.url || rawTarget}`);
        trackEvent('scan_complete', {
          score_bucket: getScoreBucket(data.score),
          google_verified: true
        });
      } else {
        const errMsg = data.psi_fallback_reason || data.message || 'Google Lighthouse could not verify this host.';
        setGoogleError(errMsg === 'timeout'
          ? 'Google cloud simulation timed out on this host (>30s). Target site may be throttled.'
          : `Google PageSpeed notice: ${errMsg}`
        );
      }
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setGoogleError(err?.name === 'AbortError'
        ? 'Google Lighthouse cloud simulation timed out (>35s). Site response is exceptionally slow.'
        : 'Network error connecting to Google PageSpeed API.'
      );
    } finally {
      setIsGoogleLoading(false);
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

      {/* Google PageSpeed On-Demand Deep Scan Button & Telemetry */}
      {!googleVerified && hasScanned && !isLoading && !scanError && (
        <div className="google-deep-scan-box" style={{
          margin: '1.25rem 0',
          padding: '1.25rem',
          background: 'var(--c-surface-subdued)',
          border: '1px solid var(--c-border)',
          borderRadius: '4px'
        }}>
          <div style={{ marginBottom: '0.85rem' }}>
            <span className="mono-label" style={{ color: 'var(--c-vermilion)', fontSize: '0.72rem', display: 'block', marginBottom: '0.25rem' }}>
              DEEP PERFORMANCE ANALYSIS
            </span>
            <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--c-text-primary)', marginBottom: '0.25rem' }}>
              Want Official Google Lighthouse Performance &amp; Core Web Vitals?
            </strong>
            <p style={{ fontSize: '0.82rem', color: 'var(--c-text-secondary)', margin: 0, lineHeight: 1.45 }}>
              Spins up a headless Chrome runner in Google Cloud to simulate mobile 4G network performance, measure LCP, CLS, TBT, and audit 70+ Lighthouse metrics.
            </p>
          </div>

          <button
            type="button"
            id="runGoogleAuditBtn"
            className="btn btn-secondary btn-full"
            onClick={handleGoogleDeepScan}
            disabled={isGoogleLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              letterSpacing: '0.04em'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>{isGoogleLoading ? 'AUDITING IN GOOGLE CLOUD (LIGHTHOUSE)...' : 'RUN DEEPER GOOGLE LIGHTHOUSE & CORE WEB VITALS ANALYSIS →'}</span>
          </button>

          {/* Google Deep Scan Progress Bar & Live Telemetry */}
          {isGoogleLoading && (
            <div style={{ marginTop: '0.85rem' }}>
              <div className="scanner-progress-track" style={{ display: 'block', height: '4px', marginBottom: '0.5rem' }}>
                <div className="scanner-progress-bar" style={{ width: `${googleProgress}%` }}></div>
              </div>
              <div className="mono-label" style={{ fontSize: '0.78rem', color: 'var(--c-text-primary)' }} aria-live="polite">
                {googleStatusMsg}
              </div>
            </div>
          )}

          {googleError && (
            <div style={{
              marginTop: '0.85rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(230, 57, 70, 0.08)',
              borderLeft: '3px solid var(--c-vermilion)',
              fontSize: '0.8rem',
              color: 'var(--c-vermilion)'
            }}>
              {googleError}
            </div>
          )}
        </div>
      )}


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
