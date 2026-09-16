/**
 * VEER ELEGANCE — Pure Coupon Utilities & Types
 *
 * Client-safe and server-safe pure calculations for coupons.
 * No server or database dependencies.
 */

export type DiscountType = "percentage" | "fixed";

export type CouponStatus =
  | "active"
  | "scheduled"
  | "expired"
  | "disabled"
  | "limit_reached";

export interface CouponRow {
  id:                  string;
  code:                string;
  discount_type:       DiscountType;
  discount_value:      number;
  minimum_order_value: number | null;
  maximum_discount:    number | null;
  usage_limit:         number | null;
  used_count:          number;
  starts_at:           string | null;
  expires_at:          string | null;
  is_active:           boolean;
  first_order_only:    boolean;
  created_at:          string;
  updated_at:          string;
}

export interface CouponWithStatus extends CouponRow {
  status: CouponStatus;
}

export interface CouponInput {
  code:                string;
  discount_type:       DiscountType;
  discount_value:      number;
  minimum_order_value: number | null;
  maximum_discount:    number | null;
  usage_limit:         number | null;
  starts_at:           string | null;
  expires_at:          string | null;
  is_active:           boolean;
  first_order_only?:   boolean;
}

export interface CouponValidationSuccess {
  valid:              true;
  code:               string;
  couponId:           string;
  discountType:       DiscountType;
  discountValue:      number;
  discountAmount:     number;
  subtotal:           number;
  discountedSubtotal: number;
  firstOrderOnly?:    boolean;
}

export interface CouponValidationError {
  valid: false;
  error: string;
  code?: string;
  internalReason?: string;
}

export type CouponValidationResult = CouponValidationSuccess | CouponValidationError;

/**
 * Checks whether a customer qualifies for a first-order coupon based on their
 * previous successful order count.
 */
export function isEligibleForFirstOrderCoupon(previousSuccessfulOrderCount: number): boolean {
  return previousSuccessfulOrderCount === 0;
}

/**
 * Normalizes a coupon code: trims whitespace and converts to uppercase.
 * Example: "  veer10  " → "VEER10"
 */
export function normalizeCouponCode(code: string | null | undefined): string {
  if (!code) return "";
  return code.trim().toUpperCase();
}

/**
 * Computes human-readable coupon lifecycle status.
 */
export function getCouponStatus(coupon: CouponRow, now: Date = new Date()): CouponStatus {
  if (!coupon.is_active) {
    return "disabled";
  }

  const startsAtRaw = coupon.starts_at ?? (coupon as any).start_date ?? (coupon as any).start_at;
  if (startsAtRaw && typeof startsAtRaw === "string" && startsAtRaw.trim() !== "") {
    const startsAt = new Date(startsAtRaw);
    if (!isNaN(startsAt.getTime()) && startsAt > now) {
      return "scheduled";
    }
  }

  const expiresAtRaw = coupon.expires_at ?? (coupon as any).end_date;
  if (expiresAtRaw && typeof expiresAtRaw === "string" && expiresAtRaw.trim() !== "") {
    const expiresAt = new Date(expiresAtRaw);
    if (!isNaN(expiresAt.getTime()) && expiresAt <= now) {
      return "expired";
    }
  }

  const usageLimit = coupon.usage_limit !== null && coupon.usage_limit !== undefined
    ? Number(coupon.usage_limit)
    : null;
  const usedCount = Number(coupon.used_count ?? (coupon as any).usage_count ?? 0);

  // A usage limit only applies if explicitly set to a positive number (> 0).
  // NULL, undefined, or <= 0 is treated as unlimited.
  if (usageLimit !== null && !isNaN(usageLimit) && usageLimit > 0) {
    if (usedCount >= usageLimit) {
      return "limit_reached";
    }
  }

  return "active";
}

/**
 * Pure calculation function for coupon discounts.
 * Validates constraints against subtotal and returns exact discount amount in INR.
 */
export function calculateCouponDiscount(
  subtotal: number,
  coupon: CouponRow,
  now: Date = new Date(),
): { discountAmount: number; error?: string; internalReason?: string } {
  if (subtotal <= 0) {
    return { discountAmount: 0, error: "Subtotal must be greater than zero.", internalReason: "SUBTOTAL_NON_POSITIVE" };
  }

  // 1. Minimum order value (supports minimum_order_value, min_order_amount, minimum_order_subtotal)
  const minOrderVal = coupon.minimum_order_value !== null && coupon.minimum_order_value !== undefined
    ? Number(coupon.minimum_order_value)
    : ((coupon as any).min_order_amount !== null && (coupon as any).min_order_amount !== undefined
        ? Number((coupon as any).min_order_amount)
        : ((coupon as any).minimum_order_subtotal !== null && (coupon as any).minimum_order_subtotal !== undefined
            ? Number((coupon as any).minimum_order_subtotal)
            : null));

  if (minOrderVal !== null && !isNaN(minOrderVal) && minOrderVal > 0) {
    if (subtotal < minOrderVal) {
      return {
        discountAmount: 0,
        error: `Minimum order value for this coupon is ₹${minOrderVal}.`,
        internalReason: "MINIMUM_NOT_MET",
      };
    }
  }

  // 2. Status checks
  const status = getCouponStatus(coupon, now);
  if (status === "disabled") {
    return { discountAmount: 0, error: "Invalid or unavailable coupon code.", internalReason: "INACTIVE" };
  }
  if (status === "scheduled") {
    return { discountAmount: 0, error: "This coupon is not yet active.", internalReason: "NOT_STARTED" };
  }
  if (status === "expired") {
    return { discountAmount: 0, error: "This coupon has expired.", internalReason: "EXPIRED" };
  }
  if (status === "limit_reached") {
    return { discountAmount: 0, error: "This coupon usage limit has been reached.", internalReason: "USAGE_LIMIT_REACHED" };
  }

  // 3. Discount calculation
  let rawDiscount = 0;

  if (coupon.discount_type === "percentage") {
    const pct = Math.max(0, Math.min(100, Number(coupon.discount_value)));
    rawDiscount = (subtotal * pct) / 100;

    const maxDisc = coupon.maximum_discount !== null && coupon.maximum_discount !== undefined
      ? Number(coupon.maximum_discount)
      : ((coupon as any).max_discount_amount !== null && (coupon as any).max_discount_amount !== undefined
          ? Number((coupon as any).max_discount_amount)
          : null);

    if (maxDisc !== null && !isNaN(maxDisc) && maxDisc > 0) {
      rawDiscount = Math.min(rawDiscount, maxDisc);
    }
  } else if (coupon.discount_type === "fixed") {
    rawDiscount = Math.min(subtotal, Math.max(0, Number(coupon.discount_value)));
  }

  // Ensure discount does not exceed subtotal and is not negative
  const discountAmount = Math.max(0, Math.min(subtotal, Math.round(rawDiscount * 100) / 100));

  return { discountAmount };
}
