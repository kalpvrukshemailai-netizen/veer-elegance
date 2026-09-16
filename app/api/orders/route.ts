/**
 * VEER ELEGANCE — POST /api/orders
 *
 * Server-side order creation endpoint.
 * Validates the authenticated session, resolves totals from the product
 * catalog, writes order + order_items to Supabase, returns the orderId.
 *
 * The client NEVER submits prices or user_id — these are always
 * derived server-side. The cart is cleared client-side ONLY after
 * this endpoint returns { success: true }.
 *
 * Security:
 *   - Auth via Supabase server client (validates JWT)
 *   - No service-role key used
 *   - Unauthenticated requests are rejected with 401
 *   - Malformed payloads are rejected with 400
 */

import { NextRequest, NextResponse } from "next/server";
import { createOrderFromCheckout, orderDisplayRef } from "@/lib/orders";
import { createAdminNotification }   from "@/lib/notifications";
import type { CartItem, CartBundleInfo } from "@/lib/cart";
import type {
  CustomerInformation,
  ShippingAddress,
  DeliveryMethodId,
} from "@/data/checkout";

// ─────────────────────────────────────────────────────────────────────────────

interface OrderRequestBody {
  cartItems:   CartItem[];
  customer:    CustomerInformation;
  shipping:    ShippingAddress;
  deliveryId:  DeliveryMethodId;
  couponCode?: string | null;
  bundle?:     CartBundleInfo | null;
}

function isValidBody(body: unknown): body is OrderRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.cartItems))       return false;
  if (!b.customer || typeof b.customer !== "object") return false;
  if (!b.shipping  || typeof b.shipping  !== "object") return false;
  if (typeof b.deliveryId !== "string")  return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
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

  const result = await createOrderFromCheckout({
    cartItems:  body.cartItems,
    customer:   body.customer,
    shipping:   body.shipping,
    deliveryId: body.deliveryId,
    couponCode: body.couponCode,
    bundle:     body.bundle,
  });

  if (!result.success) {
    const status = result.error.includes("signed in") ? 401 : 422;
    return NextResponse.json({ success: false, error: result.error }, { status });
  }

  // ── Admin notification (non-blocking, idempotent via unique DB index) ──────
  void createAdminNotification({
    type:           "new_order",
    title:          "New order received",
    message:        `Order ${orderDisplayRef(result.orderId)} has been placed.`,
    reference_id:   result.orderId,
    reference_type: "order",
  }).catch(err => console.error("[order notification]", err));

  return NextResponse.json({ success: true, orderId: result.orderId }, { status: 201 });
}
