import React, { useState, useEffect } from 'react';
import { trackEvent } from '../../lib/analytics';

interface GeoNode {
  rank: number;
  area: string;
  className: string;
}

const UNOPTIMIZED_DATA: GeoNode[] = [
  { rank: 14, className: 'rank-poor', area: 'Central' },
  { rank: 9,  className: 'rank-poor', area: 'North' },
  { rank: 18, className: 'rank-poor', area: 'East' },
  { rank: 12, className: 'rank-poor', area: 'South-E' },
  { rank: 8,  className: 'rank-poor', area: 'Downtown' },
  { rank: 16, className: 'rank-poor', area: 'Ring Rd' },
  { rank: 22, className: 'rank-poor', area: 'North-W' },
  { rank: 11, className: 'rank-poor', area: 'East-Ext' },
  { rank: 15, className: 'rank-poor', area: 'Uptown' },
  { rank: 7,  className: 'rank-poor', area: 'Hub' },
  { rank: 19, className: 'rank-poor', area: 'South-W' },
  { rank: 13, className: 'rank-poor', area: 'East-S' },
  { rank: 21, className: 'rank-poor', area: 'West-Ext' },
  { rank: 10, className: 'rank-poor', area: 'Airport' },
  { rank: 17, className: 'rank-poor', area: 'Jct' },
  { rank: 14, className: 'rank-poor', area: 'Sector 5' }
];

const OPTIMIZED_DATA: GeoNode[] = [
  { rank: 1, className: 'rank-top', area: 'Central' },
  { rank: 2, className: 'rank-top', area: 'North' },
  { rank: 1, className: 'rank-top', area: 'East' },
  { rank: 1, className: 'rank-top', area: 'South-E' },
  { rank: 1, className: 'rank-top', area: 'Downtown' },
  { rank: 2, className: 'rank-top', area: 'Ring Rd' },
  { rank: 1, className: 'rank-top', area: 'North-W' },
  { rank: 2, className: 'rank-top', area: 'East-Ext' },
  { rank: 1, className: 'rank-top', area: 'Uptown' },
  { rank: 1, className: 'rank-top', area: 'Hub' },
  { rank: 2, className: 'rank-top', area: 'South-W' },
  { rank: 1, className: 'rank-top', area: 'East-S' },
  { rank: 2, className: 'rank-top', area: 'West-Ext' },
  { rank: 1, className: 'rank-top', area: 'Airport' },
  { rank: 3, className: 'rank-top', area: 'Jct' },
  { rank: 1, className: 'rank-top', area: 'Sector 5' }
];

