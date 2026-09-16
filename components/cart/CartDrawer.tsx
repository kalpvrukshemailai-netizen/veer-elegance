"use client";

/**
 * VEER ELEGANCE — CartDrawer
 *
 * Premium slide-in bag drawer.
 *
 * Stock validation:
 *   - On drawer open, fetches /api/inventory/validate-cart
 *   - If any item is out of stock or quantity exceeds stock, the
 *     "Proceed to Checkout" button is disabled with a clear error message
 *   - Per-item warnings shown inline for quantity-vs-stock issues
 *   - Customers are never silently blocked — they see the exact reason
 *
 * Desktop: slides from right (400px wide).
 * Mobile:  near-full-screen panel.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Link   from "next/link";
import { useCart } from "./CartProvider";
import CartItemComponent from "./CartItem";
import CartCompleteTheLookRecommendation from "./CartCompleteTheLookRecommendation";
import { calculateCartSubtotal } from "@/lib/cart";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ItemValidation {
  productId:     string;
  available:     boolean;
  stockQuantity: number;
  requestedQty:  number;
  quantityOk:    boolean;
  productName:   string | null;
  error?:        string;
}

interface ValidationResult {
  isValid: boolean;
  items:   ItemValidation[];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CartDrawer() {
  const {
    items,
    itemCount,
    bundle,
    bundleNotice,
    clearBundleNotice,
    isOpen,
    closeDrawer,
  } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  // ── Stock validation state ──────────────────────────────────────────────
  const [validation,        setValidation]        = useState<ValidationResult | null>(null);
  const [validating,        setValidating]        = useState(false);

  const validateCart = useCallback(async () => {
    if (items.length === 0) {
      setValidation({ isValid: true, items: [] });
      return;
    }
    setValidating(true);
    try {
      const res  = await fetch("/api/inventory/validate-cart", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      if (res.ok) {
        setValidation(await res.json() as ValidationResult);
      } else {
        // On error, don't block checkout — allow server to enforce at order creation
        setValidation({ isValid: true, items: [] });
      }
    } catch {
      setValidation({ isValid: true, items: [] });
    } finally {
      setValidating(false);
    }
  }, [items]);

  // Validate on drawer open and whenever items change while open
  useEffect(() => {
    if (isOpen) {
      void validateCart();
    } else {
      // Reset when drawer closes so next open is always fresh
      setValidation(null);
    }
  }, [isOpen, validateCart]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) closeDrawer();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeDrawer]);

  // ── Body scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ── Focus management ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── Subtotal calculation taking active bundle into account ────────────────
  const subtotalSummary = calculateCartSubtotal({ items, bundle, bundleNotice });
  const subtotal: number | null = subtotalSummary.allPriced ? subtotalSummary.subtotal : null;

  function formatPrice(n: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 0,
    }).format(n);
  }

  // ── Per-item validation lookup ────────────────────────────────────────────
  const itemValidationMap = new Map<string, ItemValidation>(
    (validation?.items ?? []).map(v => [v.productId, v])
  );

  // Checkout is blocked if: validating, or validation result says invalid
  const checkoutBlocked = validating || (validation !== null && !validation.isValid);
  const cartErrors      = (validation?.items ?? []).filter(v => v.error);

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={closeDrawer}
        style={{
          position:   "fixed",
          inset:      0,
          zIndex:     200,
          background: "rgba(26,17,11,0.35)",
          backdropFilter: "blur(2px)",
          opacity:    isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 350ms ease",
        }}
      />

      {/* ── Drawer panel ─────────────────────────────────────────────────── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        style={{
          position:   "fixed",
          top:        0,
          right:      0,
          bottom:     0,
          zIndex:     201,
          width:      "min(420px, 100vw)",
          background: "var(--color-ivory)",
          display:    "flex",
          flexDirection: "column",
          transform:  isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 380ms cubic-bezier(0.25,0.46,0.45,0.94)",
          boxShadow:  "-8px 0 40px rgba(26,17,11,0.12)",
        }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{
          display:       "flex",
          alignItems:    "center",
          justifyContent:"space-between",
          padding:       "1.5rem clamp(1.25rem, 4vw, 1.75rem)",
          borderBottom:  "1px solid var(--border)",
          flexShrink:    0,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.625rem" }}>
            <h2 style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.75rem",
              fontWeight:    600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color:         "var(--color-espresso)",
              margin:        0,
            }}>
              Your Bag
            </h2>
            {itemCount > 0 && (
              <span style={{
                fontFamily:  "var(--font-body), Manrope, sans-serif",
                fontSize:    "0.6875rem",
                color:       "var(--color-espresso-muted)",
                fontWeight:  400,
              }}>
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>

          {/* Close */}
          <button
            ref={closeRef}
            type="button"
            aria-label="Close bag"
            onClick={closeDrawer}
            style={{
              background:   "none",
              border:       "none",
              cursor:       "pointer",
              padding:      "0.375rem",
              color:        "var(--color-espresso)",
              display:      "flex",
              alignItems:   "center",
              justifyContent:"center",
            }}
            className="cart-close-btn"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{
          flex:       1,
          overflowY:  "auto",
          padding:    "0 clamp(1.25rem, 4vw, 1.75rem)",
        }}>
          {bundleNotice && (
            <div
              style={{
                background:   "rgba(181, 142, 78, 0.08)",
                border:       "1px solid var(--border)",
                borderRadius: "3px",
                padding:      "0.75rem",
                marginTop:    "0.75rem",
                marginBottom: "0.75rem",
                display:      "flex",
                alignItems:   "flex-start",
                justifyContent:"space-between",
                gap:          "0.5rem",
              }}
            >
              <p style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "0.75rem",
                color:      "var(--color-espresso)",
                margin:     0,
                lineHeight: 1.4,
              }}>
                {bundleNotice}
              </p>
              <button
                type="button"
                onClick={clearBundleNotice}
                style={{
                  background: "none",
                  border:     "none",
                  cursor:     "pointer",
                  padding:    "0 0.25rem",
                  color:      "var(--color-espresso-muted)",
                  fontSize:   "0.875rem",
                  lineHeight: 1,
                }}
                aria-label="Dismiss notice"
              >
                ✕
              </button>
            </div>
          )}

          {subtotalSummary.hasActiveBundle && bundle && (
            <div
              style={{
                background:   "#fdfaf4",
                border:       "1px solid var(--color-gold-muted)",
                borderRadius: "4px",
                padding:      "0.75rem",
                marginTop:    "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem",
                  fontWeight:    700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color:         "var(--color-gold-muted)",
                }}>
                  ✨ Complete Your Look
                </span>
                {subtotalSummary.bundleDiscount > 0 && (
                  <span style={{
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize:   "0.6875rem",
                    fontWeight: 700,
                    color:      "#1e6b20",
                    background: "#eef7ee",
                    padding:    "0.12rem 0.375rem",
                    borderRadius:"2px",
                  }}>
                    Save {formatPrice(subtotalSummary.bundleDiscount)}
                  </span>
                )}
              </div>
              <p style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "0.75rem",
                color:      "var(--color-espresso)",
                margin:     "0 0 0.125rem 0",
              }}>
                You're getting all {bundle.productIds.length} pieces for {formatPrice(bundle.bundlePrice)}.
              </p>
              <p style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "0.6875rem",
                color:      "var(--color-espresso-muted)",
                margin:     0,
              }}>
                Individual value {formatPrice(bundle.individualTotal)} · You save {formatPrice(subtotalSummary.bundleDiscount)}
              </p>
            </div>
          )}

          {items.length === 0 ? (
            /* Empty bag state */
            <div style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              justifyContent: "center",
              height:         "100%",
              textAlign:      "center",
              gap:            "1rem",
              paddingBlock:   "4rem",
            }}>
              <svg
                width="40" height="40" viewBox="0 0 40 40"
                fill="none" aria-hidden="true"
                style={{ opacity: 0.25, flexShrink: 0 }}
              >
                <path d="M8 12h24l-3 18H11L8 12z" stroke="var(--color-espresso)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M14 12c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="var(--color-espresso)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>

              <p style={{
                fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
                fontSize:    "1.375rem",
                fontWeight:  400,
                fontStyle:   "italic",
                color:       "var(--color-espresso)",
                lineHeight:  1.2,
              }}>
                Your bag is empty.
              </p>

              <p style={{
                fontFamily:  "var(--font-body), Manrope, sans-serif",
                fontSize:    "0.875rem",
                color:       "var(--color-espresso-muted)",
                lineHeight:  1.6,
              }}>
                Discover pieces designed for every day.
              </p>

              <Link
                href="/shop/chains"
                onClick={closeDrawer}
                style={{
                  display:       "inline-flex",
                  alignItems:    "center",
                  gap:           "0.4rem",
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem",
                  fontWeight:    600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color:         "var(--color-espresso)",
                  textDecoration:"none",
                  borderBottom:  "1px solid var(--color-espresso)",
                  paddingBottom: "0.25rem",
                  marginTop:     "0.5rem",
                }}
              >
                Explore Collection
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          ) : (
            /* Cart items list */
            <>
              <ul role="list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {items.map(item => {
                  const v = itemValidationMap.get(item.productId);
                  return (
                    <li key={item.productId}>
                      <CartItemComponent item={item} />
                      {/* Per-item stock warning */}
                      {v?.error && (
                        <p style={{
                          fontFamily:   "var(--font-body), Manrope, sans-serif",
                          fontSize:     "0.75rem",
                          color:        "#9a6c4a",
                          margin:       "-0.5rem 0 1rem 0",
                          paddingLeft:  "0.125rem",
                        }}>
                          {v.error}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Complete the Look Discovery & Recommendation */}
              <CartCompleteTheLookRecommendation />
            </>
          )}
        </div>

        {/* ── Footer: subtotal + checkout ──────────────────────────────── */}
        {items.length > 0 && (
          <div style={{
            flexShrink:   0,
            borderTop:    "1px solid var(--border)",
            padding:      "1.25rem clamp(1.25rem, 4vw, 1.75rem)",
            display:      "flex",
            flexDirection:"column",
            gap:          "1rem",
          }}>
            {/* Bundle savings row if applicable */}
            {subtotalSummary.hasActiveBundle && subtotalSummary.bundleDiscount > 0 && (
              <div style={{
                display:       "flex",
                justifyContent:"space-between",
                alignItems:    "baseline",
              }}>
                <span style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem",
                  fontWeight:    600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color:         "#1e6b20",
                }}>
                  Complete Look Savings
                </span>
                <span style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize:   "0.875rem",
                  fontWeight: 600,
                  color:      "#1e6b20",
                }}>
                  - {formatPrice(subtotalSummary.bundleDiscount)}
                </span>
              </div>
            )}

            {/* Subtotal row */}
            <div style={{
              display:       "flex",
              justifyContent:"space-between",
              alignItems:    "baseline",
            }}>
              <span style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem",
                fontWeight:    600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color:         "var(--color-espresso)",
              }}>
                Subtotal
              </span>
              <span style={{
                fontFamily:  "var(--font-body), Manrope, sans-serif",
                fontSize:    "1rem",
                fontWeight:  500,
                color:       "var(--color-espresso)",
              }}>
                {subtotal !== null
                  ? formatPrice(subtotal)
                  : <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
                      Pricing coming soon
                    </span>
                }
              </span>
            </div>

            <p style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.6875rem",
              color:      "var(--color-espresso-muted)",
              margin:     0,
            }}>
              Shipping and taxes calculated at checkout.
            </p>

            {/* Stock error summary */}
            {checkoutBlocked && cartErrors.length > 0 && (
              <div
                aria-live="polite"
                style={{
                  background:   "color-mix(in srgb, #9a6c4a 8%, transparent)",
                  border:       "1px solid color-mix(in srgb, #9a6c4a 25%, transparent)",
                  padding:      "0.75rem",
                  display:      "flex",
                  flexDirection:"column",
                  gap:          "0.375rem",
                }}
              >
                {cartErrors.map((v, i) => (
                  <p key={i} style={{
                    fontFamily:  "var(--font-body), Manrope, sans-serif",
                    fontSize:    "0.75rem",
                    color:       "#7a4c2a",
                    margin:      0,
                  }}>
                    {v.error}
                  </p>
                ))}
              </div>
            )}

            {/* Checkout CTA — disabled when cart has stock issues */}
            {checkoutBlocked ? (
              <div
                id="cart-checkout-blocked"
                aria-disabled="true"
                role="status"
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  justifyContent:"center",
                  gap:           "0.5rem",
                  padding:       "1rem",
                  background:    "color-mix(in srgb, var(--color-espresso) 25%, transparent)",
                  color:         "var(--color-espresso-muted)",
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.75rem",
                  fontWeight:    600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor:        "not-allowed",
                }}
              >
                {validating ? "Checking availability…" : "Update bag to continue"}
              </div>
            ) : (
              <Link
                href="/checkout"
                id="cart-checkout-btn"
                onClick={closeDrawer}
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  justifyContent:"center",
                  gap:           "0.5rem",
                  padding:       "1rem",
                  background:    "var(--color-espresso)",
                  color:         "var(--color-ivory)",
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.75rem",
                  fontWeight:    600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  textDecoration:"none",
                  transition:    "opacity 200ms ease",
                }}
                className="cart-checkout-btn"
              >
                Proceed to Checkout
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7h10M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
