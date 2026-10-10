/**
 * Turnstile Client Helper
 * Provides safe site key resolution and graceful zero-env degradation.
 * If PUBLIC_TURNSTILE_SITE_KEY is not set or empty, Turnstile is marked unconfigured
 * and no challenge widget is mounted.
 */

export function getTurnstileSiteKey(): string | null {
  const key = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;
  if (!key || typeof key !== 'string' || !key.trim()) {
    return null;
  }
  return key.trim();
}

export function isTurnstileConfigured(): boolean {
  return getTurnstileSiteKey() !== null;
}

export function renderTurnstile(
  container: HTMLElement | null,
  callback: (token: string) => void
): string | null {
  if (typeof window === 'undefined' || !container) {
    return null;
  }
  const sitekey = getTurnstileSiteKey();
  if (!sitekey) {
    return null;
  }
  if (!window.turnstile) {
    return null;
  }
  try {
    return window.turnstile.render(container, {
      sitekey,
      callback
    });
  } catch {
    return null;
  }
}

export function getTurnstileToken(widgetId: string | null): string {
  if (typeof window === 'undefined' || !window.turnstile || !widgetId) {
    return '';
  }
  try {
    return window.turnstile.getResponse(widgetId) || '';
  } catch {
    return '';
  }
}

export function resetTurnstile(widgetId: string | null): void {
  if (typeof window === 'undefined' || !window.turnstile || !widgetId) {
    return;
  }
  try {
    window.turnstile.reset(widgetId);
  } catch {}
}
