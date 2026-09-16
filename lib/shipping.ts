/**
 * VEER ELEGANCE — Centralized Shipping Configuration & Rules
 *
 * Provides pure, safe shipping calculation functions and default configuration.
 * Single source of truth for shipping calculation across Client and Server.
 * Safe to import in both Client and Server Components.
 */

export type DeliveryMethodId = "standard" | "express";

export interface ShippingConfig {
  shippingRate:          number; // Standard Delivery rate in INR (default 49)
  freeShippingThreshold: number; // Free shipping threshold for Standard in INR (default 1499)
}

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  shippingRate:          49,
  freeShippingThreshold: 1499,
};

export interface CalculateShippingParams {
  deliveryMethod?:     DeliveryMethodId | string | null;
  postCouponSubtotal?: number | null;
  shippingConfig?:     ShippingConfig;
}

export interface ShippingCalculationResult {
  deliveryMethod:   DeliveryMethodId;
  shippingCost:     number;
  isFree:           boolean;
  threshold:        number;
  thresholdApplied: boolean;
}

/**
 * Calculates authoritative shipping information using post-coupon subtotal
 * and current store shipping configuration.
 *
 * Single delivery model: Standard Delivery (₹49 below ₹1,499, FREE at or above ₹1,499).
 *
 * Overload 1 (Recommended): Pass an options object { postCouponSubtotal, shippingConfig }
 * and receive a full ShippingCalculationResult { shippingCost, isFree, threshold, thresholdApplied }.
 *
 * Overload 2 (Backward-compatible): Pass (subtotal, config) and receive the shipping cost number directly.
 */
export function calculateShipping(params: CalculateShippingParams): ShippingCalculationResult;
export function calculateShipping(subtotal: number | null | undefined, config?: ShippingConfig): number;
export function calculateShipping(
  arg1: CalculateShippingParams | number | null | undefined,
  arg2?: ShippingConfig,
): ShippingCalculationResult | number {
  const isObjectCall = typeof arg1 === "object" && arg1 !== null && !("toFixed" in arg1);

  const subtotal: number | null | undefined = isObjectCall
    ? (arg1 as CalculateShippingParams).postCouponSubtotal
    : (arg1 as number | null | undefined);

  const config: ShippingConfig = isObjectCall
    ? (arg1 as CalculateShippingParams).shippingConfig || DEFAULT_SHIPPING_CONFIG
    : (arg2 || DEFAULT_SHIPPING_CONFIG);

  const standardRate = Math.max(
    0,
    typeof config.shippingRate === "number" && !isNaN(config.shippingRate)
      ? config.shippingRate
      : DEFAULT_SHIPPING_CONFIG.shippingRate,
  );

  const threshold = Math.max(
    0,
    typeof config.freeShippingThreshold === "number" && !isNaN(config.freeShippingThreshold)
      ? config.freeShippingThreshold
      : DEFAULT_SHIPPING_CONFIG.freeShippingThreshold,
  );

  const numericSubtotal = typeof subtotal === "number" && !isNaN(subtotal) && subtotal >= 0
    ? subtotal
    : 0;

  let shippingCost = 0;
  let isFree = false;
  let thresholdApplied = false;

  if (standardRate === 0) {
    shippingCost = 0;
    isFree = true;
    thresholdApplied = false;
  } else if (threshold === 0) {
    shippingCost = 0;
    isFree = true;
    thresholdApplied = true;
  } else if (typeof subtotal === "number" && !isNaN(subtotal) && numericSubtotal >= threshold) {
    shippingCost = 0;
    isFree = true;
    thresholdApplied = true;
  } else {
    shippingCost = standardRate;
    isFree = false;
    thresholdApplied = false;
  }

  if (isObjectCall) {
    return {
      deliveryMethod: "standard",
      shippingCost,
      isFree,
      threshold,
      thresholdApplied,
    };
  }

  return shippingCost;
}

/**
 * Returns the full shipping calculation result { shippingCost, isFree, threshold }
 * from positional arguments (subtotal, config).
 */
export function getShippingCalculation(
  subtotal: number | null | undefined,
  config?: ShippingConfig,
): ShippingCalculationResult {
  return calculateShipping({
    postCouponSubtotal: subtotal,
    shippingConfig: config,
  });
}
