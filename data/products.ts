/**
 * VEER ELEGANCE — Product Catalog
 *
 * Single source of truth for all product records.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  DATABASE-READY DESIGN NOTES                                │
 * │  This file is structured to map directly to a DB table.     │
 * │  When a backend is introduced, the Product interface        │
 * │  maps to a `products` table row. No React-specific state    │
 * │  or UI config belongs here.                                 │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Filesystem audit (2026-08-21):
 *   /public/images/products/chains/
 *     chain-01.jpeg  ✓
 *     chain-02.jpeg  ✓
 *     chain-03.jpeg  ✓
 *     chain-04.jpeg  ✓
 *     chain-05.jpeg  ✓
 *     chain-06.jpeg  ✓
 *     chain-07.jpeg  ✓
 *     chain-08.jpeg  ✓
 *     chain-09.jpeg  ✓
 *
 * Product names, prices, and detailed copy are populated ONLY when
 * verified metadata is provided by the brand team.
 * Optional fields allow the UI to render gracefully with partial data.
 *
 * FIELD CONVENTIONS
 *   featured:     true  → shown in homepage 6-card editorial grid
 *   featured:     false → available on the full /shop/[category] page only
 *   available:    false → out-of-stock / not yet launched (hidden from shop)
 *   displayOrder: integer for deterministic sort (lower = first)
 *   slug:         URL-safe identifier → /product/[slug]
 *   images:       ordered array — first element = primary; ready for multi-image PDP
 */

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strict union of all supported jewellery categories.
 * Maps directly to the CategoryId union in data/categories.ts.
 * Add new values here AND in CategoryId simultaneously.
 */
export type ProductCategory =
  | "chains"
  | "rings"
  | "earrings"
  | "bracelets"
  | "bangles"
  | "mystery-box"
  | "gen-z-accessories";

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single product in the VEER ELEGANCE catalogue.
 *
 * DB mapping (future):
 *   id            → primary key (string slug-style for URL friendliness)
 *   slug          → unique index (same as id for now)
 *   category      → enum column / foreign key to categories table
 *   name          → varchar — nullable until brand metadata confirmed
 *   price         → decimal(10,2) nullable — INR — null = not yet priced
 *   currency      → varchar(3) — ISO 4217 code, defaults to "INR"
 *   images        → jsonb / varchar[] — ordered gallery array
 *   shortDescription → varchar(280) nullable
 *   description   → text nullable
 *   material      → varchar nullable
 *   careInstructions → text nullable
 *   antiTarnish   → boolean not null default false
 *   featured      → boolean not null default false
 *   available     → boolean not null default true
 *   displayOrder  → int not null default 999
 *   createdAt     → timestamp (not managed in this file — added by DB layer)
 */
export interface Product {
  // ── Identity ──────────────────────────────────────────────────────────────
  /** Primary key. URL-safe. Unique across all products. */
  id:       string;
  /** URL slug → /product/[slug]. Identical to id in current implementation. */
  slug:     string;
  /** Supabase public.products.id UUID. */
  dbId?:    string;
  /** Strict primary category membership. */
  category: ProductCategory;
  /** Multi-category memberships from product_categories junction table. */
  categories?: ProductCategory[];

  // ── Media ─────────────────────────────────────────────────────────────────
  /**
   * Ordered image paths (relative to /public).
   * First element = primary PDP image.
   * Always non-empty — every product must have at least one image.
   */
  images:   [string, ...string[]];   // tuple: at least one element required
  /** Primary image shortcut — always images[0]. */
  image:    string;
  /** Accessible alt text for the primary image. Always present. */
  alt:      string;

  // ── Catalogue copy — optional until brand team provides verified content ──
  /**
   * Short internal working title.
   * Use "Chain 01" style while awaiting final marketing copy.
   * DO NOT invent premium product names as final copy.
   */
  name?:              string;
  /** One-line editorial teaser for cards and hover states. */
  shortDescription?:  string;
  /** Full PDP editorial description. */
  description?:       string;
  /** Material composition. E.g. "925 Sterling Silver" — only if verified. */
  material?:          string;
  /** Care instructions — only if verified. */
  careInstructions?:      string;
  /** Whether standard care instructions card should be rendered on product page. */
  showCareInstructions?: boolean;

