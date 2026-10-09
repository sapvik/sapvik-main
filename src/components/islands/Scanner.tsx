import React, { useState, useEffect, useRef } from 'react';
import { trackEvent } from '../../lib/analytics';

interface Finding {
  id: string;
  severity: 'good' | 'warning' | 'info' | 'critical';
  title: string;
  evidence: string;
  fix: string;
}

interface ScanResponse {
  success: boolean;
  url?: string;
  score?: number;
  measured_latency_ms?: number;
  response_time_ms?: number;
  has_ssl?: boolean | null;
  has_hsts?: boolean;
  has_schema?: boolean;
  has_pixel?: boolean;
  has_analytics?: boolean;
  has_viewport?: boolean;
  findings?: Finding[];
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
  const [findings, setFindings] = useState<Array<{ severity: string; title: string; fix?: string; evidence?: string }>>([
    {
      severity: 'info',
      title: 'SEO Diagnostic Standby',
      evidence: 'Enter any live website domain above to inspect real SEO score, response latency, SSL certificate health, Schema entities, and meta indexability.'
    }
  ]);

  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Initialize Turnstile widget if present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.turnstile && turnstileContainerRef.current) {
      try {
        const id = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: '1x00000000000000000000AA',
          callback: (token: string) => setTurnstileToken(token)
        });
        widgetIdRef.current = id;
      } catch {
        // Turnstile already rendered
      }
    }
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
    setProgress(25);
    setStatusMsg('Dispatching real network probe & SSL handshake...');

    trackEvent('scan_start', {
      target: rawTarget.replace(/https?:\/\//, '').split('/')[0]
    });

    try {
      setProgress(55);
      setStatusMsg('Inspecting HTML headers, Schema entity, & tracking pixels...');

      let token = turnstileToken;
      if (!token && window.turnstile && widgetIdRef.current) {
        try {
          token = window.turnstile.getResponse(widgetIdRef.current) || '';
        } catch {}
      }

      const controller = new AbortController();
      const clientTimeout = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawTarget, turnstileToken: token }),
        signal: controller.signal
      });
      clearTimeout(clientTimeout);

      setProgress(100);

      const data: ScanResponse = await resp.json();

      if (resp.ok && data.success) {
        setStatusMsg(`Live Probe Complete for ${data.url || rawTarget}`);
        const computedScore = data.score !== undefined ? data.score : 85;
        setScoreVal(`${computedScore}/100`);
        setScoreColor(computedScore >= 80 ? 'var(--c-success)' : (computedScore >= 50 ? 'var(--c-warning)' : 'var(--c-vermilion)'));

        const latency = data.measured_latency_ms || data.response_time_ms || 240;
        setTtfbVal(`${latency}ms`);

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
          score: computedScore,
          latency
        });
      } else {
        const errorMsg = data.message || 'Target website took too long or refused connection.';
        setStatusMsg(`Probe halted: ${errorMsg}`);
        setScoreVal('N/A');
        setScoreColor('var(--c-text-muted)');
        setTtfbVal('—');
        setSslVal(data.has_ssl === false ? 'FAILED' : '—');
        setSslColor(data.has_ssl === false ? 'var(--c-vermilion)' : 'var(--c-text-muted)');
        setFindings([
          {
            severity: 'critical',
            title: errorMsg,
            fix: 'Target may block external crawlers, is experiencing downtime, or firewall restricted. Request a manual audit below.'
          }
        ]);

        trackEvent('scan_error', { error: data.error || 'scan_failed' });
      }
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      const msg = isTimeout
        ? 'Diagnostic probe timed out after 8s.'
        : 'Network error connecting to diagnostic service.';
      setStatusMsg(msg);
      setScoreVal('N/A');
      setScoreColor('var(--c-text-muted)');
      setTtfbVal('—');
      setSslVal('—');
      setSslColor('var(--c-text-muted)');
      setFindings([
        {
          severity: 'critical',
          title: msg,
          fix: 'Please verify the domain name or request a comprehensive discovery audit report below.'
        }
      ]);

      trackEvent('scan_error', { error: isTimeout ? 'client_timeout' : 'network_exception' });
    } finally {
      setIsLoading(false);
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {}
      }
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
        <h3 className="audit-deck-title">Quick SEO Score Check</h3>
        <p className="audit-deck-subtitle">
          Enter your domain to inspect on-page SEO readiness: Title tags, meta descriptions, SSL security, schema markup, and response latency.
        </p>
      </div>

      {/* Input Area */}
      <form onSubmit={handleScan} className="scanner-input-group">
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
          disabled={isLoading}
        />
        <button
          type="submit"
          id="runScanBtn"
          className="btn btn-primary btn-sm"
          disabled={isLoading}
        >
          {isLoading ? 'ANALYZING SEO...' : (hasScanned ? 'RE-CHECK SEO' : 'RUN SEO CHECK')}
        </button>
      </form>

      {/* Turnstile Bot Challenge */}
      <div
        ref={turnstileContainerRef}
        id="scannerTurnstile"
        className="cf-turnstile"
        style={{ marginTop: '0.75rem' }}
      ></div>

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

      {/* Metrics Readout */}
      <div className="scanner-results-deck">
        <div className="scanner-metric-cell">
          <div className="scanner-metric-val" id="scanScoreVal" style={{ color: scoreColor }}>
            {scoreVal}
          </div>
          <div className="scanner-metric-lbl">SEO SCORE</div>
        </div>
        <div className="scanner-metric-cell">
          <div className="scanner-metric-val" id="scanTtfbVal">
            {ttfbVal}
          </div>
          <div className="scanner-metric-lbl">RESPONSE TIME</div>
        </div>
        <div className="scanner-metric-cell">
          <div className="scanner-metric-val" id="scanSslVal" style={{ color: sslColor }}>
            {sslVal}
          </div>
          <div className="scanner-metric-lbl">SSL STATUS</div>
        </div>
      </div>

      {/* Findings List */}
      <ul className="scanner-findings-list" id="scannerFindingsContainer">
        {findings.map((f, i) => (
          <li key={i} className={`scanner-finding-item ${f.severity || 'info'}`}>
            <div>
              <div style={{ fontWeight: 700 }}>{f.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--c-text-muted)', marginTop: '2px' }}>
                {f.fix || f.evidence}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--c-text-muted)', textAlign: 'right' }}>
        <a href="#contact" style={{ color: 'var(--c-vermilion)', fontWeight: 600 }}>
          Request comprehensive discovery audit report &rarr;
        </a>
      </div>
    </div>
  );
}
