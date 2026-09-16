/**
 * VEER ELEGANCE — Server Coupon / Promo Code Engine
 *
 * Server-side business logic, DB queries and Admin CRUD for coupons.
 */

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin";
import {
  type CouponRow,
  type CouponWithStatus,
  type CouponInput,
  type CouponValidationResult,
  normalizeCouponCode,
  getCouponStatus,
  calculateCouponDiscount,
} from "./coupon-utils";

export * from "./coupon-utils";

function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceKey && url) {
    return createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE VALIDATION & QUERY
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidateCouponServerOptions {
  userId?: string | null;
  client?: any;
  /** True when cart contains an active Complete-the-Look bundle price */
  hasActiveBundle?: boolean;
  /** Whether the active Complete-the-Look set permits regular coupons */
  bundleCouponAllowed?: boolean;
}

/**
 * Counts the customer's previous successful/completed orders.
 *
 * Rules:
 *  - Only orders with status IN ('confirmed', 'processing', 'shipped', 'delivered') count.
 *  - Excludes pending orders (abandoned checkouts / carts).
 *  - Excludes cancelled orders.
 *  - Excludes orders with payment_status = 'failed'.
 */
export async function getCustomerSuccessfulOrderCount(
  userId: string,
  client?: any,
): Promise<number> {
  // If a mock or specific client was passed, try it first
  if (client) {
    const { count, error } = await client
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["confirmed", "processing", "shipped", "delivered"])
      .neq("status", "cancelled")
      .neq("payment_status", "failed");

    if (!error) {
      return count ?? 0;
    }
  }

  // Use authoritative service client if available
  const serviceClient = getServiceClient();
  const supabase = serviceClient ?? client ?? (await createClient());
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["confirmed", "processing", "shipped", "delivered"])
    .neq("status", "cancelled")
    .neq("payment_status", "failed");

  if (error) {
    console.error("[getCustomerSuccessfulOrderCount]", error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * Validates a coupon code against current database state and calculates discount.
 * Safe for customer endpoints — loads coupon authoritatively using the server-side
 * service role client while keeping public.coupons protected under RLS.
 */
export async function validateAndCalculateCouponServer(
  code: string,
  subtotal: number,
  options?: ValidateCouponServerOptions,
): Promise<CouponValidationResult> {
  const canonical = normalizeCouponCode(code);

  if (!canonical) {
    return { valid: false, error: "Please enter a coupon code." };
  }

  if (subtotal <= 0) {
    console.log(`[validateAndCalculateCouponServer] Reject reason: SUBTOTAL_NON_POSITIVE (subtotal: ${subtotal})`);
    return {
      valid: false,
      error: "Your cart has no payable items.",
      internalReason: "SUBTOTAL_NON_POSITIVE",
    };
  }

  // ── Complete the Look Bundle Coupon Compatibility Check ──────────────────
  if (options?.hasActiveBundle && options?.bundleCouponAllowed === false) {
    console.log(`[validateAndCalculateCouponServer] Reject reason: BUNDLE_COUPON_BLOCKED (code: "${canonical}")`);
    return {
      valid: false,
      error: "Coupons cannot be combined with this Complete the Look offer.",
      code:  canonical,
      internalReason: "BUNDLE_COUPON_BLOCKED",
    };
  }

  // ── Authoritative Coupon Loading via Server-Side Service Client ─────────────
  // Coupon configuration is protected by RLS; anonymous/public clients cannot read it.
  // We first check options?.client to support unit test mocks. If not present or if
  // it returns no row (e.g. anon client blocked by RLS), load authoritatively via service client.
  let couponData: any = null;

  if (options?.client) {
    try {
      const { data, error } = await options.client
        .from("coupons")
        .select("*")
        .eq("code", canonical)
        .single();
      if (!error && data) {
        couponData = data;
      }
    } catch {
      // Mock client or error; fallback to service client below
    }
  }

  if (!couponData) {
    const serviceClient = getServiceClient();
    if (serviceClient) {
      const { data, error } = await serviceClient
        .from("coupons")
        .select("*")
        .eq("code", canonical)
        .single();
      if (!error && data) {
        couponData = data;
      } else if (error && error.code !== "PGRST116") {
        console.error("[validateAndCalculateCouponServer] Service client error:", error.message);
      }
    }
  }

  if (!couponData && !options?.client) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", canonical)
        .single();
      couponData = data;
    } catch {
      // Fallback exhausted
    }
  }

  if (!couponData) {
    console.log(`[validateAndCalculateCouponServer] Reject reason: CODE_NOT_FOUND (code: "${canonical}")`);
    return {
      valid: false,
      error: "Invalid or unavailable coupon code.",
      code: canonical,
      internalReason: "CODE_NOT_FOUND",
    };
  }

  // Map & coerce DB columns defensively
  const coupon: CouponRow = {
    id: couponData.id,
    code: couponData.code,
    discount_type: couponData.discount_type,
    discount_value: Number(couponData.discount_value),
    minimum_order_value:
      couponData.minimum_order_value !== null && couponData.minimum_order_value !== undefined
        ? Number(couponData.minimum_order_value)
        : (couponData.min_order_amount !== null && couponData.min_order_amount !== undefined
            ? Number(couponData.min_order_amount)
            : (couponData.minimum_order_subtotal !== null && couponData.minimum_order_subtotal !== undefined
                ? Number(couponData.minimum_order_subtotal)
                : null)),
    maximum_discount:
      couponData.maximum_discount !== null && couponData.maximum_discount !== undefined
        ? Number(couponData.maximum_discount)
        : (couponData.max_discount_amount !== null && couponData.max_discount_amount !== undefined
            ? Number(couponData.max_discount_amount)
            : null),
    usage_limit:
      couponData.usage_limit !== null && couponData.usage_limit !== undefined
        ? Number(couponData.usage_limit)
        : null,
    used_count: Number(couponData.used_count ?? couponData.usage_count ?? 0),
    starts_at: couponData.starts_at ?? couponData.start_date ?? couponData.start_at ?? null,
    expires_at: couponData.expires_at ?? couponData.end_date ?? null,
    is_active: Boolean(couponData.is_active),
    first_order_only: Boolean(couponData.first_order_only),
    created_at: couponData.created_at,
    updated_at: couponData.updated_at,
  };

  // ── First Order Only Restriction ──────────────────────────────────────────
  if (coupon.first_order_only) {
    let effectiveUserId = options?.userId;
    if (effectiveUserId === undefined) {
      // Resolve from authenticated session if not explicitly passed
      try {
        const authClient = options?.client ?? (await createClient());
        const { data: { user } } = await authClient.auth.getUser();
        effectiveUserId = user?.id ?? null;
      } catch {
        effectiveUserId = null;
      }
    }

    if (!effectiveUserId) {
      console.log(`[validateAndCalculateCouponServer] Reject reason: FIRST_ORDER_REQUIRED (guest/unauthenticated for code: "${canonical}")`);
      return {
        valid: false,
        error: "Please sign in to use this first-order coupon.",
        code:  canonical,
        internalReason: "FIRST_ORDER_REQUIRED",
      };
    }

    const previousOrders = await getCustomerSuccessfulOrderCount(effectiveUserId, options?.client);
    if (previousOrders > 0) {
      console.log(`[validateAndCalculateCouponServer] Reject reason: FIRST_ORDER_REQUIRED (customer ${effectiveUserId} has ${previousOrders} previous orders for code: "${canonical}")`);
      return {
        valid: false,
        error: "This coupon is valid only on your first order.",
        code:  canonical,
        internalReason: "FIRST_ORDER_REQUIRED",
      };
    }
  }

  const calc = calculateCouponDiscount(subtotal, coupon);

  if (calc.error) {
    console.log(`[validateAndCalculateCouponServer] Reject reason: ${calc.internalReason ?? "CALCULATION_ERROR"} (${calc.error}) for code: "${canonical}"`);
    return {
      valid: false,
      error: calc.error,
      code: canonical,
      internalReason: calc.internalReason,
    };
  }

  const discountedSubtotal = Math.max(0, subtotal - calc.discountAmount);

  return {
    valid:              true,
    code:               canonical,
    couponId:           coupon.id,
    discountType:       coupon.discount_type,
    discountValue:      Number(coupon.discount_value),
    discountAmount:     calc.discountAmount,
    subtotal,
    discountedSubtotal,
    firstOrderOnly:     coupon.first_order_only,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CRUD (guarded by requireAdmin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all coupons with live status computed.
 */
export async function getAdminCoupons(): Promise<CouponWithStatus[]> {
  await requireAdmin("/admin/coupons");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAdminCoupons]", error.message);
    return [];
  }

  const now = new Date();
  return (data ?? []).map(row => {
    const c = row as CouponRow;
    return {
      ...c,
      discount_value:      Number(c.discount_value),
      minimum_order_value: c.minimum_order_value !== null ? Number(c.minimum_order_value) : null,
      maximum_discount:    c.maximum_discount !== null ? Number(c.maximum_discount) : null,
      first_order_only:    Boolean(c.first_order_only),
      status:              getCouponStatus(c, now),
    };
  });
}

/**
 * Returns a single coupon by ID for admin edit.
 */
export async function getAdminCouponById(id: string): Promise<CouponRow | null> {
  await requireAdmin("/admin/coupons");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const c = data as CouponRow;
  return {
    ...c,
    discount_value:      Number(c.discount_value),
    minimum_order_value: c.minimum_order_value !== null ? Number(c.minimum_order_value) : null,
    maximum_discount:    c.maximum_discount !== null ? Number(c.maximum_discount) : null,
    first_order_only:    Boolean(c.first_order_only),
  };
}

/**
 * Creates a new coupon.
 */
export async function createAdminCoupon(
  input: CouponInput,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  await requireAdmin("/admin/coupons");
  const supabase = await createClient();

  const canonicalCode = normalizeCouponCode(input.code);
  if (!canonicalCode) {
    return { success: false, error: "Coupon code is required." };
  }

  if (input.discount_value <= 0) {
    return { success: false, error: "Discount value must be greater than 0." };
  }

  if (input.discount_type === "percentage" && input.discount_value > 100) {
    return { success: false, error: "Percentage discount cannot exceed 100%." };
  }

  if (input.minimum_order_value !== null && input.minimum_order_value < 0) {
    return { success: false, error: "Minimum order value cannot be negative." };
  }

  if (input.maximum_discount !== null && input.maximum_discount < 0) {
    return { success: false, error: "Maximum discount cannot be negative." };
  }

  if (input.usage_limit !== null && input.usage_limit < 0) {
    return { success: false, error: "Usage limit cannot be negative." };
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code:                canonicalCode,
      discount_type:       input.discount_type,
      discount_value:      input.discount_value,
      minimum_order_value: input.minimum_order_value,
      maximum_discount:    input.maximum_discount,
      usage_limit:         input.usage_limit,
      starts_at:           input.starts_at || null,
      expires_at:          input.expires_at || null,
      is_active:           input.is_active,
      first_order_only:    Boolean(input.first_order_only),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A coupon with this code already exists." };
    }
    return { success: false, error: error.message };
  }

  return { success: true, id: (data as { id: string }).id };
}