  // ── Pricing ───────────────────────────────────────────────────────────────
  /**
   * Selling Price in the specified currency. null / undefined = not yet priced.
   * Never invent a price. UI must handle the missing-price state safely.
   */
  price?:    number;
  /**
   * MRP / Maximum Retail Price / Original Compare-at price in INR.
   * Optional. When mrp > price, storefront UI displays struck-through MRP and discount %.
   */
  mrp?:      number;
  /**
   * ISO 4217 currency code. Defaults to "INR" for this project.
   * Stored explicitly so the data model is currency-agnostic.
   */
  currency:  "INR";   // extend to string when multi-currency is needed

  // ── Attributes ────────────────────────────────────────────────────────────
  /**
   * Anti-tarnish treatment confirmed by the brand.
   * Do NOT set to true unless verified — no marketing exaggeration.
   */
  antiTarnish: boolean;

  // ── Catalogue flags ───────────────────────────────────────────────────────
  /** If true, this product appears in the homepage featured editorial grid. */
  featured:     boolean;
  /**
   * If false, the product is out of stock or not yet launched.
   * Hidden from shop grids but slug remains valid for direct links.
   */
  available:    boolean;
  /** Current stock quantity from public.inventory. undefined = not loaded. */
  stockQuantity?: number;
  /** True when stock > 0 and stock <= low_stock_threshold. */
  isLowStock?:    boolean;

  // ── Ordering ──────────────────────────────────────────────────────────────
  /**
   * Deterministic display sort order within a category.
   * Lower values appear first. Allows non-alphabetic editorial ordering.
   */
  displayOrder: number;

