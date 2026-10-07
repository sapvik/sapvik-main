# SAPVIK Tech - Official Website & Growth Engine

Precision digital growth partner for ambitious commercial businesses.

## Architecture

- **Frontend**: Clean Vanilla HTML5, modern CSS3 (responsive design system with brand tokens), and framework-free JavaScript.
- **Server**: Multi-threaded Python server (`server.py`) for local development with built-in SSRF protection, rate limiting, and lead capture.
- **Serverless / Cloudflare Pages**: Ready-to-deploy Pages Functions in `/functions/api/`:
  - `/api/audit`: Real forensic website diagnostic scanner.
  - `/api/contact`: Form submission pipeline with Brevo CRM integration.

## Local Development

```bash
# Start local server on port 8081
python server.py

# Run verification test suite
npm test
# or
node tests/audit_tests.js
```

## Directory Structure

```
├── public/                 # Deployable static assets
│   ├── index.html          # Main landing page
│   ├── privacy.html        # Privacy policy (DPDP compliance)
│   ├── terms.html          # Terms of engagement
│   ├── cookies.html        # Tracking disclosure
│   ├── css/styles.css      # Core design system & responsive styling
│   ├── js/                 # Main, engine, and calculator modules
│   ├── assets/             # Vector brand assets & optimized images
│   ├── robots.txt          # Crawler instructions
│   └── sitemap.xml         # Canonical XML sitemap
├── functions/api/          # Cloudflare Pages Functions
├── config/                 # Single source of truth (brand, claims, assumptions)
├── tests/                  # Automated verification tests
└── brand-source/           # Master design files and branding references
```
