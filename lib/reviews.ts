/**
 * VEER ELEGANCE — Product Reviews Module (Pure & Client-Safe)
 *
 * Types, formatting, and display helpers for product reviews and ratings.
 * Safe to import in both Client and Server Components.
 */

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ProductReview {
  id:                 string;
  productId:          string;
  userId:             string;
  orderId?:           string | null;
  rating:             number;
  reviewText:         string;
  imageUrl?:          string | null;
  status:             ReviewStatus;
  verifiedPurchase:   boolean;
  createdAt:          string;
  updatedAt:          string;
  reviewerDisplayName:string;
}

export interface ReviewDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ReviewStats {
  averageRating: number;
  reviewCount:   number;
  distribution:  ReviewDistribution;
}

export interface ReviewEligibilityResult {
  canReview:          boolean;
  isVerifiedPurchase: boolean;
  orderId?:           string;
  existingReview?:    ProductReview | null;
  reason?:            "not_authenticated" | "not_purchased" | "already_reviewed" | "eligible";
}

export interface CreateReviewInput {
  productId:  string;
  rating:     number;
  reviewText: string;
  imageUrl?:  string | null;
}

export interface UpdateReviewInput {
  rating?:     number;
  reviewText?: string;
  imageUrl?:   string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY-SAFE FORMATTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a customer name into a privacy-safe display string (e.g. "K****" or "Pooja S.").
 * Never reveals email, phone, or full personal identity publicly.
 */
export function formatReviewerDisplayName(firstName?: string | null): string {
  if (!firstName || !firstName.trim()) {
    return "Verified Buyer";
  }
  const clean = firstName.trim();
  if (clean.length === 1) {
    return `${clean.toUpperCase()}****`;
  }
  return `${clean[0].toUpperCase()}${clean.slice(1, 2).toLowerCase()}****`;
}

/**
 * Formats an ISO date into a luxury date string (e.g. "2 Sep 2026").
 */
export function formatReviewDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day:   "numeric",
      month: "short",
      year:  "numeric",
    });
  } catch {
    return "";
  }
}
