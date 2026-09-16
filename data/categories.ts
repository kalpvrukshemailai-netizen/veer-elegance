/**
 * VEER ELEGANCE — Category & Themed Collection Data
 *
 * Single source of truth for category and collection configuration.
 *
 * Structure:
 *   1. chains            → THE EVERYDAY   (Chains)
 *   2. rings             → THE SIGNATURE  (Rings)
 *   3. earrings          → THE GLOW       (Earrings)
 *   4. bracelets         → THE MOTION     (Bracelets)
 *   5. bangles           → THE HALO       (Bangles)
 *   6. mystery-box       → THE UNKNOWN    (Mystery Box)
 *   7. gen-z-accessories → THE REBEL      (Gen-Z Accessories)
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type CategoryId =
  | "chains"
  | "rings"
  | "earrings"
  | "bracelets"
  | "bangles"
  | "mystery-box"
  | "gen-z-accessories";

// ─────────────────────────────────────────────────────────────────────────────
// EDITORIAL CONTENT — Category Spotlight (homepage)
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryEditorialContent {
  eyebrow:  string;
  headline: string;
  body:     string;
  /** CTA label */
  cta:      string;
}

export const EDITORIAL_CONTENT: Record<CategoryId, CategoryEditorialContent> = {
  chains: {
    eyebrow:  "THE EVERYDAY",
    headline: "Made for Every Day.",
    body:     "Delicate enough for every moment. Designed to stay beautiful.",
    cta:      "Explore THE EVERYDAY",
  },
  rings: {
    eyebrow:  "THE SIGNATURE",
    headline: "Nature, Refined.",
    body:     "Designed to bring a touch of quiet elegance into every day.",
    cta:      "Explore THE SIGNATURE",
  },
  earrings: {
    eyebrow:  "THE GLOW",
    headline: "A Quiet Statement.",
    body:     "Designed to move effortlessly with you, from everyday moments to unforgettable ones.",
    cta:      "Explore THE GLOW",
  },
  bracelets: {
    eyebrow:  "THE MOTION",
    headline: "Made to Move.",
    body:     "Elegant by design, effortless in every moment.",
    cta:      "Explore THE MOTION",
  },
  bangles: {
    eyebrow:  "THE HALO",
    headline: "Circular Grace.",
    body:     "Sculpted contours and understated radiance designed to elevate every wrist.",
    cta:      "Explore THE HALO",
  },
  "mystery-box": {
    eyebrow:  "THE UNKNOWN",
    headline: "Curated Delight.",
    body:     "Hand-selected signature pieces brought together for an experience of discovery.",
    cta:      "Explore THE UNKNOWN",
  },
  "gen-z-accessories": {
    eyebrow:  "THE REBEL",
    headline: "Fearless Expression.",
    body:     "Modern silhouettes and versatile statement pieces made for the new generation.",
    cta:      "Explore THE REBEL",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURED PRODUCT STUB
// ─────────────────────────────────────────────────────────────────────────────

export interface FeaturedProduct {
  id:          string;
  name:        string;
  price:       number;
  image?:      string;
  material:    string;
  antiTarnish: boolean;
  href:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export interface Category {
  id:              CategoryId;
  slug:            string;
  /** Customer-facing themed collection name (e.g. "THE EVERYDAY") */
  collectionName:  string;
  /** Subtitle category descriptor (e.g. "Chains") */
  subtitle:        string;
  /** Full combined display label (e.g. "THE EVERYDAY — Chains") */
  label:           string;
  /** Short editorial descriptor shown in explorer */
  tagline:         string;
  /** Looping cinematic video */
  video:           string;
  poster?:         string;
  /** Full category shop href */
  href:            string;
  /** Category shop page video */
  shopVideo:       string;
  /** Editorial headline for shop page header */
  shopHeadline:    string;
  /** Eyebrow label for shop page header */
  shopEyebrow:     string;
  /** Supporting editorial copy */
  shopDescription: string;
  /** Display sort order */
  displayOrder:    number;
  published:       boolean;
  products:        FeaturedProduct[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES (7 Themed Collections)
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORIES: Category[] = [
  {
    id:              "chains",
    slug:            "chains",
    collectionName:  "THE EVERYDAY",
    subtitle:        "Chains",
    label:           "THE EVERYDAY — Chains",
    tagline:         "Effortless layers, every day.",
    video:           "/videos/products/chain-rain.mp4",
    poster:          "/images/categories/poster-chain-rain.webp",
    href:            "/shop/chains",
    shopVideo:       "/videos/products/chain-rain.mp4",
    shopEyebrow:     "THE EVERYDAY",
    shopHeadline:    "All Chains",
    shopDescription: "Delicate everyday chains designed to stay beautiful through every moment.",
    displayOrder:    1,
    published:       true,
    products:        [],
  },
  {
    id:              "rings",
    slug:            "rings",
    collectionName:  "THE SIGNATURE",
    subtitle:        "Rings",
    label:           "THE SIGNATURE — Rings",
    tagline:         "Worn daily. Noticed always.",
    video:           "/videos/products/ring-waterfall.mp4",
    poster:          "/images/categories/poster-ring-waterfall.webp",
    href:            "/shop/rings",
    shopVideo:       "/videos/products/ring-waterfall.mp4",
    shopEyebrow:     "THE SIGNATURE",
    shopHeadline:    "All Rings",
    shopDescription: "Worn daily, noticed always. Each ring is crafted to stay as beautiful as the moment you first wore it.",
    displayOrder:    2,
    published:       true,
    products:        [],
  },
  {
    id:              "earrings",
    slug:            "earrings",
    collectionName:  "THE GLOW",
    subtitle:        "Earrings",
    label:           "THE GLOW — Earrings",
    tagline:         "Movement that catches the light.",
    video:           "/videos/products/earrings-rain.mp4",
    poster:          "/images/categories/poster-earrings-rain.webp",
    href:            "/shop/earrings",
    shopVideo:       "/videos/products/earrings-rain.mp4",
    shopEyebrow:     "THE GLOW",
    shopHeadline:    "All Earrings",
    shopDescription: "Designed to move effortlessly with you — from everyday moments to unforgettable ones.",
    displayOrder:    3,
    published:       true,
    products:        [],
  },
  {
    id:              "bracelets",
    slug:            "bracelets",
    collectionName:  "THE MOTION",
    subtitle:        "Bracelets",
    label:           "THE MOTION — Bracelets",
    tagline:         "A quiet luxury on your wrist.",
    video:           "/videos/products/bracelet-ocean.mp4",
    poster:          "/images/categories/poster-bracelet-ocean.webp",
    href:            "/shop/bracelets",
    shopVideo:       "/videos/products/bracelet-ocean.mp4",
    shopEyebrow:     "THE MOTION",
    shopHeadline:    "All Bracelets",
    shopDescription: "Elegant by design, effortless in every moment. A quiet luxury worn close to the skin.",
    displayOrder:    4,
    published:       true,
    products:        [],
  },
  {
    id:              "bangles",
    slug:            "bangles",
    collectionName:  "THE HALO",
    subtitle:        "Bangles",
    label:           "THE HALO — Bangles",
    tagline:         "Sculptural grace, circular perfection.",
    video:           "/videos/products/halo.mp4",
    poster:          "/images/categories/poster-halo.webp",
    href:            "/shop/bangles",
    shopVideo:       "/videos/products/halo.mp4",
    shopEyebrow:     "THE HALO",
    shopHeadline:    "All Bangles",
    shopDescription: "Sculptural silhouettes and seamless circular form crafted for everyday radiance.",
    displayOrder:    5,
    published:       true,
    products:        [],
  },
  {
    id:              "mystery-box",
    slug:            "mystery-box",
    collectionName:  "THE UNKNOWN",
    subtitle:        "Mystery Box",
    label:           "THE UNKNOWN — Mystery Box",
    tagline:         "Curated surprise, timeless luxury.",
    video:           "/videos/products/unknown.mp4",
    poster:          "/images/categories/poster-unknown.webp",
    href:            "/shop/mystery-box",
    shopVideo:       "/videos/products/unknown.mp4",
    shopEyebrow:     "THE UNKNOWN",
    shopHeadline:    "Mystery Boxes",
    shopDescription: "A curated selection of signature Veer Elegance pieces veiled in mystery.",
    displayOrder:    6,
    published:       true,
    products:        [],
  },
  {
    id:              "gen-z-accessories",
    slug:            "gen-z-accessories",
    collectionName:  "THE REBEL",
    subtitle:        "Gen-Z Accessories",
    label:           "THE REBEL — Gen-Z Accessories",
    tagline:         "Bold accents, modern edge.",
    video:           "/videos/products/rebel.mp4",
    poster:          "/images/categories/poster-rebel.webp",
    href:            "/shop/gen-z-accessories",
    shopVideo:       "/videos/products/rebel.mp4",
    shopEyebrow:     "THE REBEL",
    shopHeadline:    "Gen-Z Accessories",
    shopDescription: "Expressive, contemporary accents and charms designed with fearless modern energy.",
    displayOrder:    7,
    published:       true,
    products:        [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c])
) as Record<CategoryId, Category>;

/** Returns a Category by its id string. Returns undefined for unknown ids. */
export function getCategoryById(id: string): Category | undefined {
  return CATEGORY_MAP[id as CategoryId];
}

/** True if the id is a valid CategoryId */
export function isValidCategoryId(id: string): id is CategoryId {
  return id in CATEGORY_MAP;
}
