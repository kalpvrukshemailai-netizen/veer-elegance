"use client";

/**
 * VEER ELEGANCE — OrderSummary
 *
 * Checkout right-column: displays all cart items with images, names,
 * quantities and line prices. Shows subtotal + coupon discount + shipping + total.
 *
 * No prices are fabricated. If a product has no price set,
 * the line item shows a neutral "Pricing to be confirmed" state.
 * The total row reflects this clearly.
 */

import React, { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { type DeliveryMethodId } from "@/data/checkout";
import { type ShippingConfig, calculateShipping, DEFAULT_SHIPPING_CONFIG } from "@/lib/shipping";
import { calculateCartSubtotal } from "@/lib/cart";

// ─────────────────────────────────────────────────────────────────────────────

export interface AppliedCouponInfo {
  code:               string;
  discountType:       "percentage" | "fixed";
  discountValue:      number;
  discountAmount:     number;
  discountedSubtotal: number;
}

interface OrderSummaryProps {
  selectedDelivery:  DeliveryMethodId;
  shippingConfig?:   ShippingConfig;
  appliedCoupon?:    AppliedCouponInfo | null;
  onApplyCoupon?:    (coupon: AppliedCouponInfo) => void;
  onRemoveCoupon?:   () => void;
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrderSummary({
  selectedDelivery,
  shippingConfig = DEFAULT_SHIPPING_CONFIG,
  appliedCoupon  = null,
  onApplyCoupon,
  onRemoveCoupon,
}: OrderSummaryProps) {
  const { items, bundle, bundleNotice } = useCart();
  const [couponInput, setCouponInput]     = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError]     = useState<string | null>(null);

  // Compute subtotal taking any active Complete-the-Look bundle into account
  const subtotalSummary = calculateCartSubtotal({ items, bundle, bundleNotice });
  const allPriced = subtotalSummary.allPriced;

  // Individual product total before bundle discounts
  const subtotal: number | null = allPriced ? subtotalSummary.individualTotal : null;

  // Bundle-adjusted subtotal (bundlePrice + nonBundleSubtotal) used for coupon & shipping rules
  const bundleAdjustedSubtotal: number | null = allPriced ? subtotalSummary.subtotal : null;

  type ResolvedItem = {
    productId:   string;
    slug:        string;
    name:        string | null;
    price:       number | null;
    imageUrl:    string;
    antiTarnish: boolean;
    quantity:    number;
  };

  const resolvedItems: ResolvedItem[] = items.map(item => {
    const { slug, name, price, imageUrl, antiTarnish } = item.snapshot;
    return {
      productId: item.productId,
      slug,
      name,
      price,
      imageUrl,
      antiTarnish,
      quantity: item.quantity,
    };
  });

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const postCouponSubtotal = bundleAdjustedSubtotal !== null ? Math.max(0, bundleAdjustedSubtotal - discountAmount) : null;

  const shippingResult = postCouponSubtotal !== null
    ? calculateShipping({
        postCouponSubtotal,
        shippingConfig,
      })
    : null;

  const shippingCost = shippingResult !== null ? shippingResult.shippingCost : null;

  const total = (postCouponSubtotal !== null && shippingCost !== null)
    ? postCouponSubtotal + shippingCost
    : null;

  const handleApplyCoupon = async () => {
    const trimmed = couponInput.trim().toUpperCase();
    if (!trimmed) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          code: trimmed,
          cartItems: items,
          bundle: subtotalSummary.hasActiveBundle ? bundle : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCouponError(data.error || "Invalid or unavailable coupon code.");
      } else {
        setCouponInput("");
        setCouponError(null);
        onApplyCoupon?.(data.coupon);
      }
    } catch {
      setCouponError("Unable to validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponError(null);
    onRemoveCoupon?.();
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <aside
      aria-label="Order summary"
      style={{
        background:    "var(--color-parchment-deep)",
        padding:       "clamp(1.5rem, 3vw, 2.5rem)",
        display:       "flex",
        flexDirection: "column",
        gap:           "1.5rem",
      }}
    >
      {/* Header */}
      <div>
        <p style={{
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.6875rem",
          fontWeight:    600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color:         "var(--color-espresso)",
          marginBottom:  "0.25rem",
        }}>
          Order Summary
        </p>
        <p style={{
          fontFamily: "var(--font-body), Manrope, sans-serif",
          fontSize:   "0.75rem",
          color:      "var(--color-espresso-muted)",
        }}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </p>
      </div>

      {/* Divider */}
      <div aria-hidden="true" style={{ height: "1px", background: "var(--border)" }} />

      {/* Items */}
      <ul role="list" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {resolvedItems.map(({ productId, name, price, imageUrl, quantity }) => {
          const lineTotal = typeof price === "number" && price !== null
            ? price * quantity
            : null;
          const hasSrc = Boolean(imageUrl && imageUrl.trim() !== "");

          return (
            <li
              key={productId}
              style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}
            >
              {/* Thumbnail */}
              <div style={{
                flexShrink:  0,
                position:    "relative",
                width:       "62px",
                aspectRatio: "3/4",
                background:  "var(--color-parchment)",
                overflow:    "hidden",
              }}>
                {hasSrc && (
                  <img
                    src={imageUrl}
                    alt={name ?? "Product"}
                    style={{ width: "100%", height: "100%", objectFit: "contain", padding: "0.25rem" }}
                  />
                )}
                {/* Quantity badge */}
                {quantity > 1 && (
                  <span style={{
                    position:     "absolute",
                    top:          "2px",
                    right:        "2px",
                    minWidth:     "18px",
                    height:       "18px",
                    background:   "var(--color-espresso)",
                    color:        "var(--color-ivory)",
                    borderRadius: "50%",
                    fontFamily:   "var(--font-body), Manrope, sans-serif",
                    fontSize:     "0.5625rem",
                    fontWeight:   700,
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent:"center",
                  }}>
                    {quantity}
                  </span>
                )}
              </div>

              {/* Name + price */}
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <div>
                  <p style={{
                    fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
                    fontSize:    "0.9375rem",
                    fontStyle:   "italic",
                    color:       "var(--color-espresso)",
                    lineHeight:  1.3,
                  }}>
                    {name ?? "Jewellery"}
                  </p>
                  <p style={{
                    fontFamily:  "var(--font-body), Manrope, sans-serif",
                    fontSize:    "0.6875rem",
                    color:       "var(--color-espresso-muted)",
                    marginTop:   "0.2rem",
                  }}>
                    Qty: {quantity}
                  </p>
                </div>

                <p style={{
                  fontFamily:  "var(--font-body), Manrope, sans-serif",
                  fontSize:    "0.875rem",
                  fontWeight:  500,
                  color:       "var(--color-espresso)",
                  flexShrink:  0,
                }}>
                  {lineTotal !== null
                    ? formatINR(lineTotal)
                    : <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
                        —
                      </span>
                  }
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Divider */}
      <div aria-hidden="true" style={{ height: "1px", background: "var(--border)" }} />

      {/* ── Coupon Code Entry / Applied Badge ───────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p style={{
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.6875rem",
          fontWeight:    600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color:         "var(--color-espresso)",
          margin:        0,
        }}>
          Coupon Code
        </p>

        {!appliedCoupon ? (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="checkout-coupon-input"
              type="text"
              placeholder="Enter promo code"
              value={couponInput}
              onChange={e => {
                setCouponInput(e.target.value.toUpperCase());
                setCouponError(null);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyCoupon();
                }
              }}
              disabled={couponLoading}
              style={{
                flex:        1,
                padding:     "0.5625rem 0.75rem",
                background:  "var(--color-ivory)",
                border:      `1px solid ${couponError ? "#b84c4c" : "var(--border)"}`,
                color:       "var(--color-espresso)",
                fontSize:    "0.8125rem",
                fontFamily:  "var(--font-body), monospace",
                fontWeight:  600,
                letterSpacing: "0.06em",
                outline:     "none",
                borderRadius:"2px",
              }}
            />
            <button
              id="checkout-coupon-apply-btn"
              type="button"
              disabled={couponLoading || !couponInput.trim()}
              onClick={handleApplyCoupon}
              style={{
                padding:       "0.5625rem 1rem",
                background:    "var(--color-espresso)",
                color:         "var(--color-ivory)",
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem",
                fontWeight:    600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border:        "none",
                borderRadius:  "2px",
                cursor:        couponLoading || !couponInput.trim() ? "not-allowed" : "pointer",
                opacity:       couponLoading || !couponInput.trim() ? 0.6 : 1,
                transition:    "opacity 150ms ease",
              }}
            >
              {couponLoading ? "Checking…" : "Apply"}
            </button>
          </div>
        ) : (
          <div
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              padding:        "0.625rem 0.875rem",
              background:     "color-mix(in srgb, #2e7d32 10%, transparent)",
              border:         "1px solid color-mix(in srgb, #2e7d32 30%, transparent)",
              borderRadius:   "2px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", fontFamily: "var(--font-body), monospace", fontWeight: 700, color: "#2e7d32", letterSpacing: "0.06em" }}>
                {appliedCoupon.code}
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2e7d32" }}>
                (-{formatINR(appliedCoupon.discountAmount)})
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              style={{
                background: "transparent",
                border:     "none",
                color:      "var(--color-espresso-muted)",
                fontSize:   "0.6875rem",
                fontWeight: 600,
                cursor:     "pointer",
                textDecoration: "underline",
                padding:    0,
              }}
            >
              Remove
            </button>
          </div>
        )}

        {couponError && (
          <p
            role="alert"
            style={{
              margin:     0,
              fontSize:   "0.75rem",
              color:      "#b84c4c",
              fontFamily: "var(--font-body), Manrope, sans-serif",
            }}
          >
            {couponError}
          </p>
        )}
      </div>

      {/* Divider */}
      <div aria-hidden="true" style={{ height: "1px", background: "var(--border)" }} />

      {/* Totals */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {/* Subtotal */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.8125rem",
            color:      "var(--color-espresso-muted)",
          }}>
            Subtotal
          </span>
          <span style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.8125rem",
            color:      "var(--color-espresso)",
          }}>
            {subtotal !== null ? formatINR(subtotal)
              : <span style={{ fontStyle: "italic" }}>Pricing to be confirmed</span>}
          </span>
        </div>

        {/* Complete Look Bundle Savings (if active) */}
        {subtotalSummary.hasActiveBundle && subtotalSummary.bundleDiscount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.8125rem",
              color:      "#1e6b20",
              fontWeight: 500,
            }}>
              Complete Look Savings
            </span>
            <span style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.8125rem",
              color:      "#1e6b20",
              fontWeight: 600,
            }}>
              -{formatINR(subtotalSummary.bundleDiscount)}
            </span>
          </div>
        )}

        {/* Coupon Discount (if applied) */}
        {appliedCoupon && appliedCoupon.discountAmount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.8125rem",
              color:      "#2e7d32",
              fontWeight: 500,
            }}>
              Coupon ({appliedCoupon.code})
            </span>
            <span style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.8125rem",
              color:      "#2e7d32",
              fontWeight: 600,
            }}>
              -{formatINR(appliedCoupon.discountAmount)}
            </span>
          </div>
        )}

        {/* Shipping */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.8125rem",
            color:      "var(--color-espresso-muted)",
          }}>
            Shipping
          </span>
          <span style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.8125rem",
            color:         shippingResult?.isFree ? "#2e7d32" : "var(--color-espresso)",
            fontWeight:    shippingResult?.isFree ? 700 : 500,
            letterSpacing: shippingResult?.isFree ? "0.04em" : "normal",
          }}>
            {postCouponSubtotal === null || shippingCost === null ? (
              <span style={{ fontStyle: "italic", color: "var(--color-espresso-muted)" }}>To be confirmed</span>
            ) : shippingResult?.isFree ? (
              "FREE"
            ) : (
              formatINR(shippingCost)
            )}
          </span>
        </div>

        {/* Divider */}
        <div aria-hidden="true" style={{ height: "1px", background: "var(--border)", marginBlock: "0.25rem" }} />

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.875rem",
            fontWeight:    600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color:         "var(--color-espresso)",
          }}>
            Total
          </span>
          <span style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:   "1.25rem",
            fontWeight: 500,
            color:      "var(--color-espresso)",
          }}>
            {total !== null ? formatINR(total)
              : <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", fontStyle: "italic", color: "var(--color-espresso-muted)" }}>
                  To be confirmed
                </span>
            }
          </span>
        </div>
      </div>

      {/* Pricing disclaimer when prices are absent */}
      {!allPriced && (
        <p style={{
          fontFamily:   "var(--font-body), Manrope, sans-serif",
          fontSize:     "0.6875rem",
          color:        "var(--color-espresso-muted)",
          fontStyle:    "italic",
          lineHeight:   1.6,
          borderTop:    "1px solid var(--border)",
          paddingTop:   "1rem",
        }}>
          Pricing for some items is currently being confirmed by our team. You will receive the final amount before completing your order.
        </p>
      )}
    </aside>
  );
}

