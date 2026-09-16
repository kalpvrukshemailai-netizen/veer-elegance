/**
 * VEER ELEGANCE — Idempotency Test Script
 *
 * ⚠️  SAFE TEST — does NOT modify production stock unless
 *     the order you provide is a real captured order.
 *     Always use a dedicated test order.
 *
 * Usage:
 *   npx tsx scripts/test-idempotency.ts <order-uuid>
 *
 * What it tests:
 *   1. Reads current stock for all products in the order
 *   2. Calls finalize_order_inventory() THREE times
 *   3. Asserts:
 *      - Stock after attempt 1 == initial_stock - quantities
 *      - Stock after attempt 2 == same (no second deduction)
 *      - Stock after attempt 3 == same
 *      - Exactly ONE inventory_movements row with movement_type = order_completed
 *        per product (enforced by DB unique index)
 *      - orders.inventory_finalized = true
 *      - orders.payment_status = captured
 *      - Exactly ONE set of order_items
 *   4. Prints a report
 *
 * NOTE: This script uses the Supabase service-role key (server-side only).
 * Never expose it in the browser.
 */

import { createClient } from "@supabase/supabase-js";

// ── Load env ──────────────────────────────────────────────────────────────────
const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error(
    "\n❌  Missing environment variables.\n" +
    "    Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n"
  );
  process.exit(1);
}

