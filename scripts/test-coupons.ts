/**
 * VEER ELEGANCE — Unit Tests for Coupon & Discount Calculation Engine
 *
 * Tests:
 *   1. Percentage discount calculation (e.g. 10% on ₹1000 = ₹100)
 *   2. Percentage with max discount cap (e.g. 10% with max ₹75 on ₹1000 = ₹75)
 *   3. Fixed discount calculation (e.g. ₹100 off ₹1000 = ₹100)
 *   4. Fixed discount exceeding subtotal capped at subtotal (no negative amounts)
 *   5. Minimum order value validation (e.g. subtotal < ₹500 rejected)
 *   6. Start date (scheduled) & expiry date validation
 *   7. Usage limit validation (limit_reached when used_count >= usage_limit)
 *   8. Active vs Disabled flag
 *   9. Code normalization (case-insensitive, trimming)
 *  10. Interaction with shipping rules (post-coupon subtotal determines shipping)
 */

import {
  normalizeCouponCode,
  getCouponStatus,
  calculateCouponDiscount,
  type CouponRow,
} from "../lib/coupon-utils";
import { calculateShipping, type ShippingConfig } from "../lib/shipping";

console.log("=== RUNNING COUPON & DISCOUNT ENGINE UNIT TESTS ===");

const baseCoupon: CouponRow = {
  id:                  "c1",
  code:                "VEER10",
  discount_type:       "percentage",
  discount_value:      10,
  minimum_order_value: 500,
  maximum_discount:    200,
  usage_limit:         100,
  used_count:          0,
  starts_at:           null,
  expires_at:          null,
  is_active:           true,
  first_order_only:    false,
  created_at:          new Date().toISOString(),
  updated_at:          new Date().toISOString(),
};

// ── Test 1: Code Normalization ───────────────────────────────────────────────
console.log("\n1. Testing Code Normalization:");
const testCodes = [
  { in: "veer10", out: "VEER10" },
  { in: "  VEER10  ", out: "VEER10" },
  { in: "flat100", out: "FLAT100" },
  { in: "", out: "" },
  { in: null, out: "" },
  { in: undefined, out: "" },
];
for (const tc of testCodes) {
  const norm = normalizeCouponCode(tc.in);
  if (norm !== tc.out) {
    throw new Error(`Normalization failed for "${tc.in}": expected "${tc.out}", got "${norm}"`);
  }
}
console.log("✓ Normalization passed for all variations.");

// ── Test 2: Percentage Discount Calculation ──────────────────────────────────
console.log("\n2. Testing Percentage Discount Calculation:");
// 10% on ₹1000 = ₹100
const pct1000 = calculateCouponDiscount(1000, baseCoupon);
console.log(`Subtotal ₹1000, 10% discount: ₹${pct1000.discountAmount}`);
if (pct1000.discountAmount !== 100) throw new Error(`Expected 100, got ${pct1000.discountAmount}`);

// 10% on ₹1500 = ₹150
const pct1500 = calculateCouponDiscount(1500, baseCoupon);
console.log(`Subtotal ₹1500, 10% discount: ₹${pct1500.discountAmount}`);
if (pct1500.discountAmount !== 150) throw new Error(`Expected 150, got ${pct1500.discountAmount}`);

// ── Test 3: Maximum Discount Cap ─────────────────────────────────────────────
console.log("\n3. Testing Maximum Discount Cap:");
// 10% on ₹3000 = ₹300, capped at max ₹200
const pct3000 = calculateCouponDiscount(3000, baseCoupon);
console.log(`Subtotal ₹3000, 10% (max ₹200) discount: ₹${pct3000.discountAmount}`);
if (pct3000.discountAmount !== 200) throw new Error(`Expected 200, got ${pct3000.discountAmount}`);

// ── Test 4: Minimum Order Value Rejection ─────────────────────────────────────
console.log("\n4. Testing Minimum Order Value:");
// Subtotal ₹400 (< min ₹500)
const pct400 = calculateCouponDiscount(400, baseCoupon);
console.log(`Subtotal ₹400 (< min ₹500): Error = "${pct400.error}"`);
if (!pct400.error || pct400.discountAmount !== 0) {
  throw new Error("Expected minimum order rejection for ₹400 subtotal");
}

