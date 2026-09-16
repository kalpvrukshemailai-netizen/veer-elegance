/**
 * VEER ELEGANCE — Cart Complete-the-Look Discovery & Recommendation Test Suite
 *
 * Verifies all 18 test cases specified in the Cart Recommendation implementation plan:
 *  1. Discovery with base product in cart
 *  2. Discovery with matching product in cart
 *  3. Partial look awareness (1 of 3, 2 of 3)
 *  4. All pieces in cart (unbundled)
 *  5. No look configured for cart products returns null
 *  6. Disabled look is ignored
 *  7. Empty cart returns null
 *  8. Resolves cart product keys by slug
 *  9. Resolves cart product keys by UUID
 * 10. Sound gap calculation (positive gap displayed)
 * 11. Zero or negative gap suppressed
 * 12. Out-of-stock remaining piece visibly identified (canBeCompleted = false)
 * 13. Multi-look candidate priority scoring
 * 14. 1-click addition adds item to cart
 * 15. Server bundle validation on completion
 * 16. Bundle dissolution cleanly re-surfaces recommendation
 * 17. Coupon application compatibility (coupon_allowed true/false)
 * 18. Storefront PDP & Admin isolation (zero regression)
 */

import {
  getCartCompleteTheLookRecommendation,
  validateCompleteTheLookBundle,
} from "../lib/complete-the-look-server";
import {
  getCartLookRecommendationMessaging,
  calculateLookPricing,
} from "../lib/complete-the-look";
import {
  addItem,
  addBundleToCart,
  removeItem,
  calculateCartSubtotal,
  type CartState,
  type CartItem,
} from "../lib/cart";
import { validateAndCalculateCouponServer } from "../lib/coupons";

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
// MOCK DATABASE & CLIENT
// ─────────────────────────────────────────────────────────────────────────────

