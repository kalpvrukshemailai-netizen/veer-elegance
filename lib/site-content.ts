/**
 * VEER ELEGANCE — Centralized Site Content Management (Mini CMS Data Layer)
 *
 * Provides safe, structured access to public.site_content with
 * non-breaking fallback defaults.
 *
 * Rules:
 *   - Customer pages NEVER break or show empty content if DB row is missing/empty/malformed.
 *   - Stored values merge seamlessly over defaults.
 *   - Safe for Server Components and Route Handlers.
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { FOUNDER_CONTENT, BRAND_PHILOSOPHY, PHYSICAL_STORE_CONFIG } from "@/data/about";
import { BRAND_FOOTER_CONFIG } from "@/data/brand";
import { type ShippingConfig, DEFAULT_SHIPPING_CONFIG } from "@/lib/shipping";

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CONTENT INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface AboutContent {
  aboutEyebrow: string;
  aboutTitle:   string;
  aboutIntro:   string;
}

export interface FounderContentModel {
  founderEyebrow:  string;
  founderName:     string;
  founderRole:     string;
  founderQuote:    string;
  founderStory:    string; // Multi-paragraph string
  founderImageUrl: string;
}

export interface PhilosophyContent {
  philosophyEyebrow:     string;
  philosophyTitle:       string;
  philosophyBody:        string;
  philosophyPoint1Title: string;
  philosophyPoint1Body:  string;
  philosophyPoint2Title: string;
  philosophyPoint2Body:  string;
  philosophyPoint3Title: string;
  philosophyPoint3Body:  string;
  philosophyPoint4Title: string;
  philosophyPoint4Body:  string;
}

export interface WholesaleContent {
  wholesaleEyebrow:     string;
  wholesaleTitle:       string;
  wholesaleDescription: string;
  wholesaleButtonLabel: string;
}

export interface StoreContent {
  storeEyebrow:        string;
  storeTitle:          string;
  storeName:           string;
  storeAddress:        string;
  storeCity:           string;
  storeState:          string;
  storePostalCode:     string;
  storeCountry:        string;
  storePhone:          string;
  storeEmail:          string;
  storeBusinessHours:  string;
  storeGoogleMapsUrl:  string;
  storeCtaLabel:       string;
  storeAppointmentNote:string;
}

export interface FooterContent {
  footerCareTitle:            string;
  footerContactTitle:         string;
  footerNewsletterTitle:      string;
  footerNewsletterDescription:string;
}

export interface ContactContent {
  contactPhone:         string;
  contactWhatsApp:      string;
  contactEmail:         string;
  contactBusinessHours: string;
}

export interface SocialContent {
  instagramUrl: string;
  facebookUrl:  string;
  youtubeUrl:   string;
  linkedinUrl:  string;
}

export interface NewsletterContent {
  newsletterTitle:       string;
  newsletterDescription: string;
  newsletterPlaceholder: string;
  newsletterButtonLabel: string;
}

export type DisplayTargetKey =
  | "all"
  | "home"
  | "shop"
  | "collections"
  | "categories"
  | "search"
  | "products"
  | "cart"
  | "checkout"
  | "account"
  | "custom";

export interface AnnouncementContent {
  enabled:         boolean;
  text:            string;
  backgroundColor: string;
  textColor:       string;
  accentColor:     string;
  displayTargets:  DisplayTargetKey[];
  customUrls:      string[];
}

export interface PopupContent {
  enabled:     boolean;
  imageUrl:    string;
  redirectUrl: string;
}

export interface SiteContentBundle {
  about:        AboutContent;
  founder:      FounderContentModel;
  philosophy:   PhilosophyContent;
  wholesale:    WholesaleContent;
  store:        StoreContent;
  footer:       FooterContent;
  contact:      ContactContent;
  social:       SocialContent;
  newsletter:   NewsletterContent;
  shipping:     ShippingConfig;
  announcement: AnnouncementContent;
  popup:        PopupContent;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT FALLBACKS (Guaranteed Safe Baseline)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  aboutEyebrow: "Our Story",
  aboutTitle:   "Veer Elegance",
  aboutIntro:
    "Born from an appreciation for understated luxury and modern Indian craftsmanship, Veer Elegance creates timeless jewellery meant to be lived in. Each piece is crafted from anti-tarnish, water-resistant stainless steel and finished in enduring warm gold — designed for everyday elegance without compromise.",
};

export const DEFAULT_FOUNDER_CONTENT: FounderContentModel = {
  founderEyebrow:  "Behind The Craft",
  founderName:     FOUNDER_CONTENT.name,
  founderRole:     FOUNDER_CONTENT.role,
  founderQuote:    FOUNDER_CONTENT.quote,
  founderStory:    FOUNDER_CONTENT.story.join("\n\n"),
  founderImageUrl: FOUNDER_CONTENT.image?.src ?? "",
};

export const DEFAULT_PHILOSOPHY_CONTENT: PhilosophyContent = {
  philosophyEyebrow:     BRAND_PHILOSOPHY.eyebrow,
  philosophyTitle:       BRAND_PHILOSOPHY.headline,
  philosophyBody:        BRAND_PHILOSOPHY.subheading,
  philosophyPoint1Title: BRAND_PHILOSOPHY.principles[0]?.title ?? "Anti-Tarnish Everyday Wear",
  philosophyPoint1Body:  BRAND_PHILOSOPHY.principles[0]?.description ?? "",
  philosophyPoint2Title: BRAND_PHILOSOPHY.principles[1]?.title ?? "Understated Luxury",
  philosophyPoint2Body:  BRAND_PHILOSOPHY.principles[1]?.description ?? "",
  philosophyPoint3Title: BRAND_PHILOSOPHY.principles[2]?.title ?? "Effortless Comfort",
  philosophyPoint3Body:  BRAND_PHILOSOPHY.principles[2]?.description ?? "",
  philosophyPoint4Title: BRAND_PHILOSOPHY.principles[3]?.title ?? "Enduring Craftsmanship",
  philosophyPoint4Body:  BRAND_PHILOSOPHY.principles[3]?.description ?? "",
};

export const DEFAULT_WHOLESALE_CONTENT: WholesaleContent = {
  wholesaleEyebrow:     "B2B & Partnerships",
  wholesaleTitle:       "Wholesale & Bulk Enquiries",
  wholesaleDescription:
    "We partner with discerning boutiques, multi-brand retailers, and corporate gifting clients across India and internationally. Connect with our partnership concierge below.",
  wholesaleButtonLabel: "Submit Business Enquiry",
};

export const DEFAULT_STORE_CONTENT: StoreContent = {
  storeEyebrow:         "Studio & Physical Presence",
  storeTitle:           "Visit Our Flagship Studio",
  storeName:            PHYSICAL_STORE_CONFIG.storeName,
  storeAddress:         PHYSICAL_STORE_CONFIG.address ?? "",
  storeCity:            PHYSICAL_STORE_CONFIG.city ?? "Mumbai",
  storeState:           PHYSICAL_STORE_CONFIG.state ?? "Maharashtra",
  storePostalCode:      PHYSICAL_STORE_CONFIG.postalCode ?? "",
  storeCountry:         PHYSICAL_STORE_CONFIG.country ?? "India",
  storePhone:           PHYSICAL_STORE_CONFIG.phone ?? "",
  storeEmail:           PHYSICAL_STORE_CONFIG.email ?? "concierge@veerelegance.com",
  storeBusinessHours:   PHYSICAL_STORE_CONFIG.businessHours.map((h) => `${h.days}: ${h.hours}`).join("\n"),
  storeGoogleMapsUrl:   PHYSICAL_STORE_CONFIG.googleMapsUrl ?? "",
  storeCtaLabel:        "Get Directions →",
  storeAppointmentNote: PHYSICAL_STORE_CONFIG.appointmentNote,
};

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  footerCareTitle:            "Care & Services",
  footerContactTitle:         "Contact & Studio",
  footerNewsletterTitle:      BRAND_FOOTER_CONFIG.newsletter.heading,
  footerNewsletterDescription:BRAND_FOOTER_CONFIG.newsletter.subheading,
};

export const DEFAULT_CONTACT_CONTENT: ContactContent = {
  contactPhone:         BRAND_FOOTER_CONFIG.contact.phone ?? "",
  contactWhatsApp:      BRAND_FOOTER_CONFIG.contact.whatsapp ?? "",
  contactEmail:         BRAND_FOOTER_CONFIG.contact.email,
  contactBusinessHours: BRAND_FOOTER_CONFIG.contact.businessHours.map((h) => `${h.days}: ${h.hours}`).join("\n"),
};

export const DEFAULT_SOCIAL_CONTENT: SocialContent = {
  instagramUrl: BRAND_FOOTER_CONFIG.social.instagram ?? "",
  facebookUrl:  BRAND_FOOTER_CONFIG.social.facebook ?? "",
  youtubeUrl:   BRAND_FOOTER_CONFIG.social.youtube ?? "",
  linkedinUrl:  BRAND_FOOTER_CONFIG.social.linkedin ?? "",
};

export const DEFAULT_NEWSLETTER_CONTENT: NewsletterContent = {
  newsletterTitle:       BRAND_FOOTER_CONFIG.newsletter.heading,
  newsletterDescription: BRAND_FOOTER_CONFIG.newsletter.subheading,
  newsletterPlaceholder: BRAND_FOOTER_CONFIG.newsletter.placeholder,
  newsletterButtonLabel: "Join",
};

export const DEFAULT_ANNOUNCEMENT_CONTENT: AnnouncementContent = {
  enabled:         false,
  text:            "✨ Festive Elegance: Enjoy 15% off with code VEER15 • Free delivery on orders over ₹1,499 • 100% Anti-Tarnish Stainless Steel",
  backgroundColor: "#2C1810",
  textColor:       "#FAF8F5",
  accentColor:     "#B89A68",
  displayTargets:  ["all"],
  customUrls:      [],
};

export const DEFAULT_POPUP_CONTENT: PopupContent = {
  enabled:     false,
  imageUrl:    "",
  redirectUrl: "/shop",
};

export const DEFAULT_SITE_CONTENT: SiteContentBundle = {
  about:        DEFAULT_ABOUT_CONTENT,
  founder:      DEFAULT_FOUNDER_CONTENT,
  philosophy:   DEFAULT_PHILOSOPHY_CONTENT,
  wholesale:    DEFAULT_WHOLESALE_CONTENT,
  store:        DEFAULT_STORE_CONTENT,
  footer:       DEFAULT_FOOTER_CONTENT,
  contact:      DEFAULT_CONTACT_CONTENT,
  social:       DEFAULT_SOCIAL_CONTENT,
  newsletter:   DEFAULT_NEWSLETTER_CONTENT,
  shipping:     DEFAULT_SHIPPING_CONFIG,
  announcement: DEFAULT_ANNOUNCEMENT_CONTENT,
  popup:        DEFAULT_POPUP_CONTENT,
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA ACCESS & MERGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads all site content from public.site_content, merging safely over defaults.
 * Guarantees a fully-populated SiteContentBundle even if DB is unavailable.
 */
