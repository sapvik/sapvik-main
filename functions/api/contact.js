/**
 * Cloudflare Pages Function: /api/contact
 * Validated lead capture, Turnstile verification, HTML escaping,
 * Brevo SMTP dispatch, webhook streaming, and delivery guarantee.
 */

import { escapeHtml, validateOrigin, verifyTurnstileToken, validateContactPayload, readBoundedJson } from '../lib/security.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Origin Protection
  if (!validateOrigin(request, ['sapvik.com', 'localhost', '127.0.0.1'])) {
    return new Response(JSON.stringify({ ok: false, message: 'Cross-origin request blocked.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Body Size Enforcement (<50KB) & Parsing
  const bodyResult = await readBoundedJson(request, 51200);
  if (!bodyResult.ok) {
    return new Response(JSON.stringify({
      ok: false,
      error: bodyResult.error,
      message: bodyResult.message
    }), {
      status: bodyResult.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const data = bodyResult.data;

  // 3. Honeypot check (silently drop bot submissions)
  if (data.website_url_hp || data.contact_ref_code) {
    return new Response(JSON.stringify({ ok: true, lead_id: 'SUB-BOT-DISCARD' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 4. Turnstile Bot Challenge Verification
  const clientIp = request.headers.get('CF-Connecting-IP') || '';
  const turnstileToken = data.turnstileToken || data['cf-turnstile-response'];
  const turnstileSecret = env ? env.TURNSTILE_SECRET_KEY : undefined;
  const turnstileResult = await verifyTurnstileToken(turnstileToken, turnstileSecret, clientIp);
  if (!turnstileResult.success && !turnstileResult.bypassed) {
    return new Response(JSON.stringify({
      ok: false,
      message: 'Captcha verification failed. Please refresh and try again.'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 5. Server-Side Input & Consent Validation
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
  const details = (data.details || data.notes || '').trim();
  const marketingConsent = data.marketing_consent === true || data.marketingConsent === true;
  const utm = data.utm || {};
  const audit = data.audit || null;

  // Standard UUID Lead ID
  const leadId = crypto.randomUUID();

  // 6. Lead Notification Delivery
  let deliverySucceeded = false;
  const brevoKey = env ? env.BREVO_API_KEY : null;
  const webhookUrl = env ? env.LEAD_WEBHOOK_URL : null;
  const teamEmailRaw = (env && env.NOTIFICATION_EMAIL) || 'growth@sapvik.com';
  const recipients = teamEmailRaw
    .split(',')
    .map(e => e.trim())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    .map(email => ({ email }));
  const teamRecipients = recipients.length > 0 ? recipients : [{ email: 'growth@sapvik.com' }];
  const senderEmail = (env && env.BREVO_SENDER_EMAIL) || 'alerts@sapvik.com';

  // A. Dispatch Transactional Alert Email to Team via Brevo SMTP API
  if (brevoKey) {
    try {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #12161C;">
          <h2 style="color: #C93A22;">[NEW DISCOVERY LEAD] Ref: ${escapeHtml(leadId)}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold; width: 140px;">Name:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Phone:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Company:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;">${escapeHtml(business || 'N/A')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Website:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;">${escapeHtml(website || 'N/A')}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Service Focus:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;">${escapeHtml(service)}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #DDE2E7; font-weight: bold;">Marketing Updates:</td><td style="padding: 8px; border-bottom: 1px solid #DDE2E7;">${marketingConsent ? 'Opted In' : 'Declined'}</td></tr>
          </table>
          <h3>Inquiry Notes:</h3>
          <p style="background: #F4F5F6; padding: 12px; border-left: 3px solid #C93A22;">${escapeHtml(details || 'No additional notes provided.')}</p>
          ${audit ? `<h3>Attached Scanner Finding:</h3><p>Status: ${escapeHtml(String(audit.url || ''))} | Response Time: ${escapeHtml(String(audit.response_time_ms || ''))}ms</p>` : ''}
          <p style="font-size: 12px; color: #718096; margin-top: 24px;">Captured at ${new Date().toISOString()} | Client IP: ${escapeHtml(clientIp)}</p>
        </div>
      `;

      const mailResp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'SAPVIK Lead Gateway', email: senderEmail },
          to: teamRecipients,
          replyTo: { email: email, name: name },
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
  if (brevoKey && context.waitUntil) {
    const contactSyncPromise = (async () => {
      try {
        const contactPayload = {
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
        };
        // Add to marketing list only if explicit marketing consent is granted
        if (marketingConsent && env.BREVO_MARKETING_LIST_ID) {
          contactPayload.listIds = [parseInt(env.BREVO_MARKETING_LIST_ID, 10)];
        }

        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(contactPayload)
        });
      } catch (crmErr) {
        console.error('Non-critical CRM contact sync error:', crmErr);
      }
    })();

    context.waitUntil(contactSyncPromise);
  }

  // 7. Enforce Delivery Guarantee
  // If delivery succeeded, return ok: true with leadId
  if (deliverySucceeded) {
    return new Response(JSON.stringify({
      ok: true,
      lead_id: leadId,
      message: 'Inquiry received and lead notification dispatched.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // If no delivery path was configured or all deliveries failed, NEVER return ok: true!
  return new Response(JSON.stringify({
    ok: false,
    lead_id: leadId,
    error: 'delivery_offline',
    whatsapp_fallback: true,
    message: 'Automated notification delivery is currently offline. Please connect directly via WhatsApp.'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}
