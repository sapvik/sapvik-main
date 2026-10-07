import React, { useState, useEffect, useId } from 'react';
import assumptionsData from '../../config/assumptions.json';
import { computeProjections, type IndustryAssumption } from '../../lib/calculatorMath';

const assumptions = (assumptionsData.industries as Record<string, IndustryAssumption>) || {};

const AVAILABLE_SERVICES = [
  { id: 'promotions', label: 'Digital Promotions (Paid Ads)' },
  { id: 'websites', label: 'Websites Development' },
  { id: 'gmb', label: 'GMB & Local Citations' },
  { id: 'media', label: 'Media Management' },
  { id: 'apps', label: 'Application Development' },
  { id: 'branding', label: 'Branding & Identity' }
];

export default function Calculator() {
  const sliderId = useId();
  const industryId = useId();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [budget, setBudget] = useState<number>(50000);
  const [industryKey, setIndustryKey] = useState<string>('healthcare');
  const [selectedServices, setSelectedServices] = useState<string[]>(['promotions', 'websites']);
  const [saleValue, setSaleValue] = useState<string>('');
  const [closeRate, setCloseRate] = useState<string>('');

  const numSaleValue = saleValue ? parseFloat(saleValue) : undefined;
  const numCloseRate = closeRate ? parseFloat(closeRate) : undefined;

  const projection = computeProjections(
    {
      budget,
      industryKey,
      selectedServices,
      saleValue: numSaleValue,
      closeRatePct: numCloseRate
    },
    assumptions
  );

  const handleCheckboxChange = (serviceId: string, checked: boolean) => {
    setSelectedServices((prev) => {
      if (checked) {
        return prev.includes(serviceId) ? prev : [...prev, serviceId];
      } else {
        return prev.filter((id) => id !== serviceId);
      }
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="calculator-card framed-card" id="simulator" data-hydrated={mounted ? "true" : undefined}>
      <div className="calculator-head">
        <span className="mono-label">Illustrative Growth Simulator</span>
        <h2 className="calc-title">Digital Acquisition & Budget Modeler</h2>
        <p className="calc-desc">
          Test realistic inquiry volumes based on industry benchmark placeholders. Real commercial outcomes depend on competitive bids, category close rates, and conversion infrastructure.
        </p>
      </div>

      <div className="calc-grid">
        {/* Left: Input Controls */}
        <div className="calc-inputs">
          {/* Vertical Selector */}
          <div className="form-field">
            <label htmlFor={industryId} className="field-label">Industry Category</label>
            <select
              id={industryId}
              className="field-select"
              value={industryKey}
              onChange={(e) => setIndustryKey(e.target.value)}
            >
              {Object.entries(assumptions).map(([key, ind]) => (
                <option key={key} value={key}>{ind.name}</option>
              ))}
            </select>
          </div>

          {/* Monthly Budget Slider */}
          <div className="form-field">
            <div className="slider-label-row">
              <label htmlFor={sliderId} className="field-label">Monthly Ad Budget</label>
              <span className="budget-display">{formatCurrency(budget)}</span>
            </div>
            <input
              id={sliderId}
              type="range"
              min="20000"
              max="500000"
              step="5000"
              value={budget}
              onChange={(e) => setBudget(parseInt(e.target.value, 10))}
              aria-valuemin={20000}
              aria-valuemax={500000}
              aria-valuenow={budget}
              aria-valuetext={formatCurrency(budget)}
              className="budget-slider"
            />
            <div className="slider-scale">
              <span>₹20k</span>
              <span>₹250k</span>
              <span>₹500k</span>
            </div>
          </div>

          {/* Integrated Services Checkboxes */}
          <div className="form-field">
            <span className="field-label">Selected Growth Capabilities</span>
            <div className="chips-container" role="group" aria-label="Capabilities Selector">
              {AVAILABLE_SERVICES.map((srv) => {
                const isChecked = selectedServices.includes(srv.id);
                return (
                  <label key={srv.id} className={`calc-chip ${isChecked ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      value={srv.id}
                      onChange={(e) => handleCheckboxChange(srv.id, e.target.checked)}
                      className="calc-checkbox"
                    />
                    <span>{srv.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Optional ROAS Calculation */}
          <div className="form-field roas-row">
            <div>
              <label htmlFor="saleValInput" className="field-label">Avg Ticket Value (₹, optional)</label>
              <input
                id="saleValInput"
                type="number"
                placeholder="e.g. 5000"
                value={saleValue}
                onChange={(e) => setSaleValue(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="closeRateInput" className="field-label">Lead Close Rate (%, optional)</label>
              <input
                id="closeRateInput"
                type="number"
                placeholder="e.g. 20"
                value={closeRate}
                onChange={(e) => setCloseRate(e.target.value)}
                className="field-input"
              />
            </div>
          </div>
        </div>

        {/* Right: Projected Metrics Display */}
        <div className="calc-outputs">
          <span className="mono-label">Monthly Projected Output</span>

          {projection.hasPromotions ? (
            <div className="outputs-content">
              <div className="metric-box">
                <span className="metric-label">Estimated Monthly Inquiries</span>
                <span id="calcOutInquiries" className="metric-num">
                  {projection.projectedInquiriesBase}
                </span>
                <span className="metric-range">
                  Range: {projection.projectedInquiriesLow} – {projection.projectedInquiriesHigh} inquiries / month
                </span>
              </div>

              <div className="metric-box">
                <span className="metric-label">Estimated Targeted Impressions</span>
                <span className="metric-num">
                  {projection.projectedImpressions.toLocaleString('en-IN')}
                </span>
                <span className="metric-range">High-intent search & social impressions</span>
              </div>

              {projection.projectedRoas !== undefined && (
                <div className="metric-box highlight">
                  <span className="metric-label">Projected Pipeline ROAS</span>
                  <span className="metric-num" style={{ color: 'var(--c-success)' }}>
                    {projection.projectedRoas}x
                  </span>
                  <span className="metric-range">
                    Est. Revenue: {formatCurrency(projection.projectedRevenue || 0)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="organic-notice-box">
              <p className="notice-head">⚠ No Paid Media Channel Selected</p>
              <p className="notice-body">
                Organic services (Websites, GMB, Media, Applications, Branding) build foundational brand infrastructure, conversion speed, and local trust. Direct measurable monthly lead inquiries require an active paid advertising budget in <strong>Digital Promotions</strong>.
              </p>
            </div>
          )}

          <div className="model-footnote">
            <p>
              * Benchmark Source: Placeholder model. Calculations exclude discretionary third-party GST or payment gateway fees.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .calculator-card {
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        .calc-title {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .calc-desc {
          color: var(--c-text-muted);
          max-width: 680px;
          margin-bottom: 2rem;
        }
        .calc-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 860px) {
          .calc-grid {
            grid-template-columns: 1.2fr 1fr;
          }
        }
        .form-field {
          margin-bottom: 1.5rem;
        }
        .field-label {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--c-text-primary);
          margin-bottom: 0.5rem;
        }
        .field-select, .field-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--c-border-strong);
          background: #FFFFFF;
          color: var(--c-text-primary);
          outline: none;
        }
        .slider-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .budget-display {
          font-family: var(--font-display);
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--c-vermilion);
        }
        .budget-slider {
          width: 100%;
          margin: 0.75rem 0;
          accent-color: var(--c-vermilion);
          cursor: pointer;
        }
        .slider-scale {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--c-text-dim);
        }
        .chips-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .calc-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.75rem;
          background: #FFFFFF;
          border: 1px solid var(--c-border);
          font-size: 0.8rem;
          cursor: pointer;
          user-select: none;
        }
        .calc-chip.active {
          border-color: var(--c-text-primary);
          background: var(--c-surface-dark);
          color: #FFFFFF;
        }
        .roas-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .calc-outputs {
          background: var(--c-surface-subdued);
          border: 1px solid var(--c-border);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
        }
        .outputs-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
          flex: 1;
        }
        .metric-box {
          background: #FFFFFF;
          border: 1px solid var(--c-border);
          padding: 1.25rem;
        }
        .metric-box.highlight {
          border-left: 3px solid var(--c-success);
        }
        .metric-label {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          text-transform: uppercase;
          color: var(--c-text-muted);
          margin-bottom: 0.25rem;
        }
        .metric-num {
          display: block;
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          color: var(--c-text-primary);
        }
        .metric-range {
          font-size: 0.78rem;
          color: var(--c-text-dim);
        }
        .organic-notice-box {
          background: #FFFFFF;
          border-left: 3px solid var(--c-warning);
          padding: 1.25rem;
          margin-top: 1rem;
          flex: 1;
        }
        .notice-head {
          font-weight: 700;
          color: var(--c-warning);
          margin-bottom: 0.5rem;
        }
        .notice-body {
          font-size: 0.85rem;
          color: var(--c-text-muted);
          line-height: 1.5;
        }
        .model-footnote {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px dashed var(--c-border);
          font-size: 0.72rem;
          color: var(--c-text-dim);
        }
      `}</style>
    </div>
  );
}