// ── Test 5: Fixed Discount Calculation ───────────────────────────────────────
console.log("\n5. Testing Fixed Discount Calculation:");
const flatCoupon: CouponRow = {
  ...baseCoupon,
  id:             "c2",
  code:           "FLAT100",
  discount_type:  "fixed",
  discount_value: 100,
  maximum_discount: null,
};

const flat1000 = calculateCouponDiscount(1000, flatCoupon);
console.log(`Subtotal ₹1000, FLAT100 discount: ₹${flat1000.discountAmount}`);
if (flat1000.discountAmount !== 100) throw new Error(`Expected 100, got ${flat1000.discountAmount}`);

// Fixed discount exceeding subtotal (e.g. ₹500 discount on ₹400 subtotal with min 0)
const bigFlatCoupon: CouponRow = {
  ...flatCoupon,
  discount_value: 500,
  minimum_order_value: null,
};
const flatCapped = calculateCouponDiscount(350, bigFlatCoupon);
console.log(`Subtotal ₹350, FLAT500 discount capped at: ₹${flatCapped.discountAmount}`);
if (flatCapped.discountAmount !== 350) throw new Error(`Expected 350, got ${flatCapped.discountAmount}`);

// ── Test 6: Status Lifecycle (Active, Scheduled, Expired, Disabled, Limit) ───
console.log("\n6. Testing Coupon Status Lifecycle:");
const now = new Date("2026-08-27T12:00:00Z");

// Active
const statusActive = getCouponStatus(baseCoupon, now);
if (statusActive !== "active") throw new Error(`Expected active, got ${statusActive}`);

// Disabled
const statusDisabled = getCouponStatus({ ...baseCoupon, is_active: false }, now);
if (statusDisabled !== "disabled") throw new Error(`Expected disabled, got ${statusDisabled}`);

// Scheduled (starts in future)
const statusScheduled = getCouponStatus({ ...baseCoupon, starts_at: "2026-09-01T00:00:00Z" }, now);
if (statusScheduled !== "scheduled") throw new Error(`Expected scheduled, got ${statusScheduled}`);

// Expired (expired in past)
const statusExpired = getCouponStatus({ ...baseCoupon, expires_at: "2026-08-01T00:00:00Z" }, now);
if (statusExpired !== "expired") throw new Error(`Expected expired, got ${statusExpired}`);

// Limit reached
const statusLimit = getCouponStatus({ ...baseCoupon, usage_limit: 5, used_count: 5 }, now);
if (statusLimit !== "limit_reached") throw new Error(`Expected limit_reached, got ${statusLimit}`);
console.log("✓ All 5 lifecycle statuses verified.");

// ── Test 7: Post-Coupon Subtotal & Shipping Interaction ──────────────────────
console.log("\n7. Testing Free Shipping Interaction with Post-Coupon Subtotal:");
const shippingConfig: ShippingConfig = {
  shippingRate: 49,
  freeShippingThreshold: 1499,
};

// Scenario A: Subtotal ₹1500, Coupon ₹200 -> Post-coupon subtotal = ₹1300 (< 1499) -> Shipping ₹49, Total ₹1349
const discSubtotalA = 1500 - 200; // ₹1300
const shippingA     = calculateShipping(discSubtotalA, shippingConfig);
const totalA        = discSubtotalA + shippingA;
console.log(`Scenario A (₹1500 - ₹200 = ₹1300): Shipping = ₹${shippingA}, Total = ₹${totalA}`);
if (shippingA !== 49 || totalA !== 1349) {
  throw new Error(`Scenario A failed: expected shipping 49 and total 1349, got ${shippingA} and ${totalA}`);
}

// Scenario B: Subtotal ₹1800, Coupon ₹100 -> Post-coupon subtotal = ₹1700 (>= 1499) -> Shipping ₹0 (FREE), Total ₹1700
const discSubtotalB = 1800 - 100; // ₹1700
const shippingB     = calculateShipping(discSubtotalB, shippingConfig);
const totalB        = discSubtotalB + shippingB;
console.log(`Scenario B (₹1800 - ₹100 = ₹1700): Shipping = ₹${shippingB} (FREE), Total = ₹${totalB}`);
if (shippingB !== 0 || totalB !== 1700) {
  throw new Error(`Scenario B failed: expected shipping 0 and total 1700, got ${shippingB} and ${totalB}`);
}

