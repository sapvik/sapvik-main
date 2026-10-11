/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly SITE_PASSWORD?: string;
  readonly REDIRECT_ALLOW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
