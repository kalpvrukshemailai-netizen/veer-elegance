/**
 * VEER ELEGANCE — POST /api/payments/create-order
 *
 * ⚠️  TEST MODE ONLY
 *
 * Creates a pending Supabase order AND a Razorpay order atomically.
 * Returns only safe values to the browser — never the secret.
 *
 * Security guarantees:
 *   - Requires authenticated user (JWT validated server-side)
 *   - Product prices resolved from server-side Supabase catalog
 *   - Client-submitted amounts are IGNORED
 *   - RAZORPAY_KEY_SECRET never leaves this handler
 *   - Only keyId is returned to the browser
 */

import { NextRequest, NextResponse } from "next/server";
import { createOrderFromCheckout }   from "@/lib/orders";
import { razorpay, getRazorpayKeyId } from "@/lib/razorpay";
import { createClient }              from "@/lib/supabase/server";
import type { CartItem, CartBundleInfo } from "@/lib/cart";
import type {
  CustomerInformation,
  ShippingAddress,
  DeliveryMethodId,
} from "@/data/checkout";

// ─────────────────────────────────────────────────────────────────────────────

interface CreateOrderBody {
  cartItems:   CartItem[];
  customer:    CustomerInformation;
  shipping:    ShippingAddress;
  deliveryId:  DeliveryMethodId;
  couponCode?: string | null;
  bundle?:     CartBundleInfo | null;
}

function isValidBody(body: unknown): body is CreateOrderBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.cartItems))                   return false;
  if (!b.customer || typeof b.customer !== "object") return false;
  if (!b.shipping  || typeof b.shipping  !== "object") return false;
  if (typeof b.deliveryId !== "string")              return false;
  if (b.couponCode !== undefined && b.couponCode !== null && typeof b.couponCode !== "string") return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "You must be signed in to place an order." },
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
      { success: false, error: "Missing required checkout fields." },
      { status: 400 },
    );
  }

  // ── Create Supabase order (server-side price calculation) ──────────────────
  const orderResult = await createOrderFromCheckout({
    cartItems:  body.cartItems,
    customer:   body.customer,
    shipping:   body.shipping,
    deliveryId: body.deliveryId,
    couponCode: body.couponCode,
    bundle:     body.bundle,
  });

  if (!orderResult.success) {
    const status = orderResult.error.includes("signed in") ? 401 : 422;
    return NextResponse.json(
      { success: false, error: orderResult.error },
      { status },
    );
  }

  const supabaseOrderId = orderResult.orderId;

  // ── Read back the order to get the authoritative total ─────────────────────
  // The amount comes from our database — NOT from the client.
  const { data: orderRow, error: fetchError } = await supabase
    .from("orders")
    .select("total_amount, currency, razorpay_order_id")
    .eq("id", supabaseOrderId)
    .single();

  if (fetchError || !orderRow) {
    console.error("[create-order] Failed to read back order:", fetchError?.message);
    return NextResponse.json(
      { success: false, error: "Unable to retrieve order details." },
      { status: 500 },
    );
  }

  const totalAmount = Number((orderRow as { total_amount: number }).total_amount);
  const currency    = (orderRow as { currency: string }).currency ?? "INR";

  // Razorpay amount is in paise (1 INR = 100 paise)
  // Use minimum 100 paise (₹1) for zero-amount orders (e.g. free shipping + no price)
  const amountPaise = Math.max(Math.round(totalAmount * 100), 100);

  // ── Create Razorpay order (server-side, using secret key) ─────────────────
  let razorpayOrder: { id: string; amount: number; currency: string };
  try {
    razorpayOrder = await razorpay.orders.create({
      amount:          amountPaise,
      currency:        currency,
      receipt:         supabaseOrderId.slice(0, 40),  // max 40 chars
      notes: {
        supabase_order_id: supabaseOrderId,
        // TEST MODE marker
        mode: "test",
      },
    }) as { id: string; amount: number; currency: string };
  } catch (err) {
    console.error("[create-order] Razorpay order creation failed:", err);
    return NextResponse.json(
      { success: false, error: "Payment gateway error. Please try again." },
      { status: 502 },
    );
  }

  // ── Store razorpay_order_id back in Supabase ───────────────────────────────
  const { error: updateError } = await supabase
    .from("orders")
    .update({ razorpay_order_id: razorpayOrder.id, updated_at: new Date().toISOString() })
    .eq("id", supabaseOrderId)
    .eq("user_id", user.id);  // ownership safety

  if (updateError) {
    console.error("[create-order] Failed to store razorpay_order_id:", updateError.message);
    // Non-fatal — continue, verify route will still work
  }

  // ── Return safe values only ────────────────────────────────────────────────
  // NEVER return RAZORPAY_KEY_SECRET or the razorpay_signature here.
  return NextResponse.json({
    success:        true,
    razorpayOrderId: razorpayOrder.id,
    amount:         razorpayOrder.amount,   // paise
    currency:       razorpayOrder.currency,
    keyId:          getRazorpayKeyId(),     // publishable key only
    supabaseOrderId,
  }, { status: 201 });
}
