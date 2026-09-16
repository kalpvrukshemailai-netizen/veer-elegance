/**
 * VEER ELEGANCE — GET /api/payments/order-status
 *
 * ⚠️  TEST MODE ONLY
 *
 * Checks whether an existing pending Supabase order is still reusable
 * for a Razorpay payment retry (e.g. after the customer cancels the
 * Razorpay modal and wants to try again without creating a new order).
 *
 * An order is reusable when:
 *   - payment_status = 'pending' (not yet captured or failed)
 *   - inventory_finalized = false
 *   - order age < RAZORPAY_ORDER_TTL_MINUTES (15 min, matching Razorpay expiry)
 *   - belongs to the authenticated user
 *
 * Returns the Razorpay order details needed to re-open the checkout sheet.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRazorpayKeyId }          from "@/lib/razorpay";
import { createClient }              from "@/lib/supabase/server";

// Razorpay orders expire after 15 minutes. Re-use is safe within this window.
const RAZORPAY_ORDER_TTL_MS = 15 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  // ── Read orderId param ─────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim();

  if (!orderId) {
    return NextResponse.json(
      { success: false, error: "orderId is required." },
      { status: 400 },
    );
  }

  // ── Fetch order (ownership enforced) ──────────────────────────────────────
  const { data: row, error: fetchError } = await supabase
    .from("orders")
    .select("id, user_id, payment_status, inventory_finalized, razorpay_order_id, total_amount, currency, created_at")
    .eq("id", orderId)
    .eq("user_id", user.id)   // ownership: cannot query another user's order
    .single();

  if (fetchError || !row) {
    return NextResponse.json(
      { success: false, reusable: false, error: "Order not found." },
      { status: 404 },
    );
  }

  const order = row as {
    id:                 string;
    payment_status:     string;
    inventory_finalized:boolean;
    razorpay_order_id:  string | null;
    total_amount:       number;
    currency:           string;
    created_at:         string;
  };

  // ── Assess reusability ─────────────────────────────────────────────────────
  const ageMs      = Date.now() - new Date(order.created_at).getTime();
  const reusable   =
    order.payment_status     === "pending" &&
    order.inventory_finalized === false    &&
    order.razorpay_order_id  !== null      &&
    ageMs                    < RAZORPAY_ORDER_TTL_MS;

  if (!reusable) {
    return NextResponse.json({ success: true, reusable: false });
  }

  // Amount in paise (matches what was stored when the Razorpay order was created)
  const amountPaise = Math.max(Math.round(order.total_amount * 100), 100);

  return NextResponse.json({
    success:         true,
    reusable:        true,
    supabaseOrderId: order.id,
    razorpayOrderId: order.razorpay_order_id,
    amount:          amountPaise,
    currency:        order.currency ?? "INR",
    keyId:           getRazorpayKeyId(),   // publishable key only — safe for browser
  });
}
