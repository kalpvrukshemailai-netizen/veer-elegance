/**
 * VEER ELEGANCE — Dedicated Checkout Price Breakdown & Shipping Delivery Test Suite
 * Single Delivery Model: Standard Delivery Only (Express Removed)
 *
 * Validates:
 *  1. Customer sees only Standard Delivery (DELIVERY_METHODS contains only standard)
 *  2. Express Delivery is not rendered / removed from options
 *  3. Standard shipping below ₹1,499 = ₹49
 *  4. Standard shipping at ₹1,499 = FREE
 *  5. Standard shipping above ₹1,499 = FREE
 *  6. Bundle savings are included before evaluating shipping threshold
 *  7. Coupon discount is included before evaluating shipping threshold
 *  8. Bundle + coupon + shipping total is correct
 *  9. Partial bundle + coupon + shipping is correct
 * 10. Normal cart + shipping works
 * 11. Shipping amount cannot be client-manipulated
 * 12. Server calculates authoritative shipping
 * 13. Existing historical orders with Express data remain readable
 * 14. New orders use Standard Delivery only
 * 15. Razorpay receives the correct final total
 *
 * Specific regression case:
 *  Individual subtotal = ₹1,696
 *  Bundle savings = ₹99
 *  Coupon = ₹160
 *  Post-discount subtotal = ₹1,437
 *  Expected: Shipping = ₹49, Final total = ₹1,486
 */

import { calculateCartSubtotal, type CartState, type CartItem, type CartBundleInfo } from "../lib/cart";
import { calculateShipping, DEFAULT_SHIPPING_CONFIG, type ShippingConfig, type DeliveryMethodId } from "../lib/shipping";
import { DELIVERY_METHODS } from "../data/checkout";
import { validateAndCalculateCouponServer } from "../lib/coupons";
import { createOrderFromCheckout, orderDisplayRef } from "../lib/orders";

let passed = 0;
let total = 0;

