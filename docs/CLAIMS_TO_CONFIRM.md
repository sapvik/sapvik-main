# Business Promises & Claims to Confirm

This document compiles every operational commitment, delivery timeline, commercial policy, and service promise published across the SAPVIK website for verification with company leadership prior to public launch.

**Standing Rule**: Do not modify or remove these numbers without explicit company confirmation.

---

## 1. Project Delivery & Ramp-Up Timelines

| Claim / Promise | Stated Value | Exact Site Location | Verification Status | Notes / Context |
| :--- | :--- | :--- | :---: | :--- |
| **Website Development Delivery** | **2 to 6 weeks** | `src/config/services.ts` (FAQ Q1) | Pending Confirmation | Stated as: *"Typical production website engagements range from 2 to 6 weeks depending on architectural requirements, catalog size, and custom integrations."* |
| **Google Business Profile Initial Results** | **3 to 6 weeks** | `src/config/services.ts` (GBP FAQ Q2) | Pending Confirmation | Stated as: *"Initial improvements in category relevance and discovery impressions typically occur within 3 to 6 weeks."* |
| **GBP Geographic Expansion** | **60 to 90 days** | `src/config/services.ts` (GBP FAQ Q2) | Pending Confirmation | Stated as: *"Expanding ranking radius across a wider geographic radius (moving from rank 10+ into the top 3-Pack across neighboring suburbs) generally takes 60 to 90 days."* |

---

## 2. Recommended Media Budgets & Investment Thresholds

| Claim / Promise | Stated Value | Exact Site Location | Verification Status | Notes / Context |
| :--- | :--- | :--- | :---: | :--- |
| **Recommended Minimum Ad Spend** | **₹25,000 to ₹50,000 / month** | `src/config/services.ts` (Ads FAQ Q2) | Pending Confirmation | Stated as: *"For single-city local campaigns, businesses often allocate ₹25,000 to ₹50,000 per month in media spend to establish initial signal density and data significance."* |
| **Growth Simulator Budget Range** | **₹25,000 to ₹500,000 / month** | `src/lib/calculatorMath.ts` (`budget` slider) | Pending Confirmation | Range modeled in interactive calculator on homepage. |
| **Case Study Illustrative Budget** | **₹50,000 / month** | `src/content/blog/meta-ads-cpl-vs-cpa-lead-quality.md` | Pending Confirmation | Illustrative comparison table for high-intent vs broad lead forms. |

---

## 3. Commercial Policy & Account Ownership

| Claim / Promise | Stated Value | Exact Site Location | Verification Status | Notes / Context |
| :--- | :--- | :--- | :---: | :--- |
| **Direct Asset Ownership** | **100% Client Ownership** | `src/pages/index.astro`, `src/pages/services/[slug].astro`, `src/pages/terms.astro` (§3) | Pending Confirmation | Stated as: *"You retain 100% administrative ownership of your domain DNS, hosting accounts, analytics, and codebase. No proprietary vendor lock-in."* |
| **Intellectual Property Handover** | **Exclusive Client Property** | `src/pages/terms.astro` (§3) | Pending Confirmation | Stated as: *"Upon full settlement of contracted invoices, all bespoke source code, visual creative assets, custom branding vectors, and advertising accounts created specifically for the client become the exclusive property of the client."* |
| **Ad Spend Markup** | **0% Markup / Direct Platform Invoicing** | `src/pages/index.astro`, `src/pages/services/[slug].astro`, `src/pages/terms.astro` (§4) | Pending Confirmation | Stated as: *"All media expenditure on Google Ads, Meta Ads, or third-party networks is billed directly by the platform to the client's corporate payment instrument without hidden agency percentages."* |
| **Software Licensing Model** | **Zero Per-Seat SaaS Fees** | `src/config/services.ts` (App Dev FAQ Q3) | Pending Confirmation | Stated as: *"You own your custom software outright. You only pay for your underlying cloud hosting infrastructure, avoiding expensive SaaS per-seat pricing models."* |

---

## 4. Operational Turnaround & Response SLAs

| Claim / Promise | Stated Value | Exact Site Location | Verification Status | Notes / Context |
| :--- | :--- | :--- | :---: | :--- |
| **Discovery Audit Turnaround SLA** | **<24 business hours** | `src/pages/index.astro`, `src/pages/services/[slug].astro`, `src/pages/terms.astro` (§5), `src/config/site.ts` | Pending Confirmation | Stated as: *"We commit to an initial technical review and growth audit response for submitted business inquiries within 24 business hours."* |
| **Direct Engineering Access** | **Direct Response from Senior Leads** | `src/pages/index.astro` (Engagement SLA) | Pending Confirmation | Stated as: *"Direct response from senior growth engineering leads on incoming architecture reviews."* |

---

## 5. Telemetry, Reporting & Account Reviews

| Claim / Promise | Stated Value | Exact Site Location | Verification Status | Notes / Context |
| :--- | :--- | :--- | :---: | :--- |
| **Client Performance Debriefs** | **Bi-weekly review cadence** | `src/pages/services/[slug].astro` (Telemetry block) | Pending Confirmation | Stated as: *"Evaluated through bi-weekly performance debriefs focused on verified commercial inquiries, call logs, and customer acquisition."* |
| **Audit Delivery Guarantee** | **Free Instant On-Page Audit** | `src/components/islands/Scanner.tsx`, `src/pages/index.astro` | Active (Automated) | Powered by live edge probe (`/api/audit`) and Google PageSpeed Insights API. |

---

## 6. Technical Engineering & Device Support Commitments

| Claim / Promise | Stated Value | Exact Site Location | Verification Status | Notes / Context |
| :--- | :--- | :--- | :---: | :--- |
| **Mobile Viewport Compatibility** | **Down to 320px width** | `src/config/services.ts`, `tests/smoke.spec.js` | Verified by Code / Automated Tests | Tested via Playwright: zero horizontal scroll overflow at 320px and 360px viewport widths. |
| **Zero-JS by Default** | **Pure HTML/CSS static core** | `src/content/blog/core-web-vitals-mobile-india-latency.md`, `README.md` | Verified by Code / Automated Tests | Astro static generation with selective island hydration (`Scanner`, `ContactForm`, `Heatmap`, `Calculator`). |
| **Privacy Compliance** | **Google Consent Mode v2 & DPDP** | `src/layouts/Base.astro`, `src/components/ConsentBanner.astro` | Verified by Code / Automated Tests | All storage denied by default until explicit visitor acceptance. Verified by unit tests. |
