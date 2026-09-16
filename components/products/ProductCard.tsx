"use client";

/**
 * VEER ELEGANCE — ProductCard
 *
 * Luxury editorial ecommerce card.
 * Accepts a Product from data/products.ts.
 *
 * Includes:
 *  - "VIEW DETAILS" action navigating to the PDP
 *  - Compact Add to Cart corner icon button with live cart integration
 *  - Stock availability guards and inline success feedback
 *
 * Renders gracefully when optional metadata (name, price, material)
 * is not yet populated — no fabricated commercial data.
 */

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Check, Heart } from "lucide-react";
import { type Product, calculateDiscountPercent } from "@/data/products";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import type { ProductSnapshot } from "@/lib/cart";

// ─────────────────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  /** Animation delay for stagger-in effect (ms) */
  animationDelay?: number;
}

// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style:                "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductCard({ product, animationDelay = 0 }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [isAdded, setIsAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const wishlisted      = isWishlisted(product.slug);

  const hasPrice        = typeof product.price === "number";
  const hasMaterial     = Boolean(product.material);
  const discountPercent = calculateDiscountPercent(product.mrp, product.price);

  const stockQuantity   = product.stockQuantity ?? 0;
  const isOutOfStock    = product.available === false || (product.stockQuantity !== undefined && stockQuantity <= 0);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || isAdded) return;

    const snapshot: ProductSnapshot = {
      slug:        product.slug,
      name:        product.name ?? null,
      price:       product.price ?? null,
      imageUrl:    product.image,
      antiTarnish: product.antiTarnish ?? false,
    };

    addToCart(product.slug, snapshot);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  }

  function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.slug);
  }

  return (
    <Link
      href={product.href}
      style={{
        display:       "flex",
        flexDirection: "column",
        textDecoration:"none",
        color:         "inherit",
        animation:     `productCardIn 500ms cubic-bezier(0.25,0.46,0.45,0.94) ${animationDelay}ms both`,
      }}
      aria-label={[
        product.name ?? "View product",
        hasPrice ? formatPrice(product.price!, product.currency) : undefined,
        discountPercent ? `${discountPercent}% OFF` : undefined,
      ].filter(Boolean).join(" — ")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Product image / placeholder ──────────────────────────────── */}
      <div
        style={{
          position:     "relative",
          aspectRatio:  "3/4",
          overflow:     "hidden",
          borderRadius: "var(--radius-card-img, 12px)",
          transform:    "translateZ(0)",
          background:   "var(--color-parchment-deep)",
          marginBottom: "1rem",
        }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.alt}
            style={{
              width:      "100%",
              height:     "100%",
              objectFit:  "cover",
              transform:  isHovered ? "scale(1.04)" : "scale(1)",
              transition: "transform 500ms cubic-bezier(0.25,0.46,0.45,0.94)",
            }}
          />
        ) : (
          /* Premium brand placeholder */
          <div
            style={{
              width:          "100%",
              height:         "100%",
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              justifyContent: "center",
              gap:            "0.75rem",
              background:     "linear-gradient(160deg, var(--color-parchment) 0%, var(--color-parchment-deep) 100%)",
            }}
          >
            <svg
              width="48" height="48" viewBox="0 0 48 48"
              fill="none" aria-hidden="true"
              style={{ opacity: 0.25 }}
            >
              <circle cx="24" cy="28" r="5" stroke="var(--color-espresso)" strokeWidth="1"/>
              <path d="M24 23 C18 16, 8 18, 8 28" stroke="var(--color-espresso)" strokeWidth="1" fill="none"/>
              <path d="M24 23 C30 16, 40 18, 40 28" stroke="var(--color-espresso)" strokeWidth="1" fill="none"/>
            </svg>
            <span
              className="text-label"
              style={{ color: "var(--color-espresso-muted)", opacity: 0.5, fontSize: "0.5625rem" }}
            >
              Image coming soon
            </span>
          </div>
        )}

        {/* Anti-tarnish badge */}
        {product.antiTarnish && (
          <div
            style={{
              position:       "absolute",
              top:            "0.75rem",
              left:           "0.75rem",
              background:     "rgba(252,251,247,0.92)",
              backdropFilter: "blur(4px)",
              padding:        "0.25rem 0.625rem",
              border:         "1px solid var(--border-accent)",
              zIndex:         2,
            }}
          >
            <span
              className="text-label"
              style={{ color: "var(--color-gold-muted)", fontSize: "0.5rem", letterSpacing: "0.14em" }}
            >
              Anti-tarnish
            </span>
          </div>
        )}

        {/* ── Wishlist Heart Button (Top-Right) ─────────────────────────── */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={
            wishlisted
              ? `Remove ${product.name ?? "item"} from wishlist`
              : `Add ${product.name ?? "item"} to wishlist`
          }
          title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          style={{
            position:       "absolute",
            top:            "0.75rem",
            right:          "0.75rem",
            zIndex:         10,
            width:          "2.125rem",
            height:         "2.125rem",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            borderRadius:   "50%",
            background:     wishlisted ? "rgba(216, 122, 147, 0.14)" : "transparent",
            color:          wishlisted ? "#d87a93" : "var(--color-espresso)",
            border:         "none",
            boxShadow:      wishlisted ? "0 0 10px rgba(216, 122, 147, 0.28)" : "none",
            cursor:         "pointer",
            transition:     "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 200ms ease, color 200ms ease, box-shadow 200ms ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.12)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
          onMouseDown={e => {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).style.transform = "scale(0.92)";
          }}
          onMouseUp={e => {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).style.transform = "scale(1.12)";
          }}
        >
          <Heart
            size={18}
            strokeWidth={1.8}
            fill={wishlisted ? "#d87a93" : "none"}
            color={wishlisted ? "#d87a93" : "var(--color-espresso)"}
            aria-hidden="true"
          />
        </button>

        {/* Quick-action overlay — navigates to PDP */}
        <div
          style={{
            position:       "absolute",
            inset:          0,
            display:        "flex",
            alignItems:     "flex-end",
            justifyContent: "flex-start",
            padding:        "0.75rem",
            background:     "linear-gradient(to top, rgba(59,28,15,0.22) 0%, transparent 45%)",
            opacity:        isHovered ? 1 : 0,
            transition:     "opacity 300ms ease",
            pointerEvents:  "none",
            zIndex:         3,
          }}
        >
          <span
            style={{
              flex:          1,
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              background:    "rgba(252,251,247,0.95)",
              backdropFilter:"blur(4px)",
              padding:       "0.625rem 0.75rem",
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color:         "var(--color-espresso)",
              marginRight:   "3.25rem",
              boxShadow:     "0 2px 8px rgba(0,0,0,0.06)",
              borderRadius:  "var(--radius-sm, 6px)",
            }}
          >
            View Details
          </span>
        </div>

        {/* ── Compact Add to Cart corner icon button ─────────────────── */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          aria-label={
            isOutOfStock
              ? "Out of stock"
              : isAdded
                ? "Added to bag"
                : `Add ${product.name ?? "item"} to bag`
          }
          title={
            isOutOfStock
              ? "Out of stock"
              : isAdded
                ? "Added to bag"
                : "Add to bag"
          }
          style={{
            position:       "absolute",
            bottom:         "0.75rem",
            right:          "0.75rem",
            zIndex:         10,
            width:          "2.375rem",
            height:         "2.375rem",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            borderRadius:   "var(--radius-sm, 6px)",
            background:     isAdded
              ? "var(--color-espresso)"
              : "rgba(252,251,247,0.94)",
            color:          isAdded
              ? "var(--color-gold-muted)"
              : "var(--color-espresso)",
            border:         isAdded
              ? "1px solid var(--color-espresso)"
              : "1px solid var(--border)",
            backdropFilter: "blur(6px)",
            boxShadow:      "0 2px 8px rgba(0,0,0,0.08)",
            cursor:         isOutOfStock ? "not-allowed" : "pointer",
            opacity:        isOutOfStock ? 0.45 : 1,
            transition:     "background 200ms ease, color 200ms ease, border-color 200ms ease, transform 150ms ease, opacity 200ms ease",
          }}
          onMouseDown={e => {
            if (!isOutOfStock) (e.currentTarget as HTMLElement).style.transform = "scale(0.92)";
          }}
          onMouseUp={e => {
            if (!isOutOfStock) (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
        >
          {isAdded ? (
            <Check size={16} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <ShoppingBag size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* ── Product info ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {/* Material — only shown if present */}
        {hasMaterial && (
          <p
            className="text-body-sm"
            style={{ color: "var(--color-espresso-muted)", fontSize: "0.6875rem", letterSpacing: "0.04em" }}
          >
            {product.material}
          </p>
        )}

        {/* Name — working title or empty */}
        <h3
          className="text-display-sm"
          style={{ color: "var(--color-espresso)", fontSize: "clamp(0.9375rem, 1.5vw, 1.125rem)", fontWeight: 400, lineHeight: 1.3 }}
        >
          {product.name ?? "Chain Necklace"}
        </h3>

        {/* Price — only shown if present; never fabricated */}
        {hasPrice ? (
          <div
            style={{
              display:    "flex",
              alignItems: "baseline",
              gap:        "0.45rem",
              flexWrap:   "wrap",
              marginTop:  "0.125rem",
            }}
          >
            <span
              className="text-price"
              style={{ color: "var(--color-espresso)", fontSize: "0.9375rem", fontWeight: 600 }}
            >
              {formatPrice(product.price!, product.currency)}
            </span>
            {discountPercent !== null && typeof product.mrp === "number" && (
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
                  {formatPrice(product.mrp, product.currency)}
                </span>
                <span
                  style={{
                    fontFamily:     "var(--font-body), Manrope, sans-serif",
                    fontSize:       "0.6875rem",
                    fontWeight:     700,
                    letterSpacing:  "0.04em",
                    color:          "#2e7d32",
                    textTransform:  "uppercase",
                  }}
                >
                  {discountPercent}% OFF
                </span>
              </>
            )}
          </div>
        ) : (
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.75rem",
              color:      "var(--color-espresso-muted)",
              fontStyle:  "italic",
              marginTop:  "0.125rem",
            }}
          >
            Price coming soon
          </p>
        )}
      </div>
    </Link>
  );
}