/**
 * Updates an existing coupon.
 */
export async function updateAdminCoupon(
  id: string,
  input: Partial<CouponInput>,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAdmin("/admin/coupons");
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.code !== undefined) {
    const canonical = normalizeCouponCode(input.code);
    if (!canonical) return { success: false, error: "Coupon code cannot be empty." };
    payload.code = canonical;
  }

  if (input.discount_type !== undefined) {
    payload.discount_type = input.discount_type;
  }

  if (input.discount_value !== undefined) {
    if (input.discount_value <= 0) {
      return { success: false, error: "Discount value must be greater than 0." };
    }
    payload.discount_value = input.discount_value;
  }

  if (input.minimum_order_value !== undefined) {
    payload.minimum_order_value = input.minimum_order_value;
  }

  if (input.maximum_discount !== undefined) {
    payload.maximum_discount = input.maximum_discount;
  }

  if (input.usage_limit !== undefined) {
    payload.usage_limit = input.usage_limit;
  }

  if (input.starts_at !== undefined) {
    payload.starts_at = input.starts_at || null;
  }

  if (input.expires_at !== undefined) {
    payload.expires_at = input.expires_at || null;
  }

  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  if (input.first_order_only !== undefined) {
    payload.first_order_only = Boolean(input.first_order_only);
  }

  const { error } = await supabase
    .from("coupons")
    .update(payload)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A coupon with this code already exists." };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Toggles coupon active status.
 */
