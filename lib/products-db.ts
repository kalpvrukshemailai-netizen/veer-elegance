/**
 * VEER ELEGANCE — Supabase Product Helpers
 *
 * Server-side functions that read/write public.products in Supabase.
 * Named with -db suffix to coexist with the static data/products.ts
 * while the migration to database-driven products is staged.
 *
 * Customer functions → only published, non-archived products.
 * Admin functions   → full access, call after requireAdmin() only.
 *
 * Do NOT call from Client Components.
 */

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ProductCategory =
  | "chains"
  | "rings"
  | "earrings"
  | "bracelets"
  | "bangles"
  | "mystery-box"
  | "gen-z-accessories";

export interface DbProduct {
  id:                string;
  slug:              string;
  name:              string;
  category:          ProductCategory;
  price:             number | null;
  mrp:               number | null;
  currency:          string;
  short_description: string | null;
  description:       string | null;
  material:               string | null;
  show_care_instructions?: boolean;
  anti_tarnish:           boolean;
  featured:          boolean;
  published:         boolean;
  archived:          boolean;
  image_url:         string | null;
  display_order:     number;
  created_at:        string;
  updated_at:        string;
}

export { calculateDiscountPercent } from "@/data/products";

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER-FACING READS (published + non-archived only)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all published, non-archived products ordered by display_order. */
export async function getPublishedProducts(): Promise<DbProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("published", true)
    .eq("archived", false)
    .order("display_order", { ascending: true });

  if (error) { console.error("[getPublishedProducts]", error.message); return []; }
  return (data ?? []) as DbProduct[];
}

/** Returns published, non-archived products filtered by category (multi-category aware). */
export async function getPublishedProductsByCategory(
  category: ProductCategory,
): Promise<DbProduct[]> {
  const supabase = await createClient();

  // 1. Query product_categories junction table joined with public.products
  const { data: junctionData, error: junctionError } = await supabase
    .from("product_categories")
    .select("product_id, products!inner(*)")
    .eq("category_id", category)
    .eq("products.published", true)
    .eq("products.archived", false);

  // 2. Query legacy/primary products.category column as well
  const { data: legacyData, error: legacyError } = await supabase
    .from("products")
    .select("*")
    .eq("published", true)
    .eq("archived", false)
    .eq("category", category);

  const productMap = new Map<string, DbProduct>();

  if (!junctionError && junctionData) {
    for (const row of junctionData as unknown as { products: DbProduct }[]) {
      if (row.products && !productMap.has(row.products.id)) {
        productMap.set(row.products.id, row.products);
      }
    }
  }

  if (!legacyError && legacyData) {
    for (const prod of legacyData as DbProduct[]) {
      if (!productMap.has(prod.id)) {
        productMap.set(prod.id, prod);
      }
    }
  }

  if (junctionError && legacyError) {
    console.error("[getPublishedProductsByCategory] Query error:", junctionError?.message || legacyError?.message);
    return [];
  }

  return Array.from(productMap.values()).sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
}

/** Returns a single published, non-archived product by slug. */
export async function getProductBySlugDb(slug: string): Promise<DbProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .eq("archived", false)
    .single();

  if (error) return null;
  return data as DbProduct;
}