export async function getAllSiteContent(): Promise<SiteContentBundle> {
  const result: SiteContentBundle = {
    about:        { ...DEFAULT_ABOUT_CONTENT },
    founder:      { ...DEFAULT_FOUNDER_CONTENT },
    philosophy:   { ...DEFAULT_PHILOSOPHY_CONTENT },
    wholesale:    { ...DEFAULT_WHOLESALE_CONTENT },
    store:        { ...DEFAULT_STORE_CONTENT },
    footer:       { ...DEFAULT_FOOTER_CONTENT },
    contact:      { ...DEFAULT_CONTACT_CONTENT },
    social:       { ...DEFAULT_SOCIAL_CONTENT },
    newsletter:   { ...DEFAULT_NEWSLETTER_CONTENT },
    shipping:     { ...DEFAULT_SHIPPING_CONFIG },
    announcement: { ...DEFAULT_ANNOUNCEMENT_CONTENT },
    popup:        { ...DEFAULT_POPUP_CONTENT },
  };

  try {
    const supabase = getPublicClient() ?? (await createServerClient());
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value");

    if (error || !data) {
      return result;
    }

    for (const row of data) {
      const key = row.key as keyof SiteContentBundle;
      if (key in result && row.value && typeof row.value === "object") {
        // Merge stored fields over default fields
        const sectionDefaults = DEFAULT_SITE_CONTENT[key];
        const merged: Record<string, unknown> = { ...(sectionDefaults as unknown as Record<string, unknown>) };
        for (const [field, val] of Object.entries(row.value as Record<string, unknown>)) {
          if (val !== undefined && val !== null) {
            merged[field] = val;
          }
        }
        (result as unknown as Record<string, unknown>)[key] = merged;
      }
    }
  } catch {
    // Non-blocking fallback to default content
  }

  return result;
}

