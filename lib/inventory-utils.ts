/**
 * VEER ELEGANCE — Inventory shared types and pure helpers.
 *
 * Safe to import from BOTH Server and Client Components.
 * Contains NO server-side imports (no next/headers, no createClient).
 */

export type MovementType =
  | "stock_in"
  | "stock_out"
  | "adjustment"
  | "order_reserved"
  | "order_released"
  | "order_completed";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getStockStatus(
  quantity:  number,
  threshold: number,
): StockStatus {
  if (quantity <= 0)         return "out_of_stock";
  if (quantity <= threshold) return "low_stock";
  return "in_stock";
}

export function stockStatusLabel(status: StockStatus): string {
  const map: Record<StockStatus, string> = {
    in_stock:     "In Stock",
    low_stock:    "Low Stock",
    out_of_stock: "Out of Stock",
  };
  return map[status];
}
