"use client";

/**
 * VEER ELEGANCE — ProductRatingSummary
 *
 * Compact rating summary badge displayed near product title/price on the Product Detail Page.
 * Example: ★★★★★ 4.8 · 24 Reviews (or "No reviews yet")
 * Clicking scrolls smoothly to the full customer reviews section.
 */

import React from "react";
import { Star } from "lucide-react";
import type { ReviewStats } from "@/lib/reviews";

interface ProductRatingSummaryProps {
  stats: ReviewStats;
}

export default function ProductRatingSummary({ stats }: ProductRatingSummaryProps) {
  const { averageRating, reviewCount } = stats;

  function handleScrollToReviews() {
    const el = document.getElementById("customer-reviews");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  if (reviewCount === 0) {
    return (
      <button
        type="button"
        onClick={handleScrollToReviews}
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            "0.375rem",
          background:     "transparent",
          border:         "none",
          padding:        0,
          cursor:         "pointer",
          fontFamily:     "var(--font-body), Manrope, sans-serif",
          fontSize:       "0.75rem",
          color:          "var(--color-espresso-muted)",
          textDecoration: "underline",
          textUnderlineOffset: "3px",
        }}
      >
        <span>No reviews yet</span>
        <span style={{ color: "var(--color-gold-muted)" }}>·</span>
        <span style={{ color: "var(--color-espresso)", fontWeight: 600 }}>Be the first to review</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleScrollToReviews}
      aria-label={`Rated ${averageRating} out of 5 stars based on ${reviewCount} reviews`}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        gap:            "0.5rem",
        background:     "transparent",
        border:         "none",
        padding:        0,
        cursor:         "pointer",
        fontFamily:     "var(--font-body), Manrope, sans-serif",
        fontSize:       "0.8125rem",
        color:          "var(--color-espresso)",
      }}
    >
      {/* 5-star graphical indicator */}
      <div style={{ display: "flex", gap: "2px", color: "var(--color-gold-muted)" }} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(averageRating);
          return (
            <Star
              key={star}
              size={13}
              fill={filled ? "var(--color-gold-muted)" : "none"}
              color="var(--color-gold-muted)"
              strokeWidth={1.75}
            />
          );
        })}
      </div>

      <span style={{ fontWeight: 600 }}>{averageRating.toFixed(1)}</span>
      <span style={{ color: "var(--color-espresso-muted)" }}>
        ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
      </span>
    </button>
  );
}
