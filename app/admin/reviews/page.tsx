/**
 * VEER ELEGANCE — /admin/reviews
 *
 * Admin Customer Review Management page.
 * Strictly protected via requireAdmin().
 */

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAllReviewsAdmin } from "@/lib/reviews-server";
import ReviewTableClient from "@/components/admin/reviews/ReviewTableClient";

export const metadata: Metadata = {
  title: "Review Management — Admin — Veer Elegance",
};

export default async function AdminReviewsPage() {
  await requireAdmin();

  const reviews = await getAllReviewsAdmin({ limit: 150 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div>
        <p
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color:         "var(--color-gold-muted)",
            marginBottom:  "0.5rem",
          }}
        >
          Moderation & Trust
        </p>
        <h1
          style={{
            fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:    "clamp(1.875rem, 4vw, 2.5rem)",
            fontWeight:  400,
            fontStyle:   "italic",
            color:       "var(--color-espresso)",
            margin:      0,
            lineHeight:  1.1,
          }}
        >
          Customer Reviews
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.875rem",
            color:      "var(--color-espresso-muted)",
            marginTop:  "0.5rem",
          }}
        >
          Inspect verified customer reviews, photos, ratings, and moderate public visibility.
        </p>
      </div>

      {/* ── Table Client ─────────────────────────────────────────────────── */}
      <ReviewTableClient initialReviews={reviews} />
    </div>
  );
}
