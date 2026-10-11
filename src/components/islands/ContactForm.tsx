import React, { useState, useEffect, useRef } from 'react';
import { SERVICES } from '../../config/services';
import { SITE } from '../../config/site';
import { trackEvent } from '../../lib/analytics';
import { renderTurnstile, getTurnstileToken, resetTurnstile, isTurnstileConfigured } from '../../lib/turnstile';

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
  const [honeypot, setHoneypot] = useState<string>('');

  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);

  const handleFormFocus = () => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      trackEvent('form_start', { form_id: 'contact_form' });
    }
  };

  useEffect(() => {
    const id = renderTurnstile(turnstileContainerRef.current, (token: string) => setTurnstileToken(token));
    if (id) {
      widgetIdRef.current = id;
    }

    const handleBlueprint = (e: any) => {
      if (e.detail) {
        setFormData(prev => ({
          ...prev,
          service: e.detail.service || prev.service,
          details: e.detail.details || prev.details
        }));
      }
    };
    window.addEventListener('sapvik:claim-blueprint', handleBlueprint);
    return () => window.removeEventListener('sapvik:claim-blueprint', handleBlueprint);
  }, []);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Full name is required.';
      document.getElementById('formName')?.focus();
    } else if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
      document.getElementById('formPhone')?.focus();
    } else if (!/^[0-9+() -]{8,20}$/.test(formData.phone.trim())) {
      errors.phone = 'Please provide a valid phone number.';
      document.getElementById('formPhone')?.focus();
    } else if (!formData.email.trim()) {
      errors.email = 'Business email is required.';
      document.getElementById('formEmail')?.focus();
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
      document.getElementById('formEmail')?.focus();
    } else if (!formData.consent) {
      errors.consent = 'DPDP consent is required to process your inquiry.';
      document.getElementById('formConsent')?.focus();
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

    let token = turnstileToken;
    if (!token && widgetIdRef.current) {
      token = getTurnstileToken(widgetIdRef.current);
    }

    let utm: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        for (const [k, v] of searchParams.entries()) {
          if (k.startsWith('utm_')) {
            utm[k] = v;
          }
        }
      } catch {}
    }

    let audit: any = null;
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('sapvik_latest_audit');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.score !== undefined || parsed.domain)) {
            audit = {
              domain: parsed.domain,
              score: parsed.score,
              latency: parsed.latency,
              has_ssl: parsed.has_ssl
            };
          }
        }
      } catch {}
    }

    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          business: formData.business,
          website: formData.website,
          service: formData.service,
          details: formData.details,
          notes: formData.details,
          consent: formData.consent,
          marketing_consent: formData.marketingConsent,
          marketingConsent: formData.marketingConsent,
          contact_ref_code: honeypot,
          turnstileToken: token,
          utm,
          audit
        })
      });

      const data = await resp.json();

      if (resp.ok && data.ok) {
        setSubmitSuccess(data.lead_id || 'REGISTERED');
        trackEvent('generate_lead', {
          lead_id: data.lead_id,
          service_focus: formData.service,
          delivery_status: data.status || 'delivered'
        });
      } else {
        setErrorMessage(data.message || 'Submission encountered an issue.');
        if (data.status === 'delivery_offline' || data.error === 'delivery_offline' || data.whatsapp_fallback) {
          setDeliveryOffline(true);
        }
      }
    } catch {
      setErrorMessage('Network error communicating with contact gateway. Form data is preserved below.');
      setDeliveryOffline(true);
    } finally {
      setIsSubmitting(false);
      resetTurnstile(widgetIdRef.current);
    }
  };

  const getWhatsAppFallbackUrl = () => {
    const text = `Hi SAPVIK, I submitted a growth discovery inquiry for ${formData.name} (${formData.business || 'Business'}). Service focus: ${formData.service}. Could we connect directly?`;
    return `https://wa.me/${SITE.brand.whatsappNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="frame-box audit-form-deck" id="audit-form-deck">
      <div className="audit-form-header">
        <span className="mono-label" style={{ color: 'var(--c-vermilion)', display: 'block', marginBottom: '0.25rem' }}>
          CONFIDENTIAL ONBOARDING
        </span>
        <h3 className="audit-form-title">
          Claim Your Growth Blueprint
        </h3>
        <p className="audit-form-desc">
          Provide your details below. Our technical team conducts an initial diagnostic and responds within 24 business hours.
        </p>
      </div>

      {submitSuccess ? (
        <div className="form-status-panel" id="formStatusPanel" style={{ display: 'block', padding: '1.5rem', background: 'var(--c-surface-subdued)', borderLeft: '4px solid var(--c-success)' }}>
          <div style={{ fontWeight: 800, color: 'var(--c-success)', marginBottom: '0.5rem' }}>✓ DISCOVERY REQUEST REGISTERED</div>
          <p style={{ fontSize: '0.88rem', color: 'var(--c-text-secondary)', lineHeight: 1.6 }}>
            Thank you, <strong>{formData.name}</strong>. Your inquiry reference is <code>{submitSuccess}</code>. Our lead growth strategist will review your digital footprint and reach out within 24 business hours.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} onFocus={handleFormFocus} id="auditForm" noValidate>
          {/* Honeypot anti-spam field (hidden offscreen from human visitors) */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="contact_ref_code">Leave this reference field blank</label>
            <input
              type="text"
              id="contact_ref_code"
              name="contact_ref_code"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {errorMessage && (
            <div style={{ padding: '0.85rem 1rem', background: '#FEE2E2', borderLeft: '3px solid var(--c-vermilion)', color: '#991B1B', fontSize: '0.85rem', marginBottom: '1.25rem' }} role="alert">
              <p>⚠ {errorMessage}</p>
              {deliveryOffline && (
                <div className="whatsapp-fallback-action" style={{ marginTop: '0.75rem' }}>
                  <p style={{ fontSize: '0.8rem', color: '#7F1D1D', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                    Direct message gateway is currently offline. Your request has been preserved — connect directly via WhatsApp or call our team:
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a
                      href={getWhatsAppFallbackUrl()}
                      target="_blank"
                      rel="noopener"
                      className="btn btn-primary btn-sm"
                      onClick={() => trackEvent('click_whatsapp', { location: 'contact_fallback' })}
                    >
                      Connect via WhatsApp Direct &rarr;
                    </a>
                    <a
                      href={`tel:${SITE.brand.phone.replace(/\s+/g, '')}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Call {SITE.brand.phoneDisplay}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="formName" className="form-label">Full Name *</label>
              <input
                type="text"
                id="formName"
                className={`form-control ${fieldErrors.name ? 'error' : ''}`}
                placeholder="e.g. Rahul Sharma"
                autoComplete="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              {fieldErrors.name && (
                <span style={{ color: 'var(--c-vermilion)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{fieldErrors.name}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="formPhone" className="form-label">Phone / WhatsApp *</label>
              <input
                type="tel"
                id="formPhone"
                className={`form-control ${fieldErrors.phone ? 'error' : ''}`}
                placeholder="+91 88005 92147"
                inputMode="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              {fieldErrors.phone && (
                <span style={{ color: 'var(--c-vermilion)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{fieldErrors.phone}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="formEmail" className="form-label">Business Email *</label>
              <input
                type="email"
                id="formEmail"
                className={`form-control ${fieldErrors.email ? 'error' : ''}`}
                placeholder="rahul@company.com"
                inputMode="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              {fieldErrors.email && (
                <span style={{ color: 'var(--c-vermilion)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{fieldErrors.email}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="formBusiness" className="form-label">Company / Clinic Name</label>
              <input
                type="text"
                id="formBusiness"
                className="form-control"
                placeholder="Brand Name"
                autoComplete="organization"
                value={formData.business}
                onChange={(e) => setFormData({ ...formData, business: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="formWebsite" className="form-label">Website URL or Google Maps Link</label>
              <input
                type="url"
                id="formWebsite"
                className="form-control"
                placeholder="https://yourbrand.com"
                autoComplete="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label htmlFor="formService" className="form-label">Primary Service Focus</label>
              <select
                id="formService"
                className="form-control"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              >
                <option value="all">Full Growth Engine (All Capabilities)</option>
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="formDetails" className="form-label">Growth Objectives or Specific Bottlenecks</label>
            <textarea
              id="formDetails"
              className="form-control form-textarea"
              rows={2}
              placeholder="Monthly lead goals, current website, or target outcomes..."
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            ></textarea>
          </div>

          <div className="form-consent-row">
            <input
              type="checkbox"
              id="formConsent"
              className="form-consent-checkbox"
              checked={formData.consent}
              onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
              required
            />
            <label htmlFor="formConsent" className="form-consent-label">
              I agree to receive a digital growth diagnostic and consultation. Handled under our <a href="/privacy" target="_blank" style={{ color: 'var(--c-vermilion)', textDecoration: 'underline' }}>Privacy Policy</a>. *
            </label>
          </div>
          {fieldErrors.consent && (
            <span style={{ color: 'var(--c-vermilion)', fontSize: '0.75rem', marginTop: '-0.25rem', marginBottom: '0.75rem', display: 'block' }}>{fieldErrors.consent}</span>
          )}

          <div className="form-consent-row form-consent-row-opt">
            <input
              type="checkbox"
              id="formMarketingConsent"
              className="form-consent-checkbox"
              checked={formData.marketingConsent}
              onChange={(e) => setFormData({ ...formData, marketingConsent: e.target.checked })}
            />
            <label htmlFor="formMarketingConsent" className="form-consent-label muted">
              (Optional) Send me occasional growth engineering guides and benchmark updates.
            </label>
          </div>

          {/* Turnstile Bot Challenge Container (only if configured) */}
          {isTurnstileConfigured() && (
            <div ref={turnstileContainerRef} className="cf-turnstile" id="contactTurnstile" style={{ marginBottom: '1rem' }}></div>
          )}

          <button type="submit" className="btn btn-vermilion btn-lg btn-full form-submit-btn" disabled={isSubmitting}>
            <span>{isSubmitting ? 'Submitting Request...' : 'Submit Audit Request'}</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </form>
      )}
    </div>
  );
}
