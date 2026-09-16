/**
 * VEER ELEGANCE — /checkout
 *
 * Server wrapper → client CheckoutForm.
 * Handles empty-cart guard (client-side via CheckoutGuard).
 *
 * Structure:
 *   Minimal checkout header (logo + label)
 *   → CheckoutGuard → CheckoutForm + OrderSummary
 */

import type { Metadata } from "next";
import CheckoutGuard from "@/components/checkout/CheckoutGuard";
import { getShippingConfig } from "@/lib/site-content";

// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout — Veer Elegance",
  description: "Complete your Veer Elegance order.",
};

// ─────────────────────────────────────────────────────────────────────────────

export default async function CheckoutPage() {
  const shippingConfig = await getShippingConfig();

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh" }}>

      {/* ── Minimal checkout header ─────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background:   "var(--color-parchment)",
          position:     "sticky",
          top:          0,
          zIndex:       100,
        }}
      >
        <div style={{
          maxWidth:      "1280px",
          margin:        "0 auto",
          padding:       "0 clamp(1.5rem, 5vw, 4rem)",
          height:        "clamp(3.5rem, 6vw, 4.5rem)",
          display:       "flex",
          alignItems:    "center",
          justifyContent:"space-between",
        }}>
          <a
            href="/"
            aria-label="Veer Elegance — return to homepage"
            style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
          >
            <img
              src="/images/veer-elegance-logo.png"
              alt="Veer Elegance"
              style={{
                width:   "clamp(85px, 10vw, 120px)",
                height:  "auto",
                display: "block",
              }}
            />
          </a>

          <p style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color:         "var(--color-espresso-muted)",
          }}>
            Checkout
          </p>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main
        id="main-content"
        role="main"
        style={{
          maxWidth:      "1280px",
          margin:        "0 auto",
          padding:       "clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 5vw, 4rem) clamp(4rem, 8vw, 6rem)",
        }}
      >
        {/* Page heading */}
        <div style={{ marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          <span aria-hidden="true" style={{
            display: "block", width: "2rem", height: "1px",
            background: "var(--color-gold-muted)", marginBottom: "1rem",
          }} />
          <h1 style={{
            fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:    "clamp(2rem, 4vw, 3rem)",
            fontWeight:  400,
            fontStyle:   "italic",
            color:       "var(--color-espresso)",
            lineHeight:  1.1,
          }}>
            Complete Your Order
          </h1>
        </div>

        {/* CheckoutGuard handles empty-cart state, renders form when cart has items */}
        <CheckoutGuard shippingConfig={shippingConfig} />
      </main>
    </div>
  );
}