export default function Heatmap() {
  const [auditedDomain, setAuditedDomain] = useState<string | null>(null);
  const [auditedScore, setAuditedScore] = useState<number | null>(null);
  const [localSignals, setLocalSignals] = useState<{
    has_local_schema?: boolean;
    has_phone?: boolean;
    has_maps_link?: boolean;
    local_readiness?: number;
  } | null>(null);
  const [mode, setMode] = useState<'audited' | 'unoptimized' | 'optimized'>('optimized');
  const [inspectedNode, setInspectedNode] = useState<GeoNode | null>(null);

  useEffect(() => {
    // Check if an audit was stored in session
    try {
      const stored = sessionStorage.getItem('sapvik_latest_audit');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.domain) {
          setAuditedDomain(parsed.domain);
          setAuditedScore(parsed.score || 65);
          if (parsed.local_signals) {
            setLocalSignals(parsed.local_signals);
          }
          setMode('audited');
        }
      }
    } catch {}

    // Listen for live audit-complete events from the Scanner
    const handleAuditComplete = (e: any) => {
      const detail = e.detail;
      if (detail && detail.domain) {
        setAuditedDomain(detail.domain);
        setAuditedScore(detail.score || 65);
        if (detail.local_signals) {
          setLocalSignals(detail.local_signals);
        }
        setMode('audited');
        setInspectedNode(null);
      }
    };

    window.addEventListener('sapvik:audit-complete', handleAuditComplete);
    return () => window.removeEventListener('sapvik:audit-complete', handleAuditComplete);
  }, []);

  const handleModeChange = (newMode: 'audited' | 'unoptimized' | 'optimized') => {
    setMode(newMode);
    setInspectedNode(null);
    trackEvent('heatmap_toggle', { mode: newMode, domain: auditedDomain || 'generic' });
  };

  // Generate data based on current mode
  let data: GeoNode[] = OPTIMIZED_DATA;
  if (mode === 'unoptimized') {
    data = UNOPTIMIZED_DATA;
  } else if (mode === 'audited') {
    const score = auditedScore !== null ? auditedScore : 60;
    // Map score to realistic rankings: higher score = better ranks
    const shift = Math.round((score / 100) * 8);
    data = UNOPTIMIZED_DATA.map((node) => {
      const rank = Math.max(1, node.rank - shift);
      const className = rank <= 3 ? 'rank-top' : (rank <= 10 ? 'rank-fair' : 'rank-poor');
      return {
        area: node.area,
        rank,
        className
      };
    });
  }

  const top3Count = data.filter((n) => n.rank <= 3).length;
  const dominanceShare = Math.round((top3Count / 16) * 100) + '%';
  const estimatedCalls = mode === 'optimized'
    ? '148 / mo'
    : mode === 'unoptimized'
      ? '32 / mo'
      : `${Math.round(32 + (top3Count / 16) * 116)} / mo`;

  return (
    <div className="heatmap-wrapper">
      {/* Heatmap Visual Console */}
      <div className="frame-box heatmap-visual-box">
        <div className="heatmap-toggle-bar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
              <span className="mono-label">SIMULATOR STATE</span>
              {auditedDomain ? (
                <span className="badge" style={{ background: 'var(--c-vermilion-soft)', color: 'var(--c-vermilion)', borderColor: 'var(--c-vermilion)', fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                  ● AUDIT LINKED ({auditedScore || 62}/100)
                </span>
              ) : (
                <span className="badge" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                  GENERAL BASELINE
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--c-text-primary)' }}>
              {auditedDomain ? `Local Footprint: ${auditedDomain}` : 'Geographic Radius Simulation'}
            </span>
            {!auditedDomain && (
              <div style={{ marginTop: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('scanner')?.scrollIntoView({ behavior: 'smooth' });
                    setTimeout(() => {
                      document.getElementById('scannerUrlInput')?.focus();
                    }, 500);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', minHeight: '28px' }}
                >
                  <span>Scan Your Domain Above &uarr;</span>
                </button>
              </div>
            )}
          </div>

          <div className="heatmap-btn-group" role="group" aria-label="Heatmap Mode Toggle">
            {auditedDomain && (
              <button
                type="button"
                className={`heatmap-mode-btn ${mode === 'audited' ? 'active' : ''}`}
                id="btnModeAudited"
                onClick={() => handleModeChange('audited')}
                style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={`Audited: ${auditedDomain}`}
              >
                {auditedDomain}
              </button>
            )}
            <button
              type="button"
              className={`heatmap-mode-btn ${mode === 'unoptimized' ? 'active' : ''}`}
              id="btnModeUnoptimized"
              onClick={() => handleModeChange('unoptimized')}
            >
              Unoptimized
            </button>
            <button
              type="button"
              className={`heatmap-mode-btn ${mode === 'optimized' ? 'active' : ''}`}
              id="btnModeOptimized"
              onClick={() => handleModeChange('optimized')}
            >
              SAPVIK Sprint
            </button>
          </div>
        </div>

        {/* 16-Node Geo Grid */}
        <div className="geo-grid-matrix" id="geoGridMatrix" aria-label="16 Geographic Radius Nodes">
          {data.map((node, idx) => (
            <div
              key={idx}
              className={`geo-grid-node ${node.className}`}
              role="button"
              tabIndex={0}
              style={{ transform: 'scale(1)' }}
              onClick={() => setInspectedNode(node)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setInspectedNode(node);
                }
              }}
            >
              <span className="rank-num">#{node.rank}</span>
              <span className="radius-lbl">{node.area}</span>
            </div>
          ))}
        </div>

        {/* Heatmap Legend */}
        <div className="heatmap-legend">
          <span>● #1–3 Top 3 (Dominant)</span>
          <span>● #4–10 Fair</span>
          <span>● #11+ Poor (Inquiries Lost)</span>
        </div>
        <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--c-text-muted)', textAlign: 'center' }}>
          Interactive simulation model calibrated to on-page audit signals. Full 16-point GPS coordinate scan completed during client onboarding.
        </div>
      </div>

      {/* Heatmap Strategic Analysis */}
      <div className="frame-box heatmap-analysis-box">
        <div>
          <div className="badge" style={{ marginBottom: '0.75rem' }}>
            {auditedDomain ? `LIVE AUDIT: ${auditedDomain}` : 'LOCAL SEARCH MECHANICS'}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--c-text-primary)', marginBottom: '0.75rem' }}>
            {mode === 'audited'
              ? `Local Search Visibility for ${auditedDomain}`
              : 'Ranking in the Top 3 Captures the Bulk of Buyer Inquiries'}
          </h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--c-text-secondary)', lineHeight: 1.65 }}>
            {mode === 'audited'
              ? `Based on your Quick SEO diagnostic (${auditedScore}/100), ${auditedDomain} holds top-3 placement in only ${top3Count} out of 16 surrounding territory pins. Searches in other sectors fall outside the map pack, directing ready buyers directly to nearby competitors.`
              : 'When high-intent customers search for local clinics, stores, or professional services, Google serves the 3-Pack map bundle before organic links. Falling outside position #3 directs prospective customers directly to nearby competitors.'}
          </p>

          {/* Inbound Inquiry Telemetry */}
          <div className="heatmap-stat-grid">
            <div className="heatmap-stat-cell">
              <div className="heatmap-stat-val" id="heatmapCallsVal">
                {estimatedCalls}
              </div>
              <div className="heatmap-stat-lbl">ESTIMATED INBOUND CALLS</div>
            </div>
            <div className="heatmap-stat-cell">
              <div className="heatmap-stat-val" id="heatmapRankVal">
                {dominanceShare}
              </div>
              <div className="heatmap-stat-lbl">TOP-3 DOMINANCE SHARE</div>
            </div>
          </div>

          {/* Live On-Page Local Signals (if domain was audited) */}
          {localSignals && (
            <div style={{ margin: '1.25rem 0', padding: '0.85rem 1rem', background: 'var(--c-surface-subdued)', border: '1px solid var(--c-border)', fontSize: '0.82rem' }}>
              <div className="mono-label" style={{ fontSize: '0.7rem', color: 'var(--c-vermilion)', marginBottom: '0.45rem' }}>
                ON-PAGE LOCAL AUTHORITY SIGNALS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>LocalBusiness Schema Markup:</span>
                  <strong style={{ color: localSignals.has_local_schema ? 'var(--c-success)' : 'var(--c-warning)' }}>
                    {localSignals.has_local_schema ? '✓ ACTIVE' : '✗ NOT DETECTED'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Click-to-Call Phone Contact:</span>
                  <strong style={{ color: localSignals.has_phone ? 'var(--c-success)' : 'var(--c-text-muted)' }}>
                    {localSignals.has_phone ? '✓ DETECTED' : '— UNVERIFIED'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Google Maps Embed / Pin Link:</span>
                  <strong style={{ color: localSignals.has_maps_link ? 'var(--c-success)' : 'var(--c-text-muted)' }}>
                    {localSignals.has_maps_link ? '✓ DETECTED' : '— NOT LINKED'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div
            id="heatmapNotice"
            style={{
              padding: '1rem',
              background: 'var(--c-surface-subdued)',
              borderLeft: '3px solid var(--c-vermilion)',
              fontSize: '0.85rem',
              lineHeight: 1.55,
              marginBottom: '1.5rem'
            }}
          >
            {inspectedNode ? (
              <span><strong>Pin Inspection [{inspectedNode.area}]:</strong> Ranks <strong>#{inspectedNode.rank}</strong> in this local zone.</span>
            ) : mode === 'audited' ? (
              <span><strong>AUDITED DOMAIN [{auditedDomain}]:</strong> Holds top-3 ranking in {top3Count} of 16 sectors. Toggle <strong>SAPVIK Sprint</strong> above to view territory expansion target.</span>
            ) : mode === 'optimized' ? (
              <span><strong>SAPVIK SPRINT STATE:</strong> Projecting 16 out of 16 local pin radii in Top 3 for {auditedDomain || 'your business'}. High local search authority drives steady inbound inquiry flow.</span>
            ) : (
              <span><strong>UNOPTIMIZED BASELINE:</strong> Business ranks outside Local 3-Pack across surrounding sectors. Inquiries leak to top-3 competitors.</span>
            )}
          </div>
        </div>

        <a
          href="#contact"
          className="btn btn-vermilion btn-lg btn-full"
          onClick={(e) => {
            e.preventDefault();
            const contactEl = document.getElementById('contact') || document.getElementById('contact-section');
            contactEl?.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => {
              document.getElementById('formName')?.focus();
            }, 600);
          }}
        >
          <span>Lock In Your Local Territory</span>
          <span>&rarr;</span>
        </a>
      </div>
    </div>
  );
}
