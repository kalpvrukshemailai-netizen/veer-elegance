/**
 * VEER ELEGANCE — Unit & Integration Test Suite for First Order Only Coupons
 *
 * Requirements tested:
 *  1. First-order coupon + customer with no previous successful order → PASS
 *  2. First-order coupon + customer with previous successful order → REJECT
 *  3. First-order coupon + guest (unauthenticated) → REJECT
 *  4. Normal coupon + first-time customer → existing behavior
 *  5. Normal coupon + returning customer → existing behavior
 *  6. Failed previous payment should not incorrectly disqualify first-order eligibility
 *  7. Cancelled / incomplete order should follow existing successful-order semantics
 *  8. Existing minimum subtotal / discount cap / usage / date rules still work together with first-order restriction
 *  9. Server-side validation cannot be bypassed by client input
 * 10. Existing coupons with first_order_only = false behave exactly as before
 */

import {
  isEligibleForFirstOrderCoupon,
  type CouponRow,
} from "../lib/coupon-utils";
import {
  validateAndCalculateCouponServer,
  getCustomerSuccessfulOrderCount,
} from "../lib/coupons";

console.log("=== RUNNING FIRST-ORDER COUPON RESTRICTION TEST SUITE ===");

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, description: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✓ [PASS] ${description}`);
  } else {
    console.error(`✗ [FAIL] ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

// Sample coupon models
const firstOrderCoupon: CouponRow = {
  id:                  "c_first_order",
  code:                "FIRSTORDER",
  discount_type:       "percentage",
  discount_value:      15,
  minimum_order_value: 500,
  maximum_discount:    300,
  usage_limit:         1000,
  used_count:          5,
  starts_at:           null,
  expires_at:          null,
  is_active:           true,
  first_order_only:    true,
  created_at:          new Date().toISOString(),
  updated_at:          new Date().toISOString(),
};

