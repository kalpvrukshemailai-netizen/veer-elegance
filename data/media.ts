/**
 * VEER ELEGANCE — Centralised Media Configuration
 *
 * Single source of truth for all media asset paths.
 * Import from this file instead of hardcoding paths in components.
 *
 * Directory conventions (all paths are relative to /public):
 *
 *   images/brand/       → Logo and brand-identity assets
 *   images/products/    → Individual jewellery still photography
 *   images/sections/    → Editorial images used by named page sections
 *   videos/hero/        → Homepage hero cinematic video assets
 *   videos/products/    → Product-specific cinematic videos
 *   videos/sections/    → Homepage and editorial section videos
 */

// ─────────────────────────────────────────────────────────────────────
// BASE PATH CONSTANTS
// ─────────────────────────────────────────────────────────────────────

export const ASSET_BASE = {
  images: {
    root:     "/images",
    brand:    "/images/brand",
    products: "/images/products",
    sections: "/images/sections",
  },
  videos: {
    root:     "/videos",
    hero:     "/videos/hero",
    products: "/videos/products",
    sections: "/videos/sections",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────
// CORE INTERFACES
// ─────────────────────────────────────────────────────────────────────

/**
 * Dimensions for any raster image asset.
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * A single image asset reference.
 */
export interface ImageAsset {
  /** Public path served by Next.js (e.g. "/images/brand/logo.png") */
  src: string;
  /** Accessible alt text — required, never empty */
  alt: string;
  /** Optional natural dimensions for next/image layout hints */
  dimensions?: ImageDimensions;
  /** Optional MIME type hint */
  type?: "image/png" | "image/jpeg" | "image/webp" | "image/avif" | "image/svg+xml";
}

/**
 * A single video asset reference.
 * Supports multiple source formats for cross-browser compatibility.
 */
export interface VideoAsset {
  /**
   * Primary video source path(s).
   * Provide multiple formats (webm first, then mp4) for optimal support.
   */
  sources: VideoSource[];
  /** Fallback poster image shown before the video plays */
  poster?: string;
  /** Accessible label for screen readers */
  ariaLabel: string;
  /** Aspect ratio expressed as "16/9", "4/3", "1/1", etc. */
  aspectRatio?: string;
}

/**
 * A single <source> entry within a VideoAsset.
 */
export interface VideoSource {
  /** Public path to the video file */
  src: string;
  /** MIME type of the video */
  type: "video/webm" | "video/mp4" | "video/ogg";
}

// ─────────────────────────────────────────────────────────────────────
// PRODUCT MEDIA INTERFACES
// ─────────────────────────────────────────────────────────────────────

/**
 * Shot types for jewellery product photography.
 */
export type ProductShotType =
  | "hero"          // primary listing image — jewellery on neutral background
  | "lifestyle"     // jewellery worn in editorial/lifestyle context
  | "detail"        // extreme close-up of texture, clasp, stone, etc.
  | "flat-lay"      // overhead lay-flat arrangement
  | "packaging";    // brand packaging and unboxing

/**
 * A single product image with shot-type metadata.
 */
export interface ProductImage extends ImageAsset {
  shotType: ProductShotType;
  /** Display order within a product gallery (0 = primary) */
  order: number;
}

/**
 * A single product video asset.
 */
export interface ProductVideo extends VideoAsset {
  /**
   * Intent of the video clip:
   * - "cinematic"  → short atmospheric brand-style reel
   * - "360"        → product rotation / all-angle view
   * - "detail"     → close-up texture / movement clip
   */
  intent: "cinematic" | "360" | "detail";
}

/**
 * The complete media bundle for a single jewellery product.
 * Attach this to a product record when building product data.
 */
export interface ProductMediaBundle {
  /** Ordered list of product images (index 0 = primary gallery image) */
  images: ProductImage[];
  /** Optional video clips associated with this product */
  videos?: ProductVideo[];
}

// ─────────────────────────────────────────────────────────────────────
// SECTION MEDIA INTERFACES
// ─────────────────────────────────────────────────────────────────────

/**
 * Named website sections that own dedicated media assets.
 * Extend this union as new sections are added.
 */
export type SectionKey =
  | "hero"
  | "about"
  | "collections"
  | "craftsmanship"
  | "editorial"
  | "testimonials"
  | "newsletter";

/**
 * Media bundle for a named website section.
 */
export interface SectionMedia {
  section: SectionKey;
  /** Static editorial image(s) for this section */
  images?: ImageAsset[];
  /** Cinematic background or featured video for this section */
  video?: VideoAsset;
}

// ─────────────────────────────────────────────────────────────────────
// BRAND ASSETS
// ─────────────────────────────────────────────────────────────────────

/**
 * Veer Elegance brand image assets.
 * Add future brand assets (wordmark, icon, monogram, etc.) here.
 */
export const brandAssets = {
  logo: {
    src: "/images/veer-elegance-logo.png",
    alt: "Veer Elegance — Premium Anti-Tarnish Jewellery",
    dimensions: { width: 1024, height: 1024 },
    type: "image/png",
  } satisfies ImageAsset,
} as const;

// ─────────────────────────────────────────────────────────────────────
// SECTION MEDIA REGISTRY
// ─────────────────────────────────────────────────────────────────────

/**
 * Central registry of all section-level media.
 * Populate each entry as campaign assets are delivered.
 */
export const sectionMedia: Partial<Record<SectionKey, SectionMedia>> = {
  // Assets will be added here as campaign media is delivered.
  // Example shape (do not uncomment until assets exist):
  //
  // hero: {
  //   section: "hero",
  //   video: {
  //     sources: [
  //       { src: "/videos/hero/hero-campaign.webm", type: "video/webm" },
  //       { src: "/videos/hero/hero-campaign.mp4",  type: "video/mp4"  },
  //     ],
  //     poster:    "/images/sections/hero-poster.jpg",
  //     ariaLabel: "Veer Elegance campaign — jewellery in motion",
  //     aspectRatio: "16/9",
  //   },
  // },
};

// ─────────────────────────────────────────────────────────────────────
// TYPE GUARDS
// ─────────────────────────────────────────────────────────────────────

/**
 * Returns true if the asset has a video source list (i.e. is a VideoAsset).
 */
export function isVideoAsset(asset: ImageAsset | VideoAsset): asset is VideoAsset {
  return "sources" in asset && Array.isArray((asset as VideoAsset).sources);
}

/**
 * Returns true if the asset is an ImageAsset.
 */
export function isImageAsset(asset: ImageAsset | VideoAsset): asset is ImageAsset {
  return "src" in asset && !("sources" in asset);
}

// ─────────────────────────────────────────────────────────────────────
// HELPER — build a fully-typed asset path
// ─────────────────────────────────────────────────────────────────────

/**
 * Safely construct a public asset path under a known base directory.
 *
 * @example
 * assetPath(ASSET_BASE.images.products, "ring-solitaire-01.jpg")
 * // → "/images/products/ring-solitaire-01.jpg"
 */
export function assetPath(base: string, filename: string): string {
  return `${base}/${filename}`;
}
