"use server";

/**
 * VEER ELEGANCE — Admin Coupon Server Actions
 *
 * All mutations require admin authentication.
 */

import { revalidatePath } from "next/cache";
import {
  createAdminCoupon,
  updateAdminCoupon,
  toggleAdminCouponActive,
  deleteOrDeactivateAdminCoupon,
  type CouponInput,
} from "@/lib/coupons";

export interface CouponActionState {
  success?: boolean;
  error?:   string;
  id?:      string;
}

export async function createCouponAction(
  input: CouponInput,
): Promise<CouponActionState> {
  const result = await createAdminCoupon(input);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  revalidatePath("/admin/coupons");
  return { success: true, id: result.id };
}

export async function updateCouponAction(
  id: string,
  input: Partial<CouponInput>,
): Promise<CouponActionState> {
  const result = await updateAdminCoupon(id, input);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${id}/edit`);
  return { success: true };
}

export async function toggleCouponActiveAction(
  id: string,
  isActive: boolean,
): Promise<CouponActionState> {
  const result = await toggleAdminCouponActive(id, isActive);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  revalidatePath("/admin/coupons");
  return { success: true };
}

export async function deleteOrDeactivateCouponAction(
  id: string,
): Promise<{ success: boolean; error?: string; action?: "deleted" | "deactivated" }> {
  const result = await deleteOrDeactivateAdminCoupon(id);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  revalidatePath("/admin/coupons");
  return { success: true, action: result.action };
}