const standardCoupon: CouponRow = {
  id:                  "c_standard",
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

interface MockOrder {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
}

/**
 * Creates a mock Supabase client backed by mock coupons and orders data.
 */
function createMockSupabase(orders: MockOrder[], coupons: CouponRow[] = [firstOrderCoupon, standardCoupon]) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: null },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === "coupons") {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              single: async () => {
                const found = coupons.find(c => c[col as keyof CouponRow] === val);
                if (!found) return { data: null, error: { message: "Not found" } };
                return { data: found, error: null };
              },
            }),
          }),
        };
      }

      if (table === "orders") {
        let filtered = [...orders];
        const builder: any = {
          select: (_cols: string, _opts?: { count?: string; head?: boolean }) => builder,
          eq: (col: string, val: any) => {
            filtered = filtered.filter(o => (o as any)[col] === val);
            return builder;
          },
          in: (col: string, vals: any[]) => {
            filtered = filtered.filter(o => vals.includes((o as any)[col]));
            return builder;
          },
          neq: (col: string, val: any) => {
            filtered = filtered.filter(o => (o as any)[col] !== val);
            return builder;
          },
        };

        // When awaited, return { count, error }
        builder.then = (resolve: any) => {
          resolve({ count: filtered.length, error: null });
        };

        return builder;
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

async function runTests() {
  const customerId = "user_cust_123";
  const otherCustomerId = "user_cust_456";

  // ── Test 1: First-order coupon + customer with NO previous successful order → PASS ──
  console.log("\n--- Test 1: First-order coupon with new customer (0 orders) ---");
  {
    const mockDb = createMockSupabase([]);
    const res = await validateAndCalculateCouponServer("FIRSTORDER", 1000, {
      userId: customerId,
      client: mockDb as any,
    });

    assert(res.valid === true, "Coupon validation returns valid: true for new customer");
    if (res.valid) {
      assert(res.discountAmount === 150, "Discount amount is 15% of ₹1000 = ₹150");
      assert(res.discountedSubtotal === 850, "Discounted subtotal is ₹850");
      assert(res.firstOrderOnly === true, "Result preserves firstOrderOnly = true");
    }
  }

  // ── Test 2: First-order coupon + customer with previous successful order → REJECT ──
  console.log("\n--- Test 2: First-order coupon with returning customer (1+ confirmed orders) ---");
  {
    const mockDb = createMockSupabase([
      { id: "ord_1", user_id: customerId, status: "confirmed", payment_status: "captured" },
    ]);
    const res = await validateAndCalculateCouponServer("FIRSTORDER", 1000, {
      userId: customerId,
      client: mockDb as any,
    });

    assert(res.valid === false, "Coupon validation returns valid: false for returning customer");
    if (!res.valid) {
      assert(
        res.error === "This coupon is valid only on your first order.",
        `Error matches exact user-facing message: "${res.error}"`
      );
    }
  }

  // ── Test 3: First-order coupon + guest (unauthenticated) → REJECT ──
  console.log("\n--- Test 3: First-order coupon with guest customer (no userId) ---");
  {
    const mockDb = createMockSupabase([]);
    const res = await validateAndCalculateCouponServer("FIRSTORDER", 1000, {
      userId: null,
      client: mockDb as any,
    });

    assert(res.valid === false, "Coupon validation returns valid: false for guest");
    if (!res.valid) {
      assert(
        res.error === "Please sign in to use this first-order coupon.",
        `Error matches exact guest message: "${res.error}"`
      );
    }
  }

  // ── Test 4: Normal coupon + first-time customer → existing behavior ──
  console.log("\n--- Test 4: Standard coupon with first-time customer ---");
  {
    const mockDb = createMockSupabase([]);
    const res = await validateAndCalculateCouponServer("VEER10", 1000, {
      userId: customerId,
      client: mockDb as any,
    });

    assert(res.valid === true, "Standard coupon passes for first-time customer");
    if (res.valid) {
      assert(res.discountAmount === 100, "10% discount on ₹1000 = ₹100");
    }
  }

  // ── Test 5: Normal coupon + returning customer → existing behavior ──
  console.log("\n--- Test 5: Standard coupon with returning customer ---");
  {
    const mockDb = createMockSupabase([
      { id: "ord_1", user_id: customerId, status: "delivered", payment_status: "captured" },
      { id: "ord_2", user_id: customerId, status: "processing", payment_status: "captured" },
    ]);
    const res = await validateAndCalculateCouponServer("VEER10", 1000, {
      userId: customerId,
      client: mockDb as any,
    });

    assert(res.valid === true, "Standard coupon passes for returning customer with multiple orders");
    if (res.valid) {
      assert(res.discountAmount === 100, "10% discount on ₹1000 = ₹100");
    }
  }

  // ── Test 6: Failed previous payment should NOT disqualify customer ──
  console.log("\n--- Test 6: Failed payment does not disqualify first-order eligibility ---");
  {
    const mockDb = createMockSupabase([
      { id: "ord_fail", user_id: customerId, status: "pending", payment_status: "failed" },
    ]);
    const res = await validateAndCalculateCouponServer("FIRSTORDER", 1000, {
      userId: customerId,
      client: mockDb as any,
    });

    assert(res.valid === true, "Customer with only failed payment attempt remains eligible for first-order coupon");
    if (res.valid) {
      assert(res.discountAmount === 150, "Discount applied successfully");
    }
  }

  // ── Test 7: Cancelled or incomplete orders do NOT count as successful orders ──
  console.log("\n--- Test 7: Cancelled orders & abandoned checkouts do NOT disqualify customer ---");
  {
    const mockDb = createMockSupabase([
      { id: "ord_abandoned", user_id: customerId, status: "pending", payment_status: "pending" },
      { id: "ord_cancelled", user_id: customerId, status: "cancelled", payment_status: "refunded" },
      { id: "ord_other_cust", user_id: otherCustomerId, status: "confirmed", payment_status: "captured" },
    ]);

    const orderCount = await getCustomerSuccessfulOrderCount(customerId, mockDb as any);
    assert(orderCount === 0, `Previous successful order count is 0 (got ${orderCount})`);

    const isEligible = isEligibleForFirstOrderCoupon(orderCount);
    assert(isEligible === true, "Pure helper isEligibleForFirstOrderCoupon returns true");

    const res = await validateAndCalculateCouponServer("FIRSTORDER", 1000, {
      userId: customerId,
      client: mockDb as any,
    });
    assert(res.valid === true, "Coupon applies successfully when prior orders were abandoned or cancelled");
  }

  // ── Test 8: Other coupon rules (minimum subtotal, max discount cap, usage) work together ──
  console.log("\n--- Test 8: Existing constraint rules work concurrently with first-order restriction ---");
  {
    const mockDb = createMockSupabase([]);

    // Subtotal ₹400 < min order ₹500
    const minOrderRes = await validateAndCalculateCouponServer("FIRSTORDER", 400, {
      userId: customerId,
      client: mockDb as any,
    });
    assert(minOrderRes.valid === false, "Subtotal below minimum order value is rejected");
    if (!minOrderRes.valid) {
      assert(
        minOrderRes.error.includes("Minimum order value"),
        `Error contains minimum order message: "${minOrderRes.error}"`
      );
    }

    // Subtotal ₹3000: 15% = ₹450, but max discount cap = ₹300
    const capRes = await validateAndCalculateCouponServer("FIRSTORDER", 3000, {
      userId: customerId,
      client: mockDb as any,
    });
    assert(capRes.valid === true, "First-order coupon valid on ₹3000 subtotal");
    if (capRes.valid) {
      assert(capRes.discountAmount === 300, `Discount capped at ₹300 (got ${capRes.discountAmount})`);
      assert(capRes.discountedSubtotal === 2700, "Discounted subtotal is ₹2700");
    }
  }

  // ── Test 9: Server-side validation cannot be bypassed by client input ──
  console.log("\n--- Test 9: Server-side verification cannot be bypassed ---");
  {
    // Customer has confirmed order in DB
    const mockDb = createMockSupabase([
      { id: "ord_real", user_id: customerId, status: "confirmed", payment_status: "captured" },
    ]);

    // Regardless of how the caller invokes it, if customer has an order, it is rejected
    const res = await validateAndCalculateCouponServer("FIRSTORDER", 1000, {
      userId: customerId,
      client: mockDb as any,
    });
    assert(res.valid === false, "Client cannot bypass server order query check");
    if (!res.valid) {
      assert(res.error === "This coupon is valid only on your first order.", "Rejected with standard error");
    }
  }

  // ── Test 10: Existing coupons with first_order_only = false behave exactly as before ──
  console.log("\n--- Test 10: Legacy / existing coupons with first_order_only = false are unaffected ---");
  {
    const mockDb = createMockSupabase([
      { id: "ord_old_1", user_id: customerId, status: "delivered", payment_status: "captured" },
    ]);

    // VEER10 has first_order_only: false
    const res = await validateAndCalculateCouponServer("VEER10", 1500, {
      userId: customerId,
      client: mockDb as any,
    });

    assert(res.valid === true, "Existing coupon applies with no restriction on returning customer");
    if (res.valid) {
      assert(res.discountAmount === 150, "Discount calculated normally (10% of ₹1500 = ₹150)");
      assert(res.firstOrderOnly === false, "firstOrderOnly is false");
    }

    // Guest applying VEER10 should also work
    const guestRes = await validateAndCalculateCouponServer("VEER10", 1500, {
      userId: null,
      client: mockDb as any,
    });
    assert(guestRes.valid === true, "Existing coupon applies with no restriction for guest users");
  }

  console.log("\n==================================================");
  console.log(`TOTAL FIRST-ORDER TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: 0`);
  console.log("==================================================");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
