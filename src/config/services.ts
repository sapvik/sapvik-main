/**
 * SAPVIK Services Configuration
 * Single source of truth for navigation, service cards, calculator chips,
 * contact form dropdowns, and schema metadata.
 * Free of hype, buzzwords, and unsubstantiated claims.
 */

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  slug: string;
  shortName: string;
  headline: string;
  description: string;
  deliverables: string[];
  metricsFocus: string;
  iconName: string;
}

export const SERVICES: ServiceItem[] = [
  {
    id: "websites",
    code: "SRV-01",
    name: "Websites Development",
    shortName: "Websites",
    slug: "websites-development",
    headline: "Fast, accessible websites engineered for customer conversion",
    description: "Custom web development built for speed, clean mobile navigation, structured SEO metadata, and clear conversion paths.",
    deliverables: [
      "Custom responsive interface architecture (320px to 4K)",
      "Zero layout shifts and sub-second load times on mobile networks",
      "Integrated contact pipelines with server-side lead delivery",
      "Semantic Schema.org entity metadata and SEO structure"
    ],
    metricsFocus: "Mobile load speed, conversion rate, core web vitals",
    iconName: "globe"
  },
  {
    id: "gmb",
    code: "SRV-02",
    name: "GMB Management",
    shortName: "GMB & Local",
    slug: "gmb-management",
    headline: "Google Business Profile optimization and local visibility",
    description: "Hands-on management for Google Business Profiles, structured local citations, category alignment, and review response workflows.",
    deliverables: [
      "Primary and secondary category audit and alignment",
      "Weekly localized updates and product catalog syndication",
      "Local citation consistency across major Indian directories",
      "Review management workflows and response templates"
    ],
    metricsFocus: "Direct calls, direction requests, search discovery queries",
    iconName: "map-pin"
  },
  {
    id: "media",
    code: "SRV-03",
    name: "Media Management",
    shortName: "Media",
    slug: "media-management",
    headline: "Structured content creation and digital brand media",
    description: "End-to-end content production designed to explain complex services clearly and maintain active presence across relevant channels.",
    deliverables: [
      "Short-form product and service demonstration videos",
      "Educational visual assets and case explainers",
      "Channel distribution strategy and scheduling",
      "High-retention creative formats tailored for mobile feeds"
    ],
    metricsFocus: "Video completion rate, profile visits, qualified engagement",
    iconName: "video"
  },
  {
    id: "promotions",
    code: "SRV-04",
    name: "Digital Promotions",
    shortName: "Paid Ads",
    slug: "digital-promotions",
    headline: "Targeted advertising across Google and Meta with direct tracking",
    description: "Paid acquisition campaigns structured around cost-per-lead, explicit conversion tracking, and transparent ad spend management.",
    deliverables: [
      "Search intent campaigns on Google Ads (Search & Maps)",
      "Targeted audience campaigns across Meta (Instagram & Facebook)",
      "Server-side conversion tracking and event attribution",
      "Weekly performance reporting with verified inquiry numbers"
    ],
    metricsFocus: "Cost per lead (CPL), inquiry volume, attribution accuracy",
    iconName: "trending-up"
  },
  {
    id: "apps",
    code: "SRV-05",
    name: "Application Development",
    shortName: "Applications",
    slug: "application-development",
    headline: "Custom business web applications, customer portals, and internal tools",
    description: "Reliable web applications built to automate repetitive operations, manage client bookings, and streamline commercial workflows.",
    deliverables: [
      "Role-based admin dashboards and internal operational tools",
      "Client onboarding, booking, and quotation portals",
      "Third-party API integrations (CRM, WhatsApp, Payment gateways)",
      "Cloudflare edge functions and serverless data pipelines"
    ],
    metricsFocus: "Workflow operational hours saved, task completion rate, uptime",
    iconName: "cpu"
  },
  {
    id: "branding",
    code: "SRV-06",
    name: "Branding",
    shortName: "Branding",
    slug: "branding",
    headline: "Practical visual identity, typography systems, and brand guidelines",
    description: "Disciplined brand design systems that establish visual consistency across websites, presentations, and marketing collateral.",
    deliverables: [
      "Vector logo mark and responsive lockups",
      "Color palette specifications with contrast validation",
      "Typography pairing rules and hierarchy definitions",
      "Brand asset pack with SVG and print-ready formats"
    ],
    metricsFocus: "Visual consistency, accessibility compliance, asset reusability",
    iconName: "palette"
  }
];

export function getServiceBySlug(slug: string): ServiceItem | undefined {
  return SERVICES.find(s => s.slug === slug || s.id === slug);
}
