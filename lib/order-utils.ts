/**
 * VEER ELEGANCE — Order shared types and pure helpers.
 *
 * Safe to import from BOTH Server and Client Components.
 * Contains NO server-side imports.
 */

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "payment_captured_stock_issue"; // payment OK but stock insufficient at finalization time

// Defines which statuses are reachable FROM each status.
// payment_captured_stock_issue is a terminal admin-reconciled state with no forward transitions.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:                        ["confirmed", "cancelled"],
  confirmed:                      ["processing", "cancelled"],
  processing:                     ["shipped",    "cancelled"],
  shipped:                        ["delivered",  "cancelled"],
  delivered:                      [],
  cancelled:                      [],
  payment_captured_stock_issue:   [], // terminal — admin reconciles manually
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedNextStatuses(current: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}
