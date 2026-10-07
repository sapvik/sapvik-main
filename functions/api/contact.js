/**
 * Cloudflare Pages Function: /api/contact
 * Validated lead capture, Turnstile verification, HTML escaping, and zero-loss dispatch.
 */

import { escapeHtml, validateOrigin, verifyTurnstileToken, validateContactPayload } from '../lib/security.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Origin Protection
  if (!validateOrigin(request, ['sapvik.com', 'localhost', '127.0.0.1'])) {
    return new Response(JSON.stringify({ ok: false, message: 'Cross-origin request blocked.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Body Size Enforcement (<50KB)
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > 50000) {
    return new Response(JSON.stringify({ ok: false, message: 'Request payload exceeds allowable limit.' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, message: 'Malformed JSON payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Honeypot check
  if (data.website_url_hp) {
    // Silently drop bot submission
    return new Response(JSON.stringify({ ok: true, lead_id: 'SUB-BOT-DISCARD' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 4. Turnstile Bot Challenge Verification
  const clientIp = request.headers.get('CF-Connecting-IP') || '';
  if (env && env.TURNSTILE_SECRET_KEY) {
    const turnstileToken = data.turnstileToken || data['cf-turnstile-response'];
    const turnstileResult = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY, clientIp);
    if (!turnstileResult.success && !turnstileResult.bypassed) {
      return new Response(JSON.stringify({
        ok: false,
        message: 'Captcha verification failed. Please refresh and try again.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 5. Input Validation
  const validation = validateContactPayload(data);
  if (!validation.valid) {
    return new Response(JSON.stringify({ ok: false, message: validation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const name = data.name.trim();
  const phone = data.phone.trim();
  const email = data.email.trim();
  const business = (data.business || '').trim();
  const website = (data.website || '').trim();
  const service = data.service || 'all';
  const details = (data.details || '').trim();
  const marketingConsent = data.marketing_consent === true;
  const utm = data.utm || {};
  const audit = data.audit || null;

  // Robust UUID Lead ID
  const leadId = `SAPVIK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  // 6. Lead Delivery (Priority: Team Notification Email & Webhook)
  let deliverySucceeded = false;
  const brevoKey = env ? env.BREVO_API_KEY : null;
  const webhookUrl = env ? env.LEAD_WEBHOOK_URL : null;
  const teamEmail = (env && env.NOTIFICATION_EMAIL) || 'growth@sapvik.com';

  // A. Dispatch Transactional Alert Email to Team via Brevo SMTP API
  if (brevoKey) {
    try {
      const emailHtml = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #12161C;">
          <h2 style="color: #C93A22;">[NEW AUDIT LEAD] Ref: ${escapeHtml(leadId)}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold; width: 140px;">Name:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Phone:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Company:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;">${escapeHtml(business || 'N/A')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Website:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;">${escapeHtml(website || 'N/A')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Service Focus:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;">${escapeHtml(service)}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Marketing Consent:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;">${marketingConsent ? 'Granted' : 'Denied'}</td></tr>
          </table>
          <h3>Notes / Objectives:</h3>
          <p style="background: #F4F5F6; padding: 12px; border-left: 3px solid #C93A22;">${escapeHtml(details || 'No additional notes provided.')}</p>
          ${audit ? `<h3>Attached Audit Score:</h3><p>Score: ${escapeHtml(String(audit.score))}/100 | Target: ${escapeHtml(audit.url || '')}</p>` : ''}
          <p style="font-size: 12px; color: #718096; margin-top: 24px;">Captured at ${new Date().toISOString()} | Client IP: ${escapeHtml(clientIp)}</p>
        </div>
      `;

      const mailResp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'SAPVIK Lead Gateway', email: 'gateway@sapvik.com' },
          to: [{ email: teamEmail }],
          subject: `[Lead Alert] ${name} - ${business || service}`,
          htmlContent: emailHtml
        })
      });

      if (mailResp.ok) {
        deliverySucceeded = true;
      }
    } catch (mailErr) {
      console.error('Brevo SMTP alert delivery error:', mailErr);
    }
  }

  // B. Optional Webhook Dispatch
  if (webhookUrl) {
    try {
      const hookResp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          timestamp: new Date().toISOString(),
          name, phone, email, business, website, service, details,
          marketingConsent, utm, audit
        })
      });
      if (hookResp.ok) {
        deliverySucceeded = true;
      }
    } catch (hookErr) {
      console.error('Webhook dispatch error:', hookErr);
    }
  }

  // C. Asynchronous Brevo Contact Sync (Non-blocking via waitUntil)
  if (brevoKey) {
    const contactSyncPromise = (async () => {
      try {
        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            attributes: {
              FIRSTNAME: name,
              SMS: phone,
              COMPANY: business,
              WEBSITE: website,
              SERVICE: service,
              MARKETING_CONSENT: marketingConsent
            },
            updateEnabled: true
          })
        });
      } catch (crmErr) {
        console.error('Non-critical CRM contact sync error:', crmErr);
      }
    })();

    if (context.waitUntil) {
      context.waitUntil(contactSyncPromise);
    }
  }

  // 7. Enforce Delivery Guarantee
  // In local development without configured API keys, allow graceful success with mock note
  const isLocalDev = !env || (!env.BREVO_API_KEY && !env.LEAD_WEBHOOK_URL);

  if (deliverySucceeded || isLocalDev) {
    return new Response(JSON.stringify({
      ok: true,
      lead_id: leadId,
      message: 'Audit request received successfully.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // If live transmission completely failed, return explicit offline response with WhatsApp fallback
  return new Response(JSON.stringify({
    ok: false,
    lead_id: leadId,
    error: 'gateway_offline',
    whatsapp_fallback: true,
    message: 'Automated transmission gateway is currently offline. Please connect directly via WhatsApp.'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}