/** Returns published, non-archived products matching an array of slugs. */
export async function getPublishedProductsBySlugs(slugs: string[]): Promise<DbProduct[]> {
  if (slugs.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("slug", slugs)
    .eq("published", true)
    .eq("archived", false);

  if (error) {
    console.error("[getPublishedProductsBySlugs]", error.message);
    return [];
  }
  return (data ?? []) as DbProduct[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY READS (customer-safe)
// ─────────────────────────────────────────────────────────────────────────────

export interface InventoryEntry {
  product_id:         string;
  stock_quantity:     number;
  low_stock_threshold: number;
}

/**
 * Batch-reads inventory for a list of product UUIDs.
 * Returns a Map of product_id → InventoryEntry.
 *
 * Safe for customer routes: reads only stock_quantity + threshold.
 * Products with no inventory row are excluded (treated as quantity = 0).
 */
export async function getInventoryMapForProducts(
  productIds: string[],
): Promise<Map<string, InventoryEntry>> {
  if (productIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory")
    .select("product_id, stock_quantity, low_stock_threshold")
    .in("product_id", productIds);

  if (error) {
    console.error("[getInventoryMapForProducts]", error.message);
    return new Map();
  }

  return new Map(
    (data ?? []).map(row => [
      (row as InventoryEntry).product_id,
      row as InventoryEntry,
    ])
  );
}

/**
 * Batch-reads image URLs from public.product_images for a list of product UUIDs.
 * Returns a Map of product_id → string[] (public URLs ordered by sort_order ascending).
 */
export async function getProductImagesMapForProducts(
  productIds: string[],
): Promise<Map<string, string[]>> {
  if (productIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("product_id, public_url, sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getProductImagesMapForProducts]", error.message);
    return new Map();
  }

  const map = new Map<string, string[]>();
  for (const row of (data ?? []) as { product_id: string; public_url: string | null; sort_order: number }[]) {
    if (row.public_url && row.public_url.trim() !== "") {
      const list = map.get(row.product_id) || [];
      list.push(row.public_url);
      map.set(row.product_id, list);
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN READS (all products, all states)
// Only call these after requireAdmin() has confirmed the user is admin.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns ALL products (including unpublished + archived) for the admin view. */
export async function getAdminProducts(): Promise<DbProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) { console.error("[getAdminProducts]", error.message); return []; }
  return (data ?? []) as DbProduct[];
}

/** Returns a single product by its UUID for the admin edit form. */
export async function getAdminProductById(id: string): Promise<DbProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as DbProduct;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductInput {
  slug:              string;
  name:              string;
  category:          ProductCategory;
  price:             number | null;
  mrp:               number | null;
  currency:          string;
  short_description: string | null;
  description:       string | null;
  material:               string | null;
  show_care_instructions?: boolean;
  anti_tarnish:           boolean;
  featured:          boolean;
  published:         boolean;
  image_url:         string | null;
  display_order:     number;
}

export interface MutationResult {
  success: true;
  id:      string;
}

export interface MutationError {
  success: false;
  error:   string;
}

/** Creates a new product. Returns the new UUID.
 *
 * Note: A Supabase DB trigger (on_product_created → handle_new_product)
 * automatically creates a corresponding inventory row (stock_quantity = 0)
 * after the product insert. No additional app-layer step needed.
 */
export async function createProduct(
  input: ProductInput,
): Promise<MutationResult | MutationError> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...input, archived: false })
    .select("id")
    .single();

  if (error) {
    const msg = error.code === "23505"
      ? "A product with that slug already exists."
      : error.message;
    return { success: false, error: msg };
  }
  return { success: true, id: (data as { id: string }).id };
}

/** Updates an existing product by its UUID. */
export async function updateProduct(
  id:    string,
  input: Partial<ProductInput>,
): Promise<MutationResult | MutationError> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    const msg = error.code === "23505"
      ? "A product with that slug already exists."
      : error.message;
    return { success: false, error: msg };
  }
  return { success: true, id: (data as { id: string }).id };
}

/** Archives a product (soft-delete). Does not hard-delete. */
export async function archiveProduct(
  id: string,
): Promise<MutationResult | MutationError> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ archived: true, published: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: (data as { id: string }).id };
}

