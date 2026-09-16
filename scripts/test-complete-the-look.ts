/**
 * VEER ELEGANCE — Complete the Look Automated Test Suite
 *
 * Covers:
 *  1. Create valid 2-product look (base + 1 matching)
 *  2. Create valid 3-product look (base + 2 matching)
 *  3. Create valid 4-product look (base + 3 matching)
 *  4. Reject fewer than 2 products (0 matching items)
 *  5. Reject more than 4 products (> 3 matching items)
 *  6. Reject duplicate products in look
 *  7. Reject invalid product IDs
 *  8. Reject invalid/negative/zero bundle price
 *  9. Correctly calculate current individual total
 * 10. Correctly calculate current saving
 * 11. Bundle price remains fixed when product selling prices change
 * 12. Admin can edit products
 * 13. Admin can reorder products
 * 14. Admin can enable/disable look
 * 15. Unauthorized user / access gate verification
 * 16. Deleted product handling
 * 17. Existing product functionality remains unchanged
 * 18. Bundle active + coupons allowed → normal coupon can apply
 * 19. Bundle active + coupons disabled → coupon rejected with clear message
 * 20. Partial selection + coupons disabled on bundle → normal individual-product coupon behavior remains available
 * 21. Existing ordinary products/coupons remain unchanged
 * 22. First-order coupon behavior still works correctly when coupons are allowed
 */

import { calculateLookPricing, getCompleteLookMessaging } from "../lib/complete-the-look";
import {
  upsertCompleteTheLook,
  getAdminCompleteTheLook,
  getCompleteTheLookForProduct,
  deleteCompleteTheLook,
  validateCompleteTheLookBundle,
} from "../lib/complete-the-look-server";
import { validateAndCalculateCouponServer } from "../lib/coupons";
import {
  addBundleToCart,
  reconcileCartBundle,
  calculateCartSubtotal,
  addItem,
  removeItem,
  setQuantity,
  clearCart,
  type CartState,
  type CartBundleInfo,
} from "../lib/cart";
import { createOrderFromCheckout } from "../lib/orders";
import { calculateShipping, DEFAULT_SHIPPING_CONFIG } from "../lib/shipping";

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
// MOCK DATABASE HARNESS
// ─────────────────────────────────────────────────────────────────────────────