// ── Test 8: Unlimited Usage Semantics (NULL or 0 = Unlimited) ───────────────
console.log("\n8. Testing Unlimited Usage Semantics:");
// NULL usage limit
const couponNullLimit: CouponRow = { ...baseCoupon, usage_limit: null, used_count: 50 };
const statusNullLimit = getCouponStatus(couponNullLimit, now);
if (statusNullLimit !== "active") throw new Error(`Expected active for null usage_limit, got ${statusNullLimit}`);

// 0 usage limit (treated as unlimited)
const couponZeroLimit: CouponRow = { ...baseCoupon, usage_limit: 0, used_count: 50 };
const statusZeroLimit = getCouponStatus(couponZeroLimit, now);
if (statusZeroLimit !== "active") throw new Error(`Expected active for 0 usage_limit, got ${statusZeroLimit}`);

// Positive usage limit reached
const couponPosLimit: CouponRow = { ...baseCoupon, usage_limit: 10, used_count: 10 };
const statusPosLimit = getCouponStatus(couponPosLimit, now);
if (statusPosLimit !== "limit_reached") throw new Error(`Expected limit_reached for used_count >= usage_limit, got ${statusPosLimit}`);
console.log("✓ Usage limit semantics: null and 0 are unlimited, positive limit enforced.");

// ── Test 9: Rejection Reason & Diagnostic Mapping ───────────────────────────
console.log("\n9. Testing Diagnostic Rejection Mapping:");
// Inactive / disabled
const discInactive = calculateCouponDiscount(1000, { ...baseCoupon, is_active: false }, now);
if (discInactive.internalReason !== "INACTIVE") throw new Error(`Expected INACTIVE, got ${discInactive.internalReason}`);

// Not started
const discNotStarted = calculateCouponDiscount(1000, { ...baseCoupon, starts_at: "2026-09-01T00:00:00Z" }, now);
if (discNotStarted.internalReason !== "NOT_STARTED") throw new Error(`Expected NOT_STARTED, got ${discNotStarted.internalReason}`);

// Expired
const discExpired = calculateCouponDiscount(1000, { ...baseCoupon, expires_at: "2026-08-01T00:00:00Z" }, now);
if (discExpired.internalReason !== "EXPIRED") throw new Error(`Expected EXPIRED, got ${discExpired.internalReason}`);

// Usage limit reached
const discLimit = calculateCouponDiscount(1000, { ...baseCoupon, usage_limit: 5, used_count: 5 }, now);
if (discLimit.internalReason !== "USAGE_LIMIT_REACHED") throw new Error(`Expected USAGE_LIMIT_REACHED, got ${discLimit.internalReason}`);

// Minimum order not met
const discMinNotMet = calculateCouponDiscount(400, baseCoupon, now);
if (discMinNotMet.internalReason !== "MINIMUM_NOT_MET") throw new Error(`Expected MINIMUM_NOT_MET, got ${discMinNotMet.internalReason}`);
console.log("✓ All internal rejection reasons mapped cleanly.");

// ── Test 10: Numeric Coercion ───────────────────────────────────────────────
console.log("\n10. Testing Numeric Coercion (string values from DB):");
const stringValCoupon: any = {
  ...baseCoupon,
  discount_value: "10",
  minimum_order_value: "500",
  maximum_discount: "200",
  usage_limit: "100",
  used_count: "0",
};
const coercedRes = calculateCouponDiscount(1000, stringValCoupon, now);
if (coercedRes.discountAmount !== 100) throw new Error(`Expected coerced discount 100, got ${coercedRes.discountAmount}`);
console.log("✓ String-numeric fields coerced safely.");

// ── Test 11: Server Validation with Mock Database (Generic Validation) ──────
console.log("\n11. Testing Server-side Validation with Mock Database:");
import { validateAndCalculateCouponServer } from "../lib/coupons";