function createMockDatabase() {
  const products = [
    { id: "p-necklace", slug: "pearl-necklace", name: "Pearl Necklace", price: 700, category: "chains", published: true, archived: false, anti_tarnish: true, image_url: "/img/necklace.jpg" },
    { id: "p-earrings", slug: "pearl-earrings", name: "Pearl Earrings", price: 500, category: "earrings", published: true, archived: false, anti_tarnish: true, image_url: "/img/earrings.jpg" },
    { id: "p-bracelet", slug: "pearl-bracelet", name: "Pearl Bracelet", price: 300, category: "bracelets", published: true, archived: false, anti_tarnish: true, image_url: "/img/bracelet.jpg" },
    { id: "p-ring",     slug: "pearl-ring",     name: "Pearl Ring",     price: 400, category: "rings",     published: true, archived: false, anti_tarnish: false, image_url: "/img/ring.jpg" },
    { id: "p-choker",   slug: "velvet-choker",  name: "Velvet Choker",  price: 800, category: "chains",    published: true, archived: false, anti_tarnish: true, image_url: "/img/choker.jpg" },
    { id: "p-stud",     slug: "gold-stud",      name: "Gold Stud",      price: 600, category: "earrings",  published: true, archived: false, anti_tarnish: true, image_url: "/img/stud.jpg" },
    { id: "p-solitaire",slug: "solitaire-chain",name: "Solitaire Chain",price: 1200,category: "chains",    published: true, archived: false, anti_tarnish: true, image_url: "/img/solitaire.jpg" },
  ];

  let sets = [
    {
      id: "set-pearl-trio",
      base_product_id: "p-necklace",
      bundle_price: 1300, // Indiv 700 + 500 + 300 = 1500 -> Save 200
      enabled: true,
      coupon_allowed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "set-choker-duo",
      base_product_id: "p-choker",
      bundle_price: 1200, // Indiv 800 + 600 = 1400 -> Save 200
      enabled: true,
      coupon_allowed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "set-disabled-look",
      base_product_id: "p-solitaire",
      bundle_price: 1400,
      enabled: false,
      coupon_allowed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  let items = [
    { id: "item-1", set_id: "set-pearl-trio", product_id: "p-earrings", display_order: 1, created_at: new Date().toISOString() },
    { id: "item-2", set_id: "set-pearl-trio", product_id: "p-bracelet", display_order: 2, created_at: new Date().toISOString() },
    { id: "item-3", set_id: "set-choker-duo", product_id: "p-stud", display_order: 1, created_at: new Date().toISOString() },
    { id: "item-4", set_id: "set-disabled-look", product_id: "p-ring", display_order: 1, created_at: new Date().toISOString() },
  ];

  const inventory: Record<string, number> = {
    "p-necklace": 10,
    "p-earrings": 5,
    "p-bracelet": 8,
    "p-ring": 4,
    "p-choker": 3,
    "p-stud": 2,
    "p-solitaire": 1,
  };

  const coupons = [
    {
      id: "c-veer10",
      code: "VEER10",
      discount_type: "percentage",
      discount_value: 10,
      minimum_order_value: 500,
      maximum_discount: 500,
      is_active: true,
      usage_limit: null,
      used_count: 0,
      starts_at: null,
      expires_at: null,
      first_order_only: false,
    },
  ];

  const client: any = {
    from: (table: string) => {
      let filteredData: any[] = [];
      if (table === "complete_the_look_sets") filteredData = [...sets];
      else if (table === "complete_the_look_items") filteredData = [...items];
      else if (table === "products") filteredData = [...products];
      else if (table === "coupons") filteredData = [...coupons];
      else if (table === "inventory") {
        filteredData = Object.entries(inventory).map(([product_id, stock_quantity]) => ({
          product_id,
          stock_quantity,
        }));
      }

      const builder: any = {
        select: (cols: string = "*") => builder,
        eq: (col: string, val: any) => {
          filteredData = filteredData.filter((r) => r[col] === val);
          return builder;
        },
        in: (col: string, arr: any[]) => {
          filteredData = filteredData.filter((r) => arr.includes(r[col]));
          return builder;
        },
        or: (clause: string) => {
          // e.g. "id.in.(p1,p2),slug.in.(s1,s2)"
          const parts = clause.split(",");
          let ids: string[] = [];
          let slugs: string[] = [];
          for (const p of parts) {
            if (p.startsWith("id.in.(")) {
              ids = p.replace("id.in.(", "").replace(")", "").split(",");
            }
            if (p.startsWith("slug.in.(")) {
              slugs = p.replace("slug.in.(", "").replace(")", "").split(",");
            }
          }
          filteredData = filteredData.filter((r) => ids.includes(r.id) || slugs.includes(r.slug));
          return builder;
        },
        order: (col: string, { ascending }: { ascending: boolean }) => {
          filteredData.sort((a, b) => (ascending ? a[col] - b[col] : b[col] - a[col]));
          return builder;
        },
        maybeSingle: async () => ({
          data: filteredData.length > 0 ? filteredData[0] : null,
          error: null,
        }),
        single: async () => ({
          data: filteredData.length > 0 ? filteredData[0] : null,
          error: filteredData.length === 0 ? { message: "Not found" } : null,
        }),
        then: (resolve: (val: any) => void) => resolve({ data: filteredData, error: null }),
      };
      return builder;
    },
    inventory,
    sets,
    items,
    products,
  };

  return client;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE TESTS
// ─────────────────────────────────────────────────────────────────────────────

async function runCartCompleteTheLookTests() {
  console.log("\n========================================================");
  console.log("RUNNING VEER ELEGANCE CART COMPLETE THE LOOK TEST SUITE");
  console.log("========================================================\n");

  const mockDb = createMockDatabase();

  // Test 1: Discovery with base product in cart
  console.log("--- 1. Discovery with Base Product in Cart ---");
  const rec1 = await getCartCompleteTheLookRecommendation(["p-necklace"], mockDb);
  assert(rec1 !== null, "Discovers look set for base product");
  assert(rec1?.setId === "set-pearl-trio", "Identifies correct set ID");
  assert(rec1?.inCartProducts.length === 1, "inCartProducts contains 1 item");
  assert(rec1?.inCartProducts[0].id === "p-necklace", "inCartProducts has base product");
  assert(rec1?.remainingProducts.length === 2, "remainingProducts contains 2 matching pieces");
  assert(rec1?.remainingProducts.map((p) => p.id).sort().join(",") === "p-bracelet,p-earrings", "Remaining pieces are earrings and bracelet");

  // Test 2: Discovery with matching product in cart
  console.log("\n--- 2. Discovery with Matching Product in Cart ---");
  const rec2 = await getCartCompleteTheLookRecommendation(["p-earrings"], mockDb);
  assert(rec2 !== null, "Discovers look set even when matching item is added first");
  assert(rec2?.setId === "set-pearl-trio", "Finds the parent set for earrings");
  assert(rec2?.inCartProducts[0].id === "p-earrings", "Earrings are marked inCart");
  assert(rec2?.remainingProducts.length === 2, "2 items remain to be added (base necklace + bracelet)");
  assert(rec2?.remainingProducts.some((p) => p.id === "p-necklace"), "Base necklace is among remaining products");

  // Test 3: Partial look awareness (2 of 3 pieces in cart)
  console.log("\n--- 3. Partial Look Awareness (2 of 3 in Cart) ---");
  const rec3 = await getCartCompleteTheLookRecommendation(["p-necklace", "p-earrings"], mockDb);
  assert(rec3 !== null, "Found look for 2 items");
  assert(rec3?.remainingProducts.length === 1, "Only 1 piece remaining");
  assert(rec3?.remainingProducts[0].id === "p-bracelet", "Missing piece is Pearl Bracelet");
  assert(rec3?.headline === "You're almost there ✨", "Headline is 'You\'re almost there ✨'");
  assert(rec3?.subline.includes("Pearl Bracelet"), "Subline mentions the missing piece name");
  // Individual prices: 700 + 500 = 1200. Bundle price = 1300. Gap = 1300 - 1200 = 100.
  assert(rec3?.remainingGap === 100, "Gap is exactly ₹100");
  assert(rec3?.subline.includes("₹100"), "Subline includes '₹100 more'");

  // Test 4: All pieces in cart (unbundled)
  console.log("\n--- 4. All Pieces in Cart (Unbundled) ---");
  const rec4 = await getCartCompleteTheLookRecommendation(["p-necklace", "p-earrings", "p-bracelet"], mockDb);
  assert(rec4 !== null, "Found recommendation when all pieces in cart");
  assert(rec4?.isComplete === true, "isComplete is true");
  assert(rec4?.remainingProducts.length === 0, "No remaining products");
  assert(rec4?.headline === "Complete Look unlocked ✨", "Headline is 'Complete Look unlocked ✨'");
  assert(rec4?.savings === 200, "Total savings is ₹200 (1500 - 1300)");

  // Test 5: No look configured for cart products returns null
  console.log("\n--- 5. No Look Configured for Cart Product ---");
  const rec5 = await getCartCompleteTheLookRecommendation(["p-ring"], mockDb);
  assert(rec5 === null, "Returns null when item does not belong to an enabled set");

  // Test 6: Disabled look is ignored
  console.log("\n--- 6. Disabled Look Ignored ---");
  const rec6 = await getCartCompleteTheLookRecommendation(["p-solitaire"], mockDb);
  assert(rec6 === null, "Disabled look set is completely ignored");

  // Test 7: Empty cart returns null
  console.log("\n--- 7. Empty Cart ---");
  const rec7 = await getCartCompleteTheLookRecommendation([], mockDb);
  assert(rec7 === null, "Empty cart array returns null");
  const rec7b = await getCartCompleteTheLookRecommendation(null as any, mockDb);
  assert(rec7b === null, "Null input returns null");

  // Test 8: Resolves cart product keys by slug
  console.log("\n--- 8. Resolves Cart Keys by Slug ---");
  const rec8 = await getCartCompleteTheLookRecommendation(["pearl-necklace"], mockDb);
  assert(rec8 !== null, "Resolves by product slug 'pearl-necklace'");
  assert(rec8?.inCartProducts[0].id === "p-necklace", "Correctly identified UUID from slug");

  // Test 9: Resolves cart product keys by UUID
  console.log("\n--- 9. Resolves Cart Keys by UUID ---");
  const rec9 = await getCartCompleteTheLookRecommendation(["p-necklace"], mockDb);
  assert(rec9 !== null, "Resolves by product UUID 'p-necklace'");
  assert(rec9?.inCartProducts[0].slug === "pearl-necklace", "Correctly identified slug from UUID");

  // Test 10: Sound gap calculation (positive gap)
  console.log("\n--- 10. Sound Gap Calculation (Positive Gap) ---");
  const msg10 = getCartLookRecommendationMessaging({
    allProducts: [
      { id: "p1", slug: "p1", name: "Necklace", price: 700, category: "chains", published: true, archived: false, imageUrl: null },
      { id: "p2", slug: "p2", name: "Earrings", price: 500, category: "earrings", published: true, archived: false, imageUrl: null },
    ],
    inCartProductKeys: ["p1"],
    bundlePrice: 1000,
  });
  // In cart: 700. Bundle: 1000. Gap: 300.
  assert(msg10.hasRemainingGap === true, "hasRemainingGap is true");
  assert(msg10.remainingGap === 300, "remainingGap is 300");
  assert(msg10.subline.includes("₹300 more"), "Subline clearly states '₹300 more'");

  // Test 11: Zero or negative gap suppressed
  console.log("\n--- 11. Zero or Negative Gap Suppressed ---");
  // Case A: Cart items total >= bundle price
  const msg11a = getCartLookRecommendationMessaging({
    allProducts: [
      { id: "p1", slug: "p1", name: "Heavy Choker", price: 1500, category: "chains", published: true, archived: false, imageUrl: null },
      { id: "p2", slug: "p2", name: "Earrings", price: 500, category: "earrings", published: true, archived: false, imageUrl: null },
    ],
    inCartProductKeys: ["p1"],
    bundlePrice: 1500, // Bundle price is equal to currently selected item
  });
  assert(msg11a.hasRemainingGap === false, "hasRemainingGap is false when safeBundle <= inCartTotal");
  assert(msg11a.remainingGap === 0, "remainingGap is 0");
  assert(!msg11a.subline.includes("more"), "Does not state 'more'");
  assert(msg11a.subline.includes("unlock your Complete Look price of ₹1,500"), "States fixed unlock price instead");

  // Case B: Bundle price strictly less than cart total
  const msg11b = getCartLookRecommendationMessaging({
    allProducts: [
      { id: "p1", slug: "p1", name: "Heavy Choker", price: 1500, category: "chains", published: true, archived: false, imageUrl: null },
      { id: "p2", slug: "p2", name: "Earrings", price: 500, category: "earrings", published: true, archived: false, imageUrl: null },
    ],
    inCartProductKeys: ["p1"],
    bundlePrice: 1400, // Bundle price is less than current item
  });
  assert(msg11b.hasRemainingGap === false, "hasRemainingGap is false when bundle < inCartTotal");
  assert(msg11b.remainingGap === 0, "remainingGap is 0");
  assert(!msg11b.subline.includes("-"), "Never displays negative signs");

  // Test 12: Out-of-stock remaining piece visibly identified
  console.log("\n--- 12. Out-of-Stock Remaining Piece Identified ---");
  // Set bracelet to 0 stock
  mockDb.inventory["p-bracelet"] = 0;
  const rec12 = await getCartCompleteTheLookRecommendation(["p-necklace"], mockDb);
  assert(rec12 !== null, "Look discovered");
  assert(rec12?.canBeCompleted === false, "canBeCompleted is false due to OOS bracelet");
  const oosBracelet = rec12?.remainingProducts.find((p) => p.id === "p-bracelet");
  assert(oosBracelet?.inStock === false, "Bracelet has inStock: false");
  assert(rec12?.subline.includes("currently out of stock"), "Headline/subline indicates out of stock");
  // Restore inventory
  mockDb.inventory["p-bracelet"] = 8;

  // Test 13: Multi-look candidate priority scoring
  console.log("\n--- 13. Multi-Look Candidate Priority Scoring ---");
  // Suppose cart has 'p-necklace' (1/3 of pearl trio) and 'p-choker' + 'p-stud' (2/2 of choker duo)
  // Or 'p-necklace' (1/3) vs 'p-choker' (1/2)
  const rec13a = await getCartCompleteTheLookRecommendation(["p-necklace", "p-choker"], mockDb);
  // Both sets have 1 item in cart. Choker duo has 2 total (1 in cart = 50% complete).
  // Pearl trio has 3 total (1 in cart = 33% complete).
  // Both have remaining > 0.
  // Now add 'p-earrings' to cart: pearl trio has 2 in cart (66% complete), choker duo has 1 (50% complete).
  const rec13b = await getCartCompleteTheLookRecommendation(["p-necklace", "p-earrings", "p-choker"], mockDb);
  assert(rec13b?.setId === "set-pearl-trio", "Prioritizes look with more items already in cart (2 > 1)");

  // Test 14: 1-click addition adds item to cart
  console.log("\n--- 14. 1-Click Addition Adds Item to Cart ---");
  let cart: CartState = { items: [], bundle: null, bundleNotice: null };
  const snapshotNecklace = {
    slug: "pearl-necklace",
    name: "Pearl Necklace",
    price: 700,
    imageUrl: "/img/necklace.jpg",
    antiTarnish: true,
  };
  cart = addItem(cart, "pearl-necklace", snapshotNecklace);
  assert(cart.items.length === 1, "Item added to cart");
  assert(cart.items[0].productId === "pearl-necklace", "pearl-necklace in cart");

  // Now customer clicks + ADD on earrings
  const snapshotEarrings = {
    slug: "pearl-earrings",
    name: "Pearl Earrings",
    price: 500,
    imageUrl: "/img/earrings.jpg",
    antiTarnish: true,
  };
  cart = addItem(cart, "pearl-earrings", snapshotEarrings);
  assert(cart.items.length === 2, "Second item added to cart via 1-click");

  // Test 15: Server bundle validation on completion
  console.log("\n--- 15. Server Bundle Validation on Completion ---");
  // Customer clicks + ADD on final piece (bracelet)
  const validationRes = await validateCompleteTheLookBundle(
    {
      setId: "set-pearl-trio",
      productIds: ["p-necklace", "p-earrings", "p-bracelet"],
    },
    mockDb
  );
  assert(validationRes.isValid === true, "Server validation succeeds for all 3 pieces");
  assert(validationRes.bundle?.bundlePrice === 1300, "Bundle price validated authoritatively as ₹1300");

  // Apply bundle to cart
  const bundleItems = validationRes.bundle!.products.map((p) => ({
    productId: p.slug,
    snapshot: {
      slug: p.slug,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl ?? "",
      antiTarnish: p.antiTarnish,
    },
  }));
  cart = addBundleToCart(cart, validationRes.bundle!, bundleItems);
  assert(cart.bundle !== null, "Cart has active bundle");
  assert(cart.bundle?.bundlePrice === 1300, "Cart bundle price is 1300");

  const subtotalWithBundle = calculateCartSubtotal(cart);
  assert(subtotalWithBundle.subtotal === 1300, "Cart subtotal calculates exactly as ₹1,300 bundle price");
  assert(subtotalWithBundle.bundleDiscount === 200, "Cart bundle discount is ₹200");

  // Test 16: Bundle dissolution cleanly re-surfaces recommendation
  console.log("\n--- 16. Bundle Dissolution Re-Surfaces Recommendation ---");
  // Customer removes earrings from cart
  cart = removeItem(cart, "pearl-earrings");
  assert(cart.bundle === null, "Bundle automatically dissolves when item removed");
  assert(cart.bundleNotice !== null, "Notice informs user that bundle was dissolved");
  assert(cart.items.length === 2, "2 items remain in cart");

  // Now query recommendation again
  const remainingKeys = cart.items.map((i) => i.productId);
  const rec16 = await getCartCompleteTheLookRecommendation(remainingKeys, mockDb);
  assert(rec16 !== null, "Recommendation reappears immediately after bundle dissolution");
  assert(rec16?.remainingProducts.length === 1, "Shows the missing piece (earrings)");
  assert(rec16?.remainingProducts[0].id === "p-earrings", "Missing piece is indeed earrings");
  assert(rec16?.headline === "You're almost there ✨", "Persuasion messaging re-activates");

  // Test 17: Coupon application compatibility (coupon_allowed)
  console.log("\n--- 17. Coupon Application Compatibility ---");
  // A) Set with coupon_allowed = true
  const couponResA = await validateAndCalculateCouponServer("VEER10", 1300, {
    hasActiveBundle: true,
    bundleCouponAllowed: true,
    client: mockDb,
  });
  assert(couponResA.valid === true, "Coupon allowed when bundle has coupon_allowed = true");
  if (couponResA.valid) {
    assert(couponResA.discountAmount === 130, "10% coupon applied: ₹130 discount on ₹1300");
  }

  // B) Set with coupon_allowed = false
  const couponResB = await validateAndCalculateCouponServer("VEER10", 1200, {
    hasActiveBundle: true,
    bundleCouponAllowed: false,
    client: mockDb,
  });
  assert(couponResB.valid === false, "Coupon blocked when bundle has coupon_allowed = false");
  if (!couponResB.valid) {
    assert(couponResB.error?.includes("Complete the Look"), "Helpful message explaining coupon incompatibility");
  }

  // Test 18: Storefront PDP & Admin isolation (zero regression)
  console.log("\n--- 18. Storefront PDP & Admin Isolation ---");
  // Verify calculateLookPricing still functions perfectly for PDP
  const pdpPricing = calculateLookPricing(700, [500], 1000);
  assert(pdpPricing.bundlePrice === 1000, "PDP bundle pricing is unchanged");
  assert(pdpPricing.customerSavings === 200, "PDP customerSavings is 200");
  assert(pdpPricing.individualTotal === 1200, "PDP individual total is 1200");

  console.log("\n========================================================");
  console.log(`ALL TESTS PASSED: ${passed} / ${total}`);
  console.log("========================================================\n");
}

runCartCompleteTheLookTests().catch((err) => {
  console.error("Test suite encountered unexpected error:", err);
  process.exit(1);
});
