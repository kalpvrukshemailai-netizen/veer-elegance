"use client";

/**
 * VEER ELEGANCE — ProductReviewsSection
 *
 * Full luxury customer reviews section for the Product Detail Page.
 * Includes:
 *  - Rating summary & 5★-1★ breakdown progress bars
 *  - Verified purchase gating & submission modal with photo upload
 *  - Sorting controls & review cards with "Verified Purchase" badges
 *  - Privacy-safe masked customer display names
 */

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Star, CheckCircle2, Image as ImageIcon, X, Upload, ShieldCheck } from "lucide-react";
import type { Product } from "@/data/products";
import type {
  ProductReview,
  ReviewStats,
  ReviewEligibilityResult,
} from "@/lib/reviews";
import { formatReviewDate } from "@/lib/reviews";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

interface ProductReviewsSectionProps {
  product: Product;
}

export default function ProductReviewsSection({ product }: ProductReviewsSectionProps) {
  const { openAuthModal } = useWishlist();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    reviewCount:   0,
    distribution:  { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"recent" | "highest" | "lowest">("recent");
  const [photosOnly, setPhotosOnly] = useState(false);

  // Eligibility state
  const [eligibility, setEligibility] = useState<ReviewEligibilityResult | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [notEligibleNotice, setNotEligibleNotice] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Photo lightbox
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // ── 1. Fetch Approved Reviews & Stats ────────────────────────────────────
  const fetchReviews = async () => {
    try {
      const pId = product.dbId || product.id;
      const res = await fetch(
        `/api/reviews?productId=${encodeURIComponent(pId)}&sort=${sort}&photosOnly=${photosOnly}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setReviews(json.reviews || []);
          setStats(json.stats || stats);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [product.id, product.dbId, sort, photosOnly]);

  // ── 2. Check Purchase Eligibility ───────────────────────────────────────
  const checkEligibility = async () => {
    setCheckingEligibility(true);
    try {
      const pId = product.dbId || product.id;
      const res = await fetch(`/api/reviews/eligibility?productId=${encodeURIComponent(pId)}`);
      if (res.ok) {
        const json: ReviewEligibilityResult = await res.json();
        setEligibility(json);
        return json;
      }
    } catch {
      // Ignored
    } finally {
      setCheckingEligibility(false);
    }
    return null;
  };

  const handleOpenReviewForm = async () => {
    const el = await checkEligibility();

    if (!el || el.reason === "not_authenticated") {
      openAuthModal();
      return;
    }

    if (!el.isVerifiedPurchase) {
      setNotEligibleNotice(true);
      return;
    }

    // Pre-populate if editing existing review
    if (el.existingReview) {
      setFormRating(el.existingReview.rating);
      setFormText(el.existingReview.reviewText);
      setPhotoPreview(el.existingReview.imageUrl || null);
    } else {
      setFormRating(5);
      setFormText("");
      setFormPhoto(null);
      setPhotoPreview(null);
    }

    setSubmitError(null);
    setSubmitSuccess(false);
    setFormOpen(true);
  };

  // ── 3. Handle Review Submission ─────────────────────────────────────────
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim() || formText.trim().length < 10) {
      setSubmitError("Please write at least 10 characters for your review.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const pId = product.dbId || product.id;
      const formData = new FormData();
      formData.append("productId", pId);
      formData.append("rating", formRating.toString());
      formData.append("reviewText", formText.trim());
      if (formPhoto) {
        formData.append("photo", formPhoto);
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        body:   formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setSubmitError(json.error || "Failed to submit review.");
      } else {
        setSubmitSuccess(true);
        // Refresh eligibility so button reflects existing review
        checkEligibility();
        setTimeout(() => {
          setFormOpen(false);
          setSubmitSuccess(false);
        }, 2200);
      }
    } catch {
      setSubmitError("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Photo size must be 5MB or less.");
      return;
    }

    setFormPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setSubmitError(null);
  };

  const removeSelectedPhoto = () => {
    setFormPhoto(null);
    setPhotoPreview(null);
  };

  return (
    <section
      id="customer-reviews"
      aria-label="Customer Reviews"
      style={{
        borderTop:       "1px solid var(--border)",
        paddingTop:      "clamp(3rem, 6vw, 5rem)",
        paddingBottom:   "clamp(3rem, 6vw, 5rem)",
        maxWidth:        "1280px",
        margin:          "0 auto",
        paddingInline:   "clamp(1.5rem, 5vw, 4rem)",
      }}
    >
      {/* ── Section Heading ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
        <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "1.25rem" }} aria-hidden="true" />
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
          Feedback & Experiences
        </p>
        <h2
          style={{
            fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:    "clamp(2rem, 4vw, 2.75rem)",
            fontWeight:  400,
            fontStyle:   "italic",
            color:       "var(--color-espresso)",
            lineHeight:  1.1,
            margin:      0,
          }}
        >
          Customer Reviews
        </h2>
      </div>

      {/* ── Rating Summary & Breakdown Grid ───────────────────────────────── */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap:                 "2rem",
          alignItems:          "center",
          background:          "var(--color-parchment-deep)",
          padding:             "clamp(1.75rem, 4vw, 2.5rem)",
          borderRadius:        "var(--radius-card-img, 12px)",
          border:              "1px solid var(--border)",
          marginBottom:        "2.5rem",
        }}
      >
        {/* Left: Big Rating & Stars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
            <span
              style={{
                fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
                fontSize:    "clamp(3rem, 6vw, 4rem)",
                fontWeight:  400,
                color:       "var(--color-espresso)",
                lineHeight:  1,
              }}
            >
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "0.0"}
            </span>
            <span style={{ fontSize: "1.125rem", color: "var(--color-espresso-muted)" }}>
              / 5.0
            </span>
          </div>

          <div style={{ display: "flex", gap: "3px", color: "var(--color-gold-muted)" }} aria-hidden="true">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={18}
                fill={s <= Math.round(stats.averageRating) ? "var(--color-gold-muted)" : "none"}
                color="var(--color-gold-muted)"
                strokeWidth={1.75}
              />
            ))}
          </div>

          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", margin: "0.25rem 0 0 0" }}>
            Based on {stats.reviewCount} {stats.reviewCount === 1 ? "verified review" : "verified reviews"}
          </p>
        </div>

        {/* Center: 5-Star Distribution Bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
            const pct = stats.reviewCount > 0 ? Math.round((count / stats.reviewCount) * 100) : 0;
            return (
              <div key={star} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem" }}>
                <span style={{ width: "24px", color: "var(--color-espresso)", fontWeight: 600 }}>{star} ★</span>
                <div
                  style={{
                    flex:         1,
                    height:       "6px",
                    background:   "rgba(44, 24, 16, 0.08)",
                    borderRadius: "3px",
                    overflow:     "hidden",
                  }}
                >
                  <div
                    style={{
                      width:        `${pct}%`,
                      height:       "100%",
                      background:   "var(--color-gold-muted)",
                      borderRadius: "3px",
                      transition:   "width 400ms ease",
                    }}
                  />
                </div>
                <span style={{ width: "28px", color: "var(--color-espresso-muted)", textAlign: "right" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right: Write Review Button */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.75rem" }}>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)", margin: 0, fontWeight: 500 }}>
            Have you purchased this piece?
          </p>
          <button
            type="button"
            onClick={handleOpenReviewForm}
            disabled={checkingEligibility}
            style={{
              padding:        "0.875rem 1.75rem",
              background:     "var(--color-espresso)",
              color:          "var(--color-ivory)",
              fontFamily:     "var(--font-body), Manrope, sans-serif",
              fontSize:       "0.75rem",
              fontWeight:     600,
              letterSpacing:  "0.12em",
              textTransform:  "uppercase",
              border:         "none",
              borderRadius:   "2px",
              cursor:         "pointer",
              transition:     "background 200ms ease",
            }}
          >
            {eligibility?.existingReview ? "Edit Your Review" : "Write a Review"}
          </button>
        </div>
      </div>

      {/* ── Sort & Filter Controls ───────────────────────────────────────── */}
      {reviews.length > 0 && (
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            flexWrap:       "wrap",
            gap:            "1rem",
            borderBottom:   "1px solid var(--border)",
            paddingBottom:  "1rem",
            marginBottom:   "2rem",
          }}
        >
          {/* Sorting buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              Sort:
            </span>
            {(["recent", "highest", "lowest"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                style={{
                  background:     sort === s ? "var(--color-espresso)" : "transparent",
                  color:          sort === s ? "var(--color-ivory)" : "var(--color-espresso)",
                  border:         "1px solid " + (sort === s ? "var(--color-espresso)" : "var(--border)"),
                  borderRadius:   "2px",
                  padding:        "0.375rem 0.75rem",
                  fontSize:       "0.6875rem",
                  fontWeight:     600,
                  textTransform:  "uppercase",
                  letterSpacing:  "0.08em",
                  cursor:         "pointer",
                }}
              >
                {s === "recent" ? "Most Recent" : s === "highest" ? "Highest Rating" : "Lowest Rating"}
              </button>
            ))}
          </div>

          {/* Photos Only toggle */}
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--color-espresso)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={photosOnly}
              onChange={(e) => setPhotosOnly(e.target.checked)}
              style={{ accentColor: "var(--color-espresso)" }}
            />
            Photos Only
          </label>
        </div>
      )}

      {/* ── Reviews List ─────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <p style={{ color: "var(--color-espresso-muted)", fontSize: "0.875rem" }}>Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div
          style={{
            textAlign:     "center",
            padding:       "3.5rem 1rem",
            background:    "var(--color-parchment-deep)",
            borderRadius:  "var(--radius-card-img, 12px)",
            border:        "1px dashed var(--border)",
          }}
        >
          <Star size={24} color="var(--color-gold-muted)" strokeWidth={1.5} style={{ margin: "0 auto 0.75rem" }} />
          <h3
            style={{
              fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
              fontSize:    "1.5rem",
              fontWeight:  400,
              fontStyle:   "italic",
              color:       "var(--color-espresso)",
              margin:      "0 0 0.5rem 0",
            }}
          >
            No reviews yet
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--color-espresso-muted)", margin: "0 0 1.25rem 0" }}>
            Be the first verified customer to share your thoughts on this piece.
          </p>
          <button
            type="button"
            onClick={handleOpenReviewForm}
            style={{
              padding:        "0.75rem 1.5rem",
              background:     "var(--color-espresso)",
              color:          "var(--color-ivory)",
              fontSize:       "0.75rem",
              fontWeight:     600,
              textTransform:  "uppercase",
              letterSpacing:  "0.1em",
              border:         "none",
              borderRadius:   "2px",
              cursor:         "pointer",
            }}
          >
            Write a Review
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {reviews.map((r) => (
            <article
              key={r.id}
              style={{
                background:   "var(--color-ivory)",
                borderRadius: "var(--radius-card-img, 12px)",
                border:       "1px solid var(--border)",
                padding:      "clamp(1.25rem, 3vw, 1.75rem)",
                display:      "flex",
                flexDirection:"column",
                gap:          "0.875rem",
              }}
            >
              {/* Rating + Badge row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", gap: "2px", color: "var(--color-gold-muted)" }} aria-label={`Rating: ${r.rating} stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={15}
                      fill={star <= r.rating ? "var(--color-gold-muted)" : "none"}
                      color="var(--color-gold-muted)"
                      strokeWidth={1.8}
                    />
                  ))}
                </div>

                {r.verifiedPurchase && (
                  <span
                    style={{
                      display:        "inline-flex",
                      alignItems:     "center",
                      gap:            "0.3125rem",
                      background:     "rgba(46, 125, 50, 0.08)",
                      color:          "#2e7d32",
                      padding:        "0.25rem 0.5rem",
                      borderRadius:   "2px",
                      fontSize:       "0.6875rem",
                      fontWeight:     600,
                      letterSpacing:  "0.04em",
                    }}
                  >
                    <ShieldCheck size={13} strokeWidth={2} />
                    Verified Purchase
                  </span>
                )}
              </div>

              {/* Review Text */}
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize:   "0.9375rem",
                  color:      "var(--color-espresso)",
                  lineHeight: 1.6,
                  margin:     0,
                  whiteSpace: "pre-line",
                }}
              >
                &ldquo;{r.reviewText}&rdquo;
              </p>

              {/* Customer photo thumbnail */}
              {r.imageUrl && (
                <button
                  type="button"
                  onClick={() => setActivePhoto(r.imageUrl!)}
                  aria-label="View customer photo"
                  style={{
                    background: "none",
                    border:     "none",
                    padding:    0,
                    cursor:     "pointer",
                    alignSelf:  "flex-start",
                  }}
                >
                  <img
                    src={r.imageUrl}
                    alt="Customer review photo"
                    style={{
                      width:        "72px",
                      height:       "72px",
                      objectFit:    "cover",
                      borderRadius: "4px",
                      border:       "1px solid var(--border)",
                      transition:   "transform 150ms ease",
                    }}
                  />
                </button>
              )}

              {/* Reviewer Metadata */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--color-espresso-muted)", borderTop: "1px solid rgba(44, 24, 16, 0.06)", paddingTop: "0.75rem" }}>
                <span style={{ fontWeight: 600, color: "var(--color-espresso)" }}>{r.reviewerDisplayName}</span>
                <span>·</span>
                <span>{formatReviewDate(r.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── NOT ELIGIBLE NOTICE MODAL ────────────────────────────────────── */}
      {notEligibleNotice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Verified purchase required"
          style={{
            position:             "fixed",
            inset:                0,
            zIndex:               99999,
            display:              "flex",
            alignItems:           "center",
            justifyContent:      "center",
            padding:              "1.5rem",
            background:           "rgba(28, 18, 12, 0.65)",
            backdropFilter:       "blur(6px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setNotEligibleNotice(false);
          }}
        >
          <div
            style={{
              background:    "var(--color-ivory)",
              borderRadius:  "var(--radius-card-img, 12px)",
              maxWidth:      "420px",
              width:         "100%",
              padding:       "2rem",
              textAlign:     "center",
              position:      "relative",
              border:        "1px solid var(--border-accent)",
            }}
          >
            <button
              type="button"
              onClick={() => setNotEligibleNotice(false)}
              aria-label="Close"
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
            <ShieldCheck size={36} color="var(--color-gold-muted)" style={{ margin: "0 auto 1rem" }} />
            <h3 style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "1.625rem", fontStyle: "italic", margin: "0 0 0.5rem 0", color: "var(--color-espresso)" }}>
              Verified Purchase Required
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-espresso-muted)", lineHeight: 1.55, margin: "0 0 1.5rem 0" }}>
              To ensure genuine, trusted feedback, reviews may only be submitted by customers who have purchased this piece.
            </p>
            <button
              type="button"
              onClick={() => setNotEligibleNotice(false)}
              style={{
                width:          "100%",
                padding:        "0.75rem",
                background:     "var(--color-espresso)",
                color:          "var(--color-ivory)",
                fontSize:       "0.75rem",
                fontWeight:     600,
                textTransform:  "uppercase",
                letterSpacing:  "0.1em",
                border:         "none",
                borderRadius:   "2px",
                cursor:         "pointer",
              }}
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* ── WRITE / EDIT REVIEW MODAL ────────────────────────────────────── */}
      {formOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          style={{
            position:             "fixed",
            inset:                0,
            zIndex:               99999,
            display:              "flex",
            alignItems:           "center",
            justifyContent:      "center",
            padding:              "1.5rem",
            background:           "rgba(28, 18, 12, 0.65)",
            backdropFilter:       "blur(6px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setFormOpen(false);
          }}
        >
          <div
            style={{
              background:    "var(--color-ivory)",
              borderRadius:  "var(--radius-card-img, 12px)",
              maxWidth:      "520px",
              width:         "100%",
              maxHeight:     "90vh",
              overflowY:     "auto",
              padding:       "clamp(1.75rem, 4vw, 2.5rem)",
              position:      "relative",
              border:        "1px solid var(--border-accent)",
            }}
          >
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
              aria-label="Close"
              style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={18} />
            </button>

            {submitSuccess ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <CheckCircle2 size={42} color="#2e7d32" style={{ margin: "0 auto 1rem" }} />
                <h3 style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "1.75rem", fontStyle: "italic", color: "var(--color-espresso)", margin: "0 0 0.5rem 0" }}>
                  Thank You
                </h3>
                <p style={{ fontSize: "0.875rem", color: "var(--color-espresso-muted)", lineHeight: 1.5 }}>
                  Your review has been submitted and is awaiting approval.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <p style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-gold-muted)", fontWeight: 600, margin: "0 0 0.25rem 0" }}>
                    Verified Purchase
                  </p>
                  <h3 id="review-modal-title" style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "1.75rem", fontStyle: "italic", margin: 0, color: "var(--color-espresso)" }}>
                    {eligibility?.existingReview ? "Edit Your Review" : "Write a Review"}
                  </h3>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)", margin: "0.25rem 0 0 0" }}>
                    {product.name}
                  </p>
                </div>

                {/* Rating selection */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: "var(--color-espresso)", marginBottom: "0.5rem" }}>
                    Rating *
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        style={{
                          background: "none",
                          border:     "none",
                          padding:    "0.25rem",
                          cursor:     "pointer",
                          color:      star <= formRating ? "var(--color-gold-muted)" : "rgba(44, 24, 16, 0.2)",
                          transform:  star <= formRating ? "scale(1.1)" : "scale(1)",
                          transition: "transform 150ms ease, color 150ms ease",
                        }}
                        aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      >
                        <Star size={26} fill={star <= formRating ? "currentColor" : "none"} strokeWidth={1.75} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review Textarea */}
                <div>
                  <label htmlFor="review-text" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: "var(--color-espresso)", marginBottom: "0.5rem" }}>
                    Review * (min 10 characters)
                  </label>
                  <textarea
                    id="review-text"
                    required
                    rows={4}
                    minLength={10}
                    maxLength={1500}
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    placeholder="Describe the craftsmanship, durability, shine, and fit of this piece..."
                    style={{
                      width:        "100%",
                      padding:      "0.75rem",
                      borderRadius: "2px",
                      border:       "1px solid var(--border)",
                      fontFamily:   "var(--font-body), Manrope, sans-serif",
                      fontSize:     "0.875rem",
                      color:        "var(--color-espresso)",
                      background:   "var(--color-parchment)",
                      resize:       "vertical",
                    }}
                  />
                  <div style={{ textAlign: "right", fontSize: "0.6875rem", color: "var(--color-espresso-muted)", marginTop: "0.25rem" }}>
                    {formText.length}/1500 characters
                  </div>
                </div>

                {/* Optional Customer Photo */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: "var(--color-espresso)", marginBottom: "0.5rem" }}>
                    Optional Customer Photo (JPG, PNG, WebP · max 5MB)
                  </label>

                  {photoPreview ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <img
                        src={photoPreview}
                        alt="Selected review preview"
                        style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "4px", border: "1px solid var(--border)" }}
                      />
                      <button
                        type="button"
                        onClick={removeSelectedPhoto}
                        style={{
                          background:    "none",
                          border:        "1px solid var(--border)",
                          padding:       "0.375rem 0.75rem",
                          fontSize:      "0.75rem",
                          color:         "var(--color-espresso)",
                          cursor:        "pointer",
                          borderRadius:  "2px",
                        }}
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <label
                      style={{
                        display:        "flex",
                        alignItems:     "center",
                        gap:            "0.5rem",
                        padding:        "0.75rem 1rem",
                        border:         "1px dashed var(--border)",
                        borderRadius:   "2px",
                        background:     "var(--color-parchment)",
                        cursor:         "pointer",
                        fontSize:       "0.75rem",
                        color:          "var(--color-espresso-muted)",
                      }}
                    >
                      <Upload size={16} />
                      <span>Choose a photo...</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoSelect}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                </div>

                {/* Error Banner */}
                {submitError && (
                  <div style={{ color: "#c62828", fontSize: "0.8125rem", background: "rgba(198, 40, 40, 0.08)", padding: "0.625rem 0.875rem", borderRadius: "2px" }}>
                    {submitError}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding:        "0.875rem 2rem",
                    background:     "var(--color-espresso)",
                    color:          "var(--color-ivory)",
                    fontFamily:     "var(--font-body), Manrope, sans-serif",
                    fontSize:       "0.75rem",
                    fontWeight:     600,
                    letterSpacing:  "0.12em",
                    textTransform:  "uppercase",
                    border:         "none",
                    borderRadius:   "2px",
                    cursor:         submitting ? "default" : "pointer",
                    opacity:        submitting ? 0.7 : 1,
                    transition:     "opacity 200ms ease",
                  }}
                >
                  {submitting ? "Submitting..." : eligibility?.existingReview ? "Update Review" : "Submit Review"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── PHOTO EXPAND LIGHTBOX ────────────────────────────────────────── */}
      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         99999,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "2rem",
            background:     "rgba(0, 0, 0, 0.85)",
          }}
          onClick={() => setActivePhoto(null)}
        >
          <div style={{ position: "relative", maxWidth: "800px", maxHeight: "80vh" }}>
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              aria-label="Close photo"
              style={{
                position:     "absolute",
                top:          "-2.5rem",
                right:        0,
                color:        "#fff",
                background:   "none",
                border:       "none",
                cursor:       "pointer",
              }}
            >
              <X size={24} />
            </button>
            <img
              src={activePhoto}
              alt="Customer photo enlarged"
              style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: "4px" }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
