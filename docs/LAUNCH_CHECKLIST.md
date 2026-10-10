# SAPVIK Production Launch & Operations Checklist

This checklist tracks the deployment readiness, security configurations, environment variables, DNS, and operational verification for `sapvik.com`.

---

## 1. Cloudflare Project Configuration
- [ ] **Hosting Mode**: Cloudflare Pages (or Cloudflare Workers with Static Assets).
- [ ] **Framework Preset**: Astro (or None / Static).
- [ ] **Build Command**: `npm run build`
- [ ] **Build Output Directory**: `dist`
- [ ] **Root Directory**: `/`
- [ ] **Compatibility Date**: `2024-04-03` or later
- [ ] **Compatibility Flags**: `nodejs_compat` enabled

---

## 2. Environment Variables & Secrets
Configure these in **Cloudflare Dashboard > Pages > Settings > Environment variables**:

| Variable Name | Scope | Description | Status |
| :--- | :--- | :--- | :--- |
| `SITE_PASSWORD` | Preview | Password for edge preview gate (default: `sapvik2026`). Set to `DISABLE` for public production. | Configured |
| `BREVO_API_KEY` | Encrypted Secret | API key for Brevo transactional email (`POST /v3/smtp/email`). | Pending user input (`TODO_BREVO_KEY`) |
| `NOTIFICATION_EMAIL`| Production / Preview | Destination inbox for team lead alerts (e.g. `growth@sapvik.com`). | Configured default |
| `TURNSTILE_SECRET_KEY` | Encrypted Secret | Cloudflare Turnstile secret key for server-side token validation. | Pending user input (`TODO_TURNSTILE_SECRET`) |
| `PUBLIC_TURNSTILE_SITE_KEY` | Environment Variable | Public client widget site key for contact and scanner forms. | Pending user input (`TODO_TURNSTILE_SITEKEY`) |
| `LEAD_WEBHOOK_URL` | Optional Secret | External CRM/Discord/Slack webhook endpoint for redundant lead streaming. | Optional (`TODO_WEBHOOK_URL`) |

---

## 3. Cloudflare WAF & Edge Rate Limiting Rules
Configure under **Cloudflare Dashboard > Security > WAF > Rate limiting rules**:

### Rule A: Global API Guard (`/api/*`)
- **Expression**: `(http.request.uri.path wildcard "/api/*")`
- **Rate**: 60 requests per 5 minutes per IP address.
- **Action**: Block (HTTP 429) or Managed Challenge.

### Rule B: Lead Submission Rate Limit (`/api/contact`)
- **Expression**: `(http.request.uri.path eq "/api/contact" and http.request.method eq "POST")`
- **Rate**: 5 requests per 10 minutes per IP address.
- **Action**: Block (HTTP 429).
- **Purpose**: Prevents spam runs, bot flooding, and inbox exhaustion.

---

## 4. Email Deliverability & Sender Authentication (Brevo)
To ensure lead alerts never land in spam:
- [ ] **DKIM Record**: Verified in DNS (`mail._domainkey.sapvik.com`).
- [ ] **SPF Record**: Verified in DNS (`v=spf1 include:spf.brevo.com ~all`).
- [ ] **DMARC Record**: Verified in DNS (`v=DMARC1; p=reject; rua=mailto:dmarc@sapvik.com`).
- [ ] **Verified Sender**: Configured sender identity (e.g. `alerts@sapvik.com`).

---

## 5. Domain, DNS & SSL Setup
- [ ] Root domain `sapvik.com` proxied (Orange Cloud) on Cloudflare.
- [ ] Subdomain `www.sapvik.com` redirects (301) to apex domain.
- [ ] SSL/TLS encryption mode set to **Full (strict)**.
- [ ] Edge Certificates: Universal SSL Active with Minimum TLS Version `1.2`.
- [ ] Automatic HTTPS Rewrites & Always Use HTTPS enabled.

---

## 6. Analytics, Tag Manager & Consent Mode v2
- [ ] **Google Tag Manager**: Container ID `TODO_GTM_ID` linked.
  - To import pre-mapped container: Go to **GTM Admin > Import Container**, select `docs/gtm-container-plan.json`.
  - Overwrite or merge into workspace to automatically provision all 14 custom event tags and Consent Mode v2 triggers.
