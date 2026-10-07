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
      getResponse: (widgetId: string) => string;
    };
  }
}

export default function Scanner() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Initialize Turnstile widget if present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.turnstile && turnstileContainerRef.current) {
      try {
        const id = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: '1x00000000000000000000AA', // Managed placeholder / dev test sitekey
          callback: (token: string) => setTurnstileToken(token)
        });
        widgetIdRef.current = id;
      } catch {
        // Turnstile already rendered or script loading
      }
    }
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUrl = url.trim();
    if (!targetUrl) {
      setErrorMsg('Please enter a website URL.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);

    trackEvent('scan_start', {
      target_scheme: targetUrl.startsWith('https') ? 'https' : 'http'
    });

    try {
      const resp = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          turnstileToken
        })
      });

      const data: ScanResponse = await resp.json();

      if (!resp.ok || !data.success) {
        setErrorMsg(data.message || 'Unable to complete site scan. Target server may be unreachable.');
        setResult(data);
        trackEvent('scan_error', {
          error_code: data.error || 'scan_failed'
        });
      } else {
        setResult(data);
        trackEvent('scan_complete', {
          response_time_ms: data.response_time_ms || 0,
          has_ssl: data.has_ssl ?? null,
          findings_count: data.findings?.length || 0
        });
        // Persist scan for contact form attribution
        try {
          sessionStorage.setItem('sapvik_latest_audit', JSON.stringify({
            url: data.url,
            response_time_ms: data.response_time_ms
          }));
        } catch {}
      }
    } catch {
      setErrorMsg('Network error connecting to scanner gateway.');
      trackEvent('scan_error', {
        error_code: 'network_error'
      });
    } finally {
      setIsLoading(false);
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.reset(widgetIdRef.current); } catch {}
      }
    }
  };

  return (
    <div className="scanner-container framed-card" id="scanner">
      <div className="scanner-header">
        <span className="mono-label">Real-Time Diagnostic Probe</span>
        <h2 className="scanner-title">Live Website Speed & Architecture Scanner</h2>
        <p className="scanner-desc">
          Inspect your live web infrastructure: server response time, TLS security, Schema entities, and conversion tracking tags without bloated synthetic scoring.
        </p>
      </div>

      <form onSubmit={handleScan} className="scanner-form">
        <div className="scanner-input-group">
          <label htmlFor="scannerUrlInput" className="visually-hidden">Website URL</label>
          <input
            id="scannerUrlInput"
            type="text"
            className="scanner-input"
            placeholder="Enter business domain (e.g. example.com)..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            required
          />
          <button
            type="submit"
            className="btn btn-primary scanner-btn"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Scanning Network...' : 'Analyze Architecture →'}
          </button>
        </div>

        <div ref={turnstileContainerRef} className="turnstile-container"></div>
      </form>

      {/* Error Notice */}
      {errorMsg && (
        <div className="scanner-error-panel" role="alert">
          <p className="error-text">⚠ {errorMsg}</p>
          <a href="#contact" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>
            Request a Manual Architecture Audit &rarr;
          </a>
        </div>
      )}

      {/* Diagnostic Readout Grid */}
      <div className="scanner-grid" aria-live="polite">
        <div className="readout-card">
          <span className="readout-label">Response Time</span>
          <span className="readout-value">
            {result?.response_time_ms ? `${result.response_time_ms}ms` : '—'}
          </span>
          <span className="readout-note">Edge-to-origin transit</span>
        </div>

        <div className="readout-card">
          <span className="readout-label">TLS / SSL Status</span>
          <span className="readout-value">
            {result ? (
              result.has_ssl === true ? (
                <span style={{ color: 'var(--c-success)' }}>VALID</span>
              ) : result.has_ssl === false ? (
                <span style={{ color: 'var(--c-vermilion)' }}>FAILED</span>
              ) : '—'
            ) : '—'}
          </span>
          <span className="readout-note">Encrypted HTTPS</span>
        </div>

        <div className="readout-card">
          <span className="readout-label">Schema.org Entity</span>
          <span className="readout-value">
            {result ? (result.has_schema ? 'DETECTED' : 'NOT DETECTED') : '—'}
          </span>
          <span className="readout-note">JSON-LD rich snippet eligibility</span>
        </div>

        <div className="readout-card">
          <span className="readout-label">Analytics & GA4</span>
          <span className="readout-value">
            {result ? (result.has_analytics ? 'ACTIVE' : 'NOT DETECTED') : '—'}
          </span>
          <span className="readout-note">Conversion tracking container</span>
        </div>
      </div>

      {/* Findings List */}
      {result?.findings && result.findings.length > 0 && (
        <div className="findings-section">
          <h3 className="findings-head">Diagnostic Findings</h3>
          <div className="findings-list">
            {result.findings.map((f) => (
              <div key={f.id} className={`finding-card severity-${f.severity}`}>
                <div className="finding-header">
                  <span className="finding-badge">{f.severity.toUpperCase()}</span>
                  <h4 className="finding-title">{f.title}</h4>
                </div>
                <p className="finding-evidence">{f.evidence}</p>
                <p className="finding-fix"><strong>Recommended Fix:</strong> {f.fix}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .scanner-container {
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        .scanner-title {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .scanner-desc {
          color: var(--c-text-muted);
          max-width: 680px;
          margin-bottom: 1.5rem;
        }
        .scanner-form {
          margin-bottom: 2rem;
        }
        .scanner-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        @media (min-width: 640px) {
          .scanner-input-group {
            flex-direction: row;
          }
        }
        .scanner-input {
          flex: 1;
          padding: 0.85rem 1rem;
          border: 1px solid var(--c-border-strong);
          background: #F8F9FA;
          color: var(--c-text-primary);
          outline: none;
        }
        .scanner-input:focus {
          border-color: var(--c-vermilion);
          background: #FFFFFF;
        }
        .scanner-btn {
          white-space: nowrap;
        }
        .turnstile-container {
          margin-top: 0.5rem;
        }
        .scanner-error-panel {
          background: rgba(201, 58, 34, 0.08);
          border-left: 3px solid var(--c-vermilion);
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        .error-text {
          color: var(--c-vermilion);
          font-weight: 700;
        }
        .scanner-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        @media (min-width: 768px) {
          .scanner-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .readout-card {
          background: var(--c-surface-subdued);
          border: 1px solid var(--c-border);
          padding: 1.25rem 1rem;
          display: flex;
          flex-direction: column;
        }
        .readout-label {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          text-transform: uppercase;
          color: var(--c-text-muted);
          margin-bottom: 0.4rem;
        }
        .readout-value {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--c-text-primary);
          margin-bottom: 0.25rem;
        }
        .readout-note {
          font-size: 0.75rem;
          color: var(--c-text-dim);
        }
        .findings-section {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--c-border);
        }
        .findings-head {
          font-size: 1.15rem;
          margin-bottom: 1rem;
        }
        .findings-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .finding-card {
          background: #FFFFFF;
          border: 1px solid var(--c-border);
          padding: 1.25rem;
        }
        .finding-card.severity-warning { border-left: 3px solid var(--c-warning); }
        .finding-card.severity-critical { border-left: 3px solid var(--c-vermilion); }
        .finding-card.severity-good { border-left: 3px solid var(--c-success); }
        .finding-card.severity-info { border-left: 3px solid var(--c-text-dim); }
        .finding-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .finding-badge {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          background: #F1F5F9;
        }
        .finding-title {
          font-size: 0.95rem;
          font-weight: 700;
        }
        .finding-evidence {
          font-size: 0.85rem;
          color: var(--c-text-muted);
          margin-bottom: 0.4rem;
        }
        .finding-fix {
          font-size: 0.85rem;
          color: var(--c-text-primary);
        }
        .visually-hidden {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;
        }
      `}</style>
    </div>
  );
}
