/**
 * VEER ELEGANCE — POST /api/cart/complete-the-look
 *
 * Secure server-side bundle addition endpoint.
 * Validates the candidate Complete-the-Look set, verifies stock,
 * and returns authoritative pricing and item snapshots.
 *
 * Never accepts client-submitted prices, discounts, or bundle amounts.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateCompleteTheLookBundle } from "@/lib/complete-the-look-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseProductId, setId, productIds } = body || {};

    if ((!baseProductId && !setId) || !Array.isArray(productIds) || productIds.length < 2) {
      return NextResponse.json(
        { success: false, error: "Invalid Complete the Look request." },
        { status: 400 }
      );
    }

    const result = await validateCompleteTheLookBundle({
      baseProductId,
      setId,
      productIds,
    });

    if (!result.isValid || !result.bundle) {
      return NextResponse.json(
        { success: false, error: result.error || "Unable to add Complete the Look to bag." },
        { status: 422 }
      );
    }

    // Prepare items in CartItem snapshot format
    const items = result.bundle.products.map((p) => ({
      productId: p.slug,
      quantity:  1,
      bundleId:  result.bundle!.bundleId,
      bundleSetId: result.bundle!.setId,
      snapshot: {
        slug:        p.slug,
        name:        p.name,
        price:       p.price,
        imageUrl:    p.imageUrl ?? "",
        antiTarnish: p.antiTarnish,
      },
    }));

    return NextResponse.json({
      success: true,
      bundle:  result.bundle,
      items,
    });
  } catch (err: any) {
    console.error("[/api/cart/complete-the-look] Error:", err?.message);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while adding Complete the Look." },
      { status: 500 }
    );
  }
}
