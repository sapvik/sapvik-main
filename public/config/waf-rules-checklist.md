# Cloudflare WAF Rate Limiting & Launch Checklist

This checklist documents the exact Cloudflare WAF and security rules to activate upon custom domain binding (`sapvik.com`).

---

## 1. Cloudflare Free Tier WAF Quota Constraints
- **Custom WAF Rate Limiting Rules Allowance**: 1 active rate limiting rule on the Cloudflare Free Plan.
- **Strategy**: Protect the mission-critical path (`/api/contact`) as highest priority, while combining or applying Turnstile bot challenges to `/api/audit`.

---

## 2. Rule 1: Priority Lead Capture Rate Limit (Launch Checklist Item)
In the Cloudflare Dashboard under **Security > WAF > Rate limiting rules**:

- **Rule Name**: `Protect Contact Endpoint against Spam & Enumeration`
- **When incoming requests match**:
  ```text
  (http.request.uri.path eq "/api/contact" and http.request.method eq "POST")
  ```
- **Characteristics**: `IP`
- **Period**: `1 minute` (or `60 seconds`)
- **Requests**: `5`
- **Action**: `Block` (or `Managed Challenge`)
- **Duration**: `10 minutes`
- **Response Type**: JSON
  ```json
  {"ok": false, "error": "rate_limited", "message": "Too many requests. Please connect via WhatsApp."}
  ```

---

## 3. Rule 2: Free Scan Proxy & SSRF Protection
Because `/api/audit` can be invoked to probe external domains, prevent users from turning the worker into an open scanner proxy:

- **Turnstile Managed Challenge**:
  Enforced directly inside `functions/api/audit.js` requiring a valid Cloudflare Turnstile token on all requests when `TURNSTILE_SECRET_KEY` is configured.
- **WAF Rule (if Pro plan or Custom Rule expression used)**:
  ```text
  (http.request.uri.path eq "/api/audit" and not ip.geoip.country in {"IN" "US" "GB" "CA" "AU" "AE"})
  ```
  Action: `Managed Challenge`

---

## 4. Pre-Launch Verification Items
- [ ] Bind custom domain `sapvik.com` in Cloudflare Pages.
- [ ] Set environment variables in Cloudflare Pages settings:
  - `BREVO_API_KEY`: Brevo transactional SMTP key.
  - `BREVO_SENDER_EMAIL`: `growth@sapvik.com`
  - `BREVO_ALERT_RECIPIENT`: Destination address for leads.
  - `TURNSTILE_SECRET_KEY`: Secret key from Cloudflare Turnstile dashboard.
- [ ] Verify Edge Cache on `sapvik.com`: confirm `caches.default` responds with cache hits on duplicate scans.
- [ ] Verify CSP in browser console: ensure zero violations in Report-Only mode before switching to enforcing mode.
