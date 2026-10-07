import React, { useState } from 'react';

interface GridCell {
  x: number;
  y: number;
  rank: number; // 1 to 20+
  label: string;
}

const INITIAL_GRID: GridCell[] = [
  { x: 0, y: 0, rank: 1, label: "Top Rank #1 (Primary Storefront)" },
  { x: 1, y: 0, rank: 2, label: "Top Rank #2 (+1.5 km North)" },
  { x: 2, y: 0, rank: 4, label: "Mid Rank #4 (+3.0 km North)" },
  { x: 3, y: 0, rank: 7, label: "Low Rank #7 (+4.5 km North)" },

  { x: 0, y: 1, rank: 1, label: "Top Rank #1 (+1.5 km West)" },
  { x: 1, y: 1, rank: 1, label: "Top Rank #1 (Central Core)" },
  { x: 2, y: 1, rank: 3, label: "Mid Rank #3 (+1.5 km East)" },
  { x: 3, y: 1, rank: 6, label: "Low Rank #6 (+3.0 km East)" },

  { x: 0, y: 2, rank: 3, label: "Mid Rank #3 (+3.0 km West)" },
  { x: 1, y: 2, rank: 2, label: "Top Rank #2 (+1.5 km South)" },
  { x: 2, y: 2, rank: 5, label: "Mid Rank #5 (+1.5 km SE)" },
  { x: 3, y: 2, rank: 9, label: "Low Rank #9 (+3.0 km SE)" },

  { x: 0, y: 3, rank: 5, label: "Mid Rank #5 (+4.5 km SW)" },
  { x: 1, y: 3, rank: 4, label: "Mid Rank #4 (+3.0 km South)" },
  { x: 2, y: 3, rank: 8, label: "Low Rank #8 (+3.0 km South)" },
  { x: 3, y: 3, rank: 12, label: "Low Rank #12 (+4.5 km South)" }
];

export default function Heatmap() {
  const [selectedCell, setSelectedCell] = useState<GridCell>(INITIAL_GRID[5]); // Default center

  const getRankColor = (rank: number) => {
    if (rank <= 3) return '#15803D'; // Green (Local 3-Pack)
    if (rank <= 6) return '#B45309'; // Amber (First Page Mid)
    return '#C93A22';               // Vermilion / Red (Beyond Top Fold)
  };

  return (
    <div className="heatmap-container framed-card" id="heatmap">
      <div className="heatmap-head">
        <span className="mono-label">Geo-Grid Density Audit</span>
        <h2 className="heatmap-title">Illustration: Local Visibility Density Model</h2>
        <p className="heatmap-desc">
          Google Maps rankings change every 500 meters. This illustrative 4x4 coordinate model shows how Local 3-Pack discovery drops outside your immediate postal perimeter without structured citation management.
        </p>
      </div>

      <div className="heatmap-layout">
        {/* 4x4 Interactive Grid */}
        <div className="grid-board" role="region" aria-label="Local Ranking Grid">
          {INITIAL_GRID.map((cell, idx) => {
            const isSelected = selectedCell.x === cell.x && selectedCell.y === cell.y;
            const bg = getRankColor(cell.rank);
            return (
              <button
                key={idx}
                type="button"
                className={`grid-node ${isSelected ? 'selected' : ''}`}
                style={{ backgroundColor: bg }}
                onClick={() => setSelectedCell(cell)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCell(cell);
                  }
                }}
                aria-label={`Coordinate ${cell.x}, ${cell.y}: Rank #${cell.rank} - ${cell.label}`}
                aria-pressed={isSelected}
              >
                <span className="node-number">{cell.rank}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Coordinate Inspector */}
        <div className="inspector-panel">
          <div className="inspector-badge">
            <span className="mono-label">Selected Node Detail</span>
          </div>
          <h3 className="inspector-title">Rank #{selectedCell.rank}</h3>
          <p className="inspector-location">{selectedCell.label}</p>
          
          <div className="inspector-status">
            <span className="status-label">Local 3-Pack Status:</span>
            <strong style={{ color: selectedCell.rank <= 3 ? 'var(--c-success)' : 'var(--c-vermilion)' }}>
              {selectedCell.rank <= 3 ? 'In Top 3 Visible Pack' : 'Below Top 3 Fold'}
            </strong>
          </div>

          <p className="inspector-analysis">
            {selectedCell.rank <= 3
              ? "Positioned in the prime zero-click Google Maps phone pack. High inbound call intent."
              : "Customers at this radius are directed to competing businesses closer to their active GPS point."}
          </p>

          {/* Legend */}
          <div className="heatmap-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#15803D' }}></span>
              <span>Rank #1–3 (Local Pack)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#B45309' }}></span>
              <span>Rank #4–6 (Mid Page)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#C93A22' }}></span>
              <span>Rank #7+ (Low Intent)</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .heatmap-container {
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        .heatmap-title {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .heatmap-desc {
          color: var(--c-text-muted);
          max-width: 680px;
          margin-bottom: 2rem;
        }
        .heatmap-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 800px) {
          .heatmap-layout {
            grid-template-columns: 320px 1fr;
            align-items: center;
          }
        }
        .grid-board {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          background: #EAECEF;
          padding: 12px;
          border: 1px solid var(--c-border);
          max-width: 320px;
        }
        .grid-node {
          width: 60px;
          height: 60px;
          min-width: 44px;
          min-height: 44px;
          border: 2px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          cursor: pointer;
          transition: transform 0.1s ease, border-color 0.1s ease;
        }
        .grid-node:hover {
          transform: scale(1.05);
        }
        .grid-node.selected {
          border-color: #12161C;
          box-shadow: 0 0 0 3px #FFFFFF, 0 0 0 5px #12161C;
          z-index: 2;
        }
        .node-number {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 800;
        }
        .inspector-panel {
          background: var(--c-surface-subdued);
          border: 1px solid var(--c-border);
          padding: 1.5rem;
        }
        .inspector-badge {
          margin-bottom: 0.5rem;
        }
        .inspector-title {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 0.25rem;
        }
        .inspector-location {
          font-size: 0.9rem;
          color: var(--c-text-muted);
          margin-bottom: 1rem;
        }
        .inspector-status {
          margin-bottom: 0.75rem;
          font-size: 0.9rem;
        }
        .status-label {
          color: var(--c-text-muted);
          margin-right: 0.5rem;
        }
        .inspector-analysis {
          font-size: 0.88rem;
          color: var(--c-text-secondary);
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }
        .heatmap-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px dashed var(--c-border);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--c-text-muted);
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
