/**
 * VEER ELEGANCE — POST /api/cart/complete-the-look/recommendations
 *
 * Cart discovery & recommendation endpoint.
 * Accepts an array of product IDs or slugs currently in the customer's cart,
 * and dynamically discovers if any belong to an enabled Complete-the-Look set.
 * Returns the candidate look recommendation, remaining products, and live messaging.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCartCompleteTheLookRecommendation } from "@/lib/complete-the-look-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { productIds } = body || {};

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: true,
        recommendation: null,
      });
    }

    const recommendation = await getCartCompleteTheLookRecommendation(productIds);

    return NextResponse.json({
      success: true,
      recommendation,
    });
  } catch (err: any) {
    console.error("[/api/cart/complete-the-look/recommendations] Error:", err?.message);
    return NextResponse.json(
      { success: false, error: "Failed to evaluate cart recommendations." },
      { status: 500 }
    );
  }
}
