/**
 * SAPVIK Privacy-First Analytics Event Layer
 * 
 * Rules:
 * 1. Zero direct calls to gtag('event') - all tracking uses window.dataLayer.push.
 * 2. Strict PII sanitization: Strips customer names, emails, phone numbers, and raw messages.
 * 3. Works seamlessly both client-side and in SSR/tests without throwing.
 */

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

// Banned keys that could contain PII
const BANNED_PII_KEYS = new Set([
  'name',
  'fullname',
  'full_name',
  'email',
  'phone',
  'mobile',
  'telephone',
  'address',
  'password',
  'details',
  'message',
  'token',
  'turnstiletoken',
  'turnstile_token'
]);

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(?:\+?91[\s-]?)?[6-9]\d{9}/g;

/**
 * Deep sanitization function to strip PII fields and scrub values.
 */
export function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();

    // Drop banned key entirely
    if (BANNED_PII_KEYS.has(lowerKey)) {
      continue;
    }

    if (typeof value === 'string') {
      let scrubbed = value.replace(EMAIL_PATTERN, '[REDACTED_EMAIL]');
      scrubbed = scrubbed.replace(PHONE_PATTERN, '[REDACTED_PHONE]');
      clean[key] = scrubbed;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = sanitizePayload(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}

export type AnalyticsEventName =
  | 'generate_lead'
  | 'scan_start'
  | 'scan_complete'
  | 'scan_error'
  | 'calc_interact'
  | 'calc_claim'
  | 'heatmap_toggle'
  | 'faq_open'
  | 'click_whatsapp'
  | 'click_call'
  | 'click_email'
  | 'form_start'
  | 'form_error'
  | 'section_view';

/**
 * Safely push an event to window.dataLayer.
 * Guarantees zero calls to gtag('event') to prevent double-counting.
 */
export function trackEvent(
  eventName: AnalyticsEventName,
  payload: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dataLayer = window.dataLayer || [];

  const sanitized = sanitizePayload(payload);
  const eventRecord: Record<string, unknown> = {
    event: eventName,
    ...sanitized,
    event_timestamp: Date.now()
  };

  window.dataLayer.push(eventRecord);
}
