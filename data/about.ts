/**
 * VEER ELEGANCE — Brand, Founder & Store Configuration
 *
 * Single source of truth for editorial About page content,
 * founder metadata structure, verified brand philosophy,
 * and physical store configuration.
 *
 * Note on Founder & Store Data:
 * - Content uses only verified brand positioning established in the project.
 * - No fake awards, certificates, founding years, or fictional biographies.
 * - Centralised so the owner can update verified details without touching JSX.
 */

import type { ImageAsset } from "@/data/media";

// ─────────────────────────────────────────────────────────────────────────────
// FOUNDER CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export interface FounderContent {
  name:   string;
  role:   string;
  quote:  string;
  story:  string[];
  /** Optional founder portrait — when null, a refined brand placeholder is rendered */
  image:  ImageAsset | null;
}

export const FOUNDER_CONTENT: FounderContent = {
  name:  "The Founder",
  role:  "Creative Director & Founder",
  quote: "Jewellery should not be reserved for rare occasions. It should be effortless, enduring, and an intimate part of how you move through each day.",
  story: [
    "Veer Elegance was founded on a simple desire: to create jewellery that balances understated luxury with uncompromising everyday resilience. We believe that true refinement lies in the subtleties — the clean weight of a chain, the gentle lustre of warm gold, and pieces crafted to never tarnish.",
    "Every design begins with the philosophy that fine jewellery should be lived in. Designed with meticulous attention to comfort, finish, and endurance, each piece is made to accompany you effortlessly from morning coffee to evening celebrations.",
  ],
  image: null, // Ready for owner to supply image path (e.g., { src: "/images/brand/founder.jpg", alt: "Veer Elegance Founder" })
};

// ─────────────────────────────────────────────────────────────────────────────
// BRAND PHILOSOPHY
// ─────────────────────────────────────────────────────────────────────────────

export interface BrandPrinciple {
  number:      string;
  title:       string;
  description: string;
}

export const BRAND_PHILOSOPHY = {
  eyebrow:  "Why Veer Elegance",
  headline: "Designed to be Lived In.",
  subheading: "Fine jewellery crafted with modern resilience and timeless simplicity.",
  principles: [
    {
      number:      "01",
      title:       "Anti-Tarnish Everyday Wear",
      description: "Crafted to resist the elements, perfume, and daily wear so your jewellery retains its warm, luminous glow season after season.",
    },
    {
      number:      "02",
      title:       "Understated Luxury",
      description: "Subtle silhouettes, quiet confidence, and minimal design designed to complement your personal style rather than overpower it.",
    },
    {
      number:      "03",
      title:       "Effortless Comfort",
      description: "Engineered with featherweight balance and smooth edges, designed for all-day comfort without compromise.",
    },
    {
      number:      "04",
      title:       "Enduring Craftsmanship",
      description: "Every link, clasp, and setting is crafted with precision to deliver enduring beauty that stands the test of time.",
    },
  ] satisfies BrandPrinciple[],
};

// ─────────────────────────────────────────────────────────────────────────────
// PHYSICAL STORE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export interface PhysicalStoreConfig {
  storeName:      string;
  tagline:        string;
  address?:       string | null;
  city?:          string | null;
  state?:         string | null;
  postalCode?:    string | null;
  country?:       string | null;
  phone?:         string | null;
  email?:         string | null;
  businessHours:  Array<{ days: string; hours: string }>;
  /** Real Google Maps URL when configured by owner; null displays clean editorial directions card */
  googleMapsUrl:  string | null;
  appointmentNote: string;
}

export const PHYSICAL_STORE_CONFIG: PhysicalStoreConfig = {
  storeName:      "Veer Elegance Studio",
  tagline:        "Private styling sessions and wholesale consultations by appointment.",
  address:        null, // Ready for owner to supply verified address
  city:           "Mumbai",
  state:          "Maharashtra",
  postalCode:     null,
  country:        "India",
  phone:          null, // Ready for owner to supply verified contact phone
  email:          "concierge@veerelegance.com",
  businessHours: [
    { days: "Monday – Saturday", hours: "11:00 AM – 7:00 PM" },
    { days: "Sunday",            hours: "By Private Appointment" },
  ],
  googleMapsUrl:  null, // Set to Google Maps place link when ready
  appointmentNote: "For wholesale viewings, boutique curation, and private styling sessions, advance appointments are recommended.",
};