/** Toggles the published flag. */
export async function setProductPublished(
  id:        string,
  published: boolean,
): Promise<MutationResult | MutationError> {
  return updateProduct(id, { published });
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CATEGORIES (Many-to-Many Junction)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all category IDs assigned to a product. */
export async function getProductCategoryIds(productId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("category_id")
    .eq("product_id", productId);

  if (error) {
    console.error("[getProductCategoryIds]", error.message);
    return [];
  }
  return (data ?? []).map((r: { category_id: string }) => r.category_id);
}

/**
 * Batch-reads category IDs for a list of product UUIDs from public.product_categories.
 * Returns Map of product UUID (public.products.id) -> categoryId[].
 *
 * @param productIds - Array of product UUID strings. Do NOT pass slugs.
 */
export async function getProductCategoryMapForProducts(
  productIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!productIds || productIds.length === 0) return map;

  // Filter out any non-UUIDs / invalid inputs to prevent Postgres type syntax errors
  const validProductUuids = productIds.filter((id) =>
    typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );

  if (validProductUuids.length === 0) {
    return map;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("product_id, category_id")
    .in("product_id", validProductUuids);

  if (error) {
    console.error("[getProductCategoryMapForProducts]", error.message);
    return map;
  }

  for (const row of (data ?? []) as { product_id: string; category_id: string }[]) {
    const existing = map.get(row.product_id) ?? [];
    if (!existing.includes(row.category_id)) {
      existing.push(row.category_id);
    }
    map.set(row.product_id, existing);
  }

  return map;
}

/** Sets/syncs category assignments for a product. */
export async function setProductCategories(
  productId: string,
  categoryIds: string[],
): Promise<void> {
  const supabase = await createClient();
  const uniqueCategoryIds = [...new Set(categoryIds.filter(Boolean))];

  // 1. If empty, clear all categories
  if (uniqueCategoryIds.length === 0) {
    await supabase
      .from("product_categories")
      .delete()
      .eq("product_id", productId);
    return;
  }

  // 2. Delete removed categories
  const { error: delErr } = await supabase
    .from("product_categories")
    .delete()
    .eq("product_id", productId)
    .not("category_id", "in", `(${uniqueCategoryIds.map(c => `"${c}"`).join(",")})`);

  if (delErr) {
    console.error("[setProductCategories:delete]", delErr.message);
  }

  // 3. Upsert selected categories
  const rows = uniqueCategoryIds.map((catId) => ({
    product_id: productId,
    category_id: catId,
  }));

  const { error: insErr } = await supabase
    .from("product_categories")
    .upsert(rows, { onConflict: "product_id,category_id", ignoreDuplicates: true });

  if (insErr) {
    console.error("[setProductCategories:upsert]", insErr.message);
  }
}

export interface AdminProductWithDetails extends DbProduct {
  stock_quantity: number;
  low_stock_threshold: number;
  categoryIds: string[];
}

/** Batch-fetches all admin products along with live inventory and assigned categories. */
export async function getAdminProductsWithDetails(): Promise<AdminProductWithDetails[]> {
  const products = await getAdminProducts();
  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const [invMap, catMap] = await Promise.all([
    getInventoryMapForProducts(productIds),
    getProductCategoryMapForProducts(productIds),
  ]);

  return products.map((p) => {
    const inv = invMap.get(p.id);
    const assignedCats = catMap.get(p.id) ?? (p.category ? [p.category] : []);
    return {
      ...p,
      stock_quantity: inv?.stock_quantity ?? 0,
      low_stock_threshold: inv?.low_stock_threshold ?? 5,
      categoryIds: assignedCats,
    };
  });
}

/**
 * Customer product search.
 * Searches published, non-archived products by name, slug, material, description,
 * primary category, and multi-category assignments in product_categories.
 *
 * Case-insensitive, deduplicated by product UUID.
 */
export async function searchPublishedProducts(
  rawQuery?: string,
  categoryFilter?: ProductCategory | "",
): Promise<DbProduct[]> {
  const supabase = await createClient();
  const query = (rawQuery ?? "").trim().toLowerCase();

  // If no query and no category filter, return empty array
  if (!query && !categoryFilter) {
    return [];
  }

  // 1. If only categoryFilter is provided (no text query)
  if (!query && categoryFilter) {
    return getPublishedProductsByCategory(categoryFilter);
  }

  // 2. Resolve category keywords from the query with word boundaries
  const matchedCategories: ProductCategory[] = [];
  if (/\b(chain|chains|necklace|necklaces|pendant|everyday)\b/i.test(query)) matchedCategories.push("chains");
  if (/\b(ring|rings|band|bands|signature)\b/i.test(query)) matchedCategories.push("rings");
  if (/\b(earring|earrings|stud|studs|hoop|hoops|glow)\b/i.test(query)) matchedCategories.push("earrings");
  if (/\b(bracelet|bracelets|cuff|motion)\b/i.test(query)) matchedCategories.push("bracelets");
  if (/\b(bangle|bangles|halo|kada|kadas)\b/i.test(query)) matchedCategories.push("bangles");
  if (/\b(mystery|mystery[- ]?box|unknown)\b/i.test(query)) matchedCategories.push("mystery-box");
  if (/\b(gen[- ]?z|genz|rebel|accessor(y|ies)|y2k)\b/i.test(query)) matchedCategories.push("gen-z-accessories");

  const productMap = new Map<string, DbProduct>();

  // 3. Search matching products from public.products by text
  const sanitizedLike = `%${query.replace(/[%_\\]/g, "\\$&")}%`;
  const { data: textMatches, error: textErr } = await supabase
    .from("products")
    .select("*")
    .eq("published", true)
    .eq("archived", false)
    .or(`name.ilike.${sanitizedLike},slug.ilike.${sanitizedLike},material.ilike.${sanitizedLike},description.ilike.${sanitizedLike},category.ilike.${sanitizedLike}`)
    .order("display_order", { ascending: true });

  if (!textErr && textMatches) {
    for (const p of textMatches as DbProduct[]) {
      productMap.set(p.id, p);
    }
  }

  // 4. Also find products assigned to matched category keywords in product_categories
  if (matchedCategories.length > 0) {
    const { data: junctionMatches, error: juncErr } = await supabase
      .from("product_categories")
      .select("product_id, products!inner(*)")
      .in("category_id", matchedCategories)
      .eq("products.published", true)
      .eq("products.archived", false);

    if (!juncErr && junctionMatches) {
      for (const row of junctionMatches as unknown as { products: DbProduct }[]) {
        if (row.products && !productMap.has(row.products.id)) {
          productMap.set(row.products.id, row.products);
        }
      }
    }
  }

  let results = Array.from(productMap.values());

  // 5. If explicit categoryFilter was applied with text query, filter the results
  if (categoryFilter && results.length > 0) {
    const productIds = results.map((p) => p.id);
    const catMap = await getProductCategoryMapForProducts(productIds);
    results = results.filter((p) => {
      if (p.category === categoryFilter) return true;
      const assigned = catMap.get(p.id);
      return assigned?.includes(categoryFilter) ?? false;
    });
  }

  return results.sort((a, b) => a.display_order - b.display_order);
}

