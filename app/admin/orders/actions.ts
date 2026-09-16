"use server";

/**
 * VEER ELEGANCE — Admin Order Server Actions
 *
 * Status updates go through here. requireAdmin() is re-verified
 * on every call — never trusts client-side role.
 */

import { revalidatePath } from "next/cache";
import { requireAdmin }  from "@/lib/admin";
import { updateOrderStatus } from "@/lib/orders";
import type { OrderStatus } from "@/lib/order-utils";

// ─────────────────────────────────────────────────────────────────────────────

export type OrderActionState = {
  error?:   string;
  success?: boolean;
  message?: string;
};

const VALID_STATUSES: OrderStatus[] = [
  "pending", "confirmed", "processing", "shipped", "delivered", "cancelled",
];

// ─────────────────────────────────────────────────────────────────────────────

export async function updateOrderStatusAction(
  orderId:  string,
  _prev:    OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  await requireAdmin("/admin/orders");

  const raw = (formData.get("status") as string | null)?.trim() ?? "";

  if (!VALID_STATUSES.includes(raw as OrderStatus)) {
    return { error: "Invalid status value." };
  }

  const newStatus = raw as OrderStatus;
  const result    = await updateOrderStatus(orderId, newStatus);

  if (!result.success) {
    return { error: result.error };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true, message: `Status updated to ${newStatus}.` };
}
