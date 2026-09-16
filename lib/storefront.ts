/**
 * VEER ELEGANCE — Storefront Catalog
 *
 * Server-side only. Converts public.products (DbProduct) into the
 * existing UI-facing Product shape used by ProductCard, ProductGallery,
 * ProductInfo, ProductDetail, FeaturedProducts, CartDrawer, etc.
 *
 * Rules:
 *  - Only published + non-archived products are ever returned.
 *  - image_url becomes both images[0] and image (gallery-safe).
 *  - Inventory (stock_quantity + low_stock_threshold) is ALWAYS joined
 *    from public.inventory — never from products.
 *  - available = published && !archived && stock_quantity > 0
 *  - isLowStock = stock > 0 && stock <= low_stock_threshold
 *  - Do NOT call from Client Components.
 */

import {
  getPublishedProducts,
  getPublishedProductsByCategory,
  getPublishedProductsBySlugs,
  getProductBySlugDb,
  searchPublishedProducts,
  getInventoryMapForProducts,
  getProductCategoryMapForProducts,
  getProductImagesMapForProducts,
  type DbProduct,
  type InventoryEntry,
  type ProductCategory,
} from "@/lib/products-db";

import type { Product } from "@/data/products";

// ─────────────────────────────────────────────────────────────────────────────
// DB → UI ADAPTER
// ─────────────────────────────────────────────────────────────────────────────

function resolveImages(
  p: DbProduct,
  galleryUrls?: string[],
): { primary: string; all: [string, ...string[]] } {
  // 1. If product_images rows exist and have valid URLs, use them as primary source of truth
  if (galleryUrls && galleryUrls.length > 0) {
    const valid = galleryUrls.filter(url => Boolean(url && url.trim() !== ""));
    if (valid.length > 0) {
      return {
        primary: valid[0],
        all:     valid as [string, ...string[]],
      };
    }
  }

  // 2. Fall back to products.image_url column
  const fallback = (p.image_url && p.image_url.trim() !== "") ? p.image_url : "";
  return {
    primary: fallback,
    all:     [fallback],
  };
}

/**
 * Converts a DbProduct row + optional inventory entry into the UI Product shape.
 * When no inventory entry exists, stock is treated as 0 (out of stock).
 */
export function dbProductToStorefront(
  p:            DbProduct,
  inv?:         InventoryEntry,
  categoryIds?: string[],
  galleryUrls?: string[],
): Product {
  const { primary: primaryImage, all: allImages } = resolveImages(p, galleryUrls);
  const stockQuantity = inv?.stock_quantity    ?? 0;
  const threshold     = inv?.low_stock_threshold ?? 5;
  const inStock       = stockQuantity > 0;
  const isLowStock    = inStock && stockQuantity <= threshold;

  const assignedCategories = (categoryIds && categoryIds.length > 0)
    ? (categoryIds as ProductCategory[])
    : [p.category as ProductCategory];

  return {
    id:          p.slug,          // Cart stores product.id; keep slug for compatibility
    slug:        p.slug,
    dbId:        p.id,            // Supabase public.products.id UUID
    category:    p.category as ProductCategory,
    categories:  assignedCategories,
    images:      allImages,
    image:       primaryImage,
    alt:         p.name ?? `${p.category} jewellery by Veer Elegance`,
    href:        `/product/${p.slug}`,

    // Optional catalogue copy — only set when real data exists
    name:                 p.name              || undefined,
    shortDescription:     p.short_description || undefined,
    description:          p.description       || undefined,
    material:             p.material          || undefined,
    careInstructions:     undefined,           // uses centralized standard care copy when showCareInstructions is true
    showCareInstructions: Boolean(p.show_care_instructions),

    // Pricing
    price:    p.price    ?? undefined,
    mrp:      p.mrp      ?? undefined,
    currency: "INR",

    // Attributes
    antiTarnish: p.anti_tarnish,

    // Flags
    // available = published AND not archived AND in stock
    featured:  p.featured,
    available: p.published && !p.archived && inStock,

    // Inventory
    stockQuantity,
    isLowStock,

    // Ordering
    displayOrder: p.display_order,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL — join inventory & categories to a batch of DbProducts
// ─────────────────────────────────────────────────────────────────────────────

async function withInventory(rows: DbProduct[]): Promise<Product[]> {
  if (rows.length === 0) return [];
  const productIds = rows.map(r => r.id);   // product.id (UUID) = inventory.product_id & product_categories.product_id
  const [invMap, catMap, imgMap] = await Promise.all([
    getInventoryMapForProducts(productIds),
    getProductCategoryMapForProducts(productIds),
    getProductImagesMapForProducts(productIds),
  ]);
  return rows.map(p => dbProductToStorefront(p, invMap.get(p.id), catMap.get(p.id), imgMap.get(p.id)));
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC STOREFRONT QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/** All published, non-archived products across all categories with live inventory. */
export async function getStorefrontProducts(): Promise<Product[]> {
  const rows = await getPublishedProducts();
  return withInventory(rows);
}

/** Published products in a specific category with live inventory. */
export async function getStorefrontProductsByCategory(
  category: ProductCategory,
): Promise<Product[]> {
  const rows = await getPublishedProductsByCategory(category);
  return withInventory(rows);
}

/** Single published product by slug with live inventory. */
export async function getStorefrontProductBySlug(
  slug: string,
): Promise<Product | null> {
  const row = await getProductBySlugDb(slug);
  if (!row) return null;
  const [invMap, catMap, imgMap] = await Promise.all([
    getInventoryMapForProducts([row.id]),
    getProductCategoryMapForProducts([row.id]),
    getProductImagesMapForProducts([row.id]),
  ]);
  return dbProductToStorefront(row, invMap.get(row.id), catMap.get(row.id), imgMap.get(row.id));
}

/** Published products matching an array of slugs with live inventory (preserves input order). */
export async function getStorefrontProductsBySlugs(
  slugs: string[],
): Promise<Product[]> {
  if (slugs.length === 0) return [];
  const rows = await getPublishedProductsBySlugs(slugs);
  const products = await withInventory(rows);
  const productMap = new Map(products.map(p => [p.slug, p]));
  // Return in exact order of requested slugs
  return slugs.map(slug => productMap.get(slug)).filter((p): p is Product => Boolean(p));
}

/** Related products: same category, different slug, published, up to limit. */
export async function getRelatedStorefrontProducts(
  slug:     string,
  category: ProductCategory,
  limit     = 4,
): Promise<Product[]> {
  const rows     = await getPublishedProductsByCategory(category);
  const filtered = rows.filter(p => p.slug !== slug).slice(0, limit);
  return withInventory(filtered);
}

/** Featured products for homepage editorial section. */
export async function getFeaturedStorefrontProducts(
  category?: ProductCategory,
): Promise<Product[]> {
  const rows    = category
    ? await getPublishedProductsByCategory(category)
    : await getPublishedProducts();
  const featured = rows.filter(p => p.featured);
  return withInventory(featured);
}

/**
 * Searches published storefront products by query and optional category filter.
 * Multi-category aware with live inventory mapping.
 */
export async function searchStorefrontProducts(
  query?: string,
  category?: ProductCategory | "",
): Promise<Product[]> {
  const rows = await searchPublishedProducts(query, category);
  return withInventory(rows);
}