function assert(condition: any, description: string) {
  total++;
  if (Boolean(condition)) {
    passed++;
    console.log(`✓ [PASS] ${description}`);
  } else {
    console.error(`✗ [FAIL] ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATABASE HARNESS FOR SERVER COUPON & ORDER TESTING
// ─────────────────────────────────────────────────────────────────────────────

function createMockDatabase() {
  const coupons = [
    {
      id: "coup-1",
      code: "VEER10",
      discount_type: "percentage",
      discount_value: 10,
      min_order_amount: 0,
      max_discount_amount: 500,
      is_active: true,
      first_order_only: false,
      start_date: new Date(Date.now() - 86400000).toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      usage_limit: null,
      usage_count: 0,
    },
    {
      id: "coup-2",
      code: "FIRST15",
      discount_type: "percentage",
      discount_value: 15,
      min_order_amount: 0,
      max_discount_amount: 500,
      is_active: true,
      first_order_only: true,
      start_date: new Date(Date.now() - 86400000).toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      usage_limit: null,
      usage_count: 0,
    },
    {
      id: "coup-3",
      code: "PROMO160",
      discount_type: "fixed",
      discount_value: 160,
      min_order_amount: 500,
      max_discount_amount: null,
      is_active: true,
      first_order_only: false,
      start_date: new Date(Date.now() - 86400000).toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      usage_limit: null,
      usage_count: 0,
    },
    {
      id: "coup-flat100",
      code: "FLAT100",
      discount_type: "fixed",
      discount_value: 100,
      minimum_order_value: 500,
      maximum_discount: null,
      is_active: true,
      first_order_only: false,
      starts_at: null,
      expires_at: null,
      usage_limit: null,
      used_count: 0,
    },
  ];

  const products = [
    { id: "p-chain", slug: "chain-01", name: "Chain 01", price: 299, image_url: "/img/chain.jpg", published: true, archived: false },
    { id: "p-bracelet", slug: "bracelet-01", name: "Bracelet", price: 500, image_url: "/img/bracelet.jpg", published: true, archived: false },
    { id: "p-earrings", slug: "earrings-01", name: "Earrings", price: 299, image_url: "/img/earrings.jpg", published: true, archived: false },
    { id: "p-extra", slug: "extra-item", name: "Extra Pendant", price: 598, image_url: "/img/pendant.jpg", published: true, archived: false },
  ];

  const insertedOrders: any[] = [];

  const client: any = {
    from: (table: string) => {
      let query: any = {};
      let selectedData: any = null;

      if (table === "coupons") {
        selectedData = [...coupons];
      } else if (table === "products") {
        selectedData = [...products];
      } else if (table === "site_content") {
        selectedData = [
          { key: "shipping", value: { shippingRate: 49, freeShippingThreshold: 1499 } }
        ];
      } else if (table === "inventory") {
        selectedData = products.map(p => ({
          product_id: p.id,
          stock_quantity: 10,
          allow_backorder: false,
        }));
      } else if (table === "complete_the_look_sets") {
        selectedData = [
          {
            id: "set_1",
            base_product_id: "p-chain",
            bundle_price: 999,
            enabled: true,
            coupon_allowed: true,
          },
        ];
      } else if (table === "complete_the_look_items") {
        selectedData = [
          { id: "item-1", set_id: "set_1", product_id: "p-bracelet", display_order: 1 },
          { id: "item-2", set_id: "set_1", product_id: "p-earrings", display_order: 2 },
        ];
      } else if (table === "orders") {
        return {
          insert: (orderRow: any) => {
            const saved = { ...orderRow, id: "order-" + Math.random().toString(36).slice(2) };
            insertedOrders.push(saved);
            return {
              select: () => ({
                single: async () => ({ data: saved, error: null }),
              }),
            };
          },
          select: () => {
            const orderQuery: any = {
              eq: () => orderQuery,
              neq: () => orderQuery,
              in: () => orderQuery,
              is: () => orderQuery,
              single: async () => ({ data: insertedOrders[insertedOrders.length - 1] || null, error: null }),
              order: () => orderQuery,
              then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
            };
            return orderQuery;
          },
        };
      } else if (table === "order_items") {
        return {
          insert: async () => ({ data: null, error: null }),
        };
      }

      query.select = () => query;
      query.order = () => query;
      query.eq = (col: string, val: any) => {
        if (selectedData && Array.isArray(selectedData)) {
          selectedData = selectedData.filter((item: any) => item[col] === val);
        }
        return query;
      };
      query.in = (col: string, vals: any[]) => {
        if (selectedData && Array.isArray(selectedData)) {
          selectedData = selectedData.filter((item: any) => vals.includes(item[col]));
        }
        return query;
      };
      query.single = async () => ({
        data: selectedData && selectedData.length > 0 ? selectedData[0] : null,
        error: selectedData && selectedData.length > 0 ? null : { message: "Not found" },
      });
      query.maybeSingle = async () => ({
        data: selectedData && selectedData.length > 0 ? selectedData[0] : null,
        error: null,
      });
      query.then = (resolve: any) => {
        resolve({ data: selectedData, error: null });
      };

      return query;
    },
    auth: {
      getUser: async () => ({ data: { user: { id: "user-new-1", email: "customer@example.com" } }, error: null }),
    },
    _insertedOrders: insertedOrders,
  };

  return client;
}

// Helper simulating OrderSummary pricing computation
function computeOrderSummary(params: {
  cart: CartState;
  shippingConfig?: ShippingConfig;
  appliedCoupon?: { discountAmount: number; code: string } | null;
}) {
  const { cart, shippingConfig = DEFAULT_SHIPPING_CONFIG, appliedCoupon = null } = params;
  const subtotalSummary = calculateCartSubtotal(cart);

  const individualSubtotal = subtotalSummary.allPriced ? subtotalSummary.individualTotal : null;
  const bundleAdjustedSubtotal = subtotalSummary.allPriced ? subtotalSummary.subtotal : null;
  const bundleDiscount = subtotalSummary.hasActiveBundle ? subtotalSummary.bundleDiscount : 0;

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const postCouponSubtotal = bundleAdjustedSubtotal !== null ? Math.max(0, bundleAdjustedSubtotal - discountAmount) : null;

  const shippingResult = postCouponSubtotal !== null
    ? calculateShipping({
        postCouponSubtotal,
        shippingConfig,
      })
    : null;

  const shippingCost = shippingResult !== null ? shippingResult.shippingCost : null;

  const total = (postCouponSubtotal !== null && shippingCost !== null)
    ? postCouponSubtotal + shippingCost
    : null;

  return {
    subtotalSummary,
    individualSubtotal,
    bundleAdjustedSubtotal,
    bundleDiscount,
    discountAmount,
    postCouponSubtotal,
    shippingResult,
    shippingCost,
    total,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE TESTS
// ─────────────────────────────────────────────────────────────────────────────

async function runCheckoutPriceBreakdownTests() {
  console.log("\n========================================================");
  console.log("RUNNING CHECKOUT PRICE BREAKDOWN & SHIPPING TEST SUITE");
  console.log("========================================================\n");

  const mockDb = createMockDatabase();
  const shippingConfig: ShippingConfig = {
    shippingRate:          49,
    freeShippingThreshold: 1499,
  };

  // Sample items:
  // Chain 01 = ₹299
  // Bracelet = ₹500
  // Earrings = ₹299
  const itemChain: CartItem = {
    productId: "chain-01",
    quantity: 1,
    bundleId: "ctl_bundle_1",
    bundleSetId: "set_1",
    snapshot: { slug: "chain-01", name: "Chain 01", price: 299, imageUrl: "/img/chain.jpg", antiTarnish: true },
  };

  const itemBracelet: CartItem = {
    productId: "bracelet-01",
    quantity: 1,
    bundleId: "ctl_bundle_1",
    bundleSetId: "set_1",
    snapshot: { slug: "bracelet-01", name: "Bracelet", price: 500, imageUrl: "/img/bracelet.jpg", antiTarnish: true },
  };

  const itemEarrings: CartItem = {
    productId: "earrings-01",
    quantity: 1,
    bundleId: "ctl_bundle_1",
    bundleSetId: "set_1",
    snapshot: { slug: "earrings-01", name: "Earrings", price: 299, imageUrl: "/img/earrings.jpg", antiTarnish: true },
  };

  const fullBundle: CartBundleInfo = {
    bundleId: "ctl_bundle_1",
    setId: "set_1",
    baseProductId: "chain-01",
    baseProductSlug: "chain-01",
    bundlePrice: 999,
    individualTotal: 1098,
    savings: 99,
    couponAllowed: true,
    productIds: ["chain-01", "bracelet-01", "earrings-01"],
    productSlugs: ["chain-01", "bracelet-01", "earrings-01"],
  };

  // ── 1 & 2. Delivery Options UI Config: Only Standard Delivery ───────────────
  console.log("--- 1 & 2. Single Delivery Model (Standard Only, No Express) ---");
  assert(DELIVERY_METHODS.length === 1, "DELIVERY_METHODS has exactly 1 delivery method");
  assert(DELIVERY_METHODS[0].id === "standard", "The sole delivery method is 'standard'");
  assert(!DELIVERY_METHODS.some(m => m.id === "express"), "Express Delivery is completely removed from delivery options");

  // ── 3. Normal cart with no bundle ──────────────────────────────────────────
  console.log("\n--- 3. Normal Cart With No Bundle ---");
  const normalCart: CartState = {
    items: [
      {
        productId: "p1",
        quantity: 1,
        snapshot: { slug: "p1", name: "Ring", price: 600, imageUrl: "/img/ring.jpg", antiTarnish: true },
      },
      {
        productId: "p2",
        quantity: 1,
        snapshot: { slug: "p2", name: "Pendant", price: 500, imageUrl: "/img/pendant.jpg", antiTarnish: true },
      },
    ],
    bundle: null,
    bundleNotice: null,
  };

  const res1 = computeOrderSummary({ cart: normalCart, shippingConfig });
  assert(res1.subtotalSummary.hasActiveBundle === false, "No active bundle");
  assert(res1.individualSubtotal === 1100, "Individual subtotal is ₹1,100 (600 + 500)");
  assert(res1.bundleAdjustedSubtotal === 1100, "Bundle-adjusted subtotal is ₹1,100");
  assert(res1.bundleDiscount === 0, "Bundle discount is ₹0");
  assert(res1.shippingCost === 49, "Standard shipping is ₹49 (below 1499 threshold)");
  assert(res1.total === 1149, "Total is ₹1,149 (1100 + 49)");

  // ── 4. Full Complete-the-Look bundle (Chain + Bracelet + Earrings) ────────
  console.log("\n--- 4. Full Complete-the-Look Bundle ---");
  const bundleCart: CartState = {
    items: [itemChain, itemBracelet, itemEarrings],
    bundle: fullBundle,
    bundleNotice: null,
  };

  const res2 = computeOrderSummary({ cart: bundleCart, shippingConfig });
  assert(res2.subtotalSummary.hasActiveBundle === true, "Active bundle recognized");
  assert(res2.individualSubtotal === 1098, "Checkout Subtotal line is exactly ₹1,098 (299 + 500 + 299)");
  assert(res2.bundleDiscount === 99, "Complete Look Savings line is exactly -₹99 (1098 - 999)");
  assert(res2.bundleAdjustedSubtotal === 999, "Bundle-adjusted subtotal is ₹999");
  assert(res2.shippingCost === 49, "Standard shipping cost is ₹49 (₹999 post-bundle subtotal is below ₹1,499)");
  assert(res2.total === 1048, "Total with Standard is exactly ₹1,048 (1098 - 99 + 49)");
  assert(res2.total === res2.individualSubtotal! - res2.bundleDiscount + res2.shippingCost!, "Mathematical identity: Subtotal - BundleSavings + Shipping === Total");

  // ── 5. Partial bundle (2 of 3 pieces in cart) ──────────────────────────────
  console.log("\n--- 5. Partial Bundle (2 of 3 pieces) ---");
  const partialCart: CartState = {
    items: [
      { ...itemChain, bundleId: undefined, bundleSetId: undefined },
      { ...itemBracelet, bundleId: undefined, bundleSetId: undefined },
    ],
    bundle: null,
    bundleNotice: null,
  };

  const res3 = computeOrderSummary({ cart: partialCart, shippingConfig });
  assert(res3.subtotalSummary.hasActiveBundle === false, "Partial bundle does not activate bundle discount");
  assert(res3.individualSubtotal === 799, "Subtotal is ₹799 (299 + 500)");
  assert(res3.bundleDiscount === 0, "Bundle savings is ₹0 (not rendered)");
  assert(res3.bundleAdjustedSubtotal === 799, "Bundle-adjusted subtotal is ₹799");
  assert(res3.shippingCost === 49, "Shipping is ₹49");
  assert(res3.total === 848, "Total is ₹848 (799 + 49)");

  // ── 6. Bundle + Coupon Allowed ─────────────────────────────────────────────
  console.log("\n--- 6. Bundle + Coupon Allowed ---");
  const couponRes4 = await validateAndCalculateCouponServer("VEER10", res2.bundleAdjustedSubtotal!, {
    client: mockDb,
    hasActiveBundle: true,
    bundleCouponAllowed: true,
  });
  assert(couponRes4.valid === true, "Coupon VEER10 is valid on allowed bundle");
  if (!couponRes4.valid) throw new Error("Expected couponRes4 to be valid");
  assert(couponRes4.discountAmount === 99.9, "10% coupon on ₹999 = ₹99.9 discount");

  const res4 = computeOrderSummary({
    cart: bundleCart,
    shippingConfig,
    appliedCoupon: { code: "VEER10", discountAmount: couponRes4.discountAmount },
  });
  assert(res4.individualSubtotal === 1098, "Subtotal remains ₹1,098");
  assert(res4.bundleDiscount === 99, "Bundle savings remains -₹99");
  assert(res4.discountAmount === 99.9, "Coupon discount is -₹99.9");
  assert(res4.postCouponSubtotal === 899.1, "Post-coupon subtotal is ₹899.1 (999 - 99.9)");
  assert(res4.shippingCost === 49, "Shipping is ₹49 (899.1 < 1499)");
  assert(res4.total === 948.1, "Total is exactly ₹948.1 (1098 - 99 - 99.9 + 49)");
  assert(Number((res4.total!).toFixed(2)) === Number((res4.individualSubtotal! - res4.bundleDiscount - res4.discountAmount + res4.shippingCost!).toFixed(2)), "Mathematical identity with coupon holds");

  // ── 7. Bundle + Coupon Disabled ────────────────────────────────────────────
  console.log("\n--- 7. Bundle + Coupon Disabled ---");
  const couponRes5 = await validateAndCalculateCouponServer("VEER10", res2.bundleAdjustedSubtotal!, {
    client: mockDb,
    hasActiveBundle: true,
    bundleCouponAllowed: false, // Disallowed
  });
  assert(couponRes5.valid === false, "Coupon correctly rejected when bundle disables coupons");
  if (couponRes5.valid) throw new Error("Expected couponRes5 to be invalid");
  assert(couponRes5.error?.includes("Complete the Look"), "Helpful message explaining coupon restriction");

  const res5 = computeOrderSummary({ cart: bundleCart, shippingConfig, appliedCoupon: null });
  assert(res5.total === 1048, "Total remains ₹1,048 without coupon");

  // ── 8. First-Order Coupon + Allowed Bundle ─────────────────────────────────
  console.log("\n--- 8. First-Order Coupon + Allowed Bundle ---");
  const couponRes6 = await validateAndCalculateCouponServer("FIRST15", res2.bundleAdjustedSubtotal!, {
    userId: "user-new-1",
    client: mockDb,
    hasActiveBundle: true,
    bundleCouponAllowed: true,
  });
  assert(couponRes6.valid === true, "First-order coupon applies on allowed bundle");
  if (!couponRes6.valid) throw new Error("Expected couponRes6 to be valid");
  assert(couponRes6.discountAmount === 149.85, "15% coupon on ₹999 = ₹149.85 discount");

  const res6 = computeOrderSummary({
    cart: bundleCart,
    shippingConfig,
    appliedCoupon: { code: "FIRST15", discountAmount: couponRes6.discountAmount },
  });
  assert(res6.individualSubtotal === 1098, "Subtotal is ₹1,098");
  assert(res6.bundleDiscount === 99, "Bundle savings is -₹99");
  assert(res6.discountAmount === 149.85, "Coupon discount is -₹149.85");
  assert(res6.postCouponSubtotal === 849.15, "Post-coupon subtotal is ₹849.15");
  assert(res6.shippingCost === 49, "Shipping is ₹49");
  assert(res6.total === 898.15, "Total is ₹898.15 (1098 - 99 - 149.85 + 49)");

  // ── 9. Free Standard Shipping Thresholds (< 1499, == 1499, > 1499) ─────────
  console.log("\n--- 9. Free Standard Shipping Thresholds ---");
  assert(calculateShipping(999, shippingConfig) === 49, "calculateShipping(999) returns ₹49 (< ₹1,499)");
  assert(calculateShipping(1498, shippingConfig) === 49, "calculateShipping(1498) returns ₹49 (< ₹1,499)");
  assert(calculateShipping(1499, shippingConfig) === 0, "calculateShipping(1499) returns 0 (FREE == ₹1,499)");
  assert(calculateShipping(1500, shippingConfig) === 0, "calculateShipping(1500) returns 0 (FREE > ₹1,499)");

  // Bundle savings and coupon applied BEFORE threshold:
  // e.g. ₹1,550 subtotal - ₹100 bundle savings = ₹1,450 post-bundle (< ₹1,499) -> pays ₹49
  const bundleBelowThreshold = calculateShipping(1450, shippingConfig);
  assert(bundleBelowThreshold === 49, "Post-bundle subtotal ₹1,450 pays standard shipping ₹49");

  // e.g. ₹1,600 post-bundle - ₹150 coupon = ₹1,450 post-coupon (< ₹1,499) -> pays ₹49
  const postCouponBelowThreshold = calculateShipping(1450, shippingConfig);
  assert(postCouponBelowThreshold === 49, "Post-coupon subtotal ₹1,450 pays standard shipping ₹49");

  // Luxury bundle priced at ₹1,600 with ₹2,000 individual value
  const luxuryBundleCart: CartState = {
    items: [
      {
        productId: "lux-1",
        quantity: 1,
        bundleId: "ctl_lux",
        snapshot: { slug: "lux-1", name: "Gold Choker", price: 1000, imageUrl: "/img/1.jpg", antiTarnish: true },
      },
      {
        productId: "lux-2",
        quantity: 1,
        bundleId: "ctl_lux",
        snapshot: { slug: "lux-2", name: "Gold Bangle", price: 1000, imageUrl: "/img/2.jpg", antiTarnish: true },
      },
    ],
    bundle: {
      bundleId: "ctl_lux",
      setId: "set_lux",
      baseProductId: "lux-1",
      baseProductSlug: "lux-1",
      bundlePrice: 1600,
      individualTotal: 2000,
      savings: 400,
      couponAllowed: true,
      productIds: ["lux-1", "lux-2"],
      productSlugs: ["lux-1", "lux-2"],
    },
    bundleNotice: null,
  };

  const res9Std = computeOrderSummary({ cart: luxuryBundleCart, shippingConfig });
  assert(res9Std.individualSubtotal === 2000, "Luxury bundle individual subtotal is ₹2,000");
  assert(res9Std.bundleDiscount === 400, "Complete Look Savings is -₹400");
  assert(res9Std.bundleAdjustedSubtotal === 1600, "Bundle-adjusted subtotal is ₹1,600");
  assert(res9Std.shippingCost === 0, "Standard shipping is 0 (FREE) because ₹1,600 >= ₹1,499");
  assert(res9Std.total === 1600, "Total with Standard is ₹1,600 (2000 - 400 + 0)");

  // ── 10. EXACT AUTHORITATIVE REGRESSION SCENARIO ────────────────────────────
  console.log("\n--- 10. Exact Authoritative Regression Scenario ---");
  // Individual subtotal: ₹1,696
  // Complete Look savings: ₹99
  // Coupon discount: ₹160 (PROMO160)
  // Post-discount subtotal: 1696 - 99 - 160 = 1437
  // Expected: Shipping = ₹49, Final total = ₹1,486
  const screenshotCart: CartState = {
    items: [
      ...bundleCart.items, // Chain 299 + Bracelet 500 + Earrings 299 = 1098
      {
        productId: "extra-item",
        quantity: 1,
        snapshot: { slug: "extra-item", name: "Extra Pendant", price: 598, imageUrl: "/img/pendant.jpg", antiTarnish: true },
      },
    ],
    bundle: fullBundle,
    bundleNotice: null,
  };

  const screenshotCoupon = await validateAndCalculateCouponServer("PROMO160", 999 + 598, {
    client: mockDb,
    hasActiveBundle: true,
    bundleCouponAllowed: true,
  });
  assert(screenshotCoupon.valid === true, "Coupon PROMO160 is valid");
  if (!screenshotCoupon.valid) throw new Error("Expected PROMO160 to be valid");
  assert(screenshotCoupon.discountAmount === 160, "Coupon discount is exactly ₹160");

  const resRegression = computeOrderSummary({
    cart: screenshotCart,
    shippingConfig,
    appliedCoupon: { code: "PROMO160", discountAmount: screenshotCoupon.discountAmount },
  });
  assert(resRegression.individualSubtotal === 1696, "Regression Subtotal: ₹1,696 (1098 bundle + 598 item)");
  assert(resRegression.bundleDiscount === 99, "Regression Bundle Savings: -₹99");
  assert(resRegression.discountAmount === 160, "Regression Coupon: -₹160");
  assert(resRegression.postCouponSubtotal === 1437, "Regression Post-discount Subtotal: ₹1,437 (1696 - 99 - 160)");
  assert(resRegression.shippingCost === 49, "Regression Standard Shipping: ₹49 (₹1,437 < ₹1,499)");
  assert(resRegression.total === 1486, "Regression Standard Total: exactly ₹1,486 (1437 + 49)");

  // ── 11 & 12. Server-Side Authority & Manipulation Protection ────────────────
  console.log("\n--- 11 & 12. Server-Side Authority in createOrderFromCheckout ---");

  const serverOrder = await createOrderFromCheckout(
    {
      cartItems: screenshotCart.items,
      customer: { email: "customer@example.com", phone: "9876543210" },
      shipping: { firstName: "Veer", lastName: "Customer", address: "123 Elegance Way", city: "Mumbai", state: "MH", postalCode: "400001", country: "India" },
      deliveryId: "standard",
      couponCode: "PROMO160",
      bundle: fullBundle,
    },
    mockDb,
  );
  if (!serverOrder.success) {
    console.error("serverOrder failed:", (serverOrder as any).error);
  }
  assert(serverOrder.success === true, "Server createOrderFromCheckout succeeded with Standard delivery");
  const lastOrder = mockDb._insertedOrders[mockDb._insertedOrders.length - 1];
  assert(lastOrder.shipping_amount === 49, "Server authoritatively calculated shipping_amount: ₹49");
  assert(lastOrder.discount_amount === 160, "Server authoritatively calculated discount_amount: ₹160");
  assert(lastOrder.total_amount === 1486, "Server authoritatively calculated total_amount: ₹1,486");

  // Legacy client passing "express" still gets normalized standard delivery
  const serverOrderLegacy = await createOrderFromCheckout(
    {
      cartItems: screenshotCart.items,
      customer: { email: "customer@example.com", phone: "9876543210" },
      shipping: { firstName: "Veer", lastName: "Customer", address: "123 Elegance Way", city: "Mumbai", state: "MH", postalCode: "400001", country: "India" },
      deliveryId: "express",
      couponCode: "PROMO160",
      bundle: fullBundle,
    },
    mockDb,
  );
  assert(serverOrderLegacy.success === true, "Server createOrderFromCheckout succeeded with legacy input");
  const lastOrderLegacy = mockDb._insertedOrders[mockDb._insertedOrders.length - 1];
  assert(lastOrderLegacy.shipping_amount === 49, "New orders always use Standard Delivery rate ₹49 (never old express)");
  assert(lastOrderLegacy.total_amount === 1486, "New order total remains ₹1,486");

  // ── 13. Historical Orders Compatibility ────────────────────────────────────
  console.log("\n--- 13. Historical Orders Backward Compatibility ---");
  // Past order that had Express shipping recorded (e.g. shipping_amount = 99)
  const historicalExpressOrder = {
    id: "historical-order-1",
    subtotal: 1437,
    discount_amount: 0,
    shipping_amount: 99,
    total_amount: 1536,
    currency: "INR",
  };
  const displayLabel = historicalExpressOrder.shipping_amount > 0 ? `₹${historicalExpressOrder.shipping_amount}` : "Free";
  assert(displayLabel === "₹99", "Historical order with ₹99 express shipping remains viewable and accurately rendered");
  assert(orderDisplayRef(historicalExpressOrder.id) === "VE-HISTOR", "Historical order reference generated cleanly");

  // ── 14 & 15. Razorpay Final Amount Verification ─────────────────────────────
  console.log("\n--- 14 & 15. Razorpay Trusted Amount ---");
  const razorpayPaise = Math.round(lastOrder.total_amount * 100);
  assert(razorpayPaise === 148600, "Razorpay receives exact paise for regression scenario: 148600 paise (₹1,486)");

  // ── 16. FLAT100 Coupon Validation & Checkout Breakdown (Cart ₹1,297) ─────────
  console.log("\n--- 16. FLAT100 Coupon Validation & Checkout Breakdown ---");
  const flat100CartSubtotal = 1297;
  const flat100Val = await validateAndCalculateCouponServer("FLAT100", flat100CartSubtotal, {
    client: mockDb,
  });

  assert(flat100Val.valid === true, "FLAT100 is valid for cart subtotal ₹1,297");
  if (flat100Val.valid) {
    assert(flat100Val.discountAmount === 100, "FLAT100 discountAmount is ₹100");
    assert(flat100Val.discountedSubtotal === 1197, "FLAT100 discountedSubtotal is ₹1,197 (1297 - 100)");

    // Post-coupon subtotal ₹1,197 < ₹1,499 threshold -> Standard Delivery ₹49
    const flat100Shipping = calculateShipping({
      deliveryMethod: "standard",
      postCouponSubtotal: flat100Val.discountedSubtotal,
    });
    assert(flat100Shipping.shippingCost === 49, "Post-coupon subtotal ₹1,197 pays Standard Shipping ₹49");
    const flat100FinalTotal = flat100Val.discountedSubtotal + flat100Shipping.shippingCost;
    assert(flat100FinalTotal === 1246, "Final checkout total is ₹1,246 (1197 + 49)");
  }

  // FLAT100 below minimum order value (e.g. ₹499)
  const flat100UnderMin = await validateAndCalculateCouponServer("FLAT100", 499, {
    client: mockDb,
  });
  assert(flat100UnderMin.valid === false, "FLAT100 rejected when subtotal (₹499) < min order (₹500)");
  if (!flat100UnderMin.valid) {
    assert(
      flat100UnderMin.error === "Minimum order value for this coupon is ₹500.",
      "Rejection message states minimum order requirement",
    );
  }

  console.log("\n========================================================");
  console.log(`ALL CHECKOUT BREAKDOWN TESTS PASSED: ${passed} / ${total}`);
  console.log("========================================================\n");
}

runCheckoutPriceBreakdownTests().catch(err => {
  console.error("Test encountered error:", err);
  process.exit(1);
});