const orderId = process.argv[2];
if (!orderId) {
  console.error(
    "\n❌  Usage: npx tsx scripts/test-idempotency.ts <order-uuid>\n"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: { persistSession: false },
});

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string, details?: unknown): void {
  if (condition) {
    console.log(`  ${green("✓")} ${message}`);
    passed++;
  } else {
    console.log(`  ${red("✗")} ${message}`);
    if (details !== undefined) console.log(`    ${yellow("→")} ${JSON.stringify(details)}`);
    failed++;
  }
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n${bold("VEER ELEGANCE — Idempotency Test")}`);
  console.log(`Order: ${orderId}\n`);

  // ── 1. Read order ──────────────────────────────────────────────────────────
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, status, payment_status, inventory_finalized, user_id")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    console.error(red(`\n❌  Order not found: ${orderId}`));
    process.exit(1);
  }

  console.log(bold("Order state (before test):"));
  console.log(`  payment_status:      ${order.payment_status}`);
  console.log(`  status:              ${order.status}`);
  console.log(`  inventory_finalized: ${order.inventory_finalized}`);

  // ── 2. Read order_items ────────────────────────────────────────────────────
  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_id, quantity, product_name")
    .eq("order_id", orderId);

  console.log(`\n${bold("Order items:")} ${items?.length ?? 0}`);
  items?.forEach(i => {
    console.log(`  • ${i.product_name ?? i.product_id}  qty=${i.quantity}`);
  });

  // ── 3. Read initial stock ──────────────────────────────────────────────────
  const productIds = (items ?? []).map(i => i.product_id as string).filter(Boolean);

  // Filter to UUIDs only (slug-based items have no inventory)
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validProductIds = productIds.filter(id => uuidRe.test(id));

  const { data: initialStock } = await supabase
    .from("inventory")
    .select("product_id, stock_quantity")
    .in("product_id", validProductIds);

  const stockBefore = new Map<string, number>(
    (initialStock ?? []).map(r => [r.product_id as string, r.stock_quantity as number])
  );

  console.log(`\n${bold("Initial stock:")}`);
  stockBefore.forEach((qty, pid) => {
    const item = items?.find(i => i.product_id === pid);
    console.log(`  • ${item?.product_name ?? pid}  stock=${qty}`);
  });

  // ── 4. If order is not yet finalized, reset for a clean test ──────────────
  if (order.inventory_finalized) {
    console.log(yellow(
      "\n⚠  Order already finalized. Testing idempotency on pre-finalized order.\n" +
      "   (Stock will NOT be further deducted — that is the correct behaviour.)"
    ));
  }

  // ── 5. Call finalize_order_inventory THREE times ───────────────────────────
  console.log(`\n${bold("Running finalize_order_inventory() × 3:")}`);

  const results: Array<{ success: boolean; reason: string }> = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase
      .rpc("finalize_order_inventory", { p_order_id: orderId });

    if (error) {
      console.log(`  Attempt ${attempt}: ${red("RPC ERROR")} — ${error.message}`);
      results.push({ success: false, reason: `rpc_error: ${error.message}` });
    } else {
      const r = data as { success: boolean; reason: string };
      const label = r.success ? green("success") : red("failure");
      console.log(`  Attempt ${attempt}: ${label}  reason=${r.reason}`);
      results.push(r);
    }
  }

  // ── 6. Read final stock ────────────────────────────────────────────────────
  const { data: finalStockRows } = await supabase
    .from("inventory")
    .select("product_id, stock_quantity")
    .in("product_id", validProductIds);

  const stockAfter = new Map<string, number>(
    (finalStockRows ?? []).map(r => [r.product_id as string, r.stock_quantity as number])
  );

  // ── 7. Read inventory movements ────────────────────────────────────────────
  const { data: movements } = await supabase
    .from("inventory_movements")
    .select("id, product_id, change_quantity, movement_type, order_id")
    .eq("order_id", orderId)
    .eq("movement_type", "order_completed");

  // ── 8. Read final order state ──────────────────────────────────────────────
  const { data: finalOrder } = await supabase
    .from("orders")
    .select("status, payment_status, inventory_finalized")
    .eq("id", orderId)
    .single();

  // ── 9. Read order_items count ──────────────────────────────────────────────
  const { data: finalItems } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", orderId);

  // ── 10. Assertions ──────────────────────────────────────────────────────────
  console.log(`\n${bold("Assertions:")}`);

  // Attempt 1 must succeed (either first finalization or already_finalized)
  assert(
    results[0]?.success === true,
    "Attempt 1 returns success",
    results[0],
  );

  // Attempts 2 + 3 must return already_finalized (idempotent no-op)
  assert(
    results[1]?.reason === "already_finalized",
    "Attempt 2 is idempotent (already_finalized)",
    results[1],
  );
  assert(
    results[2]?.reason === "already_finalized",
    "Attempt 3 is idempotent (already_finalized)",
    results[2],
  );

  // Stock verification per product
  (items ?? []).forEach(item => {
    const pid = item.product_id as string;
    if (!uuidRe.test(pid)) return;  // skip slug items

    const before   = stockBefore.get(pid);
    const after    = stockAfter.get(pid);
    const qty      = item.quantity as number;
    const expected = before !== undefined
      ? (order.inventory_finalized ? before : before - qty)   // already done before test = no change
      : undefined;

    if (before !== undefined && after !== undefined) {
      assert(
        after === expected,
        `Stock deducted exactly once: ${before} - ${qty} = ${expected} (got ${after})`,
        { pid, before, after, expected },
      );
    }
  });

  // Exactly ONE movement per product
  validProductIds.forEach(pid => {
    const count = (movements ?? []).filter(m => m.product_id === pid).length;
    assert(
      count === 1,
      `Exactly 1 order_completed movement for product ${pid.slice(0, 8)}… (got ${count})`,
      movements?.filter(m => m.product_id === pid),
    );
  });

  // Order state
  assert(
    finalOrder?.inventory_finalized === true,
    "orders.inventory_finalized = true",
    finalOrder,
  );
  assert(
    finalOrder?.payment_status === "captured",
    "orders.payment_status = captured",
    finalOrder,
  );
  assert(
    finalOrder?.status === "confirmed" || finalOrder?.status === "payment_captured_stock_issue",
    `orders.status is valid post-payment state (got: ${finalOrder?.status})`,
    finalOrder,
  );

  // Exactly one set of order_items
  const expectedItemCount = items?.length ?? 0;
  assert(
    (finalItems?.length ?? 0) === expectedItemCount,
    `Exactly ${expectedItemCount} order_items (no duplicates)`,
    { expected: expectedItemCount, actual: finalItems?.length },
  );

  // ── 11. Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${bold("─────────────────────────────────────────")}`);
  console.log(bold("Test Result:"));
  console.log(`  Passed: ${green(String(passed))}`);
  console.log(`  Failed: ${failed > 0 ? red(String(failed)) : green("0")}`);

  console.log(`\n${bold("Idempotency Report:")}`);
  console.log(`  Strategy:          inventory_finalized flag + FOR UPDATE row-lock`);
  console.log(`  DB constraint:     inventory_movements_order_completed_unique`);
  console.log(`  Payment guard:     capture_order_payment() atomic conditional UPDATE`);
  console.log(`  Finalization fn:   finalize_order_inventory() (SECURITY DEFINER RPC)`);
  console.log(`  Movements found:   ${movements?.length ?? 0} order_completed`);
  console.log(`  Order items:       ${finalItems?.length ?? 0}`);
  console.log(`  inventory_finalized: ${finalOrder?.inventory_finalized}`);
  console.log(`  payment_status:    ${finalOrder?.payment_status}`);
  console.log(`  order status:      ${finalOrder?.status}`);

  if (failed > 0) {
    console.log(`\n${red("❌  IDEMPOTENCY FAILURES DETECTED")}`);
    process.exit(1);
  } else {
    console.log(`\n${green("✅  ALL IDEMPOTENCY CHECKS PASSED")}`);
    process.exit(0);
  }
}

run().catch(err => {
  console.error(red("\n❌  Unexpected error:"), err);
  process.exit(1);
});
