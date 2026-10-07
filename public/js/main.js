/**
 * SAPVIK Main Interactive Script
 * Production Architecture & Verified Lead Pipelines
 * Safe DOM rendering, zero raw innerHTML, accessible mobile navigation with inert & focus trap,
 * Google Consent Mode v2 banner, and resilient WhatsApp fallback.
 */

// 1. Central Config Layer
const SAPVIK_CONFIG = {
  brand: "SAPVIK",
  phone: "+91 88005 92147",
  whatsappNumber: "918800592147",
  whatsappText: "Hi SAPVIK team, I'd like to discuss a digital growth audit for my business.",
  email: "growth@sapvik.com",
  slaHours: 24
};

// 2. Global Analytics Event Helper (DataLayer Ready)
window.dataLayer = window.dataLayer || [];
window.track = function(event, params = {}) {
  const payload = { event, ...params, timestamp: new Date().toISOString() };
  window.dataLayer.push(payload);
  if (window.console && window.console.debug) {
    console.debug('[ANALYTICS EVENT]', payload);
  }
};

// 3. Capture UTM Parameters & Referrer on First Load
(function captureAttribution() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const attribution = {};
    utmKeys.forEach(key => {
      const val = urlParams.get(key);
      if (val) attribution[key] = val;
    });
    if (document.referrer && !document.referrer.includes(window.location.hostname)) {
      attribution['referrer'] = document.referrer;
    }
    attribution['landing_page'] = window.location.pathname;
    
    if (Object.keys(attribution).length > 0) {
      sessionStorage.setItem('sapvik_attribution', JSON.stringify(attribution));
    }
  } catch (e) {
    // SessionStorage unavailable or restricted
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // A. Header scroll elevation
  // ==========================================================================
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // ==========================================================================
  // B. Accessible Mobile Drawer Navigation with inert & focus trap
  // ==========================================================================
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileNavDrawer');
  const mainContent = document.getElementById('mainContent');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (mobileToggle && mobileDrawer) {
    const toggleDrawer = (open) => {
      mobileDrawer.classList.toggle('open', open);
      mobileToggle.classList.toggle('active', open);
      mobileToggle.setAttribute('aria-expanded', String(open));
      mobileDrawer.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';

      if (mainContent) {
        if (open) {
          mainContent.setAttribute('inert', '');
        } else {
          mainContent.removeAttribute('inert');
        }
      }

      if (open) {
        const firstFocusable = mobileDrawer.querySelector('a, button, [tabindex="0"]');
        if (firstFocusable) setTimeout(() => firstFocusable.focus(), 80);
      } else {
        mobileToggle.focus();
      }
    };

    mobileToggle.addEventListener('click', () => {
      const willOpen = !mobileDrawer.classList.contains('open');
      toggleDrawer(willOpen);
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        toggleDrawer(false);
      });
    });

    // Close on Escape key & Focus Trap inside drawer
    document.addEventListener('keydown', (e) => {
      if (!mobileDrawer.classList.contains('open')) return;

      if (e.key === 'Escape') {
        toggleDrawer(false);
        return;
      }

      if (e.key === 'Tab') {
        const focusables = Array.from(mobileDrawer.querySelectorAll('a, button, [tabindex="0"]'));
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // ==========================================================================
  // C. Active Nav Link Tracking on Scroll
  // ==========================================================================
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  if ('IntersectionObserver' in window && sections.length > 0) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
          window.track('section_view', { section: id });
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(sec => navObserver.observe(sec));
  }

  // ==========================================================================
  // D. Accessible FAQ Accordion
  // ==========================================================================
  const faqRows = document.querySelectorAll('.faq-row, .faq-item');
  faqRows.forEach((row, idx) => {
    const trigger = row.querySelector('.faq-trigger, .faq-question-btn');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('id', `faq-btn-${idx}`);
      
      trigger.addEventListener('click', () => {
        const isOpen = row.classList.contains('open');
        faqRows.forEach((other) => {
          other.classList.remove('open');
          const otherTrigger = other.querySelector('.faq-trigger, .faq-question-btn');
          const otherInd = other.querySelector('.faq-indicator, .faq-icon');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
          if (otherInd) otherInd.textContent = '+';
        });

        if (!isOpen) {
          row.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
          const ind = row.querySelector('.faq-indicator, .faq-icon');
          if (ind) ind.textContent = '−';
          window.track('faq_open', { question: trigger.textContent.trim() });
        }
      });
    }
  });

  // ==========================================================================
  // E. Toast Notification System (Safe DOM / No raw injection)
  // ==========================================================================
  function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = document.createElement('span');
    icon.style.color = type === 'success' ? 'var(--c-success)' : 'var(--c-vermilion)';
    icon.style.fontWeight = '700';
    icon.textContent = type === 'success' ? '✓ ' : '⚠ ';
    
    const textNode = document.createElement('span');
    textNode.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(textNode);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // ==========================================================================
  // F. Google Consent Mode v2 Banner Integration
  // ==========================================================================
  const consentBanner = document.getElementById('consentBanner');
  const btnConsentAccept = document.getElementById('btnConsentAccept');
  const btnConsentReject = document.getElementById('btnConsentReject');

  const savedConsent = localStorage.getItem('sapvik_consent');
  if (savedConsent === 'granted') {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted',
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted'
      });
    }
  } else if (savedConsent === 'denied') {
    // Explicitly denied previously, keep banner hidden
  } else {
    // Not decided yet, show privacy choice banner
    if (consentBanner) {
      consentBanner.style.display = 'block';
    }
  }

  if (btnConsentAccept) {
    btnConsentAccept.addEventListener('click', () => {
      localStorage.setItem('sapvik_consent', 'granted');
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          'analytics_storage': 'granted',
          'ad_storage': 'granted',
          'ad_user_data': 'granted',
          'ad_personalization': 'granted'
        });
      }
      if (consentBanner) consentBanner.style.display = 'none';
      window.track('consent_update', { choice: 'granted' });
    });
  }

  if (btnConsentReject) {
    btnConsentReject.addEventListener('click', () => {
      localStorage.setItem('sapvik_consent', 'denied');
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          'analytics_storage': 'denied',
          'ad_storage': 'denied',
          'ad_user_data': 'denied',
          'ad_personalization': 'denied'
        });
      }
      if (consentBanner) consentBanner.style.display = 'none';
      window.track('consent_update', { choice: 'denied' });
    });
  }

  // ==========================================================================
  // G. Real Contact & Discovery Audit Form Pipeline (Safe DOM / Zero XSS)
  // ==========================================================================
  const auditForm = document.getElementById('auditForm');
  if (auditForm) {
    const submitBtn = auditForm.querySelector('button[type="submit"]');

    auditForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = (document.getElementById('formName')?.value || '').trim();
      const phone = (document.getElementById('formPhone')?.value || '').trim();
      const email = (document.getElementById('formEmail')?.value || '').trim();
      const business = (document.getElementById('formBusiness')?.value || '').trim();
      const website = (document.getElementById('formWebsite')?.value || '').trim();
      const service = document.getElementById('formService')?.value || 'all';
      const details = (document.getElementById('formDetails')?.value || '').trim();
      const consent = document.getElementById('formConsent')?.checked;
      const marketingConsent = Boolean(document.getElementById('formMarketingConsent')?.checked);
      const hp = document.getElementById('formHp')?.value || '';

      // Inline validation
      if (!name) {
        showToast('Please enter your full name.', 'error');
        document.getElementById('formName')?.focus();
        return;
      }
      if (!phone || phone.length < 8) {
        showToast('Please enter a valid phone or WhatsApp number.', 'error');
        document.getElementById('formPhone')?.focus();
        return;
      }
      if (!email || !email.includes('@') || !email.includes('.')) {
        showToast('Please enter a valid business email address.', 'error');
        document.getElementById('formEmail')?.focus();
        return;
      }
      if (document.getElementById('formConsent') && !consent) {
        showToast('Please check the box to acknowledge our privacy notice.', 'error');
        document.getElementById('formConsent')?.focus();
        return;
      }

      // Collect Attribution & Audit Context
      let attribution = {};
      try {
        const stored = sessionStorage.getItem('sapvik_attribution');
        if (stored) attribution = JSON.parse(stored);
      } catch (err) {}

      let auditData = null;
      try {
        const storedAudit = sessionStorage.getItem('sapvik_latest_audit');
        if (storedAudit) auditData = JSON.parse(storedAudit);
      } catch (err) {}

      // Collect Turnstile token if present
      let turnstileToken = '';
      if (window.turnstile && document.getElementById('contactTurnstile')) {
        try {
          turnstileToken = window.turnstile.getResponse(document.getElementById('contactTurnstile')) || '';
        } catch (err) {}
      }

      const payload = {
        name,
        phone,
        email,
        business,
        website,
        service,
        details,
        consent: true,
        marketing_consent: marketingConsent,
        website_url_hp: hp,
        turnstileToken,
        utm: attribution,
        audit: auditData
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'TRANSMITTING REQUEST...';
      }

      window.track('form_start', { service });

      try {
        const resp = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await resp.json();

        if (resp.ok && result.ok) {
          // Success state
          window.track('generate_lead', {
            service,
            lead_id: result.lead_id,
            source: auditData ? 'audit_tool' : 'contact_form'
          });

          // Show in-form success panel safely via DOM methods
          const statusPanel = document.getElementById('formStatusPanel');
          if (statusPanel) {
            statusPanel.innerHTML = '';
            statusPanel.className = 'form-status-panel success';

            const h4 = document.createElement('h4');
            h4.style.fontFamily = 'var(--font-display)';
            h4.style.fontSize = '1.2rem';
            h4.style.color = 'var(--c-success)';
            h4.style.marginBottom = '0.5rem';
            h4.textContent = `✓ Discovery Request Logged [Ref: ${result.lead_id}]`;

            const p1 = document.createElement('p');
            p1.style.fontSize = '0.9rem';
            p1.style.color = 'var(--c-text-primary)';
            p1.style.marginBottom = '0.75rem';
            p1.appendChild(document.createTextNode(`Thank you, ${name}. Our lead strategist has received your inquiry for `));
            const strongBrand = document.createElement('strong');
            strongBrand.textContent = business || website || 'your business';
            p1.appendChild(strongBrand);
            p1.appendChild(document.createTextNode('.'));

            const p2 = document.createElement('p');
            p2.style.fontSize = '0.85rem';
            p2.style.color = 'var(--c-text-muted)';
            p2.textContent = 'We evaluate your digital architecture and will reach out with actionable findings within 24 business hours.';

            statusPanel.appendChild(h4);
            statusPanel.appendChild(p1);
            statusPanel.appendChild(p2);
            auditForm.style.display = 'none';
          } else {
            showToast(`Audit request confirmed [Ref: ${result.lead_id}]. We will reach out within 24 hours.`, 'success');
            auditForm.reset();
          }
        } else {
          // Failure with WhatsApp fallback
          const errorMsg = result.message || 'Server error logging audit request.';
          showToast(errorMsg, 'error');

          const statusPanel = document.getElementById('formStatusPanel');
          if (statusPanel) {
            statusPanel.innerHTML = '';
            statusPanel.className = 'form-status-panel error';

            const errHead = document.createElement('p');
            errHead.style.color = 'var(--c-vermilion)';
            errHead.style.fontWeight = '700';
            errHead.style.marginBottom = '0.5rem';
            errHead.textContent = `⚠ Submission notice: ${errorMsg}`;

            const errDesc = document.createElement('p');
            errDesc.style.fontSize = '0.88rem';
            errDesc.style.marginBottom = '1rem';
            errDesc.textContent = 'Your form details were preserved. You can connect directly with our strategist on WhatsApp:';

            const waMsg = `Hi SAPVIK, I attempted to submit an audit request for ${name} (${business || 'Business'}). Could you assist me directly?`;
            const waLink = document.createElement('a');
            waLink.className = 'btn btn-primary btn-sm';
            waLink.target = '_blank';
            waLink.rel = 'noopener';
            waLink.href = `https://wa.me/${SAPVIK_CONFIG.whatsappNumber}?text=${encodeURIComponent(waMsg)}`;
            waLink.textContent = 'Connect via WhatsApp Direct →';

            statusPanel.appendChild(errHead);
            statusPanel.appendChild(errDesc);
            statusPanel.appendChild(waLink);
          }
        }
      } catch (netErr) {
        showToast('Network error contacting server. Please connect via WhatsApp.', 'error');
        const statusPanel = document.getElementById('formStatusPanel');
        if (statusPanel) {
          statusPanel.innerHTML = '';
          statusPanel.className = 'form-status-panel error';

          const errHead = document.createElement('p');
          errHead.style.color = 'var(--c-vermilion)';
          errHead.style.fontWeight = '700';
          errHead.style.marginBottom = '0.5rem';
          errHead.textContent = '⚠ Network connectivity issue';

          const errDesc = document.createElement('p');
          errDesc.style.fontSize = '0.88rem';
          errDesc.style.marginBottom = '1rem';
          errDesc.textContent = 'Please reach us directly on WhatsApp:';

          const waMsg = `Hi SAPVIK, I would like to schedule a growth audit for ${name || 'my business'}.`;
          const waLink = document.createElement('a');
          waLink.className = 'btn btn-primary btn-sm';
          waLink.target = '_blank';
          waLink.rel = 'noopener';
          waLink.href = `https://wa.me/${SAPVIK_CONFIG.whatsappNumber}?text=${encodeURIComponent(waMsg)}`;
          waLink.textContent = 'Connect via WhatsApp Direct →';

          statusPanel.appendChild(errHead);
          statusPanel.appendChild(errDesc);
          statusPanel.appendChild(waLink);
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'SUBMIT AUDIT REQUEST →';
        }
        if (window.turnstile && document.getElementById('contactTurnstile')) {
          try {
            window.turnstile.reset(document.getElementById('contactTurnstile'));
          } catch (err) {}
        }
      }
    });
  }

  // ==========================================================================
  // H. WhatsApp Direct Handlers
  // ==========================================================================
  const whatsappBtns = document.querySelectorAll('.whatsapp-connect-btn');
  whatsappBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const defaultMsg = encodeURIComponent(SAPVIK_CONFIG.whatsappText);
      window.track('click_whatsapp', { location: btn.getAttribute('data-location') || 'general' });
      window.open(`https://wa.me/${SAPVIK_CONFIG.whatsappNumber}?text=${defaultMsg}`, '_blank', 'noopener,noreferrer');
    });
  });
});
