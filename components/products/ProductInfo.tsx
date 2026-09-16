"use client";

/**
 * VEER ELEGANCE — ProductInfo
 *
 * Right-column product information panel for the product detail page.
 *
 * Stock enforcement:
 *  - stockQuantity + isLowStock are populated server-side from public.inventory
 *  - When stockQuantity = 0: button is replaced with an OUT OF STOCK state;
 *    handleAddToBag() also hard-guards against adding (belt-and-suspenders).
 *  - When stockQuantity > 0 && isLowStock: shows "Only N left in stock."
 *
 * Contains:
 *  - Category breadcrumb label
 *  - Product name (Cormorant Garamond)
 *  - Price (Manrope)
 *  - Anti-tarnish indicator
 *  - Stock status
 *  - Add to Bag (or Out of Stock state)
 *  - Collapsible accordion: Description / Material & Care / Delivery
 */

import { useState, useEffect } from "react";
import Link         from "next/link";
import { Heart }    from "lucide-react";
import { type Product, calculateDiscountPercent } from "@/data/products";
import { useCart }   from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import type { ProductSnapshot } from "@/lib/cart";
import ProductRatingSummary from "@/components/reviews/ProductRatingSummary";
import type { ReviewStats } from "@/lib/reviews";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style:                "currency",
    currency:             "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCORDION ITEM
// ─────────────────────────────────────────────────────────────────────────────

