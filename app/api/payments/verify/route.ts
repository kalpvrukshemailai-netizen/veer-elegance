/**
 * VEER ELEGANCE — POST /api/payments/verify
 *
 * ⚠️  TEST MODE ONLY
 *
 * Verifies Razorpay payment signature server-side.
 * Updates order payment_status after successful verification.
 *
 * Security guarantees:
 *   - Requires authenticated user
 *   - Verifies order ownership (user can only verify their own orders)
 *   - Signature verification uses HMAC-SHA256 with timingSafeEqual
 *   - Idempotent: already-captured orders call finalizeOrderInventory (safe no-op if already done)
 *   - Cart clearing happens client-side ONLY after this returns success
 *   - RAZORPAY_KEY_SECRET never leaves the server
 */

import { NextRequest, NextResponse }  from "next/server";
import { verifyPaymentSignature }     from "@/lib/razorpay";
import {
  updateOrderPayment,
  finalizeOrderInventory,
  orderDisplayRef,
} from "@/lib/orders";
import { createAdminNotification }    from "@/lib/notifications";
import { createClient }               from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────

interface VerifyBody {
  razorpay_payment_id: string;
  razorpay_order_id:   string;
  razorpay_signature:  string;
  supabaseOrderId:     string;
}

function isValidBody(body: unknown): body is VerifyBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.razorpay_payment_id === "string" &&
    typeof b.razorpay_order_id   === "string" &&
    typeof b.razorpay_signature  === "string" &&
    typeof b.supabaseOrderId     === "string"
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json() as unknown;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      { success: false, error: "Missing payment verification fields." },
      { status: 400 },
    );
  }

  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    supabaseOrderId,
  } = body;

  // ── Verify order ownership ─────────────────────────────────────────────────
  // Ensures this order belongs to the authenticated user before writing anything.
  const { data: orderRow, error: fetchError } = await supabase
    .from("orders")
    .select("id, user_id, payment_status, razorpay_order_id")
    .eq("id", supabaseOrderId)
    .eq("user_id", user.id)   // ownership: returns null if order belongs to someone else
    .single();

  if (fetchError || !orderRow) {
    return NextResponse.json(
      { success: false, error: "Order not found." },
      { status: 404 },
    );
  }

  const order = orderRow as {
    id:                string;
    user_id:           string;
    payment_status:    string;
    razorpay_order_id: string | null;
  };

  // ── Idempotency: already captured ─────────────────────────────────────────
  // Even if already captured (e.g. webhook fired first), still finalize inventory.
  // finalizeOrderInventory() returns already_finalized instantly if already done.
  if (order.payment_status === "captured") {
    console.info("[verify] Order already captured — running idempotent finalization:", {
      order_id: supabaseOrderId,
    });

    const fin = await finalizeOrderInventory(supabaseOrderId);
    if (fin.success && !fin.alreadyDone) {
      // Webhook captured but inventory was not yet finalized — notify admin now.
      // ON CONFLICT DO NOTHING in the DB prevents duplicate notifications.
      void createAdminNotification({
        type:           "new_order",
        title:          "New order received",
        message:        `Order ${orderDisplayRef(supabaseOrderId)} payment confirmed.`,
        reference_id:   supabaseOrderId,
        reference_type: "order",
      }).catch(err => console.error("[verify] notification error:", err));
    }

    return NextResponse.json({ success: true, alreadyCaptured: true });
  }

  // ── Cross-check razorpay_order_id ─────────────────────────────────────────
  // The razorpay_order_id in our DB must match what the client sent.
  // Prevents a customer from submitting a valid signature from a different order.
  if (order.razorpay_order_id && order.razorpay_order_id !== razorpay_order_id) {
    console.warn("[verify] razorpay_order_id mismatch:", {
      order_id:           supabaseOrderId,
      expected_rzp_order: order.razorpay_order_id,
      received_rzp_order: razorpay_order_id,
    });
    await updateOrderPayment({ orderId: supabaseOrderId, paymentStatus: "failed" });
    return NextResponse.json(
      { success: false, error: "Payment verification failed." },
      { status: 400 },
    );
  }

  // ── Server-side HMAC-SHA256 signature verification ────────────────────────
  const isValid = verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );

  if (!isValid) {
    console.warn("[verify] Signature verification FAILED:", {
      order_id:          supabaseOrderId,
      razorpay_order_id: razorpay_order_id,
    });

    // Mark order as failed — do NOT clear cart (client checks json.success)
    await updateOrderPayment({
      orderId:       supabaseOrderId,
      paymentStatus: "failed",
    });

    return NextResponse.json(
      { success: false, error: "Payment verification failed. Please try again." },
      { status: 400 },
    );
  }

  // ── Signature valid — mark order as captured ───────────────────────────────
  const updateResult = await updateOrderPayment({
    orderId:           supabaseOrderId,
    paymentStatus:     "captured",
    razorpayOrderId:   razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
  });

  if (!updateResult.success) {
    console.error("[verify] Failed to update payment status:", {
      order_id: supabaseOrderId,
      error:    updateResult.error,
    });
    return NextResponse.json(
      { success: false, error: "Payment verified but order update failed. Contact support." },
      { status: 500 },
    );
  }

  // ── Finalize inventory (stock deduction + movement log) ────────────────────
  // Fully idempotent — safe if webhook fires this concurrently.
  // On stock issue: order status is flagged (payment_captured_stock_issue) but we
  // still return success because the payment IS genuinely captured.
  // Admin resolves the stock discrepancy manually.
  const finalizeResult = await finalizeOrderInventory(supabaseOrderId);

  if (!finalizeResult.success) {
    if (finalizeResult.reason === "insufficient_stock") {
      console.warn("[verify] Payment captured but stock insufficient:", {
        order_id:   supabaseOrderId,
        product_id: finalizeResult.productId,
      });
    } else {
      console.error("[verify] Inventory finalization error:", {
        reason:     finalizeResult.reason,
        product_id: finalizeResult.productId,
        order_id:   supabaseOrderId,
      });
    }
  } else if (finalizeResult.alreadyDone) {
    console.info("[verify] Inventory already finalized:", { order_id: supabaseOrderId });
  } else {
    // First successful finalization — fire admin notification.
    // (type, reference_id) unique constraint prevents duplicate notifications.
    console.info("[verify] Inventory finalized:", {
      order_id:            supabaseOrderId,
      razorpay_order_id:   razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id,
    });

    void createAdminNotification({
      type:           "new_order",
      title:          "New order received",
      message:        `Order ${orderDisplayRef(supabaseOrderId)} payment confirmed.`,
      reference_id:   supabaseOrderId,
      reference_type: "order",
    }).catch(err => console.error("[verify] notification error:", err));
  }

  // ✅ Payment captured — client will now clear cart and redirect to /checkout/success
  return NextResponse.json({ success: true });
}
