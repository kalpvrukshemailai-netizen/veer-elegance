/**
 * VEER ELEGANCE — Product Reviews Server Operations
 *
 * Server-only database operations for product reviews, ratings, verified purchase checking,
 * and admin moderation.
 */

import { createClient } from "@/lib/supabase/server";
import {
  type ProductReview,
  type ReviewStats,
  type ReviewEligibilityResult,
  type CreateReviewInput,
  type UpdateReviewInput,
  type ReviewStatus,
  formatReviewerDisplayName,
} from "./reviews";
import { deleteCustomerReviewPhoto } from "./review-photo-upload";

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeReviewText(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/<[^>]*>?/gm, "") // strip all HTML tags
    .slice(0, 1500);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. VERIFIED PURCHASE & ELIGIBILITY CHECKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether an authenticated user is eligible to review a product.
 * Requires that the user purchased the item in a confirmed/delivered/processing/shipped,
 * non-cancelled, non-failed order.
 */
export async function canUserReviewProduct(
  userId: string | null | undefined,
  productIdOrSlug: string,
  client?: any
): Promise<ReviewEligibilityResult> {
  if (!userId || !userId.trim()) {
    return {
      canReview: false,
      isVerifiedPurchase: false,
      reason: "not_authenticated",
    };
  }

  const supabase = client ?? (await createClient());

  // 1. Resolve product UUID and slug
  let product: { id: string; slug: string } | null = null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productIdOrSlug);

  if (isUuid) {
    const { data } = await supabase.from("products").select("id, slug").eq("id", productIdOrSlug).maybeSingle();
    product = data;
  } else {
    // Check by slug first
    const { data: bySlug } = await supabase.from("products").select("id, slug").eq("slug", productIdOrSlug).maybeSingle();
    if (bySlug) {
      product = bySlug;
    } else {
      const { data: byId } = await supabase.from("products").select("id, slug").eq("id", productIdOrSlug).maybeSingle();
      product = byId;
    }
  }

  if (!product) {
    return {
      canReview: false,
      isVerifiedPurchase: false,
      reason: "not_purchased",
    };
  }

  // 2. Check for existing review by this user on this product
  const { data: existingRow } = await supabase
    .from("product_reviews")
    .select("id, product_id, user_id, order_id, rating, review_text, image_url, status, verified_purchase, created_at, updated_at")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .maybeSingle();

  let existingReview: ProductReview | null = null;
  if (existingRow) {
    existingReview = {
      id:                  existingRow.id,
      productId:           existingRow.product_id,
      userId:              existingRow.user_id,
      orderId:             existingRow.order_id,
      rating:              existingRow.rating,
      reviewText:          existingRow.review_text,
      imageUrl:            existingRow.image_url,
      status:              existingRow.status as ReviewStatus,
      verifiedPurchase:    existingRow.verified_purchase,
      createdAt:           existingRow.created_at,
      updatedAt:           existingRow.updated_at,
      reviewerDisplayName: "You",
    };
  }

  // 3. Query orders + order_items for successful completed purchases
  const { data: orderItemRows, error: oErr } = await supabase
    .from("order_items")
    .select(`
      order_id,
      orders!inner (
        id,
        user_id,
        status,
        payment_status
      )
    `)
    .or(`product_id.eq.${product.id},product_slug.eq.${product.slug}`)
    .eq("orders.user_id", userId)
    .in("orders.status", ["confirmed", "processing", "shipped", "delivered"])
    .neq("orders.status", "cancelled")
    .neq("orders.payment_status", "failed")
    .limit(1);

  if (oErr) {
    console.error("[canUserReviewProduct] Error checking orders:", oErr.message);
  }

  const qualifyingItem = orderItemRows && orderItemRows.length > 0 ? orderItemRows[0] : null;

  if (!qualifyingItem) {
    return {
      canReview: false,
      isVerifiedPurchase: false,
      existingReview,
      reason: "not_purchased",
    };
  }

  return {
    canReview: true,
    isVerifiedPurchase: true,
    orderId: qualifyingItem.order_id,
    existingReview,
    reason: existingReview ? "already_reviewed" : "eligible",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PRODUCT REVIEW STATS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the aggregate rating and review distribution for a product.
 * ONLY includes reviews with status = 'approved'.
 */
export async function getProductReviewStats(
  productId: string,
  client?: any
): Promise<ReviewStats> {
  const defaultStats: ReviewStats = {
    averageRating: 0,
    reviewCount:   0,
    distribution:  { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  if (!productId) return defaultStats;

  const supabase = client ?? (await createClient());

  const { data, error } = await supabase
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("status", "approved");

  if (error || !data || data.length === 0) {
    return defaultStats;
  }

  const reviewCount = data.length;
  let totalStars = 0;
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const row of data) {
    const r = Math.min(5, Math.max(1, Math.round(row.rating))) as 1 | 2 | 3 | 4 | 5;
    totalStars += r;
    distribution[r] = (distribution[r] || 0) + 1;
  }

  const averageRating = Math.round((totalStars / reviewCount) * 10) / 10;

  return {
    averageRating,
    reviewCount,
    distribution,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PUBLIC APPROVED REVIEWS QUERY
// ─────────────────────────────────────────────────────────────────────────────

export interface GetApprovedReviewsOptions {
  sort?:       "recent" | "highest" | "lowest";
  photosOnly?: boolean;
  limit?:      number;
}

/**
 * Returns approved reviews for a product with privacy-safe display names.
 */
export async function getApprovedProductReviews(
  productId: string,
  options: GetApprovedReviewsOptions = {},
  client?: any
): Promise<ProductReview[]> {
  if (!productId) return [];

  const supabase = client ?? (await createClient());
  const { sort = "recent", photosOnly = false, limit = 50 } = options;

  let query = supabase
    .from("product_reviews")
    .select(`
      id,
      product_id,
      user_id,
      order_id,
      rating,
      review_text,
      image_url,
      status,
      verified_purchase,
      created_at,
      updated_at
    `)
    .eq("product_id", productId)
    .eq("status", "approved");

  if (photosOnly) {
    query = query.not("image_url", "is", null).neq("image_url", "");
  }

  if (sort === "highest") {
    query = query.order("rating", { ascending: false }).order("created_at", { ascending: false });
  } else if (sort === "lowest") {
    query = query.order("rating", { ascending: true }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error || !data) {
    console.error("[getApprovedProductReviews] Error:", error?.message);
    return [];
  }

  // Resolve reviewer display names via separate query without requiring an FK relationship
  const userIds = Array.from(new Set((data as any[]).map(r => r.user_id).filter(Boolean)));
  const profileMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, first_name")
      .in("id", userIds);

    if (profileRows) {
      for (const p of profileRows) {
        if (p.id && p.first_name) {
          profileMap.set(p.id, p.first_name);
        }
      }
    }
  }

  type ReviewRow = {
    id: string;
    product_id: string;
    user_id: string;
    order_id: string | null;
    rating: number;
    review_text: string;
    image_url: string | null;
    status: string;
    verified_purchase: boolean;
    created_at: string;
    updated_at: string;
  };

  return (data as unknown as ReviewRow[]).map(row => ({
    id:                  row.id,
    productId:           row.product_id,
    userId:              row.user_id,
    orderId:             row.order_id,
    rating:              row.rating,
    reviewText:          row.review_text,
    imageUrl:            row.image_url,
    status:              row.status as ReviewStatus,
    verifiedPurchase:    row.verified_purchase,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
    reviewerDisplayName: formatReviewerDisplayName(profileMap.get(row.user_id)),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CUSTOMER ACTIONS: SUBMIT, UPDATE, DELETE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submits a new review. Strictly validates verified purchase status and character limits.
 * Review enters 'pending' status for moderation.
 */
export async function submitProductReview(
  userId: string,
  input: CreateReviewInput,
  client?: any
): Promise<{ success: boolean; review?: ProductReview; error?: string }> {
  const supabase = client ?? (await createClient());

  // 1. Rating validation
  const rating = Math.round(input.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return { success: false, error: "Please select a rating between 1 and 5 stars." };
  }

  // 2. Text validation
  const text = sanitizeReviewText(input.reviewText);
  if (text.length < 10) {
    return { success: false, error: "Please provide a review of at least 10 characters." };
  }
  if (text.length > 1500) {
    return { success: false, error: "Review cannot exceed 1500 characters." };
  }

  // 3. Purchase verification check
  const eligibility = await canUserReviewProduct(userId, input.productId, supabase);
  if (!eligibility.canReview) {
    return {
      success: false,
      error: "Only customers who have purchased this item can submit a review.",
    };
  }

  // 4. Insert review with pending status
  const { data, error } = await supabase
    .from("product_reviews")
    .insert({
      user_id:           userId,
      product_id:        input.productId,
      order_id:          eligibility.orderId ?? null,
      rating,
      review_text:       text,
      image_url:         input.imageUrl?.trim() || null,
      status:            "pending",
      verified_purchase: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "You have already reviewed this product. You can update your existing review." };
    }
    console.error("[submitProductReview] Insert error:", error.message);
    return { success: false, error: "Failed to submit review. Please try again." };
  }

  return {
    success: true,
    review: {
      id:                  data.id,
      productId:           data.product_id,
      userId:              data.user_id,
      orderId:             data.order_id,
      rating:              data.rating,
      reviewText:          data.review_text,
      imageUrl:            data.image_url,
      status:              data.status as ReviewStatus,
      verifiedPurchase:    data.verified_purchase,
      createdAt:           data.created_at,
      updatedAt:           data.updated_at,
      reviewerDisplayName: "You",
    },
  };
}

/**
 * Updates the author's own review. If content or rating is edited, resets status to 'pending'.
 */
export async function updateProductReview(
  userId: string,
  reviewId: string,
  input: UpdateReviewInput,
  client?: any
): Promise<{ success: boolean; error?: string }> {
  const supabase = client ?? (await createClient());

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
    status:     "pending", // re-trigger moderation on edit
  };

  if (input.rating !== undefined) {
    const r = Math.round(input.rating);
    if (isNaN(r) || r < 1 || r > 5) {
      return { success: false, error: "Rating must be between 1 and 5 stars." };
    }
    updates.rating = r;
  }

  if (input.reviewText !== undefined) {
    const text = sanitizeReviewText(input.reviewText);
    if (text.length < 10) {
      return { success: false, error: "Review must be at least 10 characters." };
    }
    updates.review_text = text;
  }

  if (input.imageUrl !== undefined) {
    updates.image_url = input.imageUrl?.trim() || null;
  }

  const { error } = await supabase
    .from("product_reviews")
    .update(updates)
    .eq("id", reviewId)
    .eq("user_id", userId);

  if (error) {
    console.error("[updateProductReview] Update error:", error.message);
    return { success: false, error: "Failed to update review." };
  }

  return { success: true };
}

/**
 * Deletes the author's own review and cleans up attached photo.
 */
export async function deleteProductReview(
  userId: string,
  reviewId: string,
  client?: any
): Promise<{ success: boolean; error?: string }> {
  const supabase = client ?? (await createClient());

  // Fetch image url to clean up storage if present
  const { data: review } = await supabase
    .from("product_reviews")
    .select("image_url")
    .eq("id", reviewId)
    .eq("user_id", userId)
    .single();

  if (review?.image_url) {
    await deleteCustomerReviewPhoto(review.image_url, supabase);
  }

  const { error } = await supabase
    .from("product_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", userId);

  if (error) {
    console.error("[deleteProductReview] Delete error:", error.message);
    return { success: false, error: "Failed to delete review." };
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CUSTOMER ACCOUNT REVIEWS QUERY
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerReviewRow extends ProductReview {
  productName: string;
  productSlug: string;
  productImageUrl?: string | null;
}

/**
 * Returns all reviews submitted by a specific customer.
 */
export async function getUserReviews(
  userId: string,
  client?: any
): Promise<CustomerReviewRow[]> {
  if (!userId) return [];
  const supabase = client ?? (await createClient());

  const { data, error } = await supabase
    .from("product_reviews")
    .select(`
      id,
      product_id,
      user_id,
      order_id,
      rating,
      review_text,
      image_url,
      status,
      verified_purchase,
      created_at,
      updated_at,
      products (
        name,
        slug,
        image_url
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[getUserReviews] Error:", error?.message);
    return [];
  }

  type CustomerRowWithProduct = {
    id: string;
    product_id: string;
    user_id: string;
    order_id: string | null;
    rating: number;
    review_text: string;
    image_url: string | null;
    status: string;
    verified_purchase: boolean;
    created_at: string;
    updated_at: string;
    products?: { name: string; slug: string; image_url: string | null } | null;
  };

  return (data as unknown as CustomerRowWithProduct[]).map(row => ({
    id:                  row.id,
    productId:           row.product_id,
    userId:              row.user_id,
    orderId:             row.order_id,
    rating:              row.rating,
    reviewText:          row.review_text,
    imageUrl:            row.image_url,
    status:              row.status as ReviewStatus,
    verifiedPurchase:    row.verified_purchase,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
    reviewerDisplayName: "You",
    productName:         row.products?.name ?? "Jewellery Piece",
    productSlug:         row.products?.slug ?? "",
    productImageUrl:     row.products?.image_url,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADMIN MODERATION OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminReviewFilterOptions {
  status?:    "all" | "pending" | "approved" | "rejected";
  rating?:    number | "all";
  productId?: string;
  search?:    string;
  limit?:     number;
}

export interface AdminReviewRecord extends ProductReview {
  productName: string;
  productSlug: string;
}

/**
 * Returns reviews for the admin review management table.
 */
export async function getAllReviewsAdmin(
  filters: AdminReviewFilterOptions = {},
  client?: any
): Promise<AdminReviewRecord[]> {
  const supabase = client ?? (await createClient());
  const { status = "all", rating = "all", productId, search, limit = 100 } = filters;

  let query = supabase
    .from("product_reviews")
    .select(`
      id,
      product_id,
      user_id,
      order_id,
      rating,
      review_text,
      image_url,
      status,
      verified_purchase,
      created_at,
      updated_at,
      products (
        name,
        slug
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (rating && rating !== "all") {
    query = query.eq("rating", rating);
  }

  if (productId && productId.trim()) {
    query = query.eq("product_id", productId.trim());
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("[getAllReviewsAdmin] Error:", error?.message);
    return [];
  }

  // Resolve reviewer display names via separate query without requiring an FK relationship
  const userIds = Array.from(new Set((data as any[]).map(r => r.user_id).filter(Boolean)));
  const profileMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, first_name")
      .in("id", userIds);

    if (profileRows) {
      for (const p of profileRows) {
        if (p.id && p.first_name) {
          profileMap.set(p.id, p.first_name);
        }
      }
    }
  }

  type AdminRow = {
    id: string;
    product_id: string;
    user_id: string;
    order_id: string | null;
    rating: number;
    review_text: string;
    image_url: string | null;
    status: string;
    verified_purchase: boolean;
    created_at: string;
    updated_at: string;
    products?: { name: string; slug: string } | null;
  };

  let rows: AdminReviewRecord[] = (data as unknown as AdminRow[]).map(row => ({
    id:                  row.id,
    productId:           row.product_id,
    userId:              row.user_id,
    orderId:             row.order_id,
    rating:              row.rating,
    reviewText:          row.review_text,
    imageUrl:            row.image_url,
    status:              row.status as ReviewStatus,
    verifiedPurchase:    row.verified_purchase,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
    reviewerDisplayName: formatReviewerDisplayName(profileMap.get(row.user_id)),
    productName:         row.products?.name ?? "Unknown Product",
    productSlug:         row.products?.slug ?? "",
  }));

  // Client-safe text search filter across product name, reviewer name, and review text
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(
      r =>
        r.productName.toLowerCase().includes(q) ||
        r.reviewerDisplayName.toLowerCase().includes(q) ||
        r.reviewText.toLowerCase().includes(q)
    );
  }

  return rows;
}

/**
 * Updates review moderation status (approve or reject).
 */
export async function adminSetReviewStatus(
  reviewId: string,
  status: "approved" | "rejected",
  client?: any
): Promise<{ success: boolean; error?: string }> {
  const supabase = client ?? (await createClient());

  const { error } = await supabase
    .from("product_reviews")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId);

  if (error) {
    console.error("[adminSetReviewStatus] Error:", error.message);
    return { success: false, error: "Failed to update review status." };
  }

  return { success: true };
}

/**
 * Deletes a review as admin and cleans up storage photo if any.
 */
export async function adminDeleteReview(
  reviewId: string,
  client?: any
): Promise<{ success: boolean; error?: string }> {
  const supabase = client ?? (await createClient());

  const { data: review } = await supabase
    .from("product_reviews")
    .select("image_url")
    .eq("id", reviewId)
    .single();

  if (review?.image_url) {
    await deleteCustomerReviewPhoto(review.image_url, supabase);
  }

  const { error } = await supabase
    .from("product_reviews")
    .delete()
    .eq("id", reviewId);

  if (error) {
    console.error("[adminDeleteReview] Error:", error.message);
    return { success: false, error: "Failed to delete review." };
  }

  return { success: true };
}