const mockCouponList: CouponRow[] = [
  {
    id: "coup-flat100",
    code: "FLAT100",
    discount_type: "fixed",
    discount_value: 100,
    minimum_order_value: 500,
    maximum_discount: null,
    usage_limit: null,
    used_count: 0,
    starts_at: null,
    expires_at: null,
    is_active: true,
    first_order_only: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "coup-veer10",
    code: "VEER10",
    discount_type: "percentage",
    discount_value: 10,
    minimum_order_value: 500,
    maximum_discount: 200,
    usage_limit: 100,
    used_count: 5,
    starts_at: null,
    expires_at: null,
    is_active: true,
    first_order_only: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockClient = {
  from: (table: string) => {
    if (table === "coupons") {
      return {
        select: () => ({
          eq: (col: string, val: string) => ({
            single: async () => {
              const found = mockCouponList.find(c => c[col as keyof CouponRow] === val);
              if (!found) return { data: null, error: { message: "Not found", code: "PGRST116" } };
              return { data: found, error: null };
            },
          }),
        }),
      };
    }
    throw new Error(`Unexpected mock table: ${table}`);
  },
};

// Case A: FLAT100 with Cart ₹1,297
async function testServerValidation() {
  const resFlat100 = await validateAndCalculateCouponServer("FLAT100", 1297, { client: mockClient });
  if (!resFlat100.valid) throw new Error(`Expected FLAT100 to be valid on ₹1297: ${resFlat100.error}`);
  if (resFlat100.discountAmount !== 100) throw new Error(`Expected discount ₹100, got ${resFlat100.discountAmount}`);
  if (resFlat100.discountedSubtotal !== 1197) throw new Error(`Expected discounted subtotal ₹1197, got ${resFlat100.discountedSubtotal}`);
  console.log("✓ Case A: FLAT100 valid on ₹1,297 (discount ₹100, discounted ₹1,197).");

  // Case B: FLAT100 below minimum (Cart ₹499)
  const resUnderMin = await validateAndCalculateCouponServer("FLAT100", 499, { client: mockClient });
  if (resUnderMin.valid) throw new Error("Expected FLAT100 to reject subtotal ₹499");
  if (resUnderMin.error !== "Minimum order value for this coupon is ₹500.") {
    throw new Error(`Unexpected error message: ${resUnderMin.error}`);
  }
  console.log("✓ Case B: FLAT100 rejected below minimum order value.");

  // Case C: Percentage coupon VEER10
  const resVeer10 = await validateAndCalculateCouponServer("VEER10", 1297, { client: mockClient });
  if (!resVeer10.valid) throw new Error(`Expected VEER10 to be valid: ${resVeer10.error}`);
  if (resVeer10.discountAmount !== 129.7) throw new Error(`Expected discount ₹129.7, got ${resVeer10.discountAmount}`);
  console.log("✓ Case C: VEER10 percentage calculation holds.");

  // Case K: Bundle Coupon Compatibility
  const resBundleBlocked = await validateAndCalculateCouponServer("FLAT100", 1297, {
    client: mockClient,
    hasActiveBundle: true,
    bundleCouponAllowed: false,
  });
  if (resBundleBlocked.valid) throw new Error("Expected coupon to be blocked when bundle disallows coupons");
  if (resBundleBlocked.error !== "Coupons cannot be combined with this Complete the Look offer.") {
    throw new Error(`Unexpected bundle error message: ${resBundleBlocked.error}`);
  }
  console.log("✓ Case K: Bundle coupon compatibility check enforced.");

  // Case N: Whitespace and case-insensitivity
  const resNorm = await validateAndCalculateCouponServer("  flat100  ", 1297, { client: mockClient });
  if (!resNorm.valid || resNorm.code !== "FLAT100") {
    throw new Error(`Expected normalized FLAT100, got ${JSON.stringify(resNorm)}`);
  }
  console.log("✓ Case N: Lowercase and whitespace correctly normalized.");

  // Live database test if SUPABASE_SERVICE_ROLE_KEY is present
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log("\n12. Testing Authoritative Live Database Service Client Loading:");
    const liveRes = await validateAndCalculateCouponServer("FLAT100", 1297);
    if (!liveRes.valid) throw new Error(`Live DB validation failed for FLAT100: ${liveRes.error}`);
    if (liveRes.discountAmount !== 100) throw new Error(`Live DB discount amount mismatch: ${liveRes.discountAmount}`);
    console.log("✓ Live DB service role client authoritative query passed for FLAT100 on ₹1,297!");
  }

  console.log("\n🎉 ALL COUPON UNIT & INTEGRATION TESTS PASSED SUCCESSFULLY!");
}

testServerValidation().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