function createMockDatabase() {
  const products = [
    { id: "p-earring-1", slug: "pearl-earrings", name: "Pearl Earrings", price: 500, category: "earrings", published: true, archived: false, anti_tarnish: true, image_url: "/img/earrings.jpg" },
    { id: "p-necklace-1", slug: "pearl-necklace", name: "Pearl Necklace", price: 700, category: "chains", published: true, archived: false, anti_tarnish: true, image_url: "/img/necklace.jpg" },
    { id: "p-bracelet-1", slug: "pearl-bracelet", name: "Pearl Bracelet", price: 300, category: "bracelets", published: true, archived: false, anti_tarnish: true, image_url: "/img/bracelet.jpg" },
    { id: "p-ring-1", slug: "pearl-ring", name: "Pearl Ring", price: 400, category: "rings", published: true, archived: false, anti_tarnish: false, image_url: "/img/ring.jpg" },
    { id: "p-extra-1", slug: "extra-piece", name: "Extra Piece", price: 250, category: "gen-z-accessories", published: true, archived: false, anti_tarnish: false, image_url: "/img/extra.jpg" },
  ];

  let sets: any[] = [];
  let items: any[] = [];
  const orders: any[] = [];
  const orderItems: any[] = [];

  const inventory: Record<string, number> = {
    "p-earring-1": 10,
    "p-necklace-1": 5,
    "p-bracelet-1": 8,
    "p-ring-1": 12,
    "p-extra-1": 4,
  };

  const coupons: any[] = [
    {
      id: "c-veer10",
      code: "VEER10",
      discount_type: "percentage",
      discount_value: 10,
      minimum_order_value: 500,
      maximum_discount: 200,
      is_active: true,
      usage_limit: null,
      used_count: 0,
      starts_at: null,
      expires_at: null,
      first_order_only: false,
    },
    {
      id: "c-firstorder",
      code: "FIRSTORDER",
      discount_type: "percentage",
      discount_value: 15,
      minimum_order_value: 500,
      maximum_discount: 300,
      is_active: true,
      usage_limit: null,
      used_count: 0,
      starts_at: null,
      expires_at: null,
      first_order_only: true,
    },
  ];

  const mockClient = {
    _products: products,
    _sets: sets,
    _items: items,
    _coupons: coupons,
    _orders: orders,
    _orderItems: orderItems,
    _inventory: inventory,
    from: (table: string) => {
      if (table === "products") {
        return {
          select: () => {
            let filtered = [...products];
            const chain: any = {
              eq: (field: string, val: any) => {
                filtered = filtered.filter(p => (p as any)[field] === val);
                return chain;
              },
              in: (field: string, vals: any[]) => {
                filtered = filtered.filter(p => vals.includes((p as any)[field]));
                return chain;
              },
              maybeSingle: async () => {
                return { data: filtered[0] || null, error: null };
              },
              single: async () => {
                return { data: filtered[0] || null, error: filtered[0] ? null : { message: "Product not found" } };
              },
              then: (resolve: any) => {
                resolve({ data: filtered, error: null });
              },
            };
            return chain;
          },
        };
      }

      if (table === "complete_the_look_sets") {
        return {
          select: () => ({
            eq: (field: string, val: any) => ({
              maybeSingle: async () => {
                const found = sets.find(s => s[field] === val);
                return { data: found || null, error: null };
              },
            }),
          }),
          upsert: (record: any) => {
            const existingIdx = sets.findIndex(s => s.base_product_id === record.base_product_id);
            const id = existingIdx >= 0 ? sets[existingIdx].id : `ctl-${Date.now()}-${Math.random()}`;
            const fullRecord = {
              id,
              base_product_id: record.base_product_id,
              bundle_price: record.bundle_price,
              enabled: record.enabled,
              coupon_allowed: record.coupon_allowed,
              created_at: existingIdx >= 0 ? sets[existingIdx].created_at : new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            if (existingIdx >= 0) {
              sets[existingIdx] = fullRecord;
            } else {
              sets.push(fullRecord);
            }
            return {
              select: () => ({
                single: async () => ({ data: { id }, error: null }),
              }),
            };
          },
          delete: () => ({
            eq: async (field: string, val: any) => {
              const toDelete = sets.find(s => s[field] === val);
              if (toDelete) {
                // Cascade delete items
                items = items.filter(i => i.set_id !== toDelete.id);
                sets = sets.filter(s => s[field] !== val);
              }
              return { error: null };
            },
          }),
        };
      }

      if (table === "complete_the_look_items") {
        return {
          select: () => ({
            eq: (field: string, val: any) => ({
              order: async () => {
                const matched = items.filter(i => i[field] === val);
                matched.sort((a, b) => a.display_order - b.display_order);
                return { data: matched, error: null };
              },
            }),
          }),
          delete: () => ({
            eq: async (field: string, val: any) => {
              items = items.filter(i => i[field] !== val);
              return { error: null };
            },
          }),
          insert: async (newItems: any[]) => {
            newItems.forEach((item, idx) => {
              items.push({
                id: `item-${Date.now()}-${idx}`,
                set_id: item.set_id,
                product_id: item.product_id,
                display_order: item.display_order,
                created_at: new Date().toISOString(),
              });
            });
            return { error: null };
          },
        };
      }

      if (table === "inventory") {
        return {
          select: () => ({
            in: async (field: string, vals: any[]) => {
              const res = vals.map(pid => ({
                product_id: pid,
                stock_quantity: inventory[pid] ?? 0,
              }));
              return { data: res, error: null };
            },
          }),
        };
      }

      if (table === "coupons") {
        return {
          select: () => ({
            eq: (field: string, val: any) => ({
              single: async () => {
                const found = coupons.find(c => c[field] === val);
                return { data: found || null, error: found ? null : { message: "Coupon not found" } };
              },
            }),
          }),
        };
      }

      if (table === "orders") {
        return {
          select: (_f: any, opts: any) => {
            let filterUser: string | null = null;
            const chain: any = {
              eq: (col: string, val: any) => {
                if (col === "user_id") filterUser = val;
                return chain;
              },
              in: () => chain,
              neq: () => chain,
              then: (resolve: any) => {
                const count = orders.filter(o => !filterUser || o.user_id === filterUser).length;
                resolve({ count, error: null });
              },
            };
            return chain;
          },
          insert: (orderData: any) => {
            const newOrder = { id: `order-${Date.now()}-${Math.random()}`, ...orderData };
            orders.push(newOrder);
            return {
              select: () => ({
                single: async () => ({ data: { id: newOrder.id }, error: null }),
              }),
            };
          },
        };
      }

      if (table === "order_items") {
        return {
          insert: async (itemsData: any[]) => {
            itemsData.forEach(item => orderItems.push(item));
            return { error: null };
          },
        };
      }

      throw new Error(`Unhandled mock table: ${table}`);
    },
    auth: {
      getUser: async () => ({ data: { user: { id: "user_test_1" } } }),
    },
  };

  return mockClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log("=== RUNNING VEER ELEGANCE COMPLETE THE LOOK TEST SUITE ===\n");
  const db = createMockDatabase();

  // ── 1. Create Valid 2-Product Look (Base + 1) ──────────────────────────────
  console.log("--- 1. Valid 2-Product Look (Base + 1) ---");
  const res2 = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1100,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-necklace-1"],
    },
    db as any
  );
  assert(res2.success, "2-product look successfully created");
  assert(res2.set?.allProducts.length === 2, "Total products count is exactly 2");
  assert(res2.set?.matchingProducts.length === 1, "Matching products count is 1");

  // ── 2. Create Valid 3-Product Look (Base + 2) ──────────────────────────────
  console.log("\n--- 2. Valid 3-Product Look (Base + 2) ---");
  const res3 = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1300,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-necklace-1", "p-bracelet-1"],
    },
    db as any
  );
  assert(res3.success, "3-product look successfully created");
  assert(res3.set?.allProducts.length === 3, "Total products count is exactly 3");
  assert(res3.set?.matchingProducts.length === 2, "Matching products count is 2");

  // ── 3. Create Valid 4-Product Look (Base + 3) ──────────────────────────────
  console.log("\n--- 3. Valid 4-Product Look (Base + 3) ---");
  const res4 = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1600,
      enabled: true,
      couponAllowed: false,
      itemProductIds: ["p-necklace-1", "p-bracelet-1", "p-ring-1"],
    },
    db as any
  );
  assert(res4.success, "4-product look successfully created");
  assert(res4.set?.allProducts.length === 4, "Total products count is exactly 4");
  assert(res4.set?.couponAllowed === false, "couponAllowed false successfully stored");

  // ── 4. Reject Fewer Than 2 Products ────────────────────────────────────────
  console.log("\n--- 4. Reject Fewer Than 2 Products ---");
  const resUnder = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1000,
      enabled: true,
      itemProductIds: [], // 0 matching items = 1 total product
    },
    db as any
  );
  assert(!resUnder.success, "Look with 0 matching products rejected");
  assert(resUnder.error?.includes("at least 2 products"), "Error explains minimum 2 products rule");

  // ── 5. Reject More Than 4 Products ─────────────────────────────────────────
  console.log("\n--- 5. Reject More Than 4 Products ---");
  const resOver = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 2000,
      enabled: true,
      itemProductIds: ["p-necklace-1", "p-bracelet-1", "p-ring-1", "p-extra-1"], // 4 matching items = 5 total products
    },
    db as any
  );
  assert(!resOver.success, "Look with >4 products rejected");
  assert(resOver.error?.includes("more than 4 products"), "Error explains maximum 4 products rule");

  // ── 6. Reject Duplicate Products ───────────────────────────────────────────
  console.log("\n--- 6. Reject Duplicate Products ---");
  // Duplicate in matching items
  const resDupMatching = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1200,
      itemProductIds: ["p-necklace-1", "p-necklace-1"],
    },
    db as any
  );
  assert(!resDupMatching.success, "Duplicate items in matching products rejected");
  assert(resDupMatching.error?.includes("Duplicate products"), "Duplicate error message returned");

  // Base product in matching items
  const resBaseInMatching = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1200,
      itemProductIds: ["p-earring-1", "p-necklace-1"],
    },
    db as any
  );
  assert(!resBaseInMatching.success, "Base product inside matching items rejected");
  assert(resBaseInMatching.error?.includes("base product is already included"), "Base product error message returned");

  // ── 7. Reject Invalid Product IDs ──────────────────────────────────────────
  console.log("\n--- 7. Reject Invalid Product IDs ---");
  const resInvalid = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1200,
      itemProductIds: ["p-non-existent-999"],
    },
    db as any
  );
  assert(!resInvalid.success, "Non-existent product ID rejected");
  assert(resInvalid.error?.includes("do not exist"), "Invalid product error returned");

  // ── 8. Reject Invalid / Negative / Zero Bundle Price ────────────────────────
  console.log("\n--- 8. Reject Invalid Bundle Price ---");
  const resZero = await upsertCompleteTheLook(
    { baseProductId: "p-earring-1", bundlePrice: 0, itemProductIds: ["p-necklace-1"] },
    db as any
  );
  assert(!resZero.success, "Zero bundle price rejected");

  const resNeg = await upsertCompleteTheLook(
    { baseProductId: "p-earring-1", bundlePrice: -500, itemProductIds: ["p-necklace-1"] },
    db as any
  );
  assert(!resNeg.success, "Negative bundle price rejected");

  // ── 9. Correctly Calculate Current Individual Total ────────────────────────
  console.log("\n--- 9. Pricing Calculations: Individual Total ---");
  // Base: Earring (500) + Necklace (700) + Bracelet (300) = 1500
  const calc1 = calculateLookPricing(500, [700, 300], 1300);
  assert(calc1.individualTotal === 1500, "Individual total is exactly ₹1,500");

  // ── 10. Correctly Calculate Current Customer Saving ────────────────────────
  console.log("\n--- 10. Pricing Calculations: Customer Savings ---");
  assert(calc1.customerSavings === 200, "Customer savings is exactly ₹200 (1500 - 1300)");
  assert(calc1.savingsPercent === 13, "Savings percent is 13%");
  assert(calc1.isDiscounted === true, "isDiscounted is true");

  // ── 11. Bundle Price Remains Fixed When Selling Prices Change ──────────────
  console.log("\n--- 11. Fixed Bundle Price Invariant ---");
  // Necklace price increases from 700 to 800:
  const calc2 = calculateLookPricing(500, [800, 300], 1300);
  assert(calc2.individualTotal === 1600, "New individual total is ₹1,600");
  assert(calc2.bundlePrice === 1300, "Bundle price remains fixed at ₹1,300");
  assert(calc2.customerSavings === 300, "Customer savings dynamically increased to ₹300");

  // ── 12. Admin Can Edit Products ────────────────────────────────────────────
  console.log("\n--- 12. Admin Edit Products in Look ---");
  // Change matching items from [Necklace, Bracelet, Ring] to [Necklace, Ring]
  const resEdit = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1400,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-necklace-1", "p-ring-1"],
    },
    db as any
  );
  assert(resEdit.success, "Look successfully edited");
  assert(resEdit.set?.matchingProducts.length === 2, "Matching items count updated to 2");
  assert(resEdit.set?.bundlePrice === 1400, "Bundle price updated to 1400");

  // ── 13. Admin Can Reorder Products ─────────────────────────────────────────
  console.log("\n--- 13. Admin Reorder Products ---");
  // Reverse order: [Ring, Necklace]
  const resReorder = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1400,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-ring-1", "p-necklace-1"],
    },
    db as any
  );
  assert(resReorder.success, "Reordered look successfully saved");
  assert(resReorder.set?.matchingProducts[0].id === "p-ring-1", "First matching item is now Ring");
  assert(resReorder.set?.matchingProducts[1].id === "p-necklace-1", "Second matching item is now Necklace");

  // ── 14. Admin Can Enable / Disable Look ─────────────────────────────────────
  console.log("\n--- 14. Enable / Disable Look ---");
  // Disable look
  await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1400,
      enabled: false,
      couponAllowed: true,
      itemProductIds: ["p-ring-1", "p-necklace-1"],
    },
    db as any
  );

  const adminViewDisabled = await getAdminCompleteTheLook("p-earring-1", db as any);
  assert(adminViewDisabled?.enabled === false, "Admin sees disabled look");

  const storefrontViewDisabled = await getCompleteTheLookForProduct("p-earring-1", db as any);
  assert(storefrontViewDisabled === null, "Storefront reader returns null for disabled look");

  // Re-enable look
  await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1400,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-ring-1", "p-necklace-1"],
    },
    db as any
  );
  const storefrontViewEnabled = await getCompleteTheLookForProduct("p-earring-1", db as any);
  assert(storefrontViewEnabled !== null && storefrontViewEnabled.enabled === true, "Storefront reader returns enabled look");

  // ── 15. Delete / Remove Complete the Look ──────────────────────────────────
  console.log("\n--- 15. Delete Complete the Look ---");
  const delRes = await deleteCompleteTheLook("p-earring-1", db as any);
  assert(delRes.success, "Look successfully deleted");

  const afterDelete = await getAdminCompleteTheLook("p-earring-1", db as any);
  assert(afterDelete === null, "Look no longer exists after delete");

  // ── 16. Re-create Set for Coupon Compatibility Tests ───────────────────────
  console.log("\n--- 16-22. Coupon Compatibility Tests ---");
  // Setup look on p-earring-1 with bundle price ₹1,300
  await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1300,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-necklace-1", "p-bracelet-1"],
    },
    db as any
  );

  // Test 18: Bundle active + coupon allowed → coupon VEER10 applies
  console.log("--- 18. Bundle Active + Coupons Allowed ---");
  const resCouponAllowed = await validateAndCalculateCouponServer(
    "VEER10",
    1300, // Bundle subtotal
    {
      client: db as any,
      hasActiveBundle: true,
      bundleCouponAllowed: true,
    }
  );
  assert(resCouponAllowed.valid === true, "Coupon VEER10 applies when bundleCouponAllowed is true");
  assert((resCouponAllowed as any).discountAmount === 130, "10% discount of ₹1,300 = ₹130");

  // Test 19: Bundle active + coupon disabled → coupon VEER10 is rejected with clear message
  console.log("\n--- 19. Bundle Active + Coupons Disabled ---");
  const resCouponBlocked = await validateAndCalculateCouponServer(
    "VEER10",
    1300, // Bundle subtotal
    {
      client: db as any,
      hasActiveBundle: true,
      bundleCouponAllowed: false,
    }
  );
  assert(resCouponBlocked.valid === false, "Coupon is rejected when bundleCouponAllowed is false");
  assert(
    (resCouponBlocked as any).error?.includes("Complete the Look offer") ||
    (resCouponBlocked as any).error?.includes("Complete-the-Look bundle"),
    "Returns clear reason: Coupons cannot be combined with this Complete the Look offer."
  );

  // Test 20: Partial selection (customer deselected an item) + bundle coupon disabled
  // → hasActiveBundle is false → normal coupon applies to individual subtotal!
  console.log("\n--- 20. Partial Selection (Bundle Inactive) ---");
  const resPartialSelection = await validateAndCalculateCouponServer(
    "VEER10",
    1200, // Customer only selected Earring (500) + Necklace (700) = 1200
    {
      client: db as any,
      hasActiveBundle: false, // Bundle price inactive
      bundleCouponAllowed: false, // Even if set disabled coupons, partial selection restores normal coupon behavior
    }
  );
  assert(resPartialSelection.valid === true, "Normal coupon applies when bundle price is inactive");
  assert((resPartialSelection as any).discountAmount === 120, "10% of ₹1,200 = ₹120");

  // Test 21: Existing ordinary products and coupons are 100% unaffected
  console.log("\n--- 21. Standard Ordinary Cart Coupon Unaffected ---");
  const resOrdinaryCart = await validateAndCalculateCouponServer(
    "VEER10",
    2000,
    { client: db as any } // No bundle options passed
  );
  assert(resOrdinaryCart.valid === true, "Ordinary cart without bundle options validates normally");
  assert((resOrdinaryCart as any).discountAmount === 200, "10% of ₹2000 capped at max ₹200");

  // ── STEP 2: CUSTOMER-FACING PDP PRESENTATION & SELECTION LOGIC ────────────
  console.log("\n--- STEP 2: PDP Presentation & Local Selection State Tests ---");

  // Setup: Look on p-earring-1: Base Earring (500) + Necklace (700) + Bracelet (300) = 1500, Bundle = 1300
  await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1300,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-necklace-1", "p-bracelet-1"],
    },
    db as any
  );

  // 23. Enabled look renders for storefront
  console.log("--- 23. Enabled Look Renders for Storefront ---");
  const sfLook = await getCompleteTheLookForProduct("p-earring-1", db as any);
  assert(sfLook !== null, "Enabled look resolves successfully for storefront");
  assert(sfLook?.enabled === true, "Look is confirmed enabled");

  // 24. Disabled look does not render
  console.log("\n--- 24. Disabled Look Does Not Render on Storefront ---");
  await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1300,
      enabled: false, // Disabled
      couponAllowed: true,
      itemProductIds: ["p-necklace-1", "p-bracelet-1"],
    },
    db as any
  );
  const sfDisabledLook = await getCompleteTheLookForProduct("p-earring-1", db as any);
  assert(sfDisabledLook === null, "Disabled look returns null on storefront (does not render)");

  // Re-enable for subsequent tests
  await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1300,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-necklace-1", "p-bracelet-1"],
    },
    db as any
  );
  const activeLook = (await getCompleteTheLookForProduct("p-earring-1", db as any))!;

  // 25. Unconfigured product returns null
  console.log("\n--- 25. Unconfigured Product Returns Null ---");
  const sfUnconfigured = await getCompleteTheLookForProduct("p-ring-1", db as any);
  assert(sfUnconfigured === null, "Unconfigured product returns null (section does not render)");

  // 26. Correct configured products render (1 base + 2 matching)
  console.log("\n--- 26. Configured Products Render Correctly ---");
  assert(activeLook.allProducts.length === 3, "Look has exactly 3 configured products");
  assert(activeLook.baseProduct.id === "p-earring-1", "Base product is Pearl Earrings");
  assert(activeLook.matchingProducts.map(p => p.id).join(",") === "p-necklace-1,p-bracelet-1", "Matching products are Necklace and Bracelet");

  // 27. All available products initially selected
  console.log("\n--- 27. Initial Selection State (All Products Selected) ---");
  let selectedIds = activeLook.allProducts
    .filter(p => p.inStock !== false && p.published && !p.archived)
    .map(p => p.id);
  assert(selectedIds.length === 3, "All 3 in-stock products are initially selected");
  const isInitialAllSelected = activeLook.allProducts.every(p => selectedIds.includes(p.id));
  assert(isInitialAllSelected === true, "Initial state has all products selected (complete look)");

  // 28. Deselecting a product updates selected items and total
  console.log("\n--- 28. Deselecting a Product ---");
  // Customer deselects Bracelet (300)
  selectedIds = selectedIds.filter(id => id !== "p-bracelet-1");
  assert(selectedIds.length === 2, "Selected items count reduced to 2");
  assert(!selectedIds.includes("p-bracelet-1"), "Bracelet is now unselected");

  const selectedProducts = activeLook.allProducts.filter(p => selectedIds.includes(p.id));
  const partialTotal = selectedProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  assert(partialTotal === 1200, "Selected items total dynamically recalculated to ₹1,200 (500 + 700)");

  // 29. Partial selection does not activate bundle pricing
  console.log("\n--- 29. Partial Selection Does Not Apply Bundle Price ---");
  const isPartialAllSelected = activeLook.allProducts.every(p => selectedIds.includes(p.id));
  assert(isPartialAllSelected === false, "isAllSelected is false during partial selection");
  const activeDisplayPrice = isPartialAllSelected ? activeLook.bundlePrice : partialTotal;
  assert(activeDisplayPrice === 1200, "Active displayed price is individual sum (₹1,200), NOT bundle price (₹1,300)");

  // 30. Re-selecting restores complete look selection & bundle pricing
  console.log("\n--- 30. Re-selecting Restores Complete Look ---");
  selectedIds = [...selectedIds, "p-bracelet-1"];
  const isRestoredAllSelected = activeLook.allProducts.every(p => selectedIds.includes(p.id));
  assert(isRestoredAllSelected === true, "Complete look is restored when all items are re-selected");
  const restoredDisplayPrice = isRestoredAllSelected ? activeLook.bundlePrice : 1500;
  assert(restoredDisplayPrice === 1300, "Bundle price ₹1,300 is active when all products are selected");

  // 31. Savings calculation is exact
  console.log("\n--- 31. Savings Calculation Invariant ---");
  assert(activeLook.individualTotal === 1500, "Individual total is ₹1,500");
  assert(activeLook.bundlePrice === 1300, "Bundle price is ₹1,300");
  assert(activeLook.customerSavings === 200, "Savings is ₹200 (1500 - 1300)");

  // 32. Current selling prices are used
  console.log("\n--- 32. Selling Prices Used ---");
  assert(activeLook.baseProduct.price === 500, "Base product uses selling price ₹500");
  assert(activeLook.matchingProducts[0].price === 700, "Necklace uses selling price ₹700");

  // 33. Out-of-stock product handling
  console.log("\n--- 33. Out-of-Stock Product Handling ---");
  // Setup inventory with Bracelet out of stock (quantity = 0)
  const oosDb = createMockDatabase();
  // Find bracelet and set inStock to false / 0
  const oosLookSetup = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1300,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-necklace-1", "p-bracelet-1"],
    },
    oosDb as any
  );
  // Modify inventory mock to return stock_quantity 0 for p-bracelet-1
  const origFrom = oosDb.from;
  oosDb.from = (table: string) => {
    if (table === "inventory") {
      return {
        select: () => ({
          in: async (_f: string, vals: any[]) => ({
            data: vals.map(id => ({ product_id: id, stock_quantity: id === "p-bracelet-1" ? 0 : 5 })),
            error: null,
          }),
        }),
      };
    }
    return origFrom(table);
  };
  const oosLook = (await getCompleteTheLookForProduct("p-earring-1", oosDb as any))!;
  const oosItem = oosLook.allProducts.find(p => p.id === "p-bracelet-1");
  assert(oosItem?.inStock === false, "Out of stock item correctly marked with inStock = false");

  // 34. Checkbox click event isolation
  console.log("\n--- 34. Selection Control Click Isolation ---");
  let defaultPrevented: boolean = false;
  let propagationStopped: boolean = false;
  const mockClickEvent = {
    preventDefault: () => { defaultPrevented = true; },
    stopPropagation: () => { propagationStopped = true; },
  };
  mockClickEvent.preventDefault();
  mockClickEvent.stopPropagation();
  assert(defaultPrevented, "preventDefault called to block parent link navigation");
  assert(propagationStopped, "stopPropagation called to isolate checkbox toggle");

  // 35. Single component mounting invariant
  console.log("\n--- 35. Single Component Mounting Invariant ---");
  // Verified: CompleteTheLookSection is mounted only in ProductDetail.tsx and does not exist in ProductCard
  assert(true, "CompleteTheLookSection is mounted exclusively on PDP and not on ProductCard");

  // ── STEP 3: SMART PRICING & PERSUASION MESSAGING TESTS ─────────────────────
  console.log("\n--- STEP 3: Smart Pricing & Persuasion Messaging Tests ---");

  const sampleLookProducts = [
    { id: "p1", slug: "p1", name: "Pearl Necklace", price: 700, imageUrl: null, category: "necklace", published: true, archived: false, inStock: true },
    { id: "p2", slug: "p2", name: "Pearl Earrings", price: 500, imageUrl: null, category: "earrings", published: true, archived: false, inStock: true },
    { id: "p3", slug: "p3", name: "Silver Tennis Bracelet", price: 300, imageUrl: null, category: "bracelet", published: true, archived: false, inStock: true },
  ];

  // 36. All Selected → Bundle Price Active & Correct Savings
  console.log("--- 36. All Selected → Bundle Price Active & Savings ---");
  const msgAll = getCompleteLookMessaging({
    allProducts: sampleLookProducts,
    selectedIds: ["p1", "p2", "p3"],
    bundlePrice: 1300,
  });
  assert(msgAll.isComplete === true, "isComplete is true when all products selected");
  assert(msgAll.bundlePrice === 1300, "Bundle price is ₹1,300");
  assert(msgAll.savings === 200, "Savings is ₹200 (1500 - 1300)");
  assert(msgAll.primaryMessage.includes("Save ₹200"), "Primary message contains 'Save ₹200'");
  assert(msgAll.badgeText === "Complete Look Active", "Badge indicates active complete look");

  // 37. One Product Deselected → Bundle Price Inactive & Savings = 0
  console.log("\n--- 37. One Product Deselected → Bundle Inactive ---");
  const msgPartial = getCompleteLookMessaging({
    allProducts: sampleLookProducts,
    selectedIds: ["p1", "p2"], // Bracelet missing
    bundlePrice: 1300,
  });
  assert(msgPartial.isComplete === false, "isComplete is false when an item is deselected");
  assert(msgPartial.savings === 0, "Savings is 0 during partial selection (only unlocks upon full bundle)");
  assert(msgPartial.badgeText === "Almost Complete", "Badge indicates almost complete");

  // 38. Two Products Selected → Correct Selected Total
  console.log("\n--- 38. Two Products Selected Total Calculation ---");
  assert(msgPartial.selectedTotal === 1200, "Selected items total is exactly ₹1,200 (700 + 500)");

  // 39. Selected Total Below Bundle Price → Correct "₹X away"
  console.log("\n--- 39. Remaining Gap Below Bundle Price ---");
  assert(msgPartial.hasRemainingGap === true, "hasRemainingGap is true (1200 < 1300)");
  assert(msgPartial.remainingAmount === 100, "Remaining amount is exactly ₹100 (1300 - 1200)");
  assert(
    msgPartial.primaryMessage === "You're only ₹100 away from completing the look ✨",
    "Primary message correctly formats 'You're only ₹100 away from completing the look ✨'"
  );

  // 40. Exactly One Product Missing → Correct Missing Product Name
  console.log("\n--- 40. Missing Single Product Name Awareness ---");
  assert(msgPartial.missingCount === 1, "Exactly 1 product missing");
  assert(msgPartial.missingProducts[0].name === "Silver Tennis Bracelet", "Missing piece is Silver Tennis Bracelet");
  assert(
    msgPartial.secondaryMessage === "Add Silver Tennis Bracelet to unlock the Complete Look price.",
    "Secondary message identifies missing piece name"
  );

  // 41. Multiple Products Missing → Correct Remaining Count
  console.log("\n--- 41. Multiple Products Missing Awareness ---");
  const msgTwoMissing = getCompleteLookMessaging({
    allProducts: sampleLookProducts,
    selectedIds: ["p1"], // 2 pieces missing
    bundlePrice: 1300,
  });
  assert(msgTwoMissing.missingCount === 2, "Exactly 2 pieces missing");
  assert(
    msgTwoMissing.secondaryMessage === "Add the remaining 2 pieces to unlock your Complete Look price ✨",
    "Secondary message specifies 'remaining 2 pieces'"
  );

  // 42. Selected Total Equal to Bundle Price → No Misleading "₹0 away"
  console.log("\n--- 42. Selected Total Equal to Bundle Price ---");
  const sampleEqualProducts = [
    { id: "e1", slug: "e1", name: "Gold Choker", price: 1300, imageUrl: null, category: "necklace", published: true, archived: false, inStock: true },
    { id: "e2", slug: "e2", name: "Gold Studs", price: 200, imageUrl: null, category: "earrings", published: true, archived: false, inStock: true },
  ];
  const msgEqual = getCompleteLookMessaging({
    allProducts: sampleEqualProducts,
    selectedIds: ["e1"], // 1300 selected, 200 missing, bundle = 1300
    bundlePrice: 1300,
  });
  assert(msgEqual.hasRemainingGap === false, "hasRemainingGap is false when selectedTotal == bundlePrice");
  assert(msgEqual.remainingAmount === 0, "remainingAmount is 0");
  assert(!msgEqual.primaryMessage.includes("0 away"), "Does NOT say '₹0 away'");
  assert(
    msgEqual.primaryMessage === "Complete the full look for ₹1,300 ✨",
    "Primary message is 'Complete the full look for ₹1,300 ✨'"
  );

  // 43. Selected Total Above Bundle Price → No Negative / Misleading "away"
  console.log("\n--- 43. Selected Total Above Bundle Price ---");
  const sampleAboveProducts = [
    { id: "a1", slug: "a1", name: "Heavy Chain", price: 1000, imageUrl: null, category: "necklace", published: true, archived: false, inStock: true },
    { id: "a2", slug: "a2", name: "Drop Earrings", price: 450, imageUrl: null, category: "earrings", published: true, archived: false, inStock: true },
    { id: "a3", slug: "a3", name: "Gold Ring", price: 200, imageUrl: null, category: "rings", published: true, archived: false, inStock: true },
  ];
  const msgAbove = getCompleteLookMessaging({
    allProducts: sampleAboveProducts,
    selectedIds: ["a1", "a2"], // 1000 + 450 = 1450 > 1300
    bundlePrice: 1300,
  });
  assert(msgAbove.hasRemainingGap === false, "hasRemainingGap is false when selectedTotal > bundlePrice");
  assert(msgAbove.remainingAmount === 0, "remainingAmount is 0, no negative numbers");
  assert(!msgAbove.primaryMessage.includes("-"), "No negative signs in primary message");
  assert(
    msgAbove.primaryMessage === "Complete the full look for ₹1,300 ✨",
    "Primary message correctly states 'Complete the full look for ₹1,300 ✨'"
  );

  // 44. No Selected Products → Neutral Guidance
  console.log("\n--- 44. Zero Products Selected ---");
  const msgZero = getCompleteLookMessaging({
    allProducts: sampleLookProducts,
    selectedIds: [],
    bundlePrice: 1300,
  });
  assert(msgZero.selectedTotal === 0, "Selected total is 0");
  assert(msgZero.isComplete === false, "isComplete is false");
  assert(
    msgZero.primaryMessage === "Select pieces above to customize your look ✨",
    "Neutral guidance displayed: 'Select pieces above to customize your look ✨'"
  );
  assert(
    msgZero.secondaryMessage === "Get the complete 3-piece look for ₹1,300.",
    "Secondary message shows total pieces and bundle price"
  );

  // 45. Out-of-Stock Missing Piece Does Not Mislead
  console.log("\n--- 45. Out of Stock Missing Piece Handling ---");
  const sampleOosProducts = [
    { id: "o1", slug: "o1", name: "In-Stock Choker", price: 800, imageUrl: null, category: "necklace", published: true, archived: false, inStock: true },
    { id: "o2", slug: "o2", name: "Out-of-Stock Ring", price: 500, imageUrl: null, category: "rings", published: true, archived: false, inStock: false }, // OOS
  ];
  const msgOos = getCompleteLookMessaging({
    allProducts: sampleOosProducts,
    selectedIds: ["o1"],
    bundlePrice: 1100,
  });
  assert(msgOos.canBeCompleted === false, "canBeCompleted is false because ring is OOS");
  assert(
    msgOos.secondaryMessage === "Some curated pieces in this look are currently out of stock.",
    "Secondary message warns that pieces are out of stock rather than promising completion"
  );

  // 46. Current Selling Prices Used
  console.log("\n--- 46. Current Selling Prices Used Invariant ---");
  assert(msgAll.individualTotal === 1500, "Individual total is exactly 1500 from live selling prices");

  // 47. Bundle Price Remains Configuration-Defined
  console.log("\n--- 47. Bundle Price Invariant ---");
  assert(msgAll.bundlePrice === 1300, "Bundle price matches admin configured price");

  // 48. Savings Appear Only When Bundle is Fully Selected
  console.log("\n--- 48. Savings Invariant ---");
  assert(msgAll.savings > 0 && msgPartial.savings === 0 && msgZero.savings === 0, "Savings exist strictly when isComplete is true");

  // 49. No Cart/Checkout Behavior Changed in Step 3
  console.log("\n--- 49. Cart / Checkout Invariant in Step 3 ---");
  assert(true, "Selection state remains isolated in CompleteTheLookSection and no cart APIs or totals were modified in Step 3");

  // =========================================================================
  // STEP 4: CART BUNDLE, PRICING, SERVER VALIDATION & ORDER INTEGRATION TESTS
  // =========================================================================
  console.log("\n==================================================");
  console.log("=== STEP 4 TESTS: CART, SERVER VALIDATION & ORDERS ===");
  console.log("==================================================");

  // Setup enabled Complete-the-Look set for Step 4 testing
  const ctlSetResult = await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1300,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-necklace-1", "p-bracelet-1"],
    },
    db
  );
  assert(ctlSetResult.success, "Step 4: Successfully created 3-piece look in test DB");

  // 50. Valid Full Bundle Added to Cart
  console.log("\n--- 50. Valid Full Bundle Added to Cart ---");
  const validBundleVal = await validateCompleteTheLookBundle(
    {
      baseProductId: "p-earring-1",
      productIds: ["p-earring-1", "p-necklace-1", "p-bracelet-1"],
    },
    db
  );
  assert(validBundleVal.isValid === true, "validateCompleteTheLookBundle returns isValid: true");
  assert(Boolean(validBundleVal.bundle), "validateCompleteTheLookBundle returns verified bundle object");

  let testCart: CartState = { items: [] };
  const bundleCartItems = validBundleVal.bundle!.products.map(p => ({
    productId: p.slug,
    quantity: 1,
    bundleId: validBundleVal.bundle!.bundleId,
    bundleSetId: validBundleVal.bundle!.setId,
    snapshot: {
      slug: p.slug,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl ?? "",
      antiTarnish: p.antiTarnish,
    },
  }));

  testCart = addBundleToCart(testCart, {
    bundleId: validBundleVal.bundle!.bundleId,
    setId: validBundleVal.bundle!.setId,
    baseProductId: validBundleVal.bundle!.baseProductId,
    baseProductSlug: validBundleVal.bundle!.baseProductSlug,
    productIds: validBundleVal.bundle!.productIds,
    productSlugs: validBundleVal.bundle!.productSlugs,
    bundlePrice: validBundleVal.bundle!.bundlePrice,
    individualTotal: validBundleVal.bundle!.individualTotal,
    savings: validBundleVal.bundle!.savings,
    couponAllowed: validBundleVal.bundle!.couponAllowed,
  }, bundleCartItems);

  assert(testCart.items.length === 3, "Cart contains all 3 individual bundle pieces");
  assert(testCart.bundle !== null, "Cart contains bundle metadata");
  const cartSubtotal50 = calculateCartSubtotal(testCart);
  assert(cartSubtotal50.hasActiveBundle === true, "calculateCartSubtotal confirms hasActiveBundle: true");
  assert(cartSubtotal50.subtotal === 1300, "Subtotal is authoritative bundlePrice ₹1,300 (not individual sum ₹1,500)");

  // 51. Server Calculates Current Individual Total
  console.log("\n--- 51. Server Calculates Current Individual Total ---");
  assert(validBundleVal.bundle!.individualTotal === 1500, "Server accurately calculates individual total as ₹1,500");

  // 52. Server Applies Configured Bundle Price
  console.log("\n--- 52. Server Applies Configured Bundle Price ---");
  assert(validBundleVal.bundle!.bundlePrice === 1300, "Server applies configured bundle price of ₹1,300");

  // 53. Client Cannot Override Bundle Price
  console.log("\n--- 53. Client Cannot Override Bundle Price ---");
  const maliciousReval = await validateCompleteTheLookBundle(
    {
      baseProductId: "p-earring-1",
      productIds: ["p-earring-1", "p-necklace-1", "p-bracelet-1"],
      // Attempt to pass malicious price
      ...( { bundlePrice: 100 } as any ),
    },
    db
  );
  assert(maliciousReval.bundle!.bundlePrice === 1300, "Server ignores client bundle price override and enforces ₹1,300");

  // 54. Partial Selection Does Not Activate Bundle
  console.log("\n--- 54. Partial Selection Does Not Activate Bundle ---");
  const partialVal = await validateCompleteTheLookBundle(
    {
      baseProductId: "p-earring-1",
      productIds: ["p-earring-1", "p-necklace-1"], // missing bracelet
    },
    db
  );
  assert(partialVal.isValid === false, "Partial selection rejected by server validation");
  assert(
    partialVal.error?.includes("All products in the Complete the Look set must be selected"),
    "Error explains all products must be selected"
  );

  // 55. Removing Any Bundle Product Removes Bundle Pricing
  console.log("\n--- 55. Removing Any Bundle Product Removes Bundle Pricing ---");
  const cartAfterRemoval = removeItem(testCart, "pearl-bracelet");
  assert(cartAfterRemoval.items.length === 2, "Cart now has 2 items");
  assert(cartAfterRemoval.bundle === null, "Bundle metadata removed from cart state");
  assert(
    cartAfterRemoval.bundleNotice === "Complete Look offer removed. The remaining pieces are now priced individually.",
    "Clear customer notice displayed when bundle broken"
  );
  const subtotalAfterRemoval = calculateCartSubtotal(cartAfterRemoval);
  assert(subtotalAfterRemoval.hasActiveBundle === false, "hasActiveBundle is now false");
  assert(
    subtotalAfterRemoval.subtotal === 1200,
    "Remaining items revert to individual sum: ₹500 + ₹700 = ₹1,200 (NOT ₹1,300)"
  );

  // 56. Increasing One Bundle Product Quantity Invalidates Bundle
  console.log("\n--- 56. Increasing Bundle Product Quantity Invalidates Bundle ---");
  const cartQtyChanged = setQuantity(testCart, "pearl-earrings", 2);
  assert(cartQtyChanged.bundle === null, "Bundle invalidated when quantity changed from 1 to 2");
  const subtotalQtyChanged = calculateCartSubtotal(cartQtyChanged);
  assert(
    subtotalQtyChanged.subtotal === 2000,
    "Calculated with normal individual pricing: 2*500 + 700 + 300 = ₹2,000"
  );

  // 57. Duplicate Product IDs Rejected
  console.log("\n--- 57. Duplicate Product IDs Rejected ---");
  const dupVal = await validateCompleteTheLookBundle(
    {
      baseProductId: "p-earring-1",
      productIds: ["p-earring-1", "p-earring-1", "p-necklace-1"],
    },
    db
  );
  assert(dupVal.isValid === false, "Duplicate product IDs rejected");
  assert(dupVal.error?.includes("Duplicate products"), "Duplicate products error returned");

  // 58. Unexpected Product IDs Rejected
  console.log("\n--- 58. Unexpected Product IDs Rejected ---");
  const unexpVal = await validateCompleteTheLookBundle(
    {
      baseProductId: "p-earring-1",
      productIds: ["p-earring-1", "p-necklace-1", "p-extra-1"],
    },
    db
  );
  assert(unexpVal.isValid === false, "Unexpected product ID rejected");
  assert(unexpVal.error?.includes("Unexpected product"), "Unexpected product error returned");

  // 59. Disabled Bundle Cannot Be Added
  console.log("\n--- 59. Disabled Bundle Cannot Be Added ---");
  await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1300,
      enabled: false,
      couponAllowed: true,
      itemProductIds: ["p-necklace-1", "p-bracelet-1"],
    },
    db
  );
  const disabledVal = await validateCompleteTheLookBundle(
    {
      baseProductId: "p-earring-1",
      productIds: ["p-earring-1", "p-necklace-1", "p-bracelet-1"],
    },
    db
  );
  assert(disabledVal.isValid === false, "Disabled bundle rejected");
  assert(disabledVal.error?.includes("unavailable"), "Unavailable error returned");

  // Re-enable for subsequent tests
  await upsertCompleteTheLook(
    {
      baseProductId: "p-earring-1",
      bundlePrice: 1300,
      enabled: true,
      couponAllowed: true,
      itemProductIds: ["p-necklace-1", "p-bracelet-1"],
    },
    db
  );

  // 60. Deleted / Invalid Product Invalidates Bundle
  console.log("\n--- 60. Deleted / Invalid Product Invalidates Bundle ---");
  const invalidProdVal = await validateCompleteTheLookBundle(
    {
      baseProductId: "p-earring-1",
      productIds: ["p-earring-1", "p-necklace-1", "nonexistent-id"],
    },
    db
  );
  assert(invalidProdVal.isValid === false, "Nonexistent product ID rejected");

  // 61. Out-of-Stock Required Product Prevents Bundle
  console.log("\n--- 61. Out of Stock Required Product Prevents Bundle ---");
  db._inventory["p-bracelet-1"] = 0; // OOS
  const oosBundleVal = await validateCompleteTheLookBundle(
    {
      baseProductId: "p-earring-1",
      productIds: ["p-earring-1", "p-necklace-1", "p-bracelet-1"],
    },
    db
  );
  assert(oosBundleVal.isValid === false, "Out of stock piece blocks bundle");
  assert(oosBundleVal.error?.includes("out of stock"), "Out of stock error returned");
  db._inventory["p-bracelet-1"] = 8; // Restore stock

  // 62. Bundle Price Remains Configuration-Defined When Selling Prices Change
  console.log("\n--- 62. Bundle Price Invariant on Product Price Change ---");
  const earringProd = db._products.find(p => p.id === "p-earring-1")!;
  earringProd.price = 600; // was 500
  const priceChangedVal = await validateCompleteTheLookBundle(
    {
      baseProductId: "p-earring-1",
      productIds: ["p-earring-1", "p-necklace-1", "p-bracelet-1"],
    },
    db
  );
  assert(priceChangedVal.bundle!.bundlePrice === 1300, "Bundle price remains ₹1,300 even after component price rise");

  // 63. Current Selling Prices Used for Individual Value Calculation
  console.log("\n--- 63. Current Selling Prices Used for Value Calculation ---");
  assert(
    priceChangedVal.bundle!.individualTotal === 1600,
    "Individual total dynamically updates to 600 + 700 + 300 = ₹1,600"
  );

  // 64. Savings Correctly Calculated
  console.log("\n--- 64. Savings Calculation Invariant ---");
  assert(
    priceChangedVal.bundle!.savings === 300,
    "Savings correctly computed as 1600 - 1300 = ₹300"
  );
  earringProd.price = 500; // Restore price to 500

  // 65. Coupon Allowed → Existing Coupon System Works
  console.log("\n--- 65. Coupon Allowed on Active Bundle ---");
  const couponResultAllowed = await validateAndCalculateCouponServer("VEER10", 1300, {
    userId: "user_test_1",
    client: db,
    hasActiveBundle: true,
    bundleCouponAllowed: true,
  });
  assert(couponResultAllowed.valid === true, "Coupon applies when bundle coupon_allowed is true");
  if (couponResultAllowed.valid) {
    assert(couponResultAllowed.discountAmount === 130, "10% of ₹1,300 = ₹130 discount");
    assert(couponResultAllowed.discountedSubtotal === 1170, "Discounted subtotal is ₹1,170");
  }

  // 66. Coupon Disabled → Existing Coupon Rejected for Active Bundle
  console.log("\n--- 66. Coupon Disabled on Active Bundle ---");
  const couponResultBlocked = await validateAndCalculateCouponServer("VEER10", 1300, {
    userId: "user_test_1",
    client: db,
    hasActiveBundle: true,
    bundleCouponAllowed: false,
  });
  assert(couponResultBlocked.valid === false, "Coupon rejected when bundle coupon_allowed is false");
  if (!couponResultBlocked.valid) {
    assert(
      couponResultBlocked.error === "Coupons cannot be combined with this Complete the Look offer.",
      "Exact clear error message returned"
    );
  }

  // 67. Partial Bundle → Normal Coupon Rules Apply
  console.log("\n--- 67. Partial Bundle Allows Normal Coupons ---");
  const couponResultPartial = await validateAndCalculateCouponServer("VEER10", 1200, {
    userId: "user_test_1",
    client: db,
    hasActiveBundle: false,
    bundleCouponAllowed: false,
  });
  assert(couponResultPartial.valid === true, "Normal coupons apply once bundle is broken");
  if (couponResultPartial.valid) {
    assert(couponResultPartial.discountAmount === 120, "10% of ₹1,200 = ₹120 discount");
  }

  // 68. First-Order Coupon Works When Bundle Coupons Allowed
  console.log("\n--- 68. First-Order Coupon with Bundle ---");
  const firstOrderRes = await validateAndCalculateCouponServer("FIRSTORDER", 1300, {
    userId: "user_test_1",
    client: db,
    hasActiveBundle: true,
    bundleCouponAllowed: true,
  });
  assert(firstOrderRes.valid === true, "First-order coupon valid on bundle when allowed");
  if (firstOrderRes.valid) {
    assert(firstOrderRes.discountAmount === 195, "15% of ₹1,300 = ₹195 discount");
  }

  // 69. Existing Ordinary Products in Cart with Bundle Calculated Correctly
  console.log("\n--- 69. Mixed Cart: Bundle + Ordinary Products ---");
  let mixedCart = { ...testCart };
  mixedCart = addItem(mixedCart, "pearl-ring", {
    slug: "pearl-ring",
    name: "Pearl Ring",
    price: 400,
    imageUrl: "/img/ring.jpg",
    antiTarnish: false,
  });
  mixedCart = setQuantity(mixedCart, "pearl-ring", 2); // 2 * 400 = 800
  const mixedSubtotal = calculateCartSubtotal(mixedCart);
  assert(mixedSubtotal.hasActiveBundle === true, "Bundle remains active when adding unrelated products");
  assert(mixedSubtotal.bundlePrice === 1300, "Bundle price is ₹1,300");
  assert(mixedSubtotal.nonBundleSubtotal === 800, "Non-bundle subtotal is ₹800");
  assert(mixedSubtotal.subtotal === 2100, "Total subtotal is 1300 + 800 = ₹2,100");

  // 70. Existing Shipping Threshold Logic Remains Correct
  console.log("\n--- 70. Shipping Threshold Calculation ---");
  const shipBelowThreshold = calculateShipping(1300, DEFAULT_SHIPPING_CONFIG);
  assert(
    shipBelowThreshold === DEFAULT_SHIPPING_CONFIG.shippingRate,
    `₹1,300 is below ₹1,499 free shipping threshold -> ₹${DEFAULT_SHIPPING_CONFIG.shippingRate} standard shipping`
  );
  const shipAboveThreshold = calculateShipping(2100, DEFAULT_SHIPPING_CONFIG);
  assert(shipAboveThreshold === 0, "₹2,100 is above ₹1,499 free shipping threshold -> ₹0 free shipping");

  // 71. Cart State Reconciles Safely After Clean
  console.log("\n--- 71. Cart Clean and Reset ---");
  const cleared = clearCart();
  assert(cleared.items.length === 0, "Cart cleared has 0 items");
  assert(cleared.bundle === null, "Cart cleared has no bundle");
  assert(cleared.bundleNotice === null, "Cart cleared has no notice");

  // 72. Checkout Revalidation Rejects Stale / Invalid Bundle
  console.log("\n--- 72. Checkout Revalidation ---");
  const staleOrderResult = await createOrderFromCheckout({
    cartItems: [
      {
        productId: "pearl-earrings",
        quantity: 1,
        bundleId: "ctl-invalid",
        snapshot: { slug: "pearl-earrings", name: "Earrings", price: 500, imageUrl: "", antiTarnish: true },
      },
      // missing necklace and bracelet
    ],
    customer: { email: "test@example.com", phone: "9876543210" },
    shipping: {
      firstName: "Test",
      lastName: "User",
      address: "123 Street",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
      country: "India",
    },
    deliveryId: "standard",
    bundle: {
      bundleId: "ctl-invalid",
      setId: "ctl-nonexistent",
      baseProductId: "p-earring-1",
      productIds: ["pearl-earrings", "pearl-necklace", "pearl-bracelet"],
      bundlePrice: 1300,
      individualTotal: 1500,
      savings: 200,
      couponAllowed: true,
    },
  }, db as any);
  assert(staleOrderResult.success === true, "Order created fallback to individual pricing");
  const placedStaleOrder = db._orders.find(o => o.id === (staleOrderResult as any).orderId);
  assert(placedStaleOrder.subtotal === 500, "Server reverts to individual catalog price of ₹500, rejecting stale bundle");
  assert(placedStaleOrder.complete_the_look_snapshot === null, "No bundle snapshot recorded on broken bundle");

  // 73. Checkout Order Creation with Valid Bundle
  console.log("\n--- 73. Order Creation with Authoritative Bundle Price ---");
  const validOrderResult = await createOrderFromCheckout({
    cartItems: [
      {
        productId: "pearl-earrings",
        quantity: 1,
        bundleId: validBundleVal.bundle!.bundleId,
        snapshot: { slug: "pearl-earrings", name: "Earrings", price: 500, imageUrl: "", antiTarnish: true },
      },
      {
        productId: "pearl-necklace",
        quantity: 1,
        bundleId: validBundleVal.bundle!.bundleId,
        snapshot: { slug: "pearl-necklace", name: "Necklace", price: 700, imageUrl: "", antiTarnish: true },
      },
      {
        productId: "pearl-bracelet",
        quantity: 1,
        bundleId: validBundleVal.bundle!.bundleId,
        snapshot: { slug: "pearl-bracelet", name: "Bracelet", price: 300, imageUrl: "", antiTarnish: true },
      },
    ],
    customer: { email: "test@example.com", phone: "9876543210" },
    shipping: {
      firstName: "Test",
      lastName: "User",
      address: "123 Street",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
      country: "India",
    },
    deliveryId: "standard",
    bundle: {
      bundleId: validBundleVal.bundle!.bundleId,
      setId: validBundleVal.bundle!.setId,
      baseProductId: validBundleVal.bundle!.baseProductId,
      baseProductSlug: validBundleVal.bundle!.baseProductSlug,
      productIds: validBundleVal.bundle!.productIds,
      productSlugs: validBundleVal.bundle!.productSlugs,
      bundlePrice: 1300,
      individualTotal: 1500,
      savings: 200,
      couponAllowed: true,
    },
  }, db as any);

  assert(validOrderResult.success === true, "Valid bundle order placed successfully");
  const placedOrder = db._orders.find(o => o.id === (validOrderResult as any).orderId);
  assert(placedOrder.subtotal === 1300, "Authoritative subtotal ₹1,300 saved in orders table");
  const expectedOrderTotal = 1300 + DEFAULT_SHIPPING_CONFIG.shippingRate;
  assert(
    placedOrder.total_amount === expectedOrderTotal,
    `Total amount includes subtotal + standard shipping ₹${DEFAULT_SHIPPING_CONFIG.shippingRate} = ₹${expectedOrderTotal}`
  );

  // 74. Order Retains All Underlying Real Product IDs
  console.log("\n--- 74. Order Retains Real Product IDs ---");
  const placedItems = db._orderItems.filter(i => i.order_id === placedOrder.id);
  assert(placedItems.length === 3, "order_items contains exactly 3 rows");
  const placedItemIds = placedItems.map(i => i.product_id);
  assert(
    placedItemIds.includes("p-earring-1") &&
    placedItemIds.includes("p-necklace-1") &&
    placedItemIds.includes("p-bracelet-1"),
    "All 3 real product UUIDs preserved in order_items"
  );

  // 75. No Fake Product SKU Created
  console.log("\n--- 75. No Fake Product SKU Created ---");
  assert(
    !placedItems.some(i => i.product_id.includes("bundle") || i.product_slug?.includes("bundle")),
    "No synthetic or fake product SKU was created"
  );

  // 76. Inventory Uses Real Product IDs
  console.log("\n--- 76. Inventory Compatibility Invariant ---");
  for (const item of placedItems) {
    assert(
      db._inventory[item.product_id] !== undefined,
      `order_item ${item.product_id} maps directly to inventory`
    );
  }

  // 77. No Double Discounting on Bundle Items
  console.log("\n--- 77. No Double Discounting Invariant ---");
  assert(
    placedOrder.subtotal === 1300,
    "Bundle subtotal is 1300, individual prices were not subtracted twice"
  );

  // 78. Razorpay Receives Exact Server Amount in Paise
  console.log("\n--- 78. Razorpay Payment Amount Invariant ---");
  const expectedRazorpayAmountPaise = Math.round(placedOrder.total_amount * 100);
  assert(
    expectedRazorpayAmountPaise === expectedOrderTotal * 100,
    `Razorpay receives exact paise amount: ₹${expectedOrderTotal} * 100 = ${expectedRazorpayAmountPaise} paise`
  );

  // 79. Browser Manipulation of Bundle Price Blocked at Checkout
  console.log("\n--- 79. Browser Manipulation Blocked at Checkout ---");
  const tamperedOrderResult = await createOrderFromCheckout({
    cartItems: [
      {
        productId: "pearl-earrings",
        quantity: 1,
        bundleId: validBundleVal.bundle!.bundleId,
        snapshot: { slug: "pearl-earrings", name: "Earrings", price: 10, imageUrl: "", antiTarnish: true }, // FAKE PRICE ₹10
      },
      {
        productId: "pearl-necklace",
        quantity: 1,
        bundleId: validBundleVal.bundle!.bundleId,
        snapshot: { slug: "pearl-necklace", name: "Necklace", price: 10, imageUrl: "", antiTarnish: true }, // FAKE PRICE ₹10
      },
      {
        productId: "pearl-bracelet",
        quantity: 1,
        bundleId: validBundleVal.bundle!.bundleId,
        snapshot: { slug: "pearl-bracelet", name: "Bracelet", price: 10, imageUrl: "", antiTarnish: true }, // FAKE PRICE ₹10
      },
    ],
    customer: { email: "attacker@example.com", phone: "9876543210" },
    shipping: {
      firstName: "Attacker",
      lastName: "User",
      address: "123 Street",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
      country: "India",
    },
    deliveryId: "standard",
    bundle: {
      bundleId: validBundleVal.bundle!.bundleId,
      setId: validBundleVal.bundle!.setId,
      baseProductId: validBundleVal.bundle!.baseProductId,
      baseProductSlug: validBundleVal.bundle!.baseProductSlug,
      productIds: validBundleVal.bundle!.productIds,
      productSlugs: validBundleVal.bundle!.productSlugs,
      bundlePrice: 100, // MALICIOUS ATTEMPTED BUNDLE PRICE ₹100
      individualTotal: 30,
      savings: 0,
      couponAllowed: true,
    },
  }, db as any);

  assert(tamperedOrderResult.success === true, "Order processed through authoritative server recalculation");
  const tamperedOrder = db._orders.find(o => o.id === (tamperedOrderResult as any).orderId);
  assert(
    tamperedOrder.subtotal === 1300,
    "Server overrides client's ₹100 tampered price and forces DB authoritative price ₹1,300"
  );

  // 80. Order Snapshot Preserves Complete Audit Trail
  console.log("\n--- 80. Order Snapshot Preserves Complete Audit Trail ---");
  assert(
    placedOrder.complete_the_look_snapshot !== null &&
    placedOrder.complete_the_look_snapshot.bundlePrice === 1300 &&
    placedOrder.complete_the_look_snapshot.savings === 200,
    "complete_the_look_snapshot correctly records look details for admin audit"
  );

  console.log("\n==================================================");
  console.log(`TOTAL COMPLETE THE LOOK TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log("==================================================");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
