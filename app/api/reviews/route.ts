/**
 * VEER ELEGANCE — /api/reviews
 *
 * REST API for Product Reviews:
 *  - GET: Public endpoint returning approved reviews and rating stats for a product.
 *  - POST: Authenticated customer submits a review for a verified purchase.
 *  - PUT: Authenticated author updates their existing review.
 *  - DELETE: Authenticated author deletes their review.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProductReviewStats,
  getApprovedProductReviews,
  submitProductReview,
  updateProductReview,
  deleteProductReview,
} from "@/lib/reviews-server";
import { uploadCustomerReviewPhoto } from "@/lib/review-photo-upload";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId") || "";
  const sort = (searchParams.get("sort") as "recent" | "highest" | "lowest") || "recent";
  const photosOnly = searchParams.get("photosOnly") === "true";

  if (!productId.trim()) {
    return NextResponse.json({ success: false, error: "Missing productId." }, { status: 400 });
  }

  const [stats, reviews] = await Promise.all([
    getProductReviewStats(productId),
    getApprovedProductReviews(productId, { sort, photosOnly }),
  ]);

  return NextResponse.json({
    success: true,
    stats,
    reviews,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required to submit a review." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    // Support multipart/form-data (with optional file upload) or JSON
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const productId = formData.get("productId") as string;
      const ratingStr = formData.get("rating") as string;
      const reviewText = formData.get("reviewText") as string;
      const photoFile = formData.get("photo") as File | null;

      let imageUrl: string | null = null;
      if (photoFile && photoFile.size > 0) {
        const uploadRes = await uploadCustomerReviewPhoto(photoFile, productId, user.id, supabase);
        if (!uploadRes.success) {
          return NextResponse.json({ success: false, error: uploadRes.error }, { status: 400 });
        }
        imageUrl = uploadRes.publicUrl ?? null;
      }

      body = {
        productId,
        rating: parseFloat(ratingStr),
        reviewText,
        imageUrl,
      };
    } else {
      body = await request.json();
    }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request payload." }, { status: 400 });
  }

  const { productId, rating, reviewText, imageUrl } = body as {
    productId?: string;
    rating?: number;
    reviewText?: string;
    imageUrl?: string | null;
  };

  if (!productId || typeof rating !== "number" || !reviewText) {
    return NextResponse.json(
      { success: false, error: "productId, rating, and reviewText are required." },
      { status: 400 }
    );
  }

  const result = await submitProductReview(
    user.id,
    { productId, rating, reviewText, imageUrl },
    supabase
  );

  if (!result.success) {
    const status = result.error?.includes("Only customers who have purchased") ? 403 : 400;
    return NextResponse.json({ success: false, error: result.error }, { status });
  }

  return NextResponse.json({
    success: true,
    message: "Your review has been submitted and is awaiting approval.",
    review:  result.review,
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { reviewId, rating, reviewText, imageUrl } = body as {
    reviewId?: string;
    rating?: number;
    reviewText?: string;
    imageUrl?: string | null;
  };

  if (!reviewId) {
    return NextResponse.json({ success: false, error: "reviewId is required." }, { status: 400 });
  }

  const result = await updateProductReview(
    user.id,
    reviewId,
    { rating, reviewText, imageUrl },
    supabase
  );

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "Your review has been updated and is awaiting approval.",
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { reviewId } = body as { reviewId?: string };
  if (!reviewId) {
    return NextResponse.json({ success: false, error: "reviewId is required." }, { status: 400 });
  }

  const result = await deleteProductReview(user.id, reviewId, supabase);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
