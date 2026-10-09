import React, { useState } from 'react';
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
  const [isOptimized, setIsOptimized] = useState(true);
  const [inspectedNode, setInspectedNode] = useState<GeoNode | null>(null);

  const handleToggle = (optimized: boolean) => {
    setIsOptimized(optimized);
    setInspectedNode(null);
    trackEvent('heatmap_toggle', { mode: optimized ? 'optimized' : 'unoptimized' });
  };

  const data = isOptimized ? OPTIMIZED_DATA : UNOPTIMIZED_DATA;

  return (
    <div className="heatmap-wrapper">
      {/* Heatmap Visual Console */}
      <div className="frame-box heatmap-visual-box">
        <div className="heatmap-toggle-bar">
          <div>
            <span className="mono-label" style={{ display: 'block' }}>SIMULATOR STATE</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--c-text-primary)' }}>Geographic Pin Audit</span>
          </div>
          <div className="heatmap-btn-group" role="group" aria-label="Heatmap Mode Toggle">
            <button
              type="button"
              className={`heatmap-mode-btn ${!isOptimized ? 'active' : ''}`}
              id="btnModeUnoptimized"
              onClick={() => handleToggle(false)}
            >
              Unoptimized
            </button>
            <button
              type="button"
              className={`heatmap-mode-btn ${isOptimized ? 'active' : ''}`}
              id="btnModeOptimized"
              onClick={() => handleToggle(true)}
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
      </div>

      {/* Heatmap Strategic Analysis */}
      <div className="frame-box heatmap-analysis-box">
        <div>
          <div className="badge" style={{ marginBottom: '0.75rem' }}>LOCAL SEARCH MECHANICS</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--c-text-primary)', marginBottom: '0.75rem' }}>
            Ranking in the Top 3 Captures the Bulk of Buyer Inquiries
          </h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--c-text-secondary)', lineHeight: 1.65 }}>
            When high-intent customers search for local clinics, stores, or professional services, Google serves the 3-Pack map bundle before organic links. Falling outside position #3 directs prospective customers directly to nearby competitors.
          </p>

          {/* Inbound Inquiry Telemetry */}
          <div className="heatmap-stat-grid">
            <div className="heatmap-stat-cell">
              <div className="heatmap-stat-val" id="heatmapCallsVal">
                {isOptimized ? '148 / mo' : '32 / mo'}
              </div>
              <div className="heatmap-stat-lbl">ESTIMATED INBOUND CALLS</div>
            </div>
            <div className="heatmap-stat-cell">
              <div className="heatmap-stat-val" id="heatmapRankVal">
                {isOptimized ? '100%' : '0%'}
              </div>
              <div className="heatmap-stat-lbl">TOP-3 DOMINANCE SHARE</div>
            </div>
          </div>

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
              <span><strong>Pin Inspection [{inspectedNode.area}]:</strong> Business holds rank <strong>#{inspectedNode.rank}</strong> in this local zone.</span>
            ) : isOptimized ? (
              <span><strong>SAPVIK SPRINT STATE:</strong> Demonstrating 16 out of 16 local pin radii in Top 3. High local search authority drives steady inbound inquiry flow.</span>
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