  // ── Routing ───────────────────────────────────────────────────────────────
  /** Canonical PDP href. Derived from slug: /product/[slug]. */
  href: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAIN PRODUCTS — 9 confirmed uploaded assets
// ─────────────────────────────────────────────────────────────────────────────
//
// name:    temporary internal working title — not final marketing copy
// price:   omitted — not yet verified by brand team
// shortDescription / description / material / careInstructions:
//          omitted — awaiting brand metadata confirmation

export const CHAIN_PRODUCTS: Product[] = [
  // ── Featured 6 (homepage editorial grid) ────────────────────────────────
  {
    id:           "chain-01",
    slug:         "chain-01",
    category:     "chains",
    image:        "/images/products/chains/chain-01.jpeg",
    images:       ["/images/products/chains/chain-01.jpeg"],
    alt:          "Veer Elegance chain necklace — style 01",
    name:         "Chain 01",
    currency:     "INR",
    antiTarnish:  true,
    featured:     true,
    available:    true,
    displayOrder: 1,
    href:         "/product/chain-01",
  },
  {
    id:           "chain-02",
    slug:         "chain-02",
    category:     "chains",
    image:        "/images/products/chains/chain-02.jpeg",
    images:       ["/images/products/chains/chain-02.jpeg"],
    alt:          "Veer Elegance chain necklace — style 02",
    name:         "Chain 02",
    currency:     "INR",
    antiTarnish:  true,
    featured:     true,
    available:    true,
    displayOrder: 2,
    href:         "/product/chain-02",
  },
  {
    id:           "chain-03",
    slug:         "chain-03",
    category:     "chains",
    image:        "/images/products/chains/chain-03.jpeg",
    images:       ["/images/products/chains/chain-03.jpeg"],
    alt:          "Veer Elegance chain necklace — style 03",
    name:         "Chain 03",
    currency:     "INR",
    antiTarnish:  true,
    featured:     true,
    available:    true,
    displayOrder: 3,
    href:         "/product/chain-03",
  },
  {
    id:           "chain-04",
    slug:         "chain-04",
    category:     "chains",
    image:        "/images/products/chains/chain-04.jpeg",
    images:       ["/images/products/chains/chain-04.jpeg"],
    alt:          "Veer Elegance chain necklace — style 04",
    name:         "Chain 04",
    currency:     "INR",
    antiTarnish:  true,
    featured:     true,
    available:    true,
    displayOrder: 4,
    href:         "/product/chain-04",
  },
  {
    id:           "chain-05",
    slug:         "chain-05",
    category:     "chains",
    image:        "/images/products/chains/chain-05.jpeg",
    images:       ["/images/products/chains/chain-05.jpeg"],
    alt:          "Veer Elegance chain necklace — style 05",
    name:         "Chain 05",
    currency:     "INR",
    antiTarnish:  true,
    featured:     true,
    available:    true,
    displayOrder: 5,
    href:         "/product/chain-05",
  },
  {
    id:           "chain-06",
    slug:         "chain-06",
    category:     "chains",
    image:        "/images/products/chains/chain-06.jpeg",
    images:       ["/images/products/chains/chain-06.jpeg"],
    alt:          "Veer Elegance chain necklace — style 06",
    name:         "Chain 06",
    currency:     "INR",
    antiTarnish:  true,
    featured:     true,
    available:    true,
    displayOrder: 6,
    href:         "/product/chain-06",
  },
  // ── Remaining 3 (full /shop/chains page) ────────────────────────────────
  {
    id:           "chain-07",
    slug:         "chain-07",
    category:     "chains",
    image:        "/images/products/chains/chain-07.jpeg",
    images:       ["/images/products/chains/chain-07.jpeg"],
    alt:          "Veer Elegance chain necklace — style 07",
    name:         "Chain 07",
    currency:     "INR",
    antiTarnish:  true,
    featured:     false,
    available:    true,
    displayOrder: 7,
    href:         "/product/chain-07",
  },
  {
    id:           "chain-08",
    slug:         "chain-08",
    category:     "chains",
    image:        "/images/products/chains/chain-08.jpeg",
    images:       ["/images/products/chains/chain-08.jpeg"],
    alt:          "Veer Elegance chain necklace — style 08",
    name:         "Chain 08",
    currency:     "INR",
    antiTarnish:  true,
    featured:     false,
    available:    true,
    displayOrder: 8,
    href:         "/product/chain-08",
  },
  {
    id:           "chain-09",
    slug:         "chain-09",
    category:     "chains",
    image:        "/images/products/chains/chain-09.jpeg",
    images:       ["/images/products/chains/chain-09.jpeg"],
    alt:          "Veer Elegance chain necklace — style 09",
    name:         "Chain 09",
    currency:     "INR",
    antiTarnish:  true,
    featured:     false,
    available:    true,
    displayOrder: 9,
    href:         "/product/chain-09",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ALL PRODUCTS — unified catalogue across all categories
// ─────────────────────────────────────────────────────────────────────────────
// Extend this array as new category products are uploaded.
// Maintain displayOrder within each category independently.

export const ALL_PRODUCTS: Product[] = [
  ...CHAIN_PRODUCTS,
  // Future: ...RING_PRODUCTS,
  // Future: ...EARRING_PRODUCTS,
  // Future: ...BRACELET_PRODUCTS,
];

// ─────────────────────────────────────────────────────────────────────────────
// QUERY HELPERS
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions — no side effects, no React dependencies.
// Safe to call from server components, client components, and lib code.

/**
 * Look up a product by its URL slug.
 * Returns undefined if not found — caller must handle the missing case.
 */
export function getProductBySlug(slug: string): Product | undefined {
  return ALL_PRODUCTS.find(p => p.slug === slug);
}

/**
 * Returns all AVAILABLE products for a category, sorted by displayOrder.
 * Available = product.available is true.
 * Alias: getProductsByCategory — consistent with the conventional naming.
 */
export function getProductsByCategory(category: ProductCategory): Product[] {
  return ALL_PRODUCTS
    .filter(p => p.category === category && p.available)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * @deprecated Use getProductsByCategory — clearer name, same behaviour.
 * Kept for backward compatibility with existing consumers.
 */
export function getAllProducts(category: ProductCategory): Product[] {
  return getProductsByCategory(category);
}

/**
 * Returns available FEATURED products for a category, sorted by displayOrder.
 * Used by the homepage editorial product grid.
 */
export function getFeaturedProducts(category: ProductCategory): Product[] {
  return ALL_PRODUCTS
    .filter(p => p.category === category && p.featured && p.available)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Returns up to `limit` related products from the same category,
 * excluding the current product, sorted by displayOrder.
 * Used by the PDP related products section.
 */
export function getRelatedProducts(
  slug:     string,
  category: ProductCategory,
  limit:    number = 4,
): Product[] {
  return ALL_PRODUCTS
    .filter(p => p.category === category && p.slug !== slug && p.available)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, limit);
}

/**
 * Calculates discount percentage given MRP and selling price.
 * Returns whole percentage (e.g. 30) if MRP > sellingPrice > 0, else null.
 */
export function calculateDiscountPercent(
  mrp: number | null | undefined,
  sellingPrice: number | null | undefined,
): number | null {
  if (typeof mrp !== "number" || typeof sellingPrice !== "number") return null;
  if (mrp <= 0 || sellingPrice <= 0) return null;
  if (mrp <= sellingPrice) return null;
  const discount = Math.round(((mrp - sellingPrice) / mrp) * 100);
  return discount > 0 ? discount : null;
}
