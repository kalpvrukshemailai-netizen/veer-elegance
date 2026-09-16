"use client";

/**
 * VEER ELEGANCE — CheckoutGuard
 *
 * Client component that reads cart state and:
 *   - Renders the empty-bag state if cart is empty
 *   - Renders CheckoutForm if cart has items
 *
 * This split keeps CheckoutPage a server component while
 * still allowing cart-state-dependent rendering.
 *
 * Hydration safety: renders nothing on first server pass.
 * After mount, reads cart and renders appropriate UI.
 */

import { useEffect, useState } from "react";
import Link         from "next/link";
import { useCart }  from "@/components/cart/CartProvider";
import CheckoutForm from "./CheckoutForm";
import type { ShippingConfig } from "@/lib/shipping";

// ─────────────────────────────────────────────────────────────────────────────

interface CheckoutGuardProps {
  shippingConfig?: ShippingConfig;
}

export default function CheckoutGuard({ shippingConfig }: CheckoutGuardProps) {
  const { items } = useCart();
  const [mounted, setMounted] = useState(false);

  // Only render after hydration to avoid SSR mismatch
  useEffect(() => { setMounted(true); }, []);

  // During SSR / first paint — render nothing to avoid hydration errors
  if (!mounted) {
    return (
      <div style={{ minHeight: "40vh" }} aria-hidden="true" />
    );
  }

  // ── Empty cart ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        minHeight:      "50vh",
        textAlign:      "center",
        gap:            "1.5rem",
        paddingBlock:   "clamp(3rem, 6vw, 5rem)",
      }}>
        {/* Bag icon */}
        <svg
          width="44" height="44" viewBox="0 0 44 44"
          fill="none" aria-hidden="true"
          style={{ opacity: 0.22 }}
        >
          <path d="M9 14h26l-3.5 20H12.5L9 14z" stroke="var(--color-espresso)" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M15.5 14c0-3.6 3-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke="var(--color-espresso)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        <div>
          <p style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color:         "var(--color-gold-muted)",
            marginBottom:  "0.75rem",
          }}>
            Your Bag is Empty
          </p>
          <h2 style={{
            fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:    "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight:  400,
            fontStyle:   "italic",
            color:       "var(--color-espresso)",
            lineHeight:  1.1,
            marginBottom:"1rem",
          }}>
            Nothing to check out yet.
          </h2>
          <p style={{
            fontFamily:  "var(--font-body), Manrope, sans-serif",
            fontSize:    "0.9375rem",
            color:       "var(--color-espresso-muted)",
            maxWidth:    "36ch",
            lineHeight:  1.7,
            margin:      "0 auto",
          }}>
            Discover pieces designed for every day.
          </p>
        </div>

        <Link
          href="/shop/chains"
          style={{
            display:       "inline-flex",
            alignItems:    "center",
            gap:           "0.5rem",
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.75rem",
            fontWeight:    600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color:         "var(--color-espresso)",
            textDecoration:"none",
            borderBottom:  "1px solid var(--color-espresso)",
            paddingBottom: "0.375rem",
            marginTop:     "0.5rem",
          }}
        >
          Continue Shopping
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6h8M6.5 3L9 6l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    );
  }

  // ── Cart has items → render checkout form ─────────────────────────────────
  return <CheckoutForm shippingConfig={shippingConfig} />;
}
