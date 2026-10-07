import React, { useState, useEffect, useRef } from 'react';
import { SERVICES } from '../../config/services';
import { SITE } from '../../config/site';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    business: '',
    website: '',
    service: 'all',
    details: '',
    consent: false,
    marketingConsent: false
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [deliveryOffline, setDeliveryOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.turnstile && turnstileContainerRef.current) {
      try {
        const id = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: '1x00000000000000000000AA',
          callback: (token: string) => setTurnstileToken(token)
        });
        widgetIdRef.current = id;
      } catch {}
    }
  }, []);

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Please provide your full name (at least 2 characters).';
    }

    const phoneClean = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim() || phoneClean.length < 8) {
      errors.phone = 'Please provide a valid direct phone or WhatsApp number.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errors.email = 'Please provide a valid business email address.';
    }

    if (!formData.consent) {
      errors.consent = 'You must acknowledge the privacy notice to submit this inquiry.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDeliveryOffline(false);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    // Collect session attribution and scan data
    let attribution = {};
    let auditData = null;
    try {
      const storedAttr = sessionStorage.getItem('sapvik_attribution');
      if (storedAttr) attribution = JSON.parse(storedAttr);

      const storedAudit = sessionStorage.getItem('sapvik_latest_audit');
      if (storedAudit) auditData = JSON.parse(storedAudit);
    } catch {}

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      business: formData.business.trim(),
      website: formData.website.trim(),
      service: formData.service,
      details: formData.details.trim(),
      consent: formData.consent,
      marketing_consent: formData.marketingConsent,
      turnstileToken,
      utm: attribution,
      audit: auditData
    };

    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await resp.json();

      if (resp.ok && result.ok) {
        setSubmitSuccess(result.lead_id);
      } else {
        // Delivery failed or offline fallback
        setErrorMessage(result.message || 'Notification transmission could not be completed.');
        if (result.whatsapp_fallback || result.error === 'delivery_offline') {
          setDeliveryOffline(true);
        }
      }
    } catch {
      setErrorMessage('Network error communicating with contact gateway. Form data is preserved below.');
      setDeliveryOffline(true);
    } finally {
      setIsSubmitting(false);
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.reset(widgetIdRef.current); } catch {}
      }
    }
  };

  const getWhatsAppFallbackUrl = () => {
    const text = `Hi SAPVIK, I submitted a growth discovery inquiry for ${formData.name} (${formData.business || 'Business'}). Service focus: ${formData.service}. Could we connect directly?`;
    return `https://wa.me/${SITE.brand.whatsappNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="contact-card framed-card" id="contact">
      <div className="contact-head">
        <span className="mono-label">Discovery Consultation</span>
        <h2 className="contact-title">Begin Digital Architecture & Growth Review</h2>
        <p className="contact-desc">
          Receive an actionable operational review of your web platform, conversion bottlenecks, and local visibility. Backed by our 24 business hours turnaround SLA.
        </p>
      </div>

      {submitSuccess ? (
        <div className="status-panel success-panel" id="formStatusPanel">
          <div className="status-badge">✓ REQUEST REGISTERED</div>
          <h3 className="status-title">Discovery Request Confirmed</h3>
          <p className="status-ref">
            Lead Reference UUID: <code>{submitSuccess}</code>
          </p>
          <p className="status-desc">
            Thank you, {formData.name}. Our lead growth strategist has received your inquiry for{' '}
            <strong>{formData.business || formData.website || 'your business'}</strong>.
            We will review your digital footprint and reach out within 24 business hours.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="contact-form" id="auditForm" noValidate>
          {errorMessage && (
            <div className="form-error-banner" role="alert">
              <p>⚠ {errorMessage}</p>
              {deliveryOffline && (
                <div className="whatsapp-fallback-action">
                  <p className="fallback-note">
                    Your details are preserved. Connect directly with our team on WhatsApp:
                  </p>
                  <a
                    href={getWhatsAppFallbackUrl()}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-primary btn-sm"
                  >
                    Connect via WhatsApp Direct &rarr;
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            <div className="form-col">
              <label htmlFor="formName" className="form-label">
                Full Name <span className="req">*</span>
              </label>
              <input
                id="formName"
                type="text"
                className={`form-input ${fieldErrors.name ? 'error' : ''}`}
                placeholder="Rahul Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                aria-describedby={fieldErrors.name ? 'formNameError' : undefined}
                required
              />
              {fieldErrors.name && (
                <span id="formNameError" className="field-error-text">{fieldErrors.name}</span>
              )}
            </div>

            <div className="form-col">
              <label htmlFor="formPhone" className="form-label">
                Direct Phone / WhatsApp <span className="req">*</span>
              </label>
              <input
                id="formPhone"
                type="tel"
                className={`form-input ${fieldErrors.phone ? 'error' : ''}`}
                placeholder="+91 98200 12345"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                aria-describedby={fieldErrors.phone ? 'formPhoneError' : undefined}
                required
              />
              {fieldErrors.phone && (
                <span id="formPhoneError" className="field-error-text">{fieldErrors.phone}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <label htmlFor="formEmail" className="form-label">
                Business Email <span className="req">*</span>
              </label>
              <input
                id="formEmail"
                type="email"
                className={`form-input ${fieldErrors.email ? 'error' : ''}`}
                placeholder="rahul@company.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                aria-describedby={fieldErrors.email ? 'formEmailError' : undefined}
                required
              />
              {fieldErrors.email && (
                <span id="formEmailError" className="field-error-text">{fieldErrors.email}</span>
              )}
            </div>

            <div className="form-col">
              <label htmlFor="formBusiness" className="form-label">Company / Brand Name</label>
              <input
                id="formBusiness"
                type="text"
                className="form-input"
                placeholder="Apex Healthcare Pvt Ltd"
                value={formData.business}
                onChange={(e) => setFormData({ ...formData, business: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <label htmlFor="formWebsite" className="form-label">Current Website URL (optional)</label>
              <input
                id="formWebsite"
                type="text"
                className="form-input"
                placeholder="https://apexhealth.in"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>

            <div className="form-col">
              <label htmlFor="formService" className="form-label">Primary Capability of Interest</label>
              <select
                id="formService"
                className="form-select"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              >
                <option value="all">Full Digital Architecture (All Capabilities)</option>
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field-full">
            <label htmlFor="formDetails" className="form-label">Inquiry Notes or Objectives</label>
            <textarea
              id="formDetails"
              className="form-textarea"
              rows={3}
              placeholder="Outline your current conversion challenges, target customer vertical, or expansion goals..."
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            ></textarea>
          </div>

          {/* Turnstile Container */}
          <div ref={turnstileContainerRef} className="turnstile-slot" id="contactTurnstile"></div>

          {/* Consent Checkboxes */}
          <div className="consent-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                id="formConsent"
                checked={formData.consent}
                onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                aria-describedby={fieldErrors.consent ? 'formConsentError' : undefined}
                required
              />
              <span>
                I acknowledge the <a href="/privacy" target="_blank" rel="noopener">Privacy Notice</a> and consent to SAPVIK processing my submitted contact information for this inquiry. <span className="req">*</span>
              </span>
            </label>
            {fieldErrors.consent && (
              <span id="formConsentError" className="field-error-text block-err">{fieldErrors.consent}</span>
            )}

            <label className="checkbox-label" style={{ marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                id="formMarketingConsent"
                checked={formData.marketingConsent}
                onChange={(e) => setFormData({ ...formData, marketingConsent: e.target.checked })}
              />
              <span>
                (Optional) Keep me updated with practical digital acquisition teardowns and benchmarks.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary submit-btn"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Transmitting Request...' : 'Transmit Discovery Request →'}
          </button>
        </form>
      )}

      <style>{`
        .contact-card {
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        .contact-title {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .contact-desc {
          color: var(--c-text-muted);
          max-width: 680px;
          margin-bottom: 2rem;
        }
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        @media (min-width: 640px) {
          .form-row {
            grid-template-columns: 1fr 1fr;
          }
        }
        .form-col, .form-field-full {
          display: flex;
          flex-direction: column;
        }
        .form-label {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--c-text-primary);
          margin-bottom: 0.4rem;
        }
        .req {
          color: var(--c-vermilion);
        }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--c-border-strong);
          background: #FFFFFF;
          color: var(--c-text-primary);
          outline: none;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: var(--c-vermilion);
        }
        .form-input.error {
          border-color: var(--c-vermilion);
          background: rgba(201, 58, 34, 0.03);
        }
        .field-error-text {
          font-size: 0.75rem;
          color: var(--c-vermilion);
          font-weight: 600;
          margin-top: 0.25rem;
        }
        .block-err {
          display: block;
        }
        .turnstile-slot {
          min-height: 10px;
        }
        .consent-group {
          padding-top: 0.5rem;
        }
        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          font-size: 0.85rem;
          color: var(--c-text-secondary);
          cursor: pointer;
        }
        .checkbox-label input {
          margin-top: 0.25rem;
          accent-color: var(--c-vermilion);
        }
        .checkbox-label a {
          color: var(--c-vermilion);
          text-decoration: underline;
        }
        .submit-btn {
          width: 100%;
          margin-top: 0.5rem;
        }
        @media (min-width: 640px) {
          .submit-btn {
            width: auto;
            align-self: flex-start;
          }
        }
        .form-error-banner {
          background: rgba(201, 58, 34, 0.08);
          border-left: 3px solid var(--c-vermilion);
          padding: 1rem;
          margin-bottom: 0.5rem;
        }
        .whatsapp-fallback-action {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px dashed rgba(201, 58, 34, 0.2);
        }
        .fallback-note {
          font-size: 0.85rem;
          color: var(--c-text-primary);
          margin-bottom: 0.5rem;
        }
        .status-panel {
          background: #FFFFFF;
          border: 1px solid var(--c-border);
          border-left: 4px solid var(--c-success);
          padding: 2rem;
        }
        .status-badge {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--c-success);
          margin-bottom: 0.5rem;
        }
        .status-title {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .status-ref {
          font-size: 0.9rem;
          color: var(--c-text-muted);
          margin-bottom: 1rem;
        }
        .status-ref code {
          background: #F1F5F9;
          padding: 0.2rem 0.4rem;
          font-family: var(--font-mono);
          color: var(--c-text-primary);
        }
        .status-desc {
          color: var(--c-text-secondary);
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
