"use client";

/**
 * VEER ELEGANCE — CartCompleteTheLookRecommendation
 *
 * Compact luxury Complete-the-Look discovery card for CartDrawer.
 * Surfaces remaining matching pieces when at least one look item is in the cart.
 *
 * Rules:
 *   - Customer is NEVER auto-added to the bundle without adding items.
 *   - Only surfaces remaining pieces.
 *   - Dynamic persuasion messaging ("You're almost there ✨ Add [Piece] for just ₹X more...").
 *   - Sound mathematical gap: never displays negative or ₹0 gap.
 *   - Single-click "+ ADD" per remaining piece.
 *   - Activates verified bundle atomically when all pieces are in bag.
 *   - Hides cleanly when bundle is already active.
 */

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useCart } from "./CartProvider";
import {
  CartLookRecommendation,
  CompleteTheLookProduct,
} from "@/lib/complete-the-look";

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CartCompleteTheLookRecommendation() {
  const { items, bundle, addToCart, addBundleToCart } = useCart();

  const [recommendation, setRecommendation] = useState<CartLookRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  // Abort controller ref to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch recommendation when cart items change (if no active bundle)
  useEffect(() => {
    // If cart is empty or bundle is already active, clear recommendation
    if (items.length === 0 || bundle !== null) {
      setRecommendation(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const productIds = items.map((i) => i.productId);

    async function fetchRecommendation() {
      setLoading(true);
      try {
        const res = await fetch("/api/cart/complete-the-look/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds }),
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          if (!controller.signal.aborted) {
            setRecommendation(data.recommendation ?? null);
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Failed to load Complete the Look recommendation:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchRecommendation();

    return () => {
      controller.abort();
    };
  }, [items, bundle]);

  // Don't render if no recommendation or already in a bundle
  if (bundle !== null || !recommendation) {
    return null;
  }

  // If all pieces are in the cart but bundle is not active yet
  if (recommendation.remainingProducts.length === 0) {
    return (
      <div
        style={{
          background:   "rgba(181, 142, 78, 0.07)",
          border:       "1px solid var(--color-gold-muted, #9a6c4a)",
          borderRadius: "4px",
          padding:      "0.875rem 1rem",
          marginTop:    "1rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            marginBottom:   "0.375rem",
          }}
        >
          <span
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color:         "var(--color-gold-muted, #9a6c4a)",
            }}
          >
            ✨ Complete Look Unlocked
          </span>
          {recommendation.savings > 0 && (
            <span
              style={{
                fontFamily:   "var(--font-body), Manrope, sans-serif",
                fontSize:     "0.6875rem",
                fontWeight:   700,
                color:        "#1e6b20",
                background:   "#eef7ee",
                padding:      "0.12rem 0.375rem",
                borderRadius: "2px",
              }}
            >
              Save {formatPrice(recommendation.savings)}
            </span>
          )}
        </div>

        <p
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.75rem",
            color:      "var(--color-espresso, #1a110b)",
            margin:     "0 0 0.5rem 0",
            lineHeight: 1.4,
          }}
        >
          All {recommendation.allProducts.length} pieces of this curated look are in your bag!
        </p>

        <button
          type="button"
          disabled={activating}
          onClick={async () => {
            setActivating(true);
            try {
              const allProductIds = recommendation.allProducts.map((p) => p.id);
              const res = await fetch("/api/cart/complete-the-look", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                  setId:         recommendation.setId,
                  baseProductId: recommendation.baseProductId,
                  productIds:    allProductIds,
                }),
              });
              const data = await res.json();
              if (data?.success && data?.bundle && data?.items) {
                addBundleToCart(data.bundle, data.items);
              }
            } catch (e) {
              console.error("Failed to activate Complete the Look bundle:", e);
            } finally {
              setActivating(false);
            }
          }}
          style={{
            width:         "100%",
            background:    "var(--color-espresso, #1a110b)",
            color:         "var(--color-ivory, #fff)",
            border:        "none",
            borderRadius:  "2px",
            padding:       "0.5rem 0.75rem",
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor:        activating ? "not-allowed" : "pointer",
            opacity:       activating ? 0.7 : 1,
            transition:    "opacity 200ms ease",
          }}
        >
          {activating ? "Applying Look..." : `Apply Complete Look — ${formatPrice(recommendation.bundlePrice)}`}
        </button>
      </div>
    );
  }

  // Handler to add a remaining product to cart
  const handleAddProduct = async (product: CompleteTheLookProduct) => {
    setAddingId(product.id);
    try {
      // 1. Add individual product to cart
      addToCart(product.slug, {
        slug:        product.slug,
        name:        product.name,
        price:       product.price,
        imageUrl:    product.imageUrl ?? "",
        antiTarnish: true,
      });

      // 2. Check if this is the last remaining product to complete the look
      const otherRemaining = recommendation.remainingProducts.filter(
        (p) => p.id !== product.id
      );

      if (otherRemaining.length === 0) {
        // Complete look now fully in bag! Request verified bundle
        const allProductIds = recommendation.allProducts.map((p) => p.id);
        const res = await fetch("/api/cart/complete-the-look", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            setId:         recommendation.setId,
            baseProductId: recommendation.baseProductId,
            productIds:    allProductIds,
          }),
        });
        const data = await res.json();
        if (data?.success && data?.bundle && data?.items) {
          addBundleToCart(data.bundle, data.items);
        }
      }
    } catch (err) {
      console.error("Error adding look product to cart:", err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <section
      aria-label="Complete the Look recommendation"
      style={{
        background:   "rgba(181, 142, 78, 0.05)",
        border:       "1px solid var(--border, rgba(26,17,11,0.08))",
        borderRadius: "4px",
        padding:      "0.875rem 1rem",
        marginTop:    "1.25rem",
        marginBottom: "1rem",
      }}
    >
      {/* ── Top Bar: Badge & Savings ─────────────────────────────────── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          marginBottom:   "0.375rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <span
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color:         "var(--color-gold-muted, #9a6c4a)",
            }}
          >
            ✦ Complete the Look
          </span>
          {recommendation.badgeText && (
            <span
              style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.625rem",
                fontWeight:    600,
                letterSpacing: "0.06em",
                color:         "var(--color-espresso-muted, #6a5d52)",
                background:    "rgba(26,17,11,0.05)",
                padding:       "0.1rem 0.35rem",
                borderRadius:  "2px",
              }}
            >
              {recommendation.badgeText}
            </span>
          )}
        </div>

        {recommendation.savings > 0 && (
          <span
            style={{
              fontFamily:   "var(--font-body), Manrope, sans-serif",
              fontSize:     "0.6875rem",
              fontWeight:   700,
              color:        "#1e6b20",
              background:   "#eef7ee",
              padding:      "0.12rem 0.375rem",
              borderRadius: "2px",
            }}
          >
            Save {formatPrice(recommendation.savings)}
          </span>
        )}
      </div>

      {/* ── Headline & Persuasion Subline ────────────────────────────── */}
      <h3
        style={{
          fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
          fontSize:   "1.0625rem",
          fontWeight: 600,
          color:      "var(--color-espresso, #1a110b)",
          margin:     "0 0 0.25rem 0",
          lineHeight: 1.25,
        }}
      >
        {recommendation.headline}
      </h3>

      <p
        style={{
          fontFamily: "var(--font-body), Manrope, sans-serif",
          fontSize:   "0.75rem",
          color:      "var(--color-espresso-muted, #6a5d52)",
          margin:     "0 0 0.75rem 0",
          lineHeight: 1.45,
        }}
      >
        {recommendation.subline}
      </p>

      {/* ── Remaining Matching Products List ──────────────────────────── */}
      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          gap:           "0.5rem",
        }}
      >
        {recommendation.remainingProducts.map((product) => {
          const isAdding = addingId === product.id;
          const isOutOfStock = product.inStock === false;

          return (
            <div
              key={product.id}
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                gap:            "0.625rem",
                background:     "var(--color-ivory, #fff)",
                border:         "1px solid var(--border, rgba(26,17,11,0.06))",
                borderRadius:   "3px",
                padding:        "0.375rem 0.5rem",
              }}
            >
              {/* Product Thumbnail + Name */}
              <div
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        "0.5rem",
                  minWidth:   0,
                  flex:       1,
                }}
              >
                <div
                  style={{
                    position:    "relative",
                    width:       "36px",
                    height:      "36px",
                    flexShrink:  0,
                    background:  "var(--color-parchment-deep, #ede8df)",
                    borderRadius:"2px",
                    overflow:    "hidden",
                  }}
                >
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      quality={60}
                      sizes="36px"
                      style={{ objectFit: "contain", padding: "2px" }}
                    />
                  ) : (
                    <div
                      style={{
                        position:       "absolute",
                        inset:          0,
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        color:          "var(--color-espresso-muted, #6a5d52)",
                        fontSize:       "0.625rem",
                      }}
                    >
                      ✨
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    title={product.name}
                    style={{
                      fontFamily:   "var(--font-body), Manrope, sans-serif",
                      fontSize:     "0.75rem",
                      fontWeight:   600,
                      color:        "var(--color-espresso, #1a110b)",
                      margin:       0,
                      whiteSpace:   "nowrap",
                      overflow:     "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {product.name}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize:   "0.6875rem",
                      color:      "var(--color-espresso-muted, #6a5d52)",
                      margin:     0,
                    }}
                  >
                    {formatPrice(product.price)}
                  </p>
                </div>
              </div>

              {/* Add or Out of stock Button */}
              {isOutOfStock ? (
                <span
                  style={{
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.625rem",
                    fontWeight:    600,
                    letterSpacing: "0.06em",
                    color:         "#a04000",
                    background:    "#fbf0ea",
                    padding:       "0.25rem 0.5rem",
                    borderRadius:  "2px",
                    whiteSpace:    "nowrap",
                  }}
                >
                  Out of stock
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isAdding}
                  onClick={() => handleAddProduct(product)}
                  aria-label={`Add ${product.name} to complete look`}
                  style={{
                    background:    "var(--color-espresso, #1a110b)",
                    color:         "var(--color-ivory, #fff)",
                    border:        "none",
                    borderRadius:  "2px",
                    padding:       "0.25rem 0.625rem",
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    fontWeight:    600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor:        isAdding ? "not-allowed" : "pointer",
                    opacity:       isAdding ? 0.6 : 1,
                    transition:    "opacity 150ms ease, transform 150ms ease",
                    whiteSpace:    "nowrap",
                    flexShrink:    0,
                  }}
                >
                  {isAdding ? "Adding..." : "+ Add"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
