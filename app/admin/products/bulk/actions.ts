"use server";

/**
 * VEER ELEGANCE — Bulk Product Server Actions
 *
 * All bulk mutations run through these Server Actions.
 * - Enforces admin authentication via requireAdmin().
 * - Processes mutations in safe batches of 50 to prevent timeouts/body limits.
 * - Validates inputs and returns detailed execution reports (updated, skipped, failed).
 * - Preserves historical orders, inventory integrity, and multi-category relationships.
 * - Bulk delete is permanently prohibited.
 */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getProductCategoryMapForProducts,
  getInventoryMapForProducts,
  setProductCategories,
  type ProductCategory,
} from "@/lib/products-db";
import { isValidCategoryId } from "@/data/categories";

const BATCH_SIZE = 50;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface BulkActionResult {
  success: boolean;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  failures: {
    id: string;
    name: string;
    reason: string;
  }[];
}

export interface PublishReadinessCheckResult {
  readyIds: string[];
  invalidItems: {
    id: string;
    name: string;
    slug: string;
    reasons: string[];
  }[];
}

// Helper: safe chunking
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Helper: sanitize UUIDs
function sanitizeUuids(ids: string[]): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.filter(
    (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PUBLISH READINESS VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export async function validatePublishReadinessAction(
  rawProductIds: string[]
): Promise<PublishReadinessCheckResult> {
  await requireAdmin("/admin/products/bulk");

  const productIds = sanitizeUuids(rawProductIds);
  if (productIds.length === 0) {
    return { readyIds: [], invalidItems: [] };
  }

  const supabase = await createClient();

  // Fetch products, inventory, and categories in parallel
  const [{ data: products, error: prodErr }, invMap, catMap] = await Promise.all([
    supabase.from("products").select("id, name, slug, price, mrp, image_url, category, archived").in("id", productIds),
    getInventoryMapForProducts(productIds),
    getProductCategoryMapForProducts(productIds),
  ]);

  if (prodErr || !products) {
    console.error("[validatePublishReadinessAction]", prodErr?.message);
    return { readyIds: [], invalidItems: [] };
  }

  const readyIds: string[] = [];
  const invalidItems: PublishReadinessCheckResult["invalidItems"] = [];

  for (const p of products) {
    const reasons: string[] = [];
    const inv = invMap.get(p.id);
    const assignedCats = catMap.get(p.id) ?? (p.category ? [p.category] : []);

    // 1. Price check: must be set and > 0
    if (typeof p.price !== "number" || p.price <= 0 || isNaN(p.price)) {
      reasons.push("Missing or invalid selling price (must be greater than ₹0)");
    }

    // 1b. MRP vs Selling Price check: if MRP is set, it must be >= Selling Price
    if (typeof p.mrp === "number" && typeof p.price === "number" && p.mrp < p.price) {
      reasons.push(`MRP (₹${p.mrp}) is lower than selling price (₹${p.price})`);
    }

    // 2. Stock check: must be > 0
    const stockQty = inv?.stock_quantity ?? 0;
    if (stockQty <= 0) {
      reasons.push("Stock quantity is 0 (must have at least 1 unit in stock)");
    }

    // 3. Primary image check: must exist
    if (!p.image_url || p.image_url.trim() === "") {
      reasons.push("Missing primary product image");
    }

    // 4. Category check: must have at least one valid category
    if (assignedCats.length === 0) {
      reasons.push("No category assigned");
    }

    // 5. Archived check
    if (p.archived) {
      reasons.push("Product is currently archived");
    }

    if (reasons.length > 0) {
      invalidItems.push({
        id: p.id,
        name: p.name || p.slug,
        slug: p.slug,
        reasons,
      });
    } else {
      readyIds.push(p.id);
    }
  }

  return { readyIds, invalidItems };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BULK SET SELLING PRICE
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkSetPriceAction(
  rawProductIds: string[],
  price: number
): Promise<BulkActionResult> {
  const adminId = await requireAdmin("/admin/products/bulk");
  const productIds = sanitizeUuids(rawProductIds);

  if (productIds.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Selection", reason: "No valid products selected." }] };
  }

  if (typeof price !== "number" || isNaN(price) || price < 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Price", reason: "Selling price must be a non-negative number." }] };
  }

  const supabase = await createClient();

  // Validate that for all affected products with an existing MRP, MRP >= new Selling Price
  const { data: existingProducts, error: fetchErr } = await supabase
    .from("products")
    .select("id, name, slug, mrp")
    .in("id", productIds);

  if (fetchErr || !existingProducts) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: productIds.length, failures: [{ id: "all", name: "Database", reason: fetchErr?.message || "Failed to inspect products" }] };
  }

  const invalidItems = existingProducts.filter(
    (p) => typeof p.mrp === "number" && p.mrp > 0 && price > p.mrp
  );

  if (invalidItems.length > 0) {
    return {
      success: false,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: invalidItems.length,
      failures: invalidItems.map((p) => ({
        id: p.id,
        name: p.name || p.slug,
        reason: `Target Selling Price (₹${price}) is higher than existing MRP (₹${p.mrp}). Selling Price cannot exceed MRP.`,
      })),
    };
  }

  const chunks = chunkArray(productIds, BATCH_SIZE);
  let updatedCount = 0;
  const failures: BulkActionResult["failures"] = [];

  for (const batch of chunks) {
    const { error, count } = await supabase
      .from("products")
      .update({ price, updated_at: new Date().toISOString() }, { count: "exact" })
      .in("id", batch);

    if (error) {
      console.error("[bulkSetPriceAction] Batch update error:", error.message);
      for (const id of batch) {
        failures.push({ id, name: id, reason: error.message });
      }
    } else {
      updatedCount += count ?? batch.length;
    }
  }

  console.log(`[AUDIT] Admin ${adminId} bulk set selling price to ₹${price} for ${updatedCount} products.`);

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/bulk");
  revalidatePath("/shop");

  return {
    success: failures.length === 0,
    updatedCount,
    skippedCount: 0,
    failedCount: failures.length,
    failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2b. BULK SET MRP / COMPARE-AT PRICE
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkSetMrpAction(
  rawProductIds: string[],
  mrp: number | null
): Promise<BulkActionResult> {
  const adminId = await requireAdmin("/admin/products/bulk");
  const productIds = sanitizeUuids(rawProductIds);

  if (productIds.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Selection", reason: "No valid products selected." }] };
  }

  if (mrp !== null && (typeof mrp !== "number" || isNaN(mrp) || mrp <= 0)) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "MRP", reason: "MRP must be greater than ₹0." }] };
  }

  const supabase = await createClient();

  // If setting a numeric MRP, validate that MRP >= existing Selling Price for all affected products
  if (mrp !== null) {
    const { data: existingProducts, error: fetchErr } = await supabase
      .from("products")
      .select("id, name, slug, price")
      .in("id", productIds);

    if (fetchErr || !existingProducts) {
      return { success: false, updatedCount: 0, skippedCount: 0, failedCount: productIds.length, failures: [{ id: "all", name: "Database", reason: fetchErr?.message || "Failed to inspect products" }] };
    }

    const invalidItems = existingProducts.filter(
      (p) => typeof p.price === "number" && p.price > 0 && mrp < p.price
    );

    if (invalidItems.length > 0) {
      return {
        success: false,
        updatedCount: 0,
        skippedCount: 0,
        failedCount: invalidItems.length,
        failures: invalidItems.map((p) => ({
          id: p.id,
          name: p.name || p.slug,
          reason: `Target MRP (₹${mrp}) is lower than existing selling price (₹${p.price}). MRP must be ≥ Selling Price.`,
        })),
      };
    }
  }

  const chunks = chunkArray(productIds, BATCH_SIZE);
  let updatedCount = 0;
  const failures: BulkActionResult["failures"] = [];

  for (const batch of chunks) {
    const { error, count } = await supabase
      .from("products")
      .update({ mrp, updated_at: new Date().toISOString() }, { count: "exact" })
      .in("id", batch);

    if (error) {
      console.error("[bulkSetMrpAction] Batch update error:", error.message);
      for (const id of batch) {
        failures.push({ id, name: id, reason: error.message });
      }
    } else {
      updatedCount += count ?? batch.length;
    }
  }

  console.log(`[AUDIT] Admin ${adminId} bulk set MRP to ${mrp !== null ? `₹${mrp}` : "NULL (cleared)"} for ${updatedCount} products.`);

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/bulk");
  revalidatePath("/shop");

  return {
    success: failures.length === 0,
    updatedCount,
    skippedCount: 0,
    failedCount: failures.length,
    failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. BULK SET STOCK
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkSetStockAction(
  rawProductIds: string[],
  stockQuantity: number
): Promise<BulkActionResult> {
  const adminId = await requireAdmin("/admin/products/bulk");
  const productIds = sanitizeUuids(rawProductIds);

  if (productIds.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Selection", reason: "No valid products selected." }] };
  }

  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Stock", reason: "Stock quantity must be zero or a positive whole number." }] };
  }

  const supabase = await createClient();
  const chunks = chunkArray(productIds, BATCH_SIZE);
  let updatedCount = 0;
  const failures: BulkActionResult["failures"] = [];

  for (const batch of chunks) {
    // Upsert inventory rows
    const now = new Date().toISOString();
    const inventoryRows = batch.map((productId) => ({
      product_id: productId,
      stock_quantity: stockQuantity,
      low_stock_threshold: 5,
      updated_at: now,
    }));

    const { error } = await supabase
      .from("inventory")
      .upsert(inventoryRows, { onConflict: "product_id" });

    if (error) {
      console.error("[bulkSetStockAction] Batch inventory error:", error.message);
      for (const id of batch) {
        failures.push({ id, name: id, reason: error.message });
      }
    } else {
      updatedCount += batch.length;
    }
  }

  console.log(`[AUDIT] Admin ${adminId} bulk set stock to ${stockQuantity} for ${updatedCount} products.`);

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/bulk");
  revalidatePath("/shop");

  return {
    success: failures.length === 0,
    updatedCount,
    skippedCount: 0,
    failedCount: failures.length,
    failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BULK SET PUBLISHED / UNPUBLISHED
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkSetPublishedAction(
  rawProductIds: string[],
  published: boolean
): Promise<BulkActionResult> {
  const adminId = await requireAdmin("/admin/products/bulk");
  const productIds = sanitizeUuids(rawProductIds);

  if (productIds.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Selection", reason: "No valid products selected." }] };
  }

  let targetIds = productIds;
  const failures: BulkActionResult["failures"] = [];

  // If publishing, run readiness validation first
  if (published) {
    const readiness = await validatePublishReadinessAction(productIds);
    targetIds = readiness.readyIds;

    for (const inv of readiness.invalidItems) {
      failures.push({
        id: inv.id,
        name: inv.name,
        reason: inv.reasons.join("; "),
      });
    }
  }

  if (targetIds.length === 0) {
    return {
      success: false,
      updatedCount: 0,
      skippedCount: failures.length,
      failedCount: failures.length,
      failures,
    };
  }

  const supabase = await createClient();
  const chunks = chunkArray(targetIds, BATCH_SIZE);
  let updatedCount = 0;

  for (const batch of chunks) {
    const { error, count } = await supabase
      .from("products")
      .update({ published, updated_at: new Date().toISOString() }, { count: "exact" })
      .in("id", batch);

    if (error) {
      console.error("[bulkSetPublishedAction] Batch publish error:", error.message);
      for (const id of batch) {
        failures.push({ id, name: id, reason: error.message });
      }
    } else {
      updatedCount += count ?? batch.length;
    }
  }

  console.log(`[AUDIT] Admin ${adminId} bulk set published=${published} for ${updatedCount} products (skipped: ${failures.length}).`);

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/bulk");
  revalidatePath("/shop");

  return {
    success: failures.length === 0,
    updatedCount,
    skippedCount: failures.length,
    failedCount: failures.length,
    failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BULK SET FEATURED
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkSetFeaturedAction(
  rawProductIds: string[],
  featured: boolean
): Promise<BulkActionResult> {
  const adminId = await requireAdmin("/admin/products/bulk");
  const productIds = sanitizeUuids(rawProductIds);

  if (productIds.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Selection", reason: "No valid products selected." }] };
  }

  const supabase = await createClient();
  const chunks = chunkArray(productIds, BATCH_SIZE);
  let updatedCount = 0;
  const failures: BulkActionResult["failures"] = [];

  for (const batch of chunks) {
    const { error, count } = await supabase
      .from("products")
      .update({ featured, updated_at: new Date().toISOString() }, { count: "exact" })
      .in("id", batch);

    if (error) {
      console.error("[bulkSetFeaturedAction] Batch update error:", error.message);
      for (const id of batch) {
        failures.push({ id, name: id, reason: error.message });
      }
    } else {
      updatedCount += count ?? batch.length;
    }
  }

  console.log(`[AUDIT] Admin ${adminId} bulk set featured=${featured} for ${updatedCount} products.`);

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/bulk");
  revalidatePath("/shop");

  return {
    success: failures.length === 0,
    updatedCount,
    skippedCount: 0,
    failedCount: failures.length,
    failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. BULK SET ARCHIVED
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkSetArchivedAction(
  rawProductIds: string[],
  archived: boolean
): Promise<BulkActionResult> {
  const adminId = await requireAdmin("/admin/products/bulk");
  const productIds = sanitizeUuids(rawProductIds);

  if (productIds.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Selection", reason: "No valid products selected." }] };
  }

  const supabase = await createClient();
  const chunks = chunkArray(productIds, BATCH_SIZE);
  let updatedCount = 0;
  const failures: BulkActionResult["failures"] = [];

  for (const batch of chunks) {
    const updatePayload: Record<string, any> = {
      archived,
      updated_at: new Date().toISOString(),
    };
    if (archived) {
      updatePayload.published = false; // archiving unpublishes from live storefront
    }

    const { error, count } = await supabase
      .from("products")
      .update(updatePayload, { count: "exact" })
      .in("id", batch);

    if (error) {
      console.error("[bulkSetArchivedAction] Batch archive error:", error.message);
      for (const id of batch) {
        failures.push({ id, name: id, reason: error.message });
      }
    } else {
      updatedCount += count ?? batch.length;
    }
  }

  console.log(`[AUDIT] Admin ${adminId} bulk set archived=${archived} for ${updatedCount} products.`);

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/bulk");
  revalidatePath("/shop");

  return {
    success: failures.length === 0,
    updatedCount,
    skippedCount: 0,
    failedCount: failures.length,
    failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. BULK EDIT CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkEditCategoriesAction(
  rawProductIds: string[],
  config: {
    mode: "add" | "remove" | "replace";
    categoryIds: string[];
    primaryCategory?: string;
  }
): Promise<BulkActionResult> {
  const adminId = await requireAdmin("/admin/products/bulk");
  const productIds = sanitizeUuids(rawProductIds);

  if (productIds.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Selection", reason: "No valid products selected." }] };
  }

  const validTargetCats = (config.categoryIds || []).filter(isValidCategoryId);

  if (config.mode === "replace" && validTargetCats.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Categories", reason: "Replace mode requires at least one selected category." }] };
  }

  if (config.mode !== "replace" && validTargetCats.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Categories", reason: "No valid categories specified." }] };
  }

  const supabase = await createClient();

  // Fetch current products and categories
  const [{ data: products, error: prodErr }, catMap] = await Promise.all([
    supabase.from("products").select("id, name, slug, category").in("id", productIds),
    getProductCategoryMapForProducts(productIds),
  ]);

  if (prodErr || !products) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: productIds.length, failures: [{ id: "all", name: "Database", reason: prodErr?.message || "Failed to fetch products" }] };
  }

  let updatedCount = 0;
  const failures: BulkActionResult["failures"] = [];

  for (const p of products) {
    const currentCats = catMap.get(p.id) ?? (p.category ? [p.category] : []);
    let newCats: string[] = [];
    let newPrimary: string = p.category;

    if (config.mode === "add") {
      newCats = Array.from(new Set([...currentCats, ...validTargetCats]));
      if (!newPrimary || !newCats.includes(newPrimary)) {
        newPrimary = validTargetCats[0] || newCats[0];
      }
    } else if (config.mode === "remove") {
      newCats = currentCats.filter((c) => !validTargetCats.includes(c as any));
      if (newCats.length === 0) {
        failures.push({
          id: p.id,
          name: p.name || p.slug,
          reason: "Cannot remove all categories. Every product must belong to at least one category.",
        });
        continue;
      }
      if ((validTargetCats as string[]).includes(newPrimary)) {
        newPrimary = (config.primaryCategory && newCats.includes(config.primaryCategory))
          ? config.primaryCategory
          : newCats[0];
      }
    } else if (config.mode === "replace") {
      newCats = validTargetCats;
      newPrimary = (config.primaryCategory && newCats.includes(config.primaryCategory))
        ? config.primaryCategory
        : newCats[0];
    }

    // Atomic sync: update products.category and junction table
    try {
      await supabase
        .from("products")
        .update({ category: newPrimary as ProductCategory, updated_at: new Date().toISOString() })
        .eq("id", p.id);

      await setProductCategories(p.id, newCats);
      updatedCount++;
    } catch (err: any) {
      failures.push({
        id: p.id,
        name: p.name || p.slug,
        reason: err?.message || "Failed to sync categories",
      });
    }
  }

  console.log(`[AUDIT] Admin ${adminId} bulk edited categories (mode: ${config.mode}) for ${updatedCount} products.`);

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/bulk");
  revalidatePath("/shop");

  return {
    success: failures.length === 0,
    updatedCount,
    skippedCount: failures.length,
    failedCount: failures.length,
    failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. BULK RENAME / REPLACE TEXT
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkRenameAction(
  rawProductIds: string[],
  config: {
    type: "prefix" | "replace";
    prefix?: string;
    findText?: string;
    replaceText?: string;
  }
): Promise<BulkActionResult> {
  const adminId = await requireAdmin("/admin/products/bulk");
  const productIds = sanitizeUuids(rawProductIds);

  if (productIds.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: 0, failures: [{ id: "none", name: "Selection", reason: "No valid products selected." }] };
  }

  const supabase = await createClient();
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, slug")
    .in("id", productIds);

  if (prodErr || !products) {
    return { success: false, updatedCount: 0, skippedCount: 0, failedCount: productIds.length, failures: [{ id: "all", name: "Database", reason: prodErr?.message || "Failed to fetch products" }] };
  }

  let updatedCount = 0;
  let skippedCount = 0;
  const failures: BulkActionResult["failures"] = [];

  for (const p of products) {
    const currentName = p.name || p.slug;
    let newName = currentName;

    if (config.type === "prefix") {
      const prefix = (config.prefix || "").trim();
      if (!prefix) {
        skippedCount++;
        continue;
      }
      if (!currentName.startsWith(prefix)) {
        newName = `${prefix} ${currentName}`.trim();
      }
    } else if (config.type === "replace") {
      const find = config.findText || "";
      const replace = config.replaceText || "";
      if (!find) {
        skippedCount++;
        continue;
      }
      newName = currentName.replaceAll(find, replace).trim();
    }

    if (newName === currentName || !newName) {
      skippedCount++;
      continue;
    }

    const { error: updErr } = await supabase
      .from("products")
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq("id", p.id);

    if (updErr) {
      failures.push({
        id: p.id,
        name: currentName,
        reason: updErr.message,
      });
    } else {
      updatedCount++;
    }
  }

  console.log(`[AUDIT] Admin ${adminId} bulk renamed ${updatedCount} products (skipped: ${skippedCount}).`);

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/bulk");
  revalidatePath("/shop");

  return {
    success: failures.length === 0,
    updatedCount,
    skippedCount,
    failedCount: failures.length,
    failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. BULK SET CARE INSTRUCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkSetCareInstructionsAction(
  rawProductIds: string[],
  showCareInstructions: boolean,
): Promise<BulkActionResult> {
  const adminId = await requireAdmin("/admin/products/bulk");
  const productIds = sanitizeUuids(rawProductIds);

  if (productIds.length === 0) {
    return {
      success: false,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      failures: [{ id: "none", name: "Selection", reason: "No valid products selected." }],
    };
  }

  const supabase = await createClient();
  const chunks = chunkArray(productIds, BATCH_SIZE);
  let updatedCount = 0;
  const failures: BulkActionResult["failures"] = [];

  for (const batch of chunks) {
    const { error, count } = await supabase
      .from("products")
      .update(
        {
          show_care_instructions: showCareInstructions,
          updated_at: new Date().toISOString(),
        },
        { count: "exact" },
      )
      .in("id", batch);

    if (error) {
      console.error("[bulkSetCareInstructionsAction] Batch update error:", error.message);
      for (const id of batch) {
        failures.push({ id, name: id, reason: error.message });
      }
    } else {
      updatedCount += count ?? batch.length;
    }
  }

  console.log(
    `[AUDIT] Admin ${adminId} bulk set show_care_instructions=${showCareInstructions} for ${updatedCount} products.`,
  );

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/bulk");
  revalidatePath("/shop");

  return {
    success: failures.length === 0,
    updatedCount,
    skippedCount: 0,
    failedCount: failures.length,
    failures,
  };
}

