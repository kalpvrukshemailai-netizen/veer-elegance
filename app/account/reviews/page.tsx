/**
 * VEER ELEGANCE — /account/reviews
 *
 * Customer Reviews Page:
 * Displays all reviews submitted by the authenticated customer with moderation status,
 * rating, date, and product links.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Star, ShieldCheck, ExternalLink, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserReviews } from "@/lib/reviews-server";
import { formatReviewDate } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "My Reviews — Veer Elegance",
  description: "View and manage your product reviews.",
};

export default async function CustomerReviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account/reviews");
  }

  const reviews = await getUserReviews(user.id);

  const eyebrowStyle: React.CSSProperties = {
    fontFamily:    "var(--font-body), Manrope, sans-serif",
    fontSize:      "0.6875rem",
    fontWeight:    600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color:         "var(--color-gold-muted)",
    marginBottom:  "0.75rem",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
    fontSize:     "clamp(1.75rem, 4vw, 2.5rem)",
    fontWeight:   400,
    fontStyle:    "italic",
    color:        "var(--color-espresso)",
    lineHeight:   1.05,
    marginBottom: "0.5rem",
  };

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--color-parchment)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem, 5vw, 4rem)", height: "clamp(3.5rem, 6vw, 4.5rem)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" aria-label="Veer Elegance — return to homepage">
            <img src="/images/veer-elegance-logo.png" alt="Veer Elegance" style={{ width: "clamp(85px, 10vw, 120px)", height: "auto", display: "block" }} />
          </a>
          <Link
            href="/shop"
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.75rem",
              fontWeight:    600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color:         "var(--color-espresso)",
              textDecoration:"none",
            }}
          >
            Shop Collection
          </Link>
        </div>
      </header>

      <main id="main-content" role="main" style={{ flex: 1, maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 5vw, 4rem)" }}>
        {/* Back Link */}
        <Link
          href="/account"
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color:         "var(--color-espresso-muted)",
            textDecoration:"none",
            display:       "inline-flex",
            alignItems:    "center",
            gap:           "0.375rem",
            marginBottom:  "2rem",
          }}
        >
          <ArrowLeft size={12} />
          My Account
        </Link>

        {/* Heading */}
        <div style={{ marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "1.25rem" }} aria-hidden="true" />
          <p style={eyebrowStyle}>Customer Account</p>
          <h1 style={headingStyle}>My Reviews</h1>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", margin: 0 }}>
            Track moderation status and feedback for your verified purchases.
          </p>
        </div>

        {/* Reviews Content */}
        {reviews.length === 0 ? (
          <div
            style={{
              padding:       "3.5rem 1.5rem",
              textAlign:     "center",
              background:    "var(--color-parchment-deep)",
              borderRadius:  "var(--radius-card-img, 12px)",
              border:        "1px dashed var(--border)",
              maxWidth:      "520px",
              margin:        "0 auto",
            }}
          >
            <Star size={32} color="var(--color-gold-muted)" strokeWidth={1.5} style={{ margin: "0 auto 1rem" }} />
            <h2
              style={{
                fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                fontSize:   "1.75rem",
                fontStyle:  "italic",
                color:      "var(--color-espresso)",
                margin:     "0 0 0.5rem 0",
              }}
            >
              No reviews yet
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--color-espresso-muted)", margin: "0 0 1.5rem 0", lineHeight: 1.5 }}>
              You haven&apos;t reviewed any purchases yet. Visit your completed orders or explore the collection.
            </p>
            <Link
              href="/shop"
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                padding:        "0.75rem 1.75rem",
                background:     "var(--color-espresso)",
                color:          "var(--color-ivory)",
                fontSize:       "0.75rem",
                fontWeight:     600,
                textTransform:  "uppercase",
                letterSpacing:  "0.1em",
                textDecoration: "none",
                borderRadius:   "2px",
              }}
            >
              Explore Collection
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "800px" }}>
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
                  gap:          "1rem",
                }}
              >
                {/* Header row: product name & moderation badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "1.25rem", margin: 0, color: "var(--color-espresso)" }}>
                      {r.productName}
                    </h3>
                    {r.productSlug && (
                      <Link
                        href={`/product/${r.productSlug}`}
                        style={{
                          display:        "inline-flex",
                          alignItems:     "center",
                          gap:            "0.25rem",
                          fontSize:       "0.75rem",
                          color:          "var(--color-espresso-muted)",
                          textDecoration: "underline",
                          marginTop:      "0.25rem",
                        }}
                      >
                        <span>View Product</span>
                        <ExternalLink size={11} />
                      </Link>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span
                    style={{
                      padding:       "0.25rem 0.625rem",
                      borderRadius:  "2px",
                      fontSize:      "0.6875rem",
                      fontWeight:    600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      background:
                        r.status === "approved"
                          ? "rgba(46, 125, 50, 0.1)"
                          : r.status === "rejected"
                          ? "rgba(198, 40, 40, 0.1)"
                          : "rgba(245, 124, 0, 0.1)",
                      color:
                        r.status === "approved"
                          ? "#2e7d32"
                          : r.status === "rejected"
                          ? "#c62828"
                          : "#e65100",
                    }}
                  >
                    {r.status === "approved"
                      ? "Approved & Public"
                      : r.status === "rejected"
                      ? "Not Approved"
                      : "Awaiting Moderation"}
                  </span>
                </div>

                {/* Rating & Verified badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ display: "flex", gap: "2px", color: "var(--color-gold-muted)" }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        fill={star <= r.rating ? "var(--color-gold-muted)" : "none"}
                        color="var(--color-gold-muted)"
                        strokeWidth={1.8}
                      />
                    ))}
                  </div>

                  {r.verifiedPurchase && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#2e7d32", fontSize: "0.6875rem", fontWeight: 600 }}>
                      <ShieldCheck size={12} /> Verified Purchase
                    </span>
                  )}
                </div>

                {/* Review Body */}
                <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
                  &ldquo;{r.reviewText}&rdquo;
                </p>

                {/* Image if attached */}
                {r.imageUrl && (
                  <div>
                    <img
                      src={r.imageUrl}
                      alt="Your review attachment"
                      style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "4px", border: "1px solid var(--border)" }}
                    />
                  </div>
                )}

                {/* Date */}
                <div style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)", borderTop: "1px solid rgba(44, 24, 16, 0.06)", paddingTop: "0.5rem" }}>
                  Submitted on {formatReviewDate(r.createdAt)}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
