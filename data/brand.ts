/**
 * VEER ELEGANCE — Brand & Contact Configuration
 *
 * Centralized configuration for:
 *   - Customer care links (valid existing routes only)
 *   - Contact information (concierge email, hours, phone, WhatsApp)
 *   - Social links (only verified URLs)
 *   - Legal and copyright metadata
 *
 * Safe to update here without modifying JSX components.
 */

export interface BrandContactConfig {
  email:          string;
  phone:          string | null;
  whatsapp:       string | null;
  businessHours:  Array<{ days: string; hours: string }>;
  studioCity:     string;
  studioCountry:  string;
}

export interface BrandSocialConfig {
  instagram: string | null;
  facebook:  string | null;
  youtube:   string | null;
  linkedin:  string | null;
}

export interface FooterLinkItem {
  label:  string;
  href:   string;
  badge?: string;
}

export interface BrandFooterConfig {
  careLinks:     FooterLinkItem[];
  exploreLinks:  FooterLinkItem[];
  contact:       BrandContactConfig;
  social:        BrandSocialConfig;
  newsletter: {
    heading:     string;
    subheading:  string;
    placeholder: string;
    note:        string;
  };
  legal: {
    brandName:     string;
    tagline:       string;
    copyrightText: string;
  };
}

export const BRAND_FOOTER_CONFIG: BrandFooterConfig = {
  careLinks: [
    { label: "Track Your Order",    href: "/account" },
    { label: "Our Story",           href: "/about" },
    { label: "Wholesale Enquiries", href: "/about#wholesale-enquiries" },
    { label: "Visit Our Studio",    href: "/about#store-heading" },
    { label: "Customer Account",    href: "/account" },
  ],
  exploreLinks: [
    { label: "All Jewellery",       href: "/shop" },
    { label: "Chains",              href: "/shop/chains" },
    { label: "Earrings",            href: "/shop/earrings" },
    { label: "Bracelets",           href: "/shop/bracelets" },
    { label: "Bangles",             href: "/shop/bangles" },
    { label: "Mystery Box",         href: "/shop/mystery-box" },
    { label: "Gen Z Accessories",   href: "/shop/gen-z-accessories" },
  ],
  contact: {
    email:         "concierge@veerelegance.com",
    phone:         null, // Ready for owner to supply verified contact phone
    whatsapp:      null, // Ready for owner to supply verified WhatsApp number
    businessHours: [
      { days: "Mon – Sat", hours: "11:00 AM – 7:00 PM IST" },
      { days: "Sunday",    hours: "By Private Appointment" },
    ],
    studioCity:    "Mumbai",
    studioCountry: "India",
  },
  social: {
    instagram: null, // Set to verified URL e.g. "https://instagram.com/veerelegance"
    facebook:  null,
    youtube:   null,
    linkedin:  null,
  },
  newsletter: {
    heading:     "Sign Up & Save",
    subheading:  "Receive private previews of new anti-tarnish drops, editorial styling, and exclusive boutique releases.",
    placeholder: "Enter your email address",
    note:        "Subscriptions will be available shortly. We respect your privacy.",
  },
  legal: {
    brandName:     "Veer Elegance",
    tagline:       "Everyday Anti-Tarnish Luxury",
    copyrightText: `© ${new Date().getFullYear()} Veer Elegance. All rights reserved.`,
  },
};
