/**
 * Unit Test Script for VEER ELEGANCE Centralized Shipping Calculation Engine
 * Simplified Single Delivery Model: Standard Delivery Only (Express Removed)
 */
import {
  calculateShipping,
  getShippingCalculation,
  DEFAULT_SHIPPING_CONFIG,
  type ShippingConfig,
  type ShippingCalculationResult,
} from "../lib/shipping";

console.log("=== RUNNING VEER ELEGANCE SHIPPING ENGINE UNIT TESTS (SINGLE DELIVERY MODEL) ===");

const standardConfig: ShippingConfig = {
  shippingRate:          49,
  freeShippingThreshold: 1499,
};

// ── 1. Backward-compatible number signature ───────────────────────────────────
console.log("\n--- A. Backward-Compatible Overload ---");

const ship500 = calculateShipping(500, standardConfig);
if (ship500 !== 49) throw new Error(`Expected 49, got ${ship500}`);
console.log(`✓ [PASS] Subtotal ₹500: Shipping ₹${ship500}`);

const ship1498 = calculateShipping(1498, standardConfig);
if (ship1498 !== 49) throw new Error(`Expected 49, got ${ship1498}`);
console.log(`✓ [PASS] Subtotal ₹1498: Shipping ₹${ship1498}`);

const ship1499 = calculateShipping(1499, standardConfig);
if (ship1499 !== 0) throw new Error(`Expected 0 (FREE), got ${ship1499}`);
console.log(`✓ [PASS] Subtotal ₹1499: Shipping ₹${ship1499} (FREE)`);

const ship1500 = calculateShipping(1500, standardConfig);
if (ship1500 !== 0) throw new Error(`Expected 0 (FREE), got ${ship1500}`);
console.log(`✓ [PASS] Subtotal ₹1500: Shipping ₹${ship1500} (FREE)`);

const ship2000 = calculateShipping(2000, standardConfig);
if (ship2000 !== 0) throw new Error(`Expected 0 (FREE), got ${ship2000}`);
console.log(`✓ [PASS] Subtotal ₹2000: Shipping ₹${ship2000} (FREE)`);

// Edge Case: shippingRate = 0 -> FREE shipping for all orders
const zeroRateConfig: ShippingConfig = { shippingRate: 0, freeShippingThreshold: 1499 };
const shipZeroRate = calculateShipping(500, zeroRateConfig);
if (shipZeroRate !== 0) throw new Error(`Expected 0, got ${shipZeroRate}`);
console.log(`✓ [PASS] Zero shipping rate: Shipping ₹${shipZeroRate}`);

// Edge Case: freeShippingThreshold = 0 -> FREE shipping for all orders
const zeroThresholdConfig: ShippingConfig = { shippingRate: 49, freeShippingThreshold: 0 };
const shipZeroThreshold = calculateShipping(500, zeroThresholdConfig);
if (shipZeroThreshold !== 0) throw new Error(`Expected 0, got ${shipZeroThreshold}`);
console.log(`✓ [PASS] Zero threshold: Shipping ₹${shipZeroThreshold}`);

// Edge Case: subtotal = 0 -> shipping = ₹49 (below threshold)
const shipZeroSubtotal = calculateShipping(0, standardConfig);
if (shipZeroSubtotal !== 49) throw new Error(`Expected 49, got ${shipZeroSubtotal}`);
console.log(`✓ [PASS] Zero subtotal: Shipping ₹${shipZeroSubtotal}`);

// ── 2. Authoritative Object Overload — Standard Delivery ─────────────────────
console.log("\n--- B. Standard Delivery Object Overload ---");

const resStdBelow = calculateShipping({
  postCouponSubtotal: 1437,
  shippingConfig:     standardConfig,
});
if (resStdBelow.deliveryMethod !== "standard") throw new Error("Expected standard delivery method");
if (resStdBelow.shippingCost !== 49) throw new Error(`Expected 49, got ${resStdBelow.shippingCost}`);
if (resStdBelow.isFree !== false) throw new Error("Expected isFree to be false");
if (resStdBelow.threshold !== 1499) throw new Error(`Expected threshold 1499, got ${resStdBelow.threshold}`);
if (resStdBelow.thresholdApplied !== false) throw new Error("Expected thresholdApplied to be false");
console.log("✓ [PASS] Standard Delivery ₹1,437 (< 1499): ₹49 shipping, isFree: false, threshold: 1499");

const resStdExact = calculateShipping({
  postCouponSubtotal: 1499,
  shippingConfig:     standardConfig,
});
if (resStdExact.shippingCost !== 0) throw new Error(`Expected 0, got ${resStdExact.shippingCost}`);
if (resStdExact.isFree !== true) throw new Error("Expected isFree to be true");
if (resStdExact.threshold !== 1499) throw new Error(`Expected threshold 1499, got ${resStdExact.threshold}`);
if (resStdExact.thresholdApplied !== true) throw new Error("Expected thresholdApplied to be true");
console.log("✓ [PASS] Standard Delivery ₹1,499 (== 1499): FREE shipping, thresholdApplied: true");