- [ ] **Google Analytics 4**: Measurement ID `TODO_GA4_ID` configured via GTM `{{GA4 Measurement ID}}` variable.
- [ ] **Consent Mode v2**: Initialized in `src/layouts/Base.astro` with default `denied` for `ad_storage`, `analytics_storage`, `ad_user_data`, and `ad_personalization`. Updates dynamically via `ConsentBanner.astro` upon user selection and persists to `localStorage.getItem('sapvik_consent')`.
- [ ] **Zero PII in Analytics**: Verified by `tests/analytics.test.js`. Customer names, phones, emails, and inquiry details are scrubbed prior to any `dataLayer.push`.
- [ ] **DataLayer Event Verification**:
  - `generate_lead`: Triggered strictly upon confirmed delivery from `/api/contact`.
  - `scan_start`, `scan_complete`, `scan_error`: Triggered during Scanner lifecycle.
  - `calc_interact`, `calc_claim`: Triggered during Simulator interactions.
  - `heatmap_toggle`: Triggered upon coordinate inspection.
  - `faq_open`: Triggered on accordion open.
  - `click_whatsapp`, `click_call`, `click_email`: Triggered on contact link clicks.
- [ ] **Microsoft Clarity / PostHog**: (Optional) Deploy via GTM custom HTML tag with consent check `analytics_storage === 'granted'`.

---

## 7. Pre-Launch Verification Protocol
Execute prior to pointing live production DNS:
- [ ] **End-to-End Lead Submission**: Submit test inquiry with valid fields and consent; confirm receipt in `NOTIFICATION_EMAIL`.
- [ ] **Zero-Lead-Loss Fallback Test**: Temporarily set invalid `BREVO_API_KEY`; submit form; confirm UI displays WhatsApp direct fallback link with pre-filled message.
- [ ] **Website Scanner Test**: Run live scan against public domain (e.g. `cloudflare.com`); verify SSRF guards block internal IPs (e.g. `127.0.0.1`, `169.254.169.254`).
- [ ] **Mobile Responsive Audit**: Verify zero horizontal overflow at 360px viewport on mobile device or DevTools.
- [ ] **Accessibility Audit**: Mobile drawer focus trap, keyboard navigation on calculator and heatmap, contrast ratio >= 4.5:1.
- [ ] **Claim Integrity**: All public numbers cross-referenced and verified in `src/config/claims.json`. Zero placeholder phone numbers (`9876543210`).

---

## 8. Rollback Procedure
If a production issue occurs after DNS switchover:
1. In Cloudflare Pages Dashboard, navigate to **Deployments**.
2. Locate the previous stable deployment hash.
3. Click **Deployments > Actions > Rollback to this deployment**.
4. Rollback applies instantly at the edge worldwide without code recompilation.

---

## 9. Verify after env is wired

Items that require live Cloudflare, Brevo, or Turnstile credentials and cannot be validated in zero-env development:

- [ ] **Turnstile Challenge Enforcement**: With `TURNSTILE_SECRET_KEY` set, verify a request with no token to `/api/audit` or `/api/contact` returns `403`, and a valid token passes.
- [ ] **Brevo Email Dispatch**: With `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and `NOTIFICATION_EMAIL` set, verify contact form submissions deliver email to the recipient inbox.
- [ ] **Brevo Contact Attributes**: Ensure custom contact attributes `COMPANY` (text), `WEBSITE` (text), `SERVICE` (text), and `MARKETING_CONSENT` (boolean) are created in Brevo contacts schema before activating `BREVO_MARKETING_LIST_ID` contact sync.
- [ ] **Edge Password Gate Custom Passcode**: With `SITE_PASSWORD` configured in Pages environment variables, confirm the custom passcode unlocks the site and default fallback `sapvik2026` is rejected.
- [ ] **Cloudflare WAF Rules**: Confirm priority rate-limiting on `/api/contact` and managed challenge rules from `docs/waf-rules-checklist.md` are active in Cloudflare dashboard.
- [ ] **Analytics Consent Mode Update**: Verify that accepting the consent banner dynamically updates GTM / GA4 consent signals from `denied` to `granted`.
- [ ] **Content Security Policy Enforcement**: Verify browser console displays zero CSP violations in `Report-Only` mode before switching `_headers` to enforced CSP.
