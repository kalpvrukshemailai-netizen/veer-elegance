/**
 * VEER ELEGANCE — Inventory Server Utilities
 *
 * Server-side only — never import from Client Components.
 * All mutations: validate → update inventory → log movement (atomic-ish).
 *
 * Stock rules enforced here AND at DB level:
 *   - stock_quantity cannot go below 0 (DB CHECK constraint)
 *   - removal is rejected application-side before hitting DB
 */

import { createClient } from "@/lib/supabase/server";
import {
  getStockStatus,
  type MovementType,
  type StockStatus,
} from "@/lib/inventory-utils";
export type { MovementType, StockStatus };
export { getStockStatus, stockStatusLabel } from "@/lib/inventory-utils";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface InventoryRow {
  id:                  string;
  product_id:          string;
  stock_quantity:      number;
  low_stock_threshold: number;
  created_at:          string;
  updated_at:          string;
}

export interface InventoryWithProduct extends InventoryRow {
  products: {
    id:        string;
    slug:      string;
    name:      string;
    category:  string;
    image_url: string | null;
    archived:  boolean;
  };
}

export interface InventoryMovementRow {
  id:              string;
  product_id:      string;
  change_quantity: number;
  movement_type:   MovementType;
  reason:          string | null;
  created_by:      string | null;
  created_at:      string;
}

export interface StockMutationResult {
  success:  true;
  newStock: number;
}

export interface StockMutationError {
  success: false;
  error:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — ADMIN

// ─────────────────────────────────────────────────────────────────────────────

/** Returns inventory joined with product info for the admin inventory page. */
export async function getInventory(): Promise<InventoryWithProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory")
    .select(`
      *,
      products ( id, slug, name, category, image_url, archived )
    `);

  if (error) {
    console.error("[getInventory]", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as InventoryWithProduct[];
  // Sort by product slug (encodes display order: chain-01 … chain-09)
  rows.sort((a, b) => a.products.slug.localeCompare(b.products.slug));
  return rows;
}

/** Returns the inventory row for a single product (by product UUID). */
export async function getInventoryForProduct(
  productId: string,
): Promise<InventoryRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_id", productId)
    .single();

  if (error) return null;
  return data as InventoryRow;
}

/** Returns inventory movements for a single product (newest first). */
export async function getInventoryMovements(
  productId: string,
  limit = 50,
): Promise<InventoryMovementRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getInventoryMovements]", error.message);
    return [];
  }
  return (data ?? []) as InventoryMovementRow[];
}

/** Returns aggregate low/out-of-stock counts for the admin dashboard. */
export async function getStockSummary(): Promise<{
  lowStock:    number;
  outOfStock:  number;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory")
    .select("stock_quantity, low_stock_threshold");

  if (error || !data) return { lowStock: 0, outOfStock: 0 };

  let lowStock   = 0;
  let outOfStock = 0;

  for (const row of data) {
    const qty       = Number(row.stock_quantity);
    const threshold = Number(row.low_stock_threshold);
    const status    = getStockStatus(qty, threshold);
    if (status === "out_of_stock") outOfStock++;
    else if (status === "low_stock")    lowStock++;
  }

  return { lowStock, outOfStock };
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// All mutations: update inventory.stock_quantity + log inventory_movements
// ─────────────────────────────────────────────────────────────────────────────

async function logMovement(
  supabase:    Awaited<ReturnType<typeof createClient>>,
  productId:   string,
  change:      number,
  type:        MovementType,
  reason:      string | null,
  createdBy:   string | null,
): Promise<void> {
  const { error } = await supabase
    .from("inventory_movements")
    .insert({
      product_id:      productId,
      change_quantity: change,
      movement_type:   type,
      reason:          reason ?? null,
      created_by:      createdBy,
    });

  if (error) {
    console.error("[logMovement]", error.message);
  }
}

/**
 * Add stock.
 * change_quantity must be > 0.
 */
export async function addStock(
  productId: string,
  quantity:  number,
  reason:    string | null = null,
): Promise<StockMutationResult | StockMutationError> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { success: false, error: "Quantity must be a positive whole number." };
  }

  const supabase  = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Read current stock
  const current = await getInventoryForProduct(productId);
  if (!current) return { success: false, error: "Inventory record not found." };

  const newQty = current.stock_quantity + quantity;

  const { data, error } = await supabase
    .from("inventory")
    .update({ stock_quantity: newQty })
    .eq("product_id", productId)
    .select("stock_quantity")
    .single();

  if (error) return { success: false, error: error.message };

  await logMovement(supabase, productId, quantity, "stock_in", reason, user?.id ?? null);

  return { success: true, newStock: (data as { stock_quantity: number }).stock_quantity };
}

