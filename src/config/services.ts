/**
 * SAPVIK Services Configuration
 * Single source of truth for navigation, service cards, calculator chips,
 * contact form dropdowns, and schema metadata.
 * Free of hype, buzzwords, and unsubstantiated claims.
 */

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceMethodologyStep {
  step: string;
  title: string;
  description: string;
}

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  slug: string;
  legacySlugs?: string[];
  shortName: string;
  headline: string;
  metaDescription: string;
  description: string;
  whoItsFor: string[];
  methodology: ServiceMethodologyStep[];
  deliverables: string[];
  metricsFocus: string;
  iconName: string;
  faqs: ServiceFaq[];
}

export const SERVICES: ServiceItem[] = [
  {
    id: "websites",
    code: "SRV-01",
    name: "Website Development",
    shortName: "Websites",
    slug: "website-development",
    legacySlugs: ["websites-development"],
    headline: "High-speed, accessible websites engineered for customer conversion & search rankings",
    metaDescription: "Custom website development in India engineered for speed, high conversion rates, Core Web Vitals compliance, and clean commercial lead generation.",
    description: "Custom web development built for speed, clean mobile navigation, structured SEO metadata, and clear conversion paths. We write maintainable, semantic code that loads rapidly on all mobile networks without bloated page weight or unnecessary third-party scripts.",
    whoItsFor: [
      "Clinics, diagnostic centers, and healthcare providers requiring frictionless patient booking pathways and local credibility.",
      "B2B service providers and industrial manufacturers seeking professional lead generation pipelines with direct inquiry routing.",
      "High-growth regional brands transition from slow template-builder sites to custom, high-speed architectures.",
      "Commercial firms wanting complete administrative source ownership, self-hosting flexibility, and zero vendor lock-in."
    ],
    methodology: [
      {
        step: "01",
        title: "Information Architecture & User Flows",
        description: "We map navigation, conversion checkpoints, and service catalogs based on real customer search behavior and decision journeys."
      },
      {
        step: "02",
        title: "Clean Semantic Frontend Engineering",
        description: "We build lightweight, accessible interfaces optimized for mobile Core Web Vitals, minimal layout shifts, and responsive touch ergonomics."
      },
      {
        step: "03",
        title: "Edge Deployment & Conversion Instrumentation",
        description: "We configure serverless edge delivery, server-side event tracking, and encrypted lead forwarding to WhatsApp, email, or your CRM."
      }
    ],
    deliverables: [
      "Custom responsive interface architecture designed for viewports from 320px to 4K displays",
      "High-speed mobile performance with rigorous Core Web Vitals optimization and minimal Cumulative Layout Shift (CLS)",
      "Serverless contact pipelines with encrypted lead transmission, bot deterrence, and direct executive notifications",
      "Comprehensive Schema.org entity metadata (ProfessionalService, Service, WebPage, BreadcrumbList)",
      "Full administrative repository handover with zero ongoing template platform licensing fees"
    ],
    metricsFocus: "Mobile load speed, inquiry conversion rate, Core Web Vitals scores",
    iconName: "globe",
    faqs: [
      {
        question: "How long does a custom website development project typically take?",
        answer: "Most production websites are planned, built, tested, and deployed within 2 to 4 weeks, depending on catalog complexity and custom integration requirements. We provide weekly visual progress previews and adhere to strict milestone turnaround commitments."
      },
      {
        question: "Do you build on proprietary site builders like Wix or WordPress?",
        answer: "We primarily engineer custom static and edge-rendered web platforms using modern web standards (such as Astro and clean semantic HTML/CSS). This prevents security vulnerabilities, eliminates plugin update breakdowns, and ensures fast mobile page load speeds that typical template builders cannot match."
      },
      {
        question: "Who owns the domain name, hosting accounts, and code repository?",
        answer: "You retain 100% administrative ownership of your domain DNS, hosting accounts, analytics, and codebase. We deploy directly to your Cloudflare or preferred cloud infrastructure. Zero vendor lock-in, ever."
      },
      {
        question: "Will our website be optimized for mobile phone visitors across India?",
        answer: "Yes. Every component is specifically tested on mobile viewports down to 320px width on variable 4G mobile networks. Interactive buttons, tap targets, and navigation drawers are calibrated for effortless one-handed thumb interaction."
      },
      {
        question: "How is lead and inquiry data captured from forms?",
        answer: "Inquiries submitted through your website forms are validated server-side, checked for bot spam via Cloudflare Turnstile, and instantly routed to your chosen WhatsApp numbers, team email addresses, or CRM endpoints over secure TLS connections."
      }
    ]
  },
  {
    id: "gmb",
    code: "SRV-02",
    name: "Google Business Profile Management",
    shortName: "Google Business Profile",
    slug: "google-business-profile-management",
    legacySlugs: ["gmb-management"],
    headline: "Google Business Profile optimization, local 3-Pack rankings, and geo-targeted discovery",
    metaDescription: "Professional Google Business Profile management in India. Dominate local Maps 3-Pack rankings, boost incoming phone calls, and manage customer reviews.",
    description: "Hands-on management for Google Business Profiles, structured local citations, category alignment, spam fighting, geo-grid rankings, and review response workflows. We systematically position your storefront or practice into the top Google Maps 3-Pack for high-intent nearby searches.",
    whoItsFor: [
      "Medical clinics, specialty hospitals, dental centers, and diagnostic labs where proximity directly dictates patient visits.",
      "Professional service firms (lawyers, chartered accountants, consultants) seeking dominant local authority.",
      "Retail showrooms, boutique stores, and service workshops looking to maximize direct driving directions and telephone calls.",
      "Multi-location regional businesses that need synchronized citation accuracy and active profile management across branches."
    ],
    methodology: [
      {
        step: "01",
        title: "Audit & Entity Alignment",
        description: "We audit primary and secondary categories, service attributes, opening hours, geo-coordinates, and existing NAP citations."
      },
      {
        step: "02",
        title: "Optimization & Geo-Signal Expansion",
        description: "We configure localized service menus, descriptive product cards, high-resolution geotagged imagery, and structured weekly localized updates."
      },
      {
        step: "03",
        title: "Active Review Workflows & Proximity Defense",
        description: "We establish ethical review acquisition protocols, handle prompt professional review responses, and monitor competitor spam."
      }
    ],
    deliverables: [
      "Comprehensive Google Business Profile audit and primary/secondary category alignment",
      "Weekly localized post updates, service catalog syndication, and high-resolution photo uploads",
      "Structured local citation audit and cleanup across major Indian directories and mapping platforms",
      "Ethical customer review acquisition workflows, staff guidance, and templated professional responses",
      "Monthly geo-grid ranking telemetry tracking keyword visibility radius across your city"
    ],
    metricsFocus: "Inbound phone calls, Google Maps direction requests, local search discovery queries",
    iconName: "map-pin",
    faqs: [
      {
        question: "How long does it take to see rank improvements on Google Maps?",
        answer: "Initial improvements in category relevance and discovery impressions typically occur within 3 to 6 weeks. Expanding ranking radius across a wider geographic radius (moving from rank 10+ into the top 3-Pack across neighboring suburbs) generally takes 60 to 90 days of consistent optimization."
      },
      {
        question: "Can you help recover a suspended or disabled Google Business Profile?",
        answer: "Yes. We analyze the root cause of the suspension (such as address discrepancies, category mismatches, or naming violations), align documentation with Google guidelines, and prepare reinstatement appeals."
      },
      {
        question: "Do you buy or generate fake reviews for our profile?",
        answer: "Never. Fake reviews violate Google Business Profile policies and risk immediate profile suspension. Instead, we implement compliant, high-converting review generation workflows that make it effortless for your genuine satisfied clients to leave authentic reviews."
      },
      {
        question: "What is geo-grid ranking tracking?",
        answer: "Geo-grid tracking measures your Google Maps ranking from dozens of specific GPS coordinate points across your city. This reveals exactly how far your visibility extends and highlights neighborhoods where competitor optimization is needed."
      },
      {
        question: "Why is primary category selection so critical on Google Business Profile?",
        answer: "Primary category carries the single highest algorithmic weight for local search rankings. Selecting the wrong primary category can diminish your search visibility for core customer queries, regardless of other optimization efforts."
      }
    ]
  },
  {
    id: "seo",
    code: "SRV-03",
    name: "Search Engine Optimization (SEO)",
    shortName: "SEO",
    slug: "search-engine-optimization",
    legacySlugs: ["seo"],
    headline: "High-intent organic search engine optimization engineered for sustainable customer acquisition",
    metaDescription: "Data-driven SEO services in India. Technical SEO audits, commercial keyword ranking, entity optimization, and high-authority backlinks for lasting organic growth.",
    description: "Systematic technical, on-page, and semantic entity SEO designed to capture commercial search volume across India and global markets. We focus on search intent that drives paying clients and qualified business inquiries, not vanity rankings for low-intent keywords.",
    whoItsFor: [
      "B2B service providers, industrial manufacturers, and consultants targeting high-value corporate inquiries.",
      "Healthcare institutions, clinics, and medical practices wanting long-term organic authority for treatment and diagnostic terms.",
      "Regional and pan-India commercial companies looking to reduce long-term reliance on expensive paid ad auctions.",
      "Websites suffering from past algorithmic penalties, poor crawl budgets, or slow Core Web Vitals performance."
    ],
    methodology: [
      {
        step: "01",
        title: "Technical Health & Entity Architecture",
        description: "We resolve crawl indexation barriers, optimize Core Web Vitals, implement semantic Schema.org entities, and clean up duplicate URLs."
      },
      {
        step: "02",
        title: "Commercial Keyword & Intent Mapping",
        description: "We map high-intent search queries directly to dedicated service landing pages and structured educational pillar articles."
      },
      {
        step: "03",
        title: "Authority Building & Content Expansion",
        description: "We build authoritative editorial backlinks, expand topical cluster depth, and monitor rankings through Google Search Console."
      }
    ],
    deliverables: [
      "Comprehensive technical SEO audit covering crawl efficiency, indexation, site structure, and mobile speed",
      "Targeted commercial keyword research mapped to buyer intent stages and local Indian search behavior",
      "On-page optimization including semantic heading hierarchies, metadata, internal linking, and content enhancement",
      "Advanced Schema.org structured data deployment (Organization, Service, FAQPage, BreadcrumbList)",
      "Monthly transparent reporting highlighting non-branded organic impressions, clicks, keyword rankings, and organic conversions"
    ],
    metricsFocus: "Organic qualified impressions, non-branded search clicks, organic inquiry conversions",
    iconName: "search",
    faqs: [
      {
        question: "How long does organic SEO take to deliver measurable business returns?",
        answer: "Technical fixes and on-page improvements often show initial crawl and impression gains within 30 to 45 days. Substantial ranking advancements for competitive commercial keywords typically mature between months 3 and 6 as search engines establish topical authority."
      },
      {
        question: "What is the difference between local SEO and national SEO?",
        answer: "Local SEO focuses on proximity searches and the Google Maps 3-Pack for queries like 'near me' or within a specific city. National SEO targets organic search results across broader geographic regions without proximity restrictions, requiring deeper topical depth and high domain authority."
      },
      {
        question: "Do you guarantee #1 rankings on Google?",
        answer: "No ethical SEO specialist guarantees #1 rankings, as Google's algorithms change constantly and competitors also optimize. What we do guarantee is meticulous technical standards, white-hat execution, transparent tracking, and measurable organic inquiry growth."
      },
      {
        question: "How do you choose which keywords to target?",
        answer: "We focus on high-intent commercial keywords where searchers demonstrate clear purchasing or appointment intent, rather than broad educational queries that generate high traffic volume but zero inquiries."
      },
      {
        question: "Do you provide transparent monthly reporting?",
        answer: "Yes. Every month you receive a clear telemetry report based directly on verified Google Search Console data, detailing non-branded click trends, keyword positions, and inbound inquiries."
      }
    ]
  },
  {
    id: "promotions",
    code: "SRV-04",
    name: "Google Ads & Meta Ads",
    shortName: "Google & Meta Ads",
    slug: "google-ads-meta-ads",
    legacySlugs: ["digital-promotions"],
    headline: "High-intent paid search and targeted social ad campaigns with verified attribution",
    metaDescription: "Performance-focused Google Ads and Meta Ads management in India. Direct platform billing, verified cost-per-lead tracking, and client-owned ad accounts.",
    description: "Paid acquisition campaigns structured around cost-per-lead, explicit conversion tracking, client-held ad accounts, and direct platform billing. We build search intent campaigns on Google and targeted creative funnels across Instagram and Facebook with rigorous attribution.",
    whoItsFor: [
      "Businesses seeking immediate, scalable customer inquiries while longer-term organic channels ramp up.",
      "Companies with established sales operations capable of converting qualified commercial inquiries into closed deals.",
      "Brands frustrated by agency percentage markups on ad spend, opaque reporting, or inaccessible ad accounts.",
      "Organizations launching new locations, high-ticket services, or seasonal promotional drives."
    ],
    methodology: [
      {
        step: "01",
        title: "Account Structure & Tracking Infrastructure",
        description: "We configure server-side conversion tracking (Google Enhanced Conversions, Meta Conversions API), UTM taxonomies, and negative keyword lists."
      },
      {
        step: "02",
        title: "Targeting & High-Intent Creative",
        description: "We craft targeted search ad copy, localized ad extensions, and mobile-first visual creatives tailored to your ideal customer profile."
      },
      {
        step: "03",
        title: "Daily Optimization & Bid Governance",
        description: "We monitor search term reports, adjust demographic bids, prune wasteful search queries, and scale high-performing ad sets."
      }
    ],
    deliverables: [
      "High-intent search campaigns on Google Ads (Search, Call-Only, and Local Service ads)",
      "Demographic and interest-targeted audience funnels across Meta (Instagram & Facebook)",
      "Full server-side conversion tracking setup with GA4 and Conversions API (CAPI) event verification",
      "Weekly negative keyword maintenance to eliminate wasted ad spend on irrelevant search traffic",
      "Direct platform invoicing: ad spend is paid directly to Google and Meta with zero agency percentage surcharge"
    ],
    metricsFocus: "Cost per lead (CPL), verified inquiry volume, customer acquisition cost (CAC)",
    iconName: "trending-up",
    faqs: [
      {
        question: "How does billing work for our advertising spend?",
        answer: "You pay ad spend directly to Google and Meta using your own company credit card or billing account. We charge a transparent, fixed management fee. We never take a percentage cut of your ad spend or mark up advertising costs."
      },
      {
        question: "Do we retain ownership of the advertising accounts?",
        answer: "Yes, 100%. All campaigns, pixel data, custom audiences, and historical conversion data are built inside your own Google Ads and Meta Business Manager accounts. You retain full administrative access at all times."
      },
      {
        question: "What minimum monthly advertising budget do you recommend?",
        answer: "For local city campaigns, we generally recommend starting with an ad spend of ₹25,000 to ₹50,000 per month to gather sufficient conversion data and achieve statistical significance. For multi-city or national campaigns, budgets scale accordingly."
      },
      {
        question: "How do you prevent junk leads and spam submissions?",
        answer: "We implement negative keyword exclusions, disable broad audience networks, add qualifying questions on landing page forms, and deploy bot deterrence measures like Cloudflare Turnstile."
      },
      {
        question: "Can we track phone calls generated from ads?",
        answer: "Yes. We configure Google call tracking extensions and dynamic call forwarding to record call duration, timestamp, and source keyword attribution directly in your reporting dashboard."
      }
    ]
  },
  {
    id: "media",
    code: "SRV-05",
    name: "Social Media Management",
    shortName: "Social Media",
    slug: "social-media-management",
    legacySlugs: ["media-management"],
    headline: "Structured commercial content production and organic brand distribution across digital channels",
    metaDescription: "Professional social media management in India. Short-form video production, educational visual explainers, content scheduling, and commercial brand trust.",
    description: "End-to-end social media management designed to build authority, explain complex services clearly, and turn social attention into commercial trust. We focus on structured short-form video, case explainers, and consistent channel scheduling without low-effort fluff.",
    whoItsFor: [
      "Founders, medical specialists, and executives seeking to build respected thought leadership in their industry.",
      "Consumer and lifestyle businesses that require consistent, high-standard visual presence on Instagram and LinkedIn.",
      "Service firms needing short-form educational video assets to simplify complex offerings for prospective buyers.",
      "Organizations wanting an organized monthly content production cadence without hiring an in-house media team."
    ],
    methodology: [
      {
        step: "01",
        title: "Content Strategy & Narrative Pillars",
        description: "We define core commercial themes, audience questions, visual guidelines, and an editorial calendar aligned with your business goals."
      },
      {
        step: "02",
        title: "Asset Production & Video Editing",
        description: "We produce scripted short-form videos, carousels, customer case explainers, and high-retention graphics tailored for mobile feeds."
      },
      {
        step: "03",
        title: "Syndication & Community Engagement",
        description: "We schedule distribution at optimal engagement windows, manage message triage, and track qualified profile visits."
      }
    ],
    deliverables: [
      "Monthly editorial calendar with scripted content themes and commercial talking points",
      "Short-form product and service explainer videos formatted for Instagram Reels, YouTube Shorts, and LinkedIn",
      "Educational visual carousels, infographics, and customer milestone announcements",
      "Multi-channel scheduling and publishing across LinkedIn, Instagram, and Facebook",
      "Monthly engagement telemetry detailing video retention, audience reach, and profile click-throughs"
    ],
    metricsFocus: "Video completion rate, profile visits, qualified commercial engagement",
    iconName: "video",
    faqs: [
      {
        question: "Do we need to be on camera for video content?",
        answer: "Having founders or specialists on camera builds the highest trust, and we provide simple scripts and remote recording guidance. However, we also produce high-retention motion graphic explainers and case study videos that do not require live on-camera appearances."
      },
      {
        question: "Which social media platforms do you manage?",
        answer: "We focus on channels with proven commercial value for your specific industry—primarily LinkedIn for B2B and professional services, and Instagram and YouTube Shorts for consumer, healthcare, and retail brands."
      },
      {
        question: "Do we get to approve posts before they go live?",
        answer: "Yes. Every post, caption, video, and graphic is uploaded to a shared editorial board for your review and approval well before the scheduled publishing date."
      },
      {
        question: "How does social media management drive commercial inquiries?",
        answer: "Prospects who discover you via Google Ads or organic search frequently check your social media profiles to verify credibility before contacting you. An active, professional social presence converts warm search traffic into confident inquiries."
      },
      {
        question: "Who handles customer inquiries and comments on our social channels?",
        answer: "We monitor post comments and direct message notifications, responding promptly to basic inquiries using approved brand guidelines, and routing qualified sales inquiries directly to your team."
      }
    ]
  },
  {
    id: "apps",
    code: "SRV-06",
    name: "Application Development",
    shortName: "Applications",
    slug: "application-development",
    headline: "Custom business web applications, customer portals, and internal operational tools",
    metaDescription: "Custom web application development in India. Client portals, internal operational tools, CRM integrations, and resilient edge architecture.",
    description: "Reliable, modern web applications built to automate repetitive operations, manage client bookings, generate custom quotations, and streamline commercial workflows. We build fast, secure software tailored to your exact business logic with complete client IP ownership.",
    whoItsFor: [
      "Businesses outgrowing messy spreadsheets and off-the-shelf software with expensive per-seat subscription models.",
      "Service providers needing custom customer onboarding, appointment booking, or document collection portals.",
      "Companies requiring automated two-way integrations between internal databases, WhatsApp APIs, and payment gateways.",
      "Organizations demanding enterprise-grade edge security, role-based access control, and complete code ownership."
    ],
    methodology: [
      {
        step: "01",
        title: "Workflow Mapping & Architecture Design",
        description: "We document existing manual friction points, database entities, access permissions, and edge API architectures."
      },
      {
        step: "02",
        title: "Sprint-Based Development & Prototype Reviews",
        description: "We build responsive, type-safe web interfaces backed by resilient serverless edge functions and relational databases."
      },
      {
        step: "03",
        title: "Security Auditing, Integration & Deployment",
        description: "We test authentication protocols, integrate external APIs (payment, messaging), and deploy with continuous edge monitoring."
      }
    ],
    deliverables: [
      "Role-based administrative dashboards and internal staff workflow tools",
      "Client onboarding, quotation generation, and document submission portals",
      "Third-party API integrations (Payment gateways, WhatsApp Business API, CRM systems)",
      "Cloudflare Workers and serverless relational database infrastructure with automatic backups",
      "Complete source code repository handover, automated test suites, and technical documentation"
    ],
    metricsFocus: "Operational hours saved, task completion rate, platform uptime",
    iconName: "cpu",
    faqs: [
      {
        question: "What technology stack do you use for web applications?",
        answer: "We engineer resilient, modern applications using TypeScript, React, Astro, Node.js, and serverless edge databases (such as Cloudflare D1/KV or PostgreSQL). This architecture delivers high speed, low running costs, and enterprise-grade reliability."
      },
      {
        question: "How do you protect sensitive company and customer data?",
        answer: "We implement strict encryption in transit (TLS 1.3) and at rest, role-based access control (RBAC), constant-time authentication checks, edge rate-limiting, and sanitized database queries to prevent injection attacks."
      },
      {
        question: "Can the application integrate with our existing CRM or accounting tools?",
        answer: "Yes. We build custom API connectors to synchronize data seamlessly with systems like Zoho, Salesforce, Google Workspace, WhatsApp Business API, Razorpay, or custom legacy databases."
      },
      {
        question: "Do you charge ongoing per-user monthly software licensing fees?",
        answer: "No. You own your custom software outright. You only pay for your underlying cloud hosting infrastructure (which is often extremely cost-effective on modern serverless edge tiers), avoiding expensive SaaS per-seat pricing models."
      },
      {
        question: "Do you provide post-launch maintenance and technical support?",
        answer: "Yes. Every application deployment includes post-launch operational support, security patching, uptime monitoring, and optional ongoing feature development retainers."
      }
    ]
  },
  {
    id: "branding",
    code: "SRV-07",
    name: "Brand Identity & Strategy",
    shortName: "Brand Identity",
    slug: "branding",
    headline: "Disciplined visual identity systems, typography guidelines, and commercial brand standards",
    metaDescription: "Strategic brand identity design in India. Vector logos, color palettes, typography hierarchy, and comprehensive brand guidelines for ambitious businesses.",
    description: "Disciplined brand design systems that establish visual consistency across websites, presentations, marketing collateral, and digital communications. We create timeless visual identities that convey immediate commercial credibility, market authority, and lasting customer recall.",
    whoItsFor: [
      "Emerging enterprises upgrading from generic, amateur visual branding to a credible market-leading identity.",
      "Established businesses launching new divisions, product lines, or specialty services requiring cohesive brand architecture.",
      "Organizations planning a major digital transformation that demands modern, accessible visual standards.",
      "Companies wanting a structured design system with reusable digital assets for in-house teams and external vendors."
    ],
    methodology: [
      {
        step: "01",
        title: "Market Positioning & Core Identity Pillars",
        description: "We clarify your brand purpose, competitive differentiation, audience expectations, and core personality attributes."
      },
      {
        step: "02",
        title: "Visual System & Design Architecture",
        description: "We design vector mark options, validate color contrast ratios, pair typography systems, and draft usage rules."
      },
      {
        step: "03",
        title: "Asset Kit Production & Brand Guidelines",
        description: "We deliver vector production files, responsive logo lockups, digital social templates, and a comprehensive brand book."
      }
    ],
    deliverables: [
      "Vector master logo marks with responsive lockups (horizontal, stacked, icon-only, dark/light variations)",
      "Curated color palette with strict WCAG accessibility contrast ratios and HEX/RGB/CMYK specifications",
      "Typography pairing specifications with web font licensing guidance and hierarchy rules",
      "Comprehensive digital brand guidelines manual covering clear space, misuse rules, and layout principles",
      "Ready-to-use digital asset kit (SVG, high-res PNG, favicon set, email signatures, letterhead templates)"
    ],
    metricsFocus: "Visual consistency, design token reusability, brand recognition",
    iconName: "palette",
    faqs: [
      {
        question: "What files do we receive upon brand identity completion?",
        answer: "You receive a complete master brand package containing vector files (.SVG, .AI, .EPS), high-resolution transparent PNGs, web-optimized assets, complete favicon packs, and a comprehensive PDF Brand Guidelines manual."
      },
      {
        question: "How many design concepts do you present?",
        answer: "We typically present 2 to 3 thoroughly developed, strategically distinct identity systems—complete with real-world applications (website headers, business cards, social media profiles)—rather than a dozen superficial sketches."
      },
      {
        question: "How long does a brand identity project take?",
        answer: "A complete brand identity and guideline project typically takes 2 to 3 weeks from initial positioning discovery to final asset pack delivery."
      },
      {
        question: "Are the color palettes and typography tested for web accessibility?",
        answer: "Yes. Every color pairing is validated against WCAG 2.1 AA/AAA contrast guidelines to ensure high readability on all digital screens and compliant accessibility standards."
      },
      {
        question: "Can you design matching marketing collateral and pitch decks?",
        answer: "Yes. Once your core brand identity is finalized, we can produce matching digital letterheads, presentation slide templates, social media kits, and corporate brochures."
      }
    ]
  }
];

export function getServiceBySlug(slug: string): ServiceItem | undefined {
  return SERVICES.find(s => s.slug === slug || s.id === slug || (s.legacySlugs && s.legacySlugs.includes(slug)));
}