const resStdAbove = calculateShipping({
  postCouponSubtotal: 2500,
  shippingConfig:     standardConfig,
});
if (resStdAbove.shippingCost !== 0) throw new Error(`Expected 0, got ${resStdAbove.shippingCost}`);
if (resStdAbove.isFree !== true) throw new Error("Expected isFree to be true");
if (resStdAbove.thresholdApplied !== true) throw new Error("Expected thresholdApplied to be true");
console.log("✓ [PASS] Standard Delivery ₹2,500 (> 1499): FREE shipping, thresholdApplied: true");

// ── 3. Specific Regression Scenario ──────────────────────────────────────────
console.log("\n--- C. Authoritative Regression Scenario ---");
// Individual subtotal = ₹1,696
// Bundle savings = ₹99
// Coupon = ₹160
// Eligible shipping subtotal: ₹1,696 - ₹99 - ₹160 = ₹1,437
// Expected Shipping = ₹49
// Final Total = ₹1,437 + ₹49 = ₹1,486
const individualSubtotal = 1696;
const bundleSavings = 99;
const couponDiscount = 160;
const eligibleShippingSubtotal = individualSubtotal - bundleSavings - couponDiscount;
if (eligibleShippingSubtotal !== 1437) throw new Error(`Expected 1437, got ${eligibleShippingSubtotal}`);

const regShippingResult = calculateShipping({
  postCouponSubtotal: eligibleShippingSubtotal,
  shippingConfig:     standardConfig,
});
if (regShippingResult.shippingCost !== 49) {
  throw new Error(`Expected shipping 49 for subtotal 1437, got ${regShippingResult.shippingCost}`);
}
if (regShippingResult.isFree !== false) throw new Error("Expected isFree false for 1437");
const finalTotal = eligibleShippingSubtotal + regShippingResult.shippingCost;
if (finalTotal !== 1486) {
  throw new Error(`Expected final total 1486, got ${finalTotal}`);
}
console.log(`✓ [PASS] Regression Case: Subtotal ₹${individualSubtotal} - Bundle ₹${bundleSavings} - Coupon ₹${couponDiscount} = ₹${eligibleShippingSubtotal} -> Shipping ₹${regShippingResult.shippingCost} -> Total ₹${finalTotal}`);

// ── 4. getShippingCalculation Helper ─────────────────────────────────────────
console.log("\n--- D. getShippingCalculation Helper ---");
const calcHelperBelow = getShippingCalculation(1498, standardConfig);
if (calcHelperBelow.shippingCost !== 49 || calcHelperBelow.isFree !== false || calcHelperBelow.threshold !== 1499) {
  throw new Error("getShippingCalculation below threshold failed");
}
const calcHelperAbove = getShippingCalculation(1499, standardConfig);
if (calcHelperAbove.shippingCost !== 0 || calcHelperAbove.isFree !== true || calcHelperAbove.threshold !== 1499) {
  throw new Error("getShippingCalculation at threshold failed");
}
console.log("✓ [PASS] getShippingCalculation correctly returns { shippingCost, isFree, threshold, thresholdApplied }");

// ── 5. Custom Admin Rates & Threshold ────────────────────────────────────────
console.log("\n--- E. Custom Admin Config ---");

const customAdminConfig: ShippingConfig = {
  shippingRate:          79,
  freeShippingThreshold: 1999,
};

const resCustomStdBelow = calculateShipping({
  postCouponSubtotal: 1500,
  shippingConfig:     customAdminConfig,
});
if (resCustomStdBelow.shippingCost !== 79) throw new Error(`Expected 79, got ${resCustomStdBelow.shippingCost}`);
console.log("✓ [PASS] Custom Standard Below Threshold (1500 < 1999): ₹79");

const resCustomStdAbove = calculateShipping({
  postCouponSubtotal: 2000,
  shippingConfig:     customAdminConfig,
});
if (resCustomStdAbove.shippingCost !== 0) throw new Error(`Expected 0, got ${resCustomStdAbove.shippingCost}`);
console.log("✓ [PASS] Custom Standard Above Threshold (2000 >= 1999): FREE");

// ── 6. Edge Cases & Delivery Method Normalization ────────────────────────────
console.log("\n--- F. Edge Cases & Normalization ---");

// Even if legacy "express" was passed, delivery method normalizes to standard
const resLegacyExpress = calculateShipping({
  deliveryMethod:     "express",
  postCouponSubtotal: 1437,
  shippingConfig:     standardConfig,
});
if (resLegacyExpress.deliveryMethod !== "standard") throw new Error("Expected deliveryMethod standard");
if (resLegacyExpress.shippingCost !== 49) throw new Error("Expected standard rate ₹49");
console.log("✓ [PASS] Legacy 'express' input safely normalizes to standard Delivery (₹49)");

// Null / undefined delivery method defaults safely to standard
const resDefaultMethod = calculateShipping({
  deliveryMethod:     null,
  postCouponSubtotal: 500,
  shippingConfig:     standardConfig,
});
if (resDefaultMethod.deliveryMethod !== "standard" || resDefaultMethod.shippingCost !== 49) {
  throw new Error("Expected default standard delivery");
}
console.log("✓ [PASS] Null delivery method defaults to standard (₹49)");

console.log("\n========================================================");
console.log("ALL SHIPPING CALCULATION ENGINE TESTS PASSED (16/16)!");
console.log("========================================================\n");
