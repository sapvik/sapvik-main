# Performance Baseline (Pre-Launch Phase 0)

Date: October 19, 2026  
Environment: Local Cloudflare Pages preview (`dist` served via `wrangler pages dev dist --port 8082`)  
Method: Lighthouse 12.x via Node.js API, 3 runs per device profile, median reported.  
Device Profiles:
- **Mobile**: Emulated Moto G Power / mobile viewport (360x640), default 4G throttling (150ms RTT, 1.6 Mbps throughput, 4x CPU slowdown).
- **Desktop**: Desktop viewport (1350x940), desktop throttling (40ms RTT, 10 Mbps throughput, 1x CPU slowdown).

---

## Baseline Metrics Table (Medians of 3 Runs)

| Page | Mode | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | JS Transfer | CSS Transfer |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Home (`/`)** | Mobile | **98** | **96** | **96** | **100** | 2,196 ms | 17 ms | 0.006 | 296.0 KB | 9.5 KB |
| **Home (`/`)** | Desktop | **100** | **95** | **96** | **100** | 428 ms | 0 ms | 0.039 | 295.9 KB | 9.5 KB |
| **Service (`/services/website-development`)** | Mobile | **100** | **94** | **100** | **100** | 1,238 ms | 36 ms | 0.002 | 176.5 KB | 9.5 KB |
| **Service (`/services/website-development`)** | Desktop | **100** | **98** | **100** | **100** | 465 ms | 0 ms | 0.004 | 176.5 KB | 9.5 KB |
| **Blog (`/blog/core-web-vitals-mobile-india-latency`)** | Mobile | **99** | **96** | **100** | **100** | 1,683 ms | 41 ms | 0.000 | 176.5 KB | 11.6 KB |
| **Blog (`/blog/core-web-vitals-mobile-india-latency`)** | Desktop | **100** | **96** | **100** | **100** | 471 ms | 0 ms | 0.002 | 176.4 KB | 11.6 KB |

---

## Top Failing / Sub-Optimal Audits per Category

### 1. Performance
- **`render-blocking-resources`** (Score: ~0.0 - 0.5):
  - Stylesheets (`/_astro/*.css`) block initial paint; estimated savings ~730 ms - 1,090 ms on mobile.
- **`unused-javascript`** (Score: ~0.0 - 0.5):
  - Estimated savings: 54 KiB to 111 KiB.
  - Primary contributors: Third-party Turnstile `api.js` loaded unconditionally on initial load, GTM script loading early, and hydration bundles for islands that are not currently in the viewport.
- **`dom-size`** (Score: ~0.5 on Homepage):
  - 862 DOM elements on homepage (nearing Lighthouse warning threshold).
- **`bf-cache`** (Score: 0 on Mobile Home):
  - Page prevented back/forward cache restoration due to page lifecycle/unload listeners.
- **`interactive` / Time to Interactive**:
  - ~5.6 s - 5.7 s on Mobile Home due to early script execution and Turnstile init.

### 2. Accessibility
- **`color-contrast`** (Score: 0):
  - `.mono-label` elements styled with `color: var(--c-vermilion)` (`#c93a22`) over neutral backgrounds (`#eaecef`) have a contrast ratio of 4.31:1 (fails 4.5:1 minimum).
  - Mobile bottom dock button span (`#ffffff` text on `#128c7e`) has a contrast ratio of 4.13:1 (fails 4.5:1 minimum).
  - Certain muted secondary body text elements fall under the 4.5:1 threshold.
- **`heading-order`** (Score: 0):
  - Heading levels do not decrease sequentially (e.g. `<h3>` in `Scanner` audit-deck-title appears without preceding `<h2>`, and `<h4>` in `.channel-card` appears without preceding `<h3>`).

### 3. Best Practices
- **`errors-in-console`** (Score: 0 on Home):
  - `Uncaught TurnstileError: [Cloudflare Turnstile] Error: 110200` thrown on initial page load by `challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`.
  - Triggered because Turnstile's script is loaded synchronously in the head before user interaction and fails on non-registered/local host domains.

### 4. SEO
- **Score: 100 / 100** across all 3 pages in both Mobile and Desktop modes.
  - Meta tags, canonical URLs, robots directives, structured data hooks, crawlability, and mobile viewport are all healthy.

---

