/**
 * VEER ELEGANCE — GET /api/reviews/eligibility
 *
 * Checks if the current authenticated user has purchased a product and is
 * eligible to submit a review, or whether they already have an existing review.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUserReviewProduct } from "@/lib/reviews-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId") || "";

  if (!productId.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing productId query parameter." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      success: true,
      canReview: false,
      isVerifiedPurchase: false,
      reason: "not_authenticated",
    });
  }

  const eligibility = await canUserReviewProduct(user.id, productId.trim(), supabase);

  return NextResponse.json({
    success: true,
    ...eligibility,
  });
}
