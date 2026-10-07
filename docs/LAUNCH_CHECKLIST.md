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
- [ ] **Google Analytics 4**: Measurement ID `TODO_GA4_ID` configured via GTM.
- [ ] **Consent Mode v2**: Initialized with default `denied` for `ad_storage` and `analytics_storage`. Updates dynamically upon banner acceptance.
- [ ] **DataLayer Events**: Verified firing of `generate_lead`, `scan_complete`, `calc_interact`, `faq_open`.
- [ ] **Microsoft Clarity**: (Optional) Project ID `TODO_CLARITY_ID` added in GTM.

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
