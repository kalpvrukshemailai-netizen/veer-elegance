/**
 * VEER ELEGANCE — POST /api/coupons/validate
 *
 * Validates a customer coupon code server-side against current database state
 * and authoritative product prices from public.products.
 *
 * Guarantees:
 *   - Prices are resolved from public.products (client-sent prices ignored)
 *   - Discount calculated against verified selling price subtotal
 *   - Free shipping threshold checked against post-coupon subtotal
 *   - Clean, customer-safe error messages
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAndCalculateCouponServer } from "@/lib/coupons";
import { createClient } from "@/lib/supabase/server";
import { calculateShipping } from "@/lib/shipping";
import { getShippingConfig } from "@/lib/site-content";
import { validateCompleteTheLookBundle } from "@/lib/complete-the-look-server";
import type { CartItem, CartBundleInfo } from "@/lib/cart";

interface ValidateCouponBody {
  code:        string;
  cartItems:   CartItem[];
  bundle?:     CartBundleInfo | null;
  deliveryId?: string | null;
}

function isValidBody(body: unknown): body is ValidateCouponBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.code !== "string") return false;
  if (!Array.isArray(b.cartItems)) return false;
  return true;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json() as unknown;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      { success: false, error: "Missing required validation fields." },
      { status: 400 },
    );
  }

  const { code, cartItems, bundle: candidateBundle } = body;

  if (cartItems.length === 0) {
    return NextResponse.json(
      { success: false, error: "Your cart is empty." },
      { status: 400 },
    );
  }

  // ── Authoritative price resolution from Supabase catalog ──────────────────
  const supabase = await createClient();
  const slugs = cartItems.map(item => item.productId);

  const { data: dbProducts, error: dbError } = await supabase
    .from("products")
    .select("id, slug, price")
    .in("slug", slugs)
    .eq("published", true)
    .eq("archived", false);

  if (dbError || !dbProducts) {
    return NextResponse.json(
      { success: false, error: "Failed to verify cart items." },
      { status: 500 },
    );
  }

  const priceMap = new Map<string, number>(
    dbProducts
      .filter(p => typeof p.price === "number")
      .map(p => [p.slug as string, Number(p.price)])
  );

  // ── Re-validate Complete-the-Look bundle server-side ───────────────────────
  let hasActiveBundle = false;
  let bundleCouponAllowed = true;
  let verifiedSubtotal = 0;

  if (candidateBundle && candidateBundle.setId) {
    const bundleItemsInCart = cartItems.filter(
      i => i.bundleId === candidateBundle.bundleId && i.quantity === 1
    );

    const bundleItemSlugs = bundleItemsInCart.map(i => i.productId);

    const bundleValidation = await validateCompleteTheLookBundle(
      {
        setId: candidateBundle.setId,
        productIds: bundleItemSlugs,
      },
      supabase
    );

    if (bundleValidation.isValid && bundleValidation.bundle) {
      hasActiveBundle = true;
      bundleCouponAllowed = bundleValidation.bundle.couponAllowed;

      // Bundle price + non-bundle items subtotal
      const nonBundleItems = cartItems.filter(i => i.bundleId !== candidateBundle.bundleId);
      let nonBundleSubtotal = 0;
      for (const item of nonBundleItems) {
        const unitPrice = priceMap.get(item.productId);
        if (unitPrice !== undefined && unitPrice > 0) {
          nonBundleSubtotal += unitPrice * item.quantity;
        }
      }

      verifiedSubtotal = bundleValidation.bundle.bundlePrice + nonBundleSubtotal;
    }
  }

  // Fallback if no valid bundle active: compute standard catalog sum
  if (!hasActiveBundle) {
    for (const item of cartItems) {
      const unitPrice = priceMap.get(item.productId);
      if (unitPrice !== undefined && unitPrice > 0) {
        verifiedSubtotal += unitPrice * item.quantity;
      }
    }
  }

  if (verifiedSubtotal <= 0) {
    return NextResponse.json(
      { success: false, error: "No priced items found in cart." },
      { status: 400 },
    );
  }

  // ── Authenticated user resolution for coupon eligibility ─────────────────
  const { data: { user } } = await supabase.auth.getUser();

  // ── Server-side coupon validation & discount calculation ──────────────────
  const result = await validateAndCalculateCouponServer(code, verifiedSubtotal, {
    userId: user?.id ?? null,
    hasActiveBundle,
    bundleCouponAllowed,
  });

  if (!result.valid) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  }

  // ── Shipping calculation on POST-COUPON subtotal ──────────────────────────
  const shippingConfig = await getShippingConfig();
  const shippingResult = calculateShipping({
    deliveryMethod:     "standard",
    postCouponSubtotal: result.discountedSubtotal,
    shippingConfig,
  });
  const shippingAmount = shippingResult.shippingCost;
  const totalAmount    = result.discountedSubtotal + shippingAmount;

  return NextResponse.json({
    success: true,
    coupon: {
      code:               result.code,
      discountType:       result.discountType,
      discountValue:      result.discountValue,
      discountAmount:     result.discountAmount,
      subtotal:           result.subtotal,
      discountedSubtotal: result.discountedSubtotal,
      shippingAmount,
      totalAmount,
    },
  });
}
