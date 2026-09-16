/**
 * VEER ELEGANCE — /api/admin/reviews
 *
 * Admin review management endpoints:
 *  - GET: Paginated / filtered list of all reviews.
 *  - PATCH: Moderate review (approve / reject).
 *  - DELETE: Delete review.
 * Enforces requireAdmin() on all operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  getAllReviewsAdmin,
  adminSetReviewStatus,
  adminDeleteReview,
  type AdminReviewFilterOptions,
} from "@/lib/reviews-server";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") as any) || "all";
  const ratingRaw = searchParams.get("rating");
  const rating = ratingRaw && ratingRaw !== "all" ? parseInt(ratingRaw, 10) : "all";
  const search = searchParams.get("search") || undefined;
  const productId = searchParams.get("productId") || undefined;

  const filters: AdminReviewFilterOptions = {
    status,
    rating: isNaN(rating as number) ? "all" : rating,
    search,
    productId,
  };

  const reviews = await getAllReviewsAdmin(filters);
  return NextResponse.json({ success: true, reviews });
}

export async function PATCH(request: NextRequest) {
  await requireAdmin();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { reviewId, status } = body as { reviewId?: string; status?: "approved" | "rejected" };

  if (!reviewId || (status !== "approved" && status !== "rejected")) {
    return NextResponse.json({ success: false, error: "Valid reviewId and status required." }, { status: 400 });
  }

  const result = await adminSetReviewStatus(reviewId, status);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `Review ${status}.` });
}

export async function DELETE(request: NextRequest) {
  await requireAdmin();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { reviewId } = body as { reviewId?: string };

  if (!reviewId) {
    return NextResponse.json({ success: false, error: "reviewId required." }, { status: 400 });
  }

  const result = await adminDeleteReview(reviewId);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Review deleted." });
}