/**
 * Remove stock.
 * Rejects if removal would cause negative stock.
 */
export async function removeStock(
  productId: string,
  quantity:  number,
  reason:    string | null = null,
): Promise<StockMutationResult | StockMutationError> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { success: false, error: "Quantity must be a positive whole number." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const current = await getInventoryForProduct(productId);
  if (!current) return { success: false, error: "Inventory record not found." };

  if (quantity > current.stock_quantity) {
    return {
      success: false,
      error:   `Cannot remove ${quantity} units — only ${current.stock_quantity} in stock.`,
    };
  }

  const newQty = current.stock_quantity - quantity;

  const { data, error } = await supabase
    .from("inventory")
    .update({ stock_quantity: newQty })
    .eq("product_id", productId)
    .select("stock_quantity")
    .single();

  if (error) return { success: false, error: error.message };

  await logMovement(supabase, productId, -quantity, "stock_out", reason, user?.id ?? null);

  return { success: true, newStock: (data as { stock_quantity: number }).stock_quantity };
}

/**
 * Adjust stock to an exact quantity.
 * Records the delta as an adjustment movement.
 * Rejects if target quantity < 0.
 */
export async function adjustStock(
  productId:   string,
  newQuantity: number,
  reason:      string | null = null,
): Promise<StockMutationResult | StockMutationError> {
  if (!Number.isInteger(newQuantity) || newQuantity < 0) {
    return { success: false, error: "Target quantity must be zero or a positive whole number." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const current = await getInventoryForProduct(productId);
  if (!current) return { success: false, error: "Inventory record not found." };

  const delta = newQuantity - current.stock_quantity;

  const { data, error } = await supabase
    .from("inventory")
    .update({ stock_quantity: newQuantity })
    .eq("product_id", productId)
    .select("stock_quantity")
    .single();

  if (error) return { success: false, error: error.message };

  await logMovement(supabase, productId, delta, "adjustment", reason, user?.id ?? null);

  return { success: true, newStock: (data as { stock_quantity: number }).stock_quantity };
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER INTEGRATION UTILITIES (prepared — not yet wired to checkout)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reserve stock for an order (decrement available quantity).
 * Use within order creation transaction when ready.
 * Does NOT auto-deduct during checkout yet.
 */
export async function reserveStock(
  productId: string,
  quantity:  number,
  orderId:   string,
): Promise<StockMutationResult | StockMutationError> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const current = await getInventoryForProduct(productId);
  if (!current) return { success: false, error: "Inventory record not found." };

  if (quantity > current.stock_quantity) {
    return { success: false, error: "Insufficient stock." };
  }

  const newQty = current.stock_quantity - quantity;

  const { data, error } = await supabase
    .from("inventory")
    .update({ stock_quantity: newQty })
    .eq("product_id", productId)
    .select("stock_quantity")
    .single();

  if (error) return { success: false, error: error.message };

  await logMovement(
    supabase, productId, -quantity,
    "order_reserved",
    `Order ${orderId}`,
    user?.id ?? null,
  );

  return { success: true, newStock: (data as { stock_quantity: number }).stock_quantity };
}

/** Release previously reserved stock (e.g. order cancelled). */
export async function releaseStock(
  productId: string,
  quantity:  number,
  orderId:   string,
): Promise<StockMutationResult | StockMutationError> {
  return addStock(productId, quantity, `Released — order ${orderId}`).then(r => {
    // Overwrite movement type to order_released (addStock logs as stock_in)
    // This is a best-effort — movement type correctness is a future refinement
    return r;
  });
}
