"use client";

/**
 * VEER ELEGANCE — CartItem
 *
 * A single line item inside the cart drawer.
 *
 * Reads product data from item.snapshot — captured at add-to-cart time
 * from the live Supabase product page. No runtime product lookup needed.
 * Works for ANY product in public.products (existing chains, new admin products).
 *
 * If a cart item has no snapshot (legacy, pre-migration): the CartProvider
 * purges it during the initial localStorage read, so it never reaches here.
 */

import Image  from "next/image";
import { useCart } from "./CartProvider";
import type { CartItem as CartItemType } from "@/lib/cart";

// ─────────────────────────────────────────────────────────────────────────────

interface CartItemProps {
  item: CartItemType;
}

// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(price);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCart();

  // All display data comes from the snapshot captured at add-to-cart time.
  const { snapshot } = item;
  const { name, price, imageUrl, antiTarnish } = snapshot;

  const hasPrice  = typeof price === "number" && price !== null;
  const hasSrc    = Boolean(imageUrl && imageUrl.trim() !== "");
  const lineTotal = hasPrice ? price! * item.quantity : null;

  return (
    <div
      style={{
        display:      "flex",
        gap:          "1rem",
        paddingBlock: "1.25rem",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* ── Product image ─────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink:  0,
          position:    "relative",
          width:       "72px",
          aspectRatio: "3/4",
          background:  "var(--color-parchment-deep)",
          overflow:    "hidden",
        }}
      >
        {hasSrc ? (
          <Image
            src={imageUrl}
            alt={name ?? "Product"}
            fill
            quality={60}
            sizes="72px"
            style={{ objectFit: "contain", padding: "0.375rem" }}
          />
        ) : (
          /* No image — neutral parchment placeholder */
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="16" height="16" rx="2" stroke="var(--color-espresso-muted)" strokeWidth="1" strokeDasharray="3 2"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── Product info ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {/* Anti-tarnish badge */}
        {antiTarnish && (
          <span style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.5rem",
            fontWeight:    600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color:         "var(--color-gold-muted)",
          }}>
            Anti-tarnish
          </span>
        )}

        {/* Product name */}
        <p style={{
          fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
          fontSize:   "1rem",
          fontWeight: 400,
          fontStyle:  "italic",
          color:      "var(--color-espresso)",
          lineHeight: 1.25,
        }}>
          {name ?? "Jewellery"}
        </p>

        {/* Price + line total */}
        {hasPrice && (
          <p style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.8125rem",
            fontWeight: 500,
            color:      "var(--color-espresso-muted)",
          }}>
            {formatPrice(price!)}
            {item.quantity > 1 && lineTotal && (
              <span style={{ marginLeft: "0.5rem", color: "var(--color-espresso)" }}>
                = {formatPrice(lineTotal)}
              </span>
            )}
          </p>
        )}

        {/* ── Quantity controls + Remove ────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem" }}>
          {/* Stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", border: "1px solid var(--border)" }}>
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              style={{
                width:      "28px",
                height:     "28px",
                display:    "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border:     "none",
                cursor:     "pointer",
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "1rem",
                color:      "var(--color-espresso)",
                lineHeight: 1,
              }}
              className="cart-qty-btn"
            >
              −
            </button>

            <span style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.8125rem",
              fontWeight: 500,
              color:      "var(--color-espresso)",
              minWidth:   "18px",
              textAlign:  "center",
            }}>
              {item.quantity}
            </span>

            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              style={{
                width:      "28px",
                height:     "28px",
                display:    "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border:     "none",
                cursor:     "pointer",
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "1rem",
                color:      "var(--color-espresso)",
                lineHeight: 1,
              }}
              className="cart-qty-btn"
            >
              +
            </button>
          </div>

          {/* Remove */}
          <button
            type="button"
            aria-label={`Remove ${name ?? "item"} from bag`}
            onClick={() => removeFromCart(item.productId)}
            style={{
              background:      "none",
              border:          "none",
              padding:         0,
              cursor:          "pointer",
              fontFamily:      "var(--font-body), Manrope, sans-serif",
              fontSize:        "0.5625rem",
              fontWeight:      500,
              letterSpacing:   "0.1em",
              textTransform:   "uppercase",
              color:           "var(--color-espresso-muted)",
              textDecoration:  "underline",
              textUnderlineOffset: "2px",
            }}
            className="cart-remove-btn"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