/**
 * Loads a single section's content with non-breaking fallback.
 */
export async function getSiteSectionContent<K extends keyof SiteContentBundle>(
  sectionKey: K,
): Promise<SiteContentBundle[K]> {
  const fallback = DEFAULT_SITE_CONTENT[sectionKey];

  try {
    const supabase = getPublicClient() ?? (await createServerClient());
    const { data, error } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", sectionKey)
      .single();

    if (error || !data || !data.value || typeof data.value !== "object") {
      return fallback;
    }

    const merged: Record<string, unknown> = { ...(fallback as unknown as Record<string, unknown>) };
    for (const [field, val] of Object.entries(data.value as Record<string, unknown>)) {
      if (val !== undefined && val !== null) {
        merged[field] = val;
      }
    }
    return merged as unknown as SiteContentBundle[K];
  } catch {
    return fallback;
  }
}

/**
 * Saves a content section in public.site_content.
 */
export async function updateSiteSectionContent<K extends keyof SiteContentBundle>(
  sectionKey: K,
  value: Partial<SiteContentBundle[K]>,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();

    // 1. Fetch current value to merge cleanly
    const { data: existing } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", sectionKey)
      .single();

    const baseVal = (existing?.value && typeof existing.value === "object")
      ? (existing.value as Record<string, unknown>)
      : (DEFAULT_SITE_CONTENT[sectionKey] as unknown as Record<string, unknown>);

    const mergedValue = {
      ...baseVal,
      ...value,
    };

    const { error: upsertErr } = await supabase
      .from("site_content")
      .upsert(
        {
          key:        sectionKey,
          value:      mergedValue,
          updated_at: new Date().toISOString(),
          updated_by: userId ?? null,
        },
        { onConflict: "key" },
      );

    if (upsertErr) {
      console.error(`[updateSiteSectionContent:${sectionKey}]`, upsertErr.message);
      return { success: false, error: upsertErr.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update content";
    console.error(`[updateSiteSectionContent:${sectionKey}] Exception:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Resets a section back to its default fallback values.
 */
export async function resetSiteSectionContent<K extends keyof SiteContentBundle>(
  sectionKey: K,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  const defaultValue = DEFAULT_SITE_CONTENT[sectionKey];
  return updateSiteSectionContent(sectionKey, defaultValue, userId);
}

/**
 * Loads the current shipping configuration from public.site_content,
 * safely merging over default fallback rules.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  const content = await getSiteSectionContent("shipping");
  const shippingRate =
    typeof content?.shippingRate === "number" && !isNaN(content.shippingRate) && content.shippingRate >= 0
      ? content.shippingRate
      : DEFAULT_SHIPPING_CONFIG.shippingRate;

  const freeShippingThreshold =
    typeof content?.freeShippingThreshold === "number" && !isNaN(content.freeShippingThreshold) && content.freeShippingThreshold >= 0
      ? content.freeShippingThreshold
      : DEFAULT_SHIPPING_CONFIG.freeShippingThreshold;

  return {
    shippingRate,
    freeShippingThreshold,
  };
}
