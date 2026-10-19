/**
 * Turnstile Client Helper
 * Provides safe site key resolution and graceful zero-env degradation.
 * Bakes in DEFAULT_SITE_KEY and supports async script loading.
 */

const DEFAULT_SITE_KEY = '0x4AAAAAAAFTY0v25vZJ_wPCQ';

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

let scriptPromise: Promise<void> | null = null;

export function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="turnstile/v0/api.js"]');
    if (existing) {
      if (window.turnstile) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => resolve());
      }
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return scriptPromise;
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

  // Inject/await Turnstile script tag on demand, then render
  loadTurnstileScript().then(() => {
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
  });

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

/**
 * Waits for the Turnstile script to load and the widget to produce a token.
 * Supports passing a widget ID, a widgetId getter function, and an optional token getter function (e.g. from React ref).
 * Returns the token string, or '' if it times out after maxMs.
 */
export async function waitForTurnstileToken(
  widgetIdOrGetter?: string | null | (() => string | null),
  tokenGetter?: () => string,
  maxMs = 6000
): Promise<string> {
  if (typeof window === 'undefined') return '';

  // First ensure the script is loaded
  await loadTurnstileScript();

  // Then poll for the token
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (tokenGetter) {
      const liveToken = tokenGetter();
      if (liveToken) return liveToken;
    }
    if (window.turnstile) {
      try {
        const id = typeof widgetIdOrGetter === 'function' ? widgetIdOrGetter() : widgetIdOrGetter;
        const token = id ? window.turnstile.getResponse(id) : window.turnstile.getResponse();
        if (token) return token;
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return tokenGetter ? tokenGetter() : '';
}
