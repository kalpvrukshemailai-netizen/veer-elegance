"use server";

/**
 * VEER ELEGANCE — Inventory Server Actions
 *
 * All stock mutations go through these Server Actions.
 * requireAdmin() re-verified on every action.
 * Stock notifications are fired after each successful mutation.
 */

import { revalidatePath }          from "next/cache";
import { requireAdmin }            from "@/lib/admin";
import { addStock, removeStock, adjustStock, getInventoryForProduct } from "@/lib/inventory";
import { createStockNotification } from "@/lib/notifications";

// ─────────────────────────────────────────────────────────────────────────────

export type InventoryActionState = {
  error?:      string;
  success?:    boolean;
  newStock?:   number;
};

// Helper: fetch product name for notification messages
async function getProductNameForId(productId: string): Promise<string> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("name")
      .eq("id", productId)
      .single();
    return (data as { name: string } | null)?.name ?? "Product";
  } catch {
    return "Product";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD STOCK
// ─────────────────────────────────────────────────────────────────────────────

export async function addStockAction(
  productId: string,
  _prev:     InventoryActionState,
  formData:  FormData,
): Promise<InventoryActionState> {
  await requireAdmin("/admin/inventory");

  const qtyStr = (formData.get("quantity") as string | null)?.trim() ?? "";
  const qty    = parseInt(qtyStr, 10);

  if (!qtyStr || isNaN(qty) || qty <= 0) {
    return { error: "Quantity must be a positive whole number." };
  }

  const reason = (formData.get("reason") as string | null)?.trim() || null;

  const result = await addStock(productId, qty, reason);
  if (!result.success) return { error: result.error };

  // Fire stock notification if new level crosses a threshold
  const inv = await getInventoryForProduct(productId);
  if (inv) {
    const name = await getProductNameForId(productId);
    void createStockNotification(productId, name, result.newStock, inv.low_stock_threshold).catch(() => {});
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return { success: true, newStock: result.newStock };
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE STOCK
// ─────────────────────────────────────────────────────────────────────────────

export async function removeStockAction(
  productId: string,
  _prev:     InventoryActionState,
  formData:  FormData,
): Promise<InventoryActionState> {
  await requireAdmin("/admin/inventory");

  const qtyStr = (formData.get("quantity") as string | null)?.trim() ?? "";
  const qty    = parseInt(qtyStr, 10);

  if (!qtyStr || isNaN(qty) || qty <= 0) {
    return { error: "Quantity must be a positive whole number." };
  }

  const reason = (formData.get("reason") as string | null)?.trim() || null;

  const result = await removeStock(productId, qty, reason);
  if (!result.success) return { error: result.error };

  // Fire stock notification
  const inv = await getInventoryForProduct(productId);
  if (inv) {
    const name = await getProductNameForId(productId);
    void createStockNotification(productId, name, result.newStock, inv.low_stock_threshold).catch(() => {});
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return { success: true, newStock: result.newStock };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADJUST STOCK
// ─────────────────────────────────────────────────────────────────────────────

export async function adjustStockAction(
  productId: string,
  _prev:     InventoryActionState,
  formData:  FormData,
): Promise<InventoryActionState> {
  await requireAdmin("/admin/inventory");

  const qtyStr = (formData.get("quantity") as string | null)?.trim() ?? "";
  const qty    = parseInt(qtyStr, 10);

  if (!qtyStr || isNaN(qty) || qty < 0) {
    return { error: "Target quantity must be 0 or a positive whole number." };
  }

  const reason = (formData.get("reason") as string | null)?.trim() || null;

  const result = await adjustStock(productId, qty, reason);
  if (!result.success) return { error: result.error };

  // Fire stock notification
  const inv = await getInventoryForProduct(productId);
  if (inv) {
    const name = await getProductNameForId(productId);
    void createStockNotification(productId, name, result.newStock, inv.low_stock_threshold).catch(() => {});
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return { success: true, newStock: result.newStock };
}
