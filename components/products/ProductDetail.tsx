"use client";

/**
 * VEER ELEGANCE — ProductDetail
 *
 * Client wrapper composing the full product detail page.
 *
 * Desktop: two-column — gallery (≈58%) left, info (≈42%) right.
 * Mobile:  single column — image first, then info, then related.
 *
 * Related Products (You May Also Like):
 *  - Same category, different slug
 *  - Up to 4 products
 *  - Each links to its /product/[slug] route
 *  - Real images only — no fakes
 */

import Link          from "next/link";
import ProductGallery from "./ProductGallery";
import ProductInfo    from "./ProductInfo";
import ProductReviewsSection from "@/components/reviews/ProductReviewsSection";
import CompleteTheLookSection from "./CompleteTheLookSection";
import type { CompleteTheLookDetail } from "@/lib/complete-the-look";
import { type Product, calculateDiscountPercent } from "@/data/products";

// ─────────────────────────────────────────────────────────────────────────────

interface ProductDetailProps {
  product:          Product;
  related:          Product[];
  completeTheLook?: CompleteTheLookDetail | null;
}

export default function ProductDetail({ product, related, completeTheLook }: ProductDetailProps) {
  return (
    <div
      style={{
        background: "var(--color-parchment)",
        minHeight:  "100dvh",
      }}
    >
      {/* ── Main two-column product section ────────────────────────────── */}
      <div
        className="pdp-layout"
        style={{
          maxWidth:      "1280px",
          margin:        "0 auto",
          paddingTop:    "clamp(5.5rem, 10vw, 8rem)",   // clears fixed navbar
          paddingBottom: "clamp(3rem, 6vw, 5rem)",
          paddingInline: "clamp(1.5rem, 5vw, 4rem)",
        }}
      >
        {/* Desktop: flex row. Mobile: column via CSS class */}
        <div className="pdp-columns">
          {/* ── LEFT: Gallery ────────────────────────────────────────── */}
          <div className="pdp-col-gallery">
            <ProductGallery product={product} />
          </div>

          {/* ── RIGHT: Info ──────────────────────────────────────────── */}
          <div className="pdp-col-info">
            <ProductInfo product={product} />
          </div>
        </div>
      </div>

      {/* ── Complete the Look Section ───────────────────────────────────── */}
      <CompleteTheLookSection
        completeTheLook={completeTheLook}
        productId={product.id}
      />

      {/* ── Customer Reviews & Ratings ──────────────────────────────────── */}
      <ProductReviewsSection product={product} />

      {/* ── Divider ────────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            height:       "1px",
            background:   "var(--border)",
            maxWidth:     "1280px",
            margin:       "0 auto",
            marginInline: "clamp(1.5rem, 5vw, 4rem)",
          }}
        />
      )}

      {/* ── You May Also Like ──────────────────────────────────────────── */}
      {related.length > 0 && (
        <section
          aria-label="You may also like"
          style={{
            maxWidth:      "1280px",
            margin:        "0 auto",
            paddingBlock:  "clamp(3rem, 6vw, 5rem)",
            paddingInline: "clamp(1.5rem, 5vw, 4rem)",
          }}
        >
          {/* Section header */}
          <header style={{ marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
            <span
              aria-hidden="true"
              style={{
                display:    "block",
                width:      "1.5rem",
                height:     "1px",
                background: "var(--color-gold-muted)",
                marginBottom:"1rem",
              }}
            />
            <p
              style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem",
                fontWeight:    600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color:         "var(--color-gold-muted)",
                marginBottom:  "0.5rem",
              }}
            >
              You may also like
            </p>
            <h2
              className="text-display-sm"
              style={{
                color:      "var(--color-espresso)",
                lineHeight: 1.1,
                fontStyle:  "italic",
                fontWeight: 300,
              }}
            >
              More from the Collection
            </h2>
          </header>

          {/* Related product grid */}
          <div className="pdp-related-grid">
            {related.map(rel => (
              <Link
                key={rel.id}
                href={rel.href}
                aria-label={rel.alt}
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
                className="pdp-related-card"
              >
                {/* Image */}
                <div
                  style={{
                    position:     "relative",
                    width:        "100%",
                    aspectRatio:  "3 / 4",
                    overflow:     "hidden",
                    borderRadius: "var(--radius-card-img, 12px)",
                    transform:    "translateZ(0)",
                    background:   "var(--color-parchment-deep)",
                  }}
                >
                  <img
                    src={rel.image}
                    alt={rel.alt}
                    style={{
                      width:          "100%",
                      height:         "100%",
                      objectFit:      "contain",
                      objectPosition: "center",
                      padding:        "1rem",
                      transition:     "transform 500ms cubic-bezier(0.25,0.46,0.45,0.94)",
                      display:        "block",
                    }}
                    className="pdp-related-img"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div style={{ paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  {rel.antiTarnish && (
                    <span
                      style={{
                        fontFamily:    "var(--font-body), Manrope, sans-serif",
                        fontSize:      "0.5625rem",
                        fontWeight:    600,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color:         "var(--color-gold-muted)",
                      }}
                    >
                      Anti-tarnish
                    </span>
                  )}
                  {rel.name && (
                    <p
                      style={{
                        fontFamily:  "var(--font-body), Manrope, sans-serif",
                        fontSize:    "0.875rem",
                        fontWeight:  500,
                        color:       "var(--color-espresso)",
                        lineHeight:  1.35,
                      }}
                    >
                      {rel.name}
                    </p>
                  )}
                  {typeof rel.price === "number" && (
                    (() => {
                      const discountPercent = calculateDiscountPercent(rel.mrp, rel.price);
                      return (
                        <div
                          style={{
                            display:    "flex",
                            alignItems: "baseline",
                            gap:        "0.4rem",
                            flexWrap:   "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontFamily:    "var(--font-body), Manrope, sans-serif",
                              fontSize:      "0.9375rem",
                              fontWeight:    600,
                              color:         "var(--color-espresso)",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(rel.price)}
                          </span>
                          {discountPercent !== null && typeof rel.mrp === "number" && (
                            <>
                              <span
                                style={{
                                  fontFamily:     "var(--font-body), Manrope, sans-serif",
                                  fontSize:       "0.75rem",
                                  color:          "var(--color-espresso-muted)",
                                  textDecoration: "line-through",
                                  fontWeight:     400,
                                }}
                              >
                                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(rel.mrp)}
                              </span>
                              <span
                                style={{
                                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                                  fontSize:      "0.6875rem",
                                  fontWeight:    700,
                                  letterSpacing: "0.04em",
                                  color:         "#2e7d32",
                                  textTransform: "uppercase",
                                }}
                              >
                                {discountPercent}% OFF
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })()
                  )}
                  <p
                    className="pdp-related-cta"
                    style={{
                      fontFamily:    "var(--font-body), Manrope, sans-serif",
                      fontSize:      "0.5625rem",
                      fontWeight:    600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color:         "var(--color-espresso-muted)",
                      marginTop:     "0.25rem",
                      display:       "flex",
                      alignItems:    "center",
                      gap:           "0.3rem",
                      transition:    "color 250ms ease",
                    }}
                  >
                    View
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                      <path d="M1 4.5h7M5.5 2l2.5 2.5L5.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Back to full collection */}
          <div style={{ textAlign: "center", marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
            <Link
              href="/shop/chains"
              style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.75rem",
                fontWeight:    600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color:         "var(--color-espresso)",
                textDecoration:"none",
                borderBottom:  "1px solid var(--color-espresso)",
                paddingBottom: "0.375rem",
              }}
            >
              View All Chains
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