## Action Plan for Subsequent Phases
- **Phase 1**: Address all correctness fixes (Scanner data merge logic, score presentation separation, timeout & fallback states, committed `.env.production`, fail-closed password middleware, `404.astro`, copy corrections, claims audit).
- **Phase 2**: Target the failing performance audits:
  - Defer GTM loader to load/idle.
  - Lazy-load Turnstile `api.js` on interaction or viewport scroll (fixes console error and unused JS).
  - Change island hydration to `client:idle` / `client:visible` with reserved layout heights.
  - Preload above-the-fold fonts with font-display swap and metric overrides.
  - Optimize SVGs (logo/favicon) with `svgo`.
  - Add immutable caching headers in `public/_headers`.
  - Test stylesheet inlining (`build.inlineStylesheets: 'always'`).
- **Phase 3**: Fix accessibility contrast issues (boost vermilion & WhatsApp dock contrast, fix heading hierarchy, tap targets >= 44x44px).
- **Phase 4**: Sitemap generator integration, meta/title validation tests, structured data cleanup, legacy redirect removal.
- **Phase 5**: Content input preparation and draft-flagged routes.

---

## Phase 2 (Performance) Measurement Table (Medians of 3 Runs)

| Page | Mode | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | JS Transfer | CSS Transfer |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Home (`/`)** | Mobile | **98** | **96** | **100** | **100** | 2,138 ms | 37 ms | 0.000 | 255.5 KB | 9.7 KB |
| **Home (`/`)** | Desktop | **100** | **95** | **100** | **100** | 584 ms | 0 ms | 0.026 | 255.5 KB | 9.7 KB |
| **Service (`/services/website-development`)** | Mobile | **99** | **94** | **100** | **100** | 1,976 ms | 34 ms | 0.026 | 176.5 KB | 9.7 KB |
| **Service (`/services/website-development`)** | Desktop | **100** | **98** | **100** | **100** | 444 ms | 0 ms | 0.002 | 176.5 KB | 9.7 KB |
| **Blog (`/blog/core-web-vitals-mobile-india-latency`)** | Mobile | **100** | **96** | **100** | **100** | 1,594 ms | 33 ms | 0.020 | 176.5 KB | 11.8 KB |
| **Blog (`/blog/core-web-vitals-mobile-india-latency`)** | Desktop | **100** | **96** | **100** | **100** | 462 ms | 0 ms | 0.000 | 176.5 KB | 11.8 KB |

- **JS Transfer Savings**: -40.5 KB on Home page initial load (from 296.0 KB to 255.5 KB).
- **Console Errors**: 0 console errors (Turnstile 110200 eliminated via interaction-based lazy loader).
- **Best Practices**: 100 / 100 on all pages.

---

## Phase 3 (Accessibility & Best Practices) Measurement Table (Medians of 3 Runs)

| Page | Mode | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | JS Transfer | CSS Transfer |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Home (`/`)** | Mobile | **98** | **100** | **100** | **100** | 2,134 ms | 38 ms | 0.000 | 255.5 KB | 9.7 KB |
| **Home (`/`)** | Desktop | **100** | **100** | **100** | **100** | 585 ms | 0 ms | 0.026 | 255.5 KB | 9.7 KB |
| **Service (`/services/website-development`)** | Mobile | **99** | **100** | **100** | **100** | 1,901 ms | 57 ms | 0.026 | 176.5 KB | 9.7 KB |
| **Service (`/services/website-development`)** | Desktop | **100** | **100** | **100** | **100** | 429 ms | 0 ms | 0.002 | 176.5 KB | 9.7 KB |
| **Blog (`/blog/core-web-vitals-mobile-india-latency`)** | Mobile | **99** | **100** | **100** | **100** | 2,055 ms | 45 ms | 0.020 | 176.5 KB | 11.8 KB |
| **Blog (`/blog/core-web-vitals-mobile-india-latency`)** | Desktop | **100** | **100** | **100** | **100** | 465 ms | 0 ms | 0.000 | 176.5 KB | 11.8 KB |

- **Accessibility**: 100 / 100 across all 3 pages (Mobile & Desktop).
  - Contrast fixed (`--c-vermilion` tuned to `#B8301B`, WhatsApp dock button to `#0E7465`).
  - Strict heading hierarchy across all templates (0 skipped headings; all converted to sequential `h1 -> h2 -> h3`).
  - Target sizes set to >= 44x44px on touch controls.
  - Form inputs equipped with full ARIA attributes (`aria-required`, `aria-invalid`, `aria-describedby` linked error messages).
  - Mobile Scanner input attributes enhanced (`inputMode="url"`, `autoComplete="url"`, `autoCapitalize="off"`, `spellCheck={false}`).
- **Best Practices**: 100 / 100 across all 3 pages (Mobile & Desktop).
- **SEO**: 100 / 100 across all 3 pages (Mobile & Desktop).
- **Performance**: 98–99 Mobile, 100 Desktop. Target met (>90 Mobile, 100 Desktop).

