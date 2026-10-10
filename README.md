# SAPVIK — Precision Digital Growth Infrastructure

The official web platform and digital acquisition engine for **SAPVIK** (India), rebuilt as a high-performance **Astro + React Islands** static application hosted on **Cloudflare Pages** with hardened edge Functions.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────┐
                      │    Cloudflare Edge (_middleware.js)   │
                      │    Preview Password Gate & WAF Rules  │
                      └──────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
    ┌──────────────────────────┐                    ┌─────────────────────────┐
    │     Static Pages         │                    │   Edge Functions        │
    │     (Astro + React)      │                    │   (/functions/api/*)    │
    ├──────────────────────────┤                    ├─────────────────────────┤
    │ • /                      │                    │ • /api/audit (SSRF-safe)│
    │ • /services/* (6 routes) │                    │ • /api/contact (Brevo)  │
    │ • /terms, /privacy       │                    └─────────────────────────┘
    │ • /cookies               │
    └──────────────────────────┘
```

- **Frontend Core**: **Astro 7** static site generation (`format: 'file'`) producing lightweight, zero-JS HTML by default.
- **Client Hydration (React 19 Islands)**:
  - `Scanner.tsx` (`client:load`): Live server response time & TLS security probe with Cloudflare Turnstile.
  - `ContactForm.tsx` (`client:load`): Lead intake pipeline with DPDP consent and automated WhatsApp direct failover.
  - `Heatmap.tsx` (`client:visible`): 4x4 coordinate local ranking distribution model.
  - `Calculator.tsx` (`client:visible`): Pure-math growth estimator with promotions-only attribution.
- **Backend & Edge Security**: Hardened Cloudflare Pages Functions in `functions/`:
  - `functions/lib/ssrf.js`: Cloudflare DoH IP verification, CIDR blocklist, numeric/IPv6 normalization.
  - `functions/lib/scanner.js`: Manual redirect hops (max 3), 500 KB stream limits, regex heuristics.
  - `functions/api/contact.js`: Origin checks, RFC 4122 v4 UUID tracking, Brevo SMTP delivery with zero-lead-loss fallback.
  - `functions/_middleware.js`: Edge SHA-256 access gate for private staging environments.
- **Privacy & Analytics**: Google Consent Mode v2 (denied by default), GTM container schema (`docs/gtm-container-plan.json`), and automated PII scrubbing on all `dataLayer.push` events.

---

## Directory Structure

```
├── .github/workflows/ci.yml       # Automated CI (TypeScript, build, unit tests, Playwright)
├── astro.config.mjs               # Astro static configuration
├── docs/                          # Architecture checklists, launch operations, and GTM container schema
├── functions/                     # Cloudflare Pages Functions
│   ├── _middleware.js             # Edge preview gate
│   ├── api/audit.js               # Diagnostic scanner API
│   ├── api/contact.js             # Lead intake & Brevo dispatch API
│   └── lib/                       # SSRF validator, scanner, security utilities
├── public/                        # Static assets copied to dist/
│   ├── _headers                   # Cloudflare security headers & caching policies
│   ├── assets/fonts/              # Self-hosted Archivo & IBM Plex Sans .woff2 fonts
│   ├── assets/logo.svg            # Vector brand identity
│   ├── config/                    # Public assumptions, claims, and site config
│   ├── robots.txt                 # Search engine directives
│   └── sitemap.xml                # Canonical XML sitemap (10 routes)
├── src/
│   ├── components/                # Astro components (Header, Footer, ConsentBanner, etc.)
│   ├── components/islands/        # React 19 interactive islands (Scanner, ContactForm, etc.)
│   ├── config/                    # Centralized config (site, services, claims, assumptions)
│   ├── layouts/Base.astro         # Root HTML layout with Consent Mode v2 & Turnstile
│   ├── lib/                       # Pure math and analytics event layer
│   ├── pages/                     # File-based routing (/, /services/[slug], /terms, etc.)
│   └── styles/                    # Design tokens and responsive CSS
├── tests/                         # Node unit, integration, and Playwright smoke tests
└── docs/LAUNCH_CHECKLIST.md       # Production checklist and operations manual
```

---

## Development & Verification Commands

### 1. Local Development

```bash
# Run Astro development server (port 4321)
npm run dev:astro

# Run Cloudflare Pages emulation with Functions & Edge Middleware (port 8082)
npm run dev
```

### 2. Build & Type Checking

```bash
# Type check all TypeScript and JSX files
npm run typecheck

# Build static bundle to dist/
npm run build
```

### 3. Test Suites

```bash
# Run 44 Node unit & integration tests + claims verifier
npm test

# Run 9 Playwright end-to-end smoke tests against live edge server
npm run test:smoke
```

---

## Production Deployment to Cloudflare Pages

1. **Build Settings**:
   - **Framework Preset**: None (or Astro)
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
2. **Environment Secrets** (configure under Pages Settings > Environment Variables):
   - `BREVO_API_KEY`: API key for SMTP delivery notifications.
   - `NOTIFICATION_EMAIL`: Team inbox for new lead notifications.
   - `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key.
   - `SITE_PASSWORD`: Passcode for edge preview protection (set to `DISABLE` in live production).

For full pre-flight verification steps, consult [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md).
