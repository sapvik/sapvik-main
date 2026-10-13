import React, { useState, useEffect } from 'react';
import assumptionsData from '../../config/assumptions.json';
import { computeProjections, type IndustryAssumption } from '../../lib/calculatorMath';
import { trackEvent } from '../../lib/analytics';

const assumptions = (assumptionsData.industries as Record<string, IndustryAssumption>) || {};

const AVAILABLE_SERVICES = [
  { id: 'websites', label: 'Website Development' },
  { id: 'gmb', label: 'Google Business Profile' },
  { id: 'seo', label: 'Search Engine Optimization (SEO)' },
  { id: 'promotions', label: 'Google Ads & Meta Ads' },
  { id: 'media', label: 'Social Media Management' },
  { id: 'apps', label: 'Application Development' }
];

export default function Calculator() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [budget, setBudget] = useState<number>(50000);
  const [industryKey, setIndustryKey] = useState<string>('other');
  const [selectedServices, setSelectedServices] = useState<string[]>(['websites', 'gmb', 'promotions']);

  const projection = computeProjections(
    {
      budget,
      industryKey,
      selectedServices
    },
    assumptions
  );

  const handleCheckboxChange = (serviceId: string, checked: boolean) => {
    setSelectedServices((prev) => {
      const updated = checked
        ? (prev.includes(serviceId) ? prev : [...prev, serviceId])
        : prev.filter((id) => id !== serviceId);
      return updated;
    });

    trackEvent('calc_interact', {
      interaction_type: 'service_toggle',
      service: serviceId,
      state: checked ? 'added' : 'removed'
    });
  };

  const handleBudgetChange = (newBudget: number) => {
    setBudget(newBudget);
    trackEvent('calc_interact', {
      interaction_type: 'budget_slide',
      budget: newBudget
    });
  };

  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  const formatImpressions = (val: number) => {
    if (val >= 100000) {
      return (val / 100000).toFixed(1) + ' Lakh+';
    }
    return val.toLocaleString('en-IN') + '+';
  };

  const selectedNames = AVAILABLE_SERVICES.filter(s => selectedServices.includes(s.id)).map(s => s.label);
  const indObj = assumptions[industryKey];
  const indLabel = indObj ? indObj.name : 'Commercial';

  const handleClaimBlueprint = () => {
    trackEvent('calc_claim', {
      budget,
      industry: industryKey,
      services_count: selectedServices.length
    });

    // Populate ContactForm island via custom event
    const blueprintText = `[Claimed Blueprint Configuration]\nCategory: ${indLabel}\nServices: ${selectedNames.join(', ')}\nTarget Monthly Media Budget: ${formatCurrency(budget)} / mo\nPlease reach out with technical proposal and deliverables.`;
    
    window.dispatchEvent(new CustomEvent('sapvik:claim-blueprint', {
      detail: {
        service: selectedServices.length === 1 ? selectedServices[0] : 'all',
        details: blueprintText
      }
    }));

    const contactEl = document.getElementById('contact') || document.getElementById('contact-section');
    contactEl?.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
      document.getElementById('formName')?.focus();
    }, 600);
  };

  return (
    <div className="frame-box calculator-deck" id="simulator" data-hydrated={mounted ? "true" : undefined}>
      {/* Controls Left */}
      <div className="calc-controls">
        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="calcIndustrySelect" className="form-label" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--c-text-primary)', marginBottom: '0.4rem' }}>
            Commercial Category
          </label>
          <select
            id="calcIndustrySelect"
            className="form-control"
            style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '15px', border: '1px solid #BDC6D0', background: 'var(--c-surface)', color: 'var(--c-text-primary)' }}
            value={industryKey}
            onChange={(e) => {
              setIndustryKey(e.target.value);
              trackEvent('calc_interact', { interaction_type: 'industry_select', industry: e.target.value });
            }}
          >
            <option value="other">General Local Commercial (Median CPL ₹600)</option>
            <option value="healthcare">Clinics & Healthcare (Median CPL ₹550)</option>
            <option value="d2c">E-Commerce / D2C (Median CPL ₹320)</option>
            <option value="b2b">B2B & Professional Services (Median CPL ₹1,100)</option>
            <option value="education">Education & Coaching (Median CPL ₹480)</option>
          </select>
        </div>

        <div className="calc-label-heading" style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--c-text-primary)', marginBottom: '0.6rem' }}>
          Select Required Services
        </div>

        <div className="calc-chips-container">
          {AVAILABLE_SERVICES.map((srv) => {
            const isChecked = selectedServices.includes(srv.id);
            return (
              <label key={srv.id} className={`calc-chip ${isChecked ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  value={srv.id}
                  className="calc-checkbox"
                  checked={isChecked}
                  onChange={(e) => handleCheckboxChange(srv.id, e.target.checked)}
                />
                <span>{srv.label}</span>
              </label>
            );
          })}
        </div>

        {/* Ad Budget Slider */}
        <div className="calc-slider-block" style={{ marginTop: '1.5rem' }}>
          <div className="slider-readout" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className="mono-label">Monthly Media/Ad Budget:</span>
            <span className="slider-val-num" id="calcBudgetValue" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--c-vermilion)' }}>
              {formatCurrency(budget)}
            </span>
          </div>
          <label htmlFor="calcBudgetSlider" className="visually-hidden" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>
            Monthly Media Budget Slider
          </label>
          <input
            type="range"
            id="calcBudgetSlider"
            className="instrument-slider"
            min="20000"
            max="250000"
            step="5000"
            value={budget}
            onChange={(e) => handleBudgetChange(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: 'var(--c-vermilion)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: '0.5rem' }}>
            <span>₹20,000 (Starter)</span>
            <span>₹1,00,000 (Growth)</span>
            <span>₹2,50,000 (Scale)</span>
          </div>
        </div>
      </div>

      {/* Output Readout Right */}
      <div className="calc-stage">
        <div>
          <div className="mono-label" style={{ marginBottom: '0.5rem', color: 'var(--c-vermilion)' }}>
            PROJECTED MONTHLY OUTPUT
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 800, color: 'var(--c-text-primary)', marginBottom: '1.5rem' }}>
            Illustrative Simulator Output
          </h3>

          <div className="telemetry-grid">
            <div className="telemetry-cell">
              <div className="telemetry-val" id="calcOutImpressions">
                {projection.hasPromotions ? formatImpressions(projection.projectedImpressions) : 'Brand Reach'}
              </div>
              <div className="telemetry-lbl">ESTIMATED IMPRESSIONS</div>
            </div>

            <div className="telemetry-cell highlight">
              <div className="telemetry-val" id="calcOutInquiries" style={{ color: 'var(--c-vermilion)' }}>
                {projection.hasPromotions
                  ? `${projection.projectedInquiriesLow} – ${projection.projectedInquiriesHigh}`
                  : '—'}
              </div>
              <div className="telemetry-lbl">ESTIMATED INQUIRIES</div>
            </div>

            <div className="telemetry-cell">
              <div className="telemetry-val" id="calcOutLocalLift">
                {selectedServices.includes('gmb') ? 'Top 3 Push' : 'Standard'}
              </div>
              <div className="telemetry-lbl">LOCAL 3-PACK LIFT</div>
            </div>

            <div className="telemetry-cell">
              <div className="telemetry-val" id="calcOutEfficiency">
                {selectedServices.includes('websites') ? 'High Speed' : 'Base'}
              </div>
              <div className="telemetry-lbl">FUNNEL EFFICIENCY</div>
            </div>
          </div>

          <div className="blueprint-dispatch" id="blueprintDispatchText">
            <div style={{ marginBottom: '0.35rem' }}>
              <strong>Configured Scope:</strong> {selectedNames.length > 0 ? selectedNames.join(', ') : 'None selected'}
            </div>
            <div style={{ marginBottom: '0.35rem' }}>
              <strong>Allocated Monthly Ad Budget:</strong> {formatCurrency(budget)} ({indLabel})
            </div>
            {!projection.hasPromotions && (
              <div style={{ color: 'var(--c-warning)', marginBottom: '0.35rem' }}>
                Note: Lead inquiries require active ad spend in Digital Promotions.
              </div>
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)', fontStyle: 'italic' }}>
              Illustrative simulator based on benchmark placeholders in assumptions.json. Actual returns depend on market category, unit economics, conversion efficiency, and operational close rate.
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-vermilion btn-lg btn-full"
          id="claimBlueprintBtn"
          onClick={handleClaimBlueprint}
          style={{ marginTop: '1.5rem' }}
        >
          <span>Claim This Growth Blueprint</span>
          <span>&darr;</span>
        </button>
      </div>
    </div>
  );
}
