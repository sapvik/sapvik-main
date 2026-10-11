/**
 * SAPVIK Site & Brand Configuration
 * Single source of truth for brand identity, contact details, SLAs, and verified address.
 */

export interface SiteConfig {
  brand: {
    name: string;
    legalName: string;
    founder: string;
    founderEmail: string;
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
      linkedin?: string;
      instagram?: string;
      twitter?: string;
    };
    address: string;
    streetAddress: string;
    locality: string;
    region: string;
    postalCode: string;
    country: string;
  };
}

export const SITE: SiteConfig = {
  brand: {
    name: "SAPVIK",
    legalName: "SAPVIK",
    founder: "Anil Raina",
    founderEmail: "anil@sapvik.com",
    tagline: "Sharper digital execution for growing businesses.",
    slogan: "Build. Be Seen. Grow.",
    email: "growth@sapvik.com",
    phone: "+91 95999 28526",
    phoneDisplay: "+91 95999 28526",
    whatsappNumber: "919599928526",
    whatsappText: "Hi SAPVIK team, I'd like to discuss a digital growth audit for my business.",
    slaHours: 24,
    slaStatement: "We review and respond to discovery inquiries within 24 business hours.",
    social: {
      linkedin: "",
      instagram: ""
    },
    address: "Colosseo Ventures, #77, 2nd Cross, Chowdeshwari Temple Rd, HAL Central Township, Marathahalli, Bengaluru, Karnataka 560037",
    streetAddress: "Colosseo Ventures, #77, 2nd Cross, Chowdeshwari Temple Rd, HAL Central Township, Marathahalli",
    locality: "Bengaluru",
    region: "Karnataka",
    postalCode: "560037",
    country: "India"
  }
};