function AccordionItem({
  label,
  children,
  defaultOpen = false,
}: {
  label:       string;
  children:    React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `accordion-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(v => !v)}
        style={{
          width:         "100%",
          display:       "flex",
          alignItems:    "center",
          justifyContent:"space-between",
          padding:       "1rem 0",
          background:    "none",
          border:        "none",
          cursor:        "pointer",
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.75rem",
          fontWeight:    600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color:         "var(--color-espresso)",
          outline:       "none",
        }}
        className="pdp-accordion-btn"
      >
        {label}
        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 14 14"
          fill="none" aria-hidden="true"
          style={{
            transform:  open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 300ms ease",
            flexShrink: 0,
          }}
        >
          <path
            d="M2 5l5 5 5-5"
            stroke="currentColor" strokeWidth="1.25"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        id={id}
        role="region"
        style={{
          maxHeight:  open ? "600px" : "0",
          overflow:   "hidden",
          transition: "max-height 350ms cubic-bezier(0.25,0.46,0.45,0.94)",
        }}
      >
        <div
          style={{
            paddingBottom: "1.25rem",
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.875rem",
            color:         "var(--color-espresso-muted)",
            lineHeight:    1.75,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARE INSTRUCTIONS CARD (Visual Presentation)
// ─────────────────────────────────────────────────────────────────────────────

export const CARE_INSTRUCTIONS_DATA = [
  {
    id: "water",
    title: "Keep Away From Water",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M10 2.75C10 2.75 4.75 9 4.75 13C4.75 15.9 7.1 18.25 10 18.25C12.9 18.25 15.25 15.9 15.25 13C15.25 9 10 2.75 10 2.75Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="3.75"
          y1="16.25"
          x2="16.25"
          y2="3.75"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "spray",
    title: "Avoid Perfumes And Spray",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <rect x="5.5" y="7.5" width="9" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 7.5V5H12V7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 5H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="16.5" cy="3.5" r="0.75" fill="currentColor" />
        <circle cx="18" cy="5.75" r="0.75" fill="currentColor" />
        <circle cx="16.5" cy="8" r="0.75" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "cloth",
    title: "Clean With A Dry And Soft Cloth",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M4.5 13.5C4.5 11.5 6 10 8 10H14C15.5 10 16.5 11.25 16.5 12.75C16.5 14.5 15 16.5 13 16.5H6.5C5.39543 16.5 4.5 15.6046 4.5 14.5V13.5Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.5 10V6.5C6.5 4.85 7.85 3.5 9.5 3.5H12.5C14.15 3.5 15.5 4.85 15.5 6.5V10"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 5.5L3.8 3.5L5.8 4.3L3.8 5.1L3 7.1L2.2 5.1L0.2 4.3L2.2 3.5L3 5.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export function ProductCareCard() {
  return (
    <div
      className="pdp-care-card"
      style={{
        background:   "#faf5f3",
        border:       "1px solid rgba(225, 210, 202, 0.8)",
        borderRadius: "6px",
        padding:      "1.125rem 1.25rem",
        display:      "flex",
        flexDirection:"column",
        gap:          "0.875rem",
      }}
    >
      {CARE_INSTRUCTIONS_DATA.map((item) => (
        <div
          key={item.id}
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        "0.875rem",
          }}
        >
          <div
            style={{
              width:          "28px",
              height:         "28px",
              borderRadius:   "50%",
              background:     "rgba(184, 154, 104, 0.12)",
              border:         "1px solid rgba(184, 154, 104, 0.25)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
              color:          "var(--color-gold-muted)",
            }}
          >
            {item.icon}
          </div>
          <span
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.8125rem",
              fontWeight:    500,
              color:         "var(--color-espresso)",
              letterSpacing: "0.01em",
              lineHeight:    1.4,
            }}
          >
            {item.title}
          </span>
        </div>
      ))}
    </div>
  );
}

export const STANDARD_CARE_INSTRUCTIONS =
  "Wipe gently with a soft cloth after each wear. Keep away from harsh perfumes, chemicals, and prolonged immersion in water to preserve its warm lustre.";

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [bagState, setBagState] = useState<"idle" | "added">("idle");

  const wishlisted = isWishlisted(product.slug);

  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    averageRating: 0,
    reviewCount:   0,
    distribution:  { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  useEffect(() => {
    const pId = product.dbId || product.id;
    if (!pId) return;
    fetch(`/api/reviews?productId=${encodeURIComponent(pId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.stats) {
          setReviewStats(json.stats);
        }
      })
      .catch(() => {});
  }, [product.id, product.dbId]);

  // ── Stock state (populated server-side from public.inventory) ─────────────
  const stockQuantity = product.stockQuantity ?? 0;
  const inStock       = product.available ?? (stockQuantity > 0);
  const isLowStock    = product.isLowStock ?? false;

  function handleAddToBag() {
    // Hard guard: never add out-of-stock products.
    // inStock and stockQuantity are set server-side — cannot be tampered by the client.
    if (!inStock || stockQuantity <= 0) return;

    const snapshot: ProductSnapshot = {
      slug:        product.slug,
      name:        product.name ?? null,
      price:       product.price ?? null,
      imageUrl:    product.image,
      antiTarnish: product.antiTarnish,
    };
    addToCart(product.slug, snapshot);
    setBagState("added");
    setTimeout(() => setBagState("idle"), 2200);
  }

  const hasName  = Boolean(product.name);
  const hasPrice = typeof product.price === "number";
  const hasDesc  = Boolean(product.description);
  const hasMat   = Boolean(product.material);
  const showCare = Boolean(product.showCareInstructions);
  const careText = product.careInstructions || STANDARD_CARE_INSTRUCTIONS;
  const discountPercent = calculateDiscountPercent(product.mrp, product.price);

  return (
    <div
      className="pdp-info"
      style={{
        display:       "flex",
        flexDirection: "column",
        gap:           "clamp(1.25rem, 2.5vw, 1.75rem)",
      }}
    >
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb">
        <ol
          style={{
            display:    "flex",
            gap:        "0.5rem",
            listStyle:  "none",
            padding:    0,
            margin:     0,
            flexWrap:   "wrap",
          }}
        >
          {[
            { label: "Home",   href: "/" },
            { label: "Chains", href: "/shop/chains" },
            { label: product.name ?? product.id, href: "#" },
          ].map((crumb, idx, arr) => (
            <li
              key={crumb.href + idx}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {idx < arr.length - 1 ? (
                <>
                  <Link
                    href={crumb.href}
                    style={{
                      fontFamily:    "var(--font-body), Manrope, sans-serif",
                      fontSize:      "0.6875rem",
                      letterSpacing: "0.08em",
                      color:         "var(--color-espresso-muted)",
                      textDecoration:"none",
                    }}
                  >
                    {crumb.label}
                  </Link>
                  <span aria-hidden="true" style={{ color: "var(--color-espresso-muted)", opacity: 0.4, fontSize: "0.6875rem" }}>/</span>
                </>
              ) : (
                <span
                  aria-current="page"
                  style={{
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    letterSpacing: "0.08em",
                    color:         "var(--color-espresso)",
                    textTransform: "uppercase",
                  }}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Category eyebrow ───────────────────────────────────────────── */}
      <div>
        <p
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color:         "var(--color-gold-muted)",
            marginBottom:  "0.625rem",
          }}
        >
          Chain
        </p>

        {/* Product name — Cormorant Garamond */}
        {hasName ? (
          <h1
            className="text-display-md"
            style={{
              color:      "var(--color-espresso)",
              lineHeight: 1.1,
            }}
          >
            {product.name}
          </h1>
        ) : (
          <h1
            className="text-display-md"
            style={{
              color:      "var(--color-espresso)",
              lineHeight: 1.1,
              fontStyle:  "italic",
            }}
          >
            Chain Necklace
          </h1>
        )}

        {/* ── Compact Review Rating Summary ── */}
        <div style={{ marginTop: "0.5rem" }}>
          <ProductRatingSummary stats={reviewStats} />
        </div>
      </div>

      {/* ── Price & MRP ─────────────────────────────────────────────────── */}
      {hasPrice && (
        <div
          style={{
            display:    "flex",
            alignItems: "baseline",
            gap:        "0.75rem",
            flexWrap:   "wrap",
          }}
        >
          {/* Selling Price */}
          <span
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "1.25rem",
              fontWeight:    600,
              color:         "var(--color-espresso)",
              letterSpacing: "-0.01em",
            }}
          >
            {formatPrice(product.price!)}
          </span>

          {/* Strikethrough MRP + Discount % */}
          {discountPercent !== null && typeof product.mrp === "number" && (
            <>
              <span
                style={{
                  fontFamily:     "var(--font-body), Manrope, sans-serif",
                  fontSize:       "0.9375rem",
                  color:          "var(--color-espresso-muted)",
                  textDecoration: "line-through",
                  fontWeight:     400,
                }}
              >
                {formatPrice(product.mrp)}
              </span>
              <span
                style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem",
                  fontWeight:    700,
                  letterSpacing: "0.08em",
                  color:         "#2e7d32",
                  textTransform: "uppercase",
                  padding:       "0.15rem 0.5rem",
                  background:    "rgba(46, 125, 50, 0.08)",
                  border:        "1px solid rgba(46, 125, 50, 0.2)",
                  borderRadius:  "2px",
                }}
              >
                {discountPercent}% OFF
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Anti-tarnish indicator ─────────────────────────────────────── */}
      {product.antiTarnish && (
        <div
          style={{
            display:     "flex",
            alignItems:  "center",
            gap:         "0.625rem",
            paddingBlock:"0.75rem",
            borderTop:   "1px solid var(--border)",
            borderBottom:"1px solid var(--border)",
          }}
        >
          <svg
            width="14" height="14" viewBox="0 0 14 14"
            fill="none" aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M7 1.5L2 3.5v4c0 2.5 2.1 4.8 5 5.5 2.9-.7 5-3 5-5.5v-4L7 1.5z"
              stroke="var(--color-gold-muted)" strokeWidth="1"
              fill="none" strokeLinejoin="round"
            />
            <path
              d="M4.5 7l1.5 1.5L9 5.5"
              stroke="var(--color-gold-muted)" strokeWidth="1.1"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color:         "var(--color-gold-muted)",
            }}
          >
            Anti-tarnish
          </span>
        </div>
      )}

      {/* ── Short description ─────────────────────────────────────────── */}
      {hasDesc && (
        <p
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.9375rem",
            color:      "var(--color-espresso-muted)",
            lineHeight: 1.75,
            maxWidth:   "38ch",
          }}
        >
          {product.description}
        </p>
      )}

      {/* ── Stock status + Add to Bag ─────────────────────────────────── */}
      <div>
        {/* Low stock notice — shown when stock > 0 but below threshold */}
        {inStock && isLowStock && (
          <p
            aria-live="polite"
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.75rem",
              fontWeight:    600,
              letterSpacing: "0.08em",
              color:         "var(--color-gold-muted)",
              marginBottom:  "0.875rem",
            }}
          >
            Only {stockQuantity} left in stock.
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: "100%", maxWidth: "420px" }}>
          {inStock ? (
            /* In stock: Add to Bag button */
            <button
              type="button"
              id="pdp-add-to-bag"
              onClick={handleAddToBag}
              aria-label="Add to bag"
              aria-live="polite"
              disabled={bagState === "added"}
              style={{
                display:       "flex",
                alignItems:    "center",
                justifyContent:"center",
                gap:           "0.5rem",
                flex:          1,
                padding:       "1rem 1.75rem",
                background:    bagState === "added" ? "var(--color-espresso-muted)" : "var(--color-espresso)",
                border:        "none",
                color:         "var(--color-ivory)",
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.75rem",
                fontWeight:    600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor:        bagState === "added" ? "default" : "pointer",
                transition:    "background 300ms ease, opacity 200ms ease",
              }}
              className="pdp-add-btn"
            >
              {bagState === "added" ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path d="M2 6.5l3.5 3.5L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Added
                </>
              ) : (
                "Add to Bag"
              )}
            </button>
          ) : (
            /* Out of stock: non-interactive state indicator */
            <div
              id="pdp-out-of-stock"
              role="status"
              aria-label="This product is currently out of stock"
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           "0.75rem",
                flex:          1,
                padding:       "1rem 1.75rem",
                background:    "transparent",
                border:        "1.5px solid var(--border)",
                color:         "var(--color-espresso-muted)",
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.75rem",
                fontWeight:    600,
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 9l5-5M9 9L4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Out of Stock
            </div>
          )}

          {/* PDP Wishlist Button */}
          <button
            type="button"
            id="pdp-wishlist-btn"
            onClick={() => toggleWishlist(product.slug)}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            style={{
              width:          "3.25rem",
              height:         "3.25rem",
              borderRadius:   "2px",
              border:         wishlisted ? "1px solid #d87a93" : "1px solid var(--border)",
              background:     wishlisted ? "rgba(216, 122, 147, 0.14)" : "transparent",
              color:          wishlisted ? "#d87a93" : "var(--color-espresso)",
              boxShadow:      wishlisted ? "0 0 10px rgba(216, 122, 147, 0.28)" : "none",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              cursor:         "pointer",
              flexShrink:     0,
              transition:     "all 200ms ease",
            }}
          >
            <Heart
              size={20}
              strokeWidth={1.8}
              fill={wishlisted ? "#d87a93" : "none"}
              color={wishlisted ? "#d87a93" : "var(--color-espresso)"}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* ── Accordion: Description / Material / Care Instructions / Delivery ── */}
      <div style={{ marginTop: "0.5rem" }}>
        {(hasDesc || hasMat) && (
          <AccordionItem label="Description" defaultOpen={false}>
            {hasDesc && <p>{product.description}</p>}
          </AccordionItem>
        )}

        {hasMat && (
          <AccordionItem label="Material" defaultOpen={false}>
            <p>{product.material}</p>
          </AccordionItem>
        )}

        {showCare && (
          <AccordionItem label="Care Instructions" defaultOpen={false}>
            <ProductCareCard />
          </AccordionItem>
        )}

        {/* Delivery — static brand messaging, no fabricated promises */}
        <AccordionItem label="Delivery & Returns" defaultOpen={false}>
          <p>Delivery details will be confirmed at checkout.</p>
        </AccordionItem>

        {/* Closing bottom border */}
        <div style={{ borderTop: "1px solid var(--border)" }} />
      </div>
    </div>
  );
}
