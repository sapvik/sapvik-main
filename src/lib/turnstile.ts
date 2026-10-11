/**
 * Turnstile Client Helper
 * Provides safe site key resolution and graceful zero-env degradation.
 * Bakes in DEFAULT_SITE_KEY and supports async script loading.
 */

const DEFAULT_SITE_KEY = '0x4AAAAAAFTY0v25vZJ_wPCQ';

export function getTurnstileSiteKey(): string | null {
  const envKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;
  if (typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  return DEFAULT_SITE_KEY;
}

export function isTurnstileConfigured(): boolean {
  return getTurnstileSiteKey() !== null;
}

export function renderTurnstile(
  container: HTMLElement | null,
  callback: (token: string) => void,
  onWidgetId?: (widgetId: string) => void
): string | null {
  if (typeof window === 'undefined' || !container) {
    return null;
  }
  const sitekey = getTurnstileSiteKey();
  if (!sitekey) {
    return null;
  }

  const doRender = (): string | null => {
    if (!window.turnstile || !container) return null;
    try {
      container.innerHTML = '';
      const id = window.turnstile.render(container, {
        sitekey,
        callback,
        'refresh-expired': 'auto'
      });
      if (id && onWidgetId) {
        onWidgetId(id);
      }
      return id;
    } catch {
      return null;
    }
  };

  if (window.turnstile) {
    return doRender();
  }

  // If Turnstile script tag is still downloading/executing (async/defer)
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (window.turnstile) {
      clearInterval(poll);
      doRender();
    } else if (attempts >= 40) {
      clearInterval(poll);
    }
  }, 100);

  return null;
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

