/**
 * VEER ELEGANCE — POST /api/payments/webhook
 *
 * ⚠️  TEST MODE ONLY
 *
 * Razorpay webhook receiver.
 * Validates x-razorpay-signature before processing any event.
 * All database updates are idempotent — safe if the same event arrives twice.
 *
 * === DASHBOARD CONFIGURATION REQUIRED ===
 *
 * To activate this webhook in Razorpay:
 *
 * 1. Open Razorpay Dashboard → Settings → Webhooks → Add New Webhook
 * 2. URL:    https://your-domain.com/api/payments/webhook
 * 3. Secret: generate a secure random string
 * 4. Add to .env.local:  RAZORPAY_WEBHOOK_SECRET=<your-secret>
 * 5. Select events:
 *      ✓ payment.captured
 *      ✓ payment.failed
 *      ✓ order.paid
 *
 * For local development:
 *   Use ngrok to expose localhost:3000 and set the ngrok URL in Dashboard.
 *   ngrok http 3000
 *   → https://<ngrok-id>.ngrok-free.app/api/payments/webhook
 *
 * ==========================================
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature }    from "@/lib/razorpay";
import { adminUpdateOrderPayment, finalizeOrderInventory, orderDisplayRef } from "@/lib/orders";
import { createAdminNotification }   from "@/lib/notifications";
import { createClient }              from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface RazorpayWebhookPayload {
  entity:  string;
  event:   string;
  payload: {
    payment?: {
      entity?: {
        id:       string;
        order_id: string;
        status:   string;
        notes?:   Record<string, string>;
      };
    };
    order?: {
      entity?: {
        id:     string;
        status: string;
        notes?: Record<string, string>;
      };
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Read raw body for signature verification (must be string, not parsed)
  const rawBody  = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  // ── Signature verification ──────────────────────────────────────────────
  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn("[webhook] Invalid webhook signature received.");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // ── Parse payload ──────────────────────────────────────────────────────
  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  console.log("[webhook] Received event:", event.event);

  // ── Handle events ──────────────────────────────────────────────────────
  try {
    switch (event.event) {
      case "payment.captured": {
        const payment = event.payload.payment?.entity;
        if (!payment) break;

        const supabaseOrderId = await resolveSupabaseOrderId(payment.order_id, payment.notes);
        if (!supabaseOrderId) {
          console.warn("[webhook] payment.captured: cannot resolve Supabase order for Razorpay order", payment.order_id);
          break;
        }

        await adminUpdateOrderPayment({
          orderId:           supabaseOrderId,
          paymentStatus:     "captured",
          razorpayOrderId:   payment.order_id,
          razorpayPaymentId: payment.id,
        });
        // Finalize inventory — idempotent; safe if verify route already did this
        const fin = await finalizeOrderInventory(supabaseOrderId);
        if (!fin.success) {
          console.warn("[webhook] payment.captured: inventory finalization:", {
            reason: fin.reason, product_id: fin.productId, order_id: supabaseOrderId,
          });
        } else if (!fin.alreadyDone) {
          // First finalization — notify admin (idempotent via DB unique index)
          void createAdminNotification({
            type:           "new_order",
            title:          "New order received",
            message:        `Order ${orderDisplayRef(supabaseOrderId)} payment confirmed.`,
            reference_id:   supabaseOrderId,
            reference_type: "order",
          }).catch(err => console.error("[webhook] notification error:", err));
        }
        console.log("[webhook] payment.captured processed:", {
          order_id: supabaseOrderId, razorpay_payment_id: payment.id,
        });
        break;
      }

      case "payment.failed": {
        const payment = event.payload.payment?.entity;
        if (!payment) break;

        const supabaseOrderId = await resolveSupabaseOrderId(payment.order_id, payment.notes);
        if (!supabaseOrderId) break;

        // Only update to failed if not already captured (idempotent)
        await adminUpdateOrderPayment({
          orderId:         supabaseOrderId,
          paymentStatus:   "failed",
          razorpayOrderId: payment.order_id,
        });
        console.log("[webhook] payment.failed processed for order:", supabaseOrderId);
        break;
      }

      case "order.paid": {
        // order.paid fires after payment is captured — idempotent update
        const order = event.payload.order?.entity;
        if (!order) break;

        const supabaseOrderId = await resolveSupabaseOrderId(order.id, order.notes);
        if (!supabaseOrderId) break;

        await adminUpdateOrderPayment({
          orderId:         supabaseOrderId,
          paymentStatus:   "captured",
          razorpayOrderId: order.id,
        });
        // Finalize inventory — idempotent; safe if verify route or payment.captured already did this
        const fin = await finalizeOrderInventory(supabaseOrderId);
        if (!fin.success) {
          console.warn("[webhook] order.paid: inventory finalization:", {
            reason: fin.reason, product_id: fin.productId, order_id: supabaseOrderId,
          });
        } else if (!fin.alreadyDone) {
          // First finalization — notify admin (idempotent via DB unique index)
          void createAdminNotification({
            type:           "new_order",
            title:          "New order received",
            message:        `Order ${orderDisplayRef(supabaseOrderId)} payment confirmed.`,
            reference_id:   supabaseOrderId,
            reference_type: "order",
          }).catch(err => console.error("[webhook] notification error:", err));
        }
        console.log("[webhook] order.paid processed:", { order_id: supabaseOrderId });
        break;
      }

      default:
        // Unknown event — log and return 200 so Razorpay doesn't retry
        console.log("[webhook] Unhandled event type:", event.event);
        break;
    }
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    // Return 200 anyway to prevent Razorpay from retrying
  }

  // Always return 200 — Razorpay retries on non-2xx responses
  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the Supabase order UUID from the Razorpay order ID.
 *
 * Strategy:
 *   1. Check notes.supabase_order_id  — set when we create the Razorpay order
 *   2. Fall back to DB lookup by razorpay_order_id index
 */
async function resolveSupabaseOrderId(
  razorpayOrderId: string,
  notes?: Record<string, string>,
): Promise<string | null> {
  // Strategy 1: notes set at Razorpay order creation time
  if (notes?.supabase_order_id) {
    return notes.supabase_order_id;
  }

  // Strategy 2: DB lookup by razorpay_order_id column (indexed)
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();

    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}