export async function toggleAdminCouponActive(
  id: string,
  isActive: boolean,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAdmin("/admin/coupons");
  const supabase = await createClient();

  const { error } = await supabase
    .from("coupons")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Deletes or deactivates a coupon:
 * - If used_count === 0: deletes permanently.
 * - If used_count > 0: deactivates (is_active = false) to preserve order history integrity.
 */
export async function deleteOrDeactivateAdminCoupon(
  id: string,
): Promise<{ success: true; action: "deleted" | "deactivated" } | { success: false; error: string }> {
  await requireAdmin("/admin/coupons");
  const supabase = await createClient();

  // 1. Fetch current usage count
  const { data: coupon, error: fetchErr } = await supabase
    .from("coupons")
    .select("id, used_count")
    .eq("id", id)
    .single();

  if (fetchErr || !coupon) {
    return { success: false, error: "Coupon not found." };
  }

  const usedCount = (coupon as { used_count: number }).used_count ?? 0;

  if (usedCount > 0) {
    // Has been used — deactivate rather than deleting
    const { error: updateErr } = await supabase
      .from("coupons")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) return { success: false, error: updateErr.message };
    return { success: true, action: "deactivated" };
  }

  // Never used — safe to delete permanently
  const { error: deleteErr } = await supabase
    .from("coupons")
    .delete()
    .eq("id", id);

  if (deleteErr) return { success: false, error: deleteErr.message };
  return { success: true, action: "deleted" };
}
