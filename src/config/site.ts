/**
 * SAPVIK Site & Brand Configuration
 * Single source of truth for brand identity, contact details, SLAs, and social links.
 * Any unconfirmed legal entity or address fields are typed with TODO_ placeholders.
 */

export interface SiteConfig {
  brand: {
    name: string;
    legalName: string;
    tagline: string;
    slogan: string;
    email: string;
    phone: string;
    phoneDisplay: string;
    whatsappNumber: string;
    whatsappText: string;
    slaHours: number;
    slaStatement: string;
    social: {
      linkedin: string;
      instagram: string;
      twitter?: string;
    };
    address: string;
  };
}

export const SITE: SiteConfig = {
  brand: {
    name: "SAPVIK",
    legalName: "TODO_LEGAL_ENTITY_NAME",
    tagline: "Sharper digital execution for growing businesses.",
    slogan: "Build. Be Seen. Grow.",
    email: "growth@sapvik.com",
    phone: "+91 88005 92147",
    phoneDisplay: "+91 88005 92147",
    whatsappNumber: "918800592147",
    whatsappText: "Hi SAPVIK team, I'd like to discuss a digital growth audit for my business.",
    slaHours: 24,
    slaStatement: "We review and respond to discovery inquiries within 24 business hours.",
    social: {
      linkedin: "https://www.linkedin.com/company/sapvik",
      instagram: "https://www.instagram.com/sapviktech"
    },
    address: "TODO_OFFICE_ADDRESS"
  }
};
