/**
 * VEER ELEGANCE — /api/complete-the-look
 *
 * Public storefront API endpoint for retrieving enabled Complete the Look sets.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCompleteTheLookForProduct } from "@/lib/complete-the-look-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId || !productId.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing productId query parameter." },
        { status: 400 }
      );
    }

    const set = await getCompleteTheLookForProduct(productId.trim());
    return NextResponse.json({ success: true, set });
  } catch (err: any) {
    console.error("[/api/complete-the-look] Error:", err?.message);
    return NextResponse.json(
      { success: false, error: "Failed to load Complete the Look configuration." },
      { status: 500 }
    );
  }
}
