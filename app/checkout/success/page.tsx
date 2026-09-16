/**
 * VEER ELEGANCE — /checkout/success
 *
 * SERVER-SIDE GUARDED success page.
 *
 * Accepts ?orderId=<uuid> search param.
 * Authenticates the user and queries the DB to confirm payment_status = 'captured'.
 * Only shows the confirmed-payment message when the DB genuinely says so.
 *
 * Safe on refresh: re-queries DB each time — always honest.
 * Safe if visited directly without orderId: shows a neutral "check your account" state.
 * Safe if orderId belongs to another user: treated as not found.
 *
 * No client-side hooks. No cart dependency. No redirect on refresh.
 */

import type { Metadata } from "next";
import Link              from "next/link";
import { createClient } from "@/lib/supabase/server";
import { orderDisplayRef } from "@/lib/orders";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Order Confirmed — Veer Elegance",
  description: "Your Veer Elegance order has been confirmed.",
};

// ─────────────────────────────────────────────────────────────────────────────

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp      = await searchParams;
  const orderId = sp.orderId?.trim() ?? "";

  // ── Server-side DB check ───────────────────────────────────────────────────
  let isConfirmed  = false;
  let orderRef     = "";
  let isSignedIn   = false;

  if (orderId) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      isSignedIn = !!user;

      if (user) {
        const { data: order } = await supabase
          .from("orders")
          .select("id, payment_status")
          .eq("id", orderId)
          .eq("user_id", user.id)   // ownership: only the customer can see their own order
          .single();

        if (order && (order as { payment_status: string }).payment_status === "captured") {
          isConfirmed = true;
          orderRef    = orderDisplayRef(orderId);
        }
      }
    } catch {
      // DB error — fall through to neutral state (safe default)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        background:    "var(--color-parchment)",
        minHeight:     "100dvh",
        display:       "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Minimal header ──────────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background:   "var(--color-parchment)",
          flexShrink:   0,
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
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main
        id="main-content"
        role="main"
        style={{
          flex:           1,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "clamp(4rem, 8vw, 6rem) clamp(1.5rem, 5vw, 4rem)",
          textAlign:      "center",
        }}
      >
        {isConfirmed ? (
          /* ── Confirmed: payment_status = captured in DB ─────────────── */
          <>
            {/* Decorative check circle */}
            <div
              aria-hidden="true"
              style={{
                width:         "56px",
                height:        "56px",
                borderRadius:  "50%",
                border:        "1.5px solid var(--color-gold-muted)",
                display:       "flex",
                alignItems:    "center",
                justifyContent:"center",
                marginBottom:  "2rem",
                flexShrink:    0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M4.5 11l4.5 4.5 9-9"
                  stroke="var(--color-gold-muted)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         "var(--color-gold-muted)",
              marginBottom:  "1rem",
            }}>
              Order Confirmed
            </p>

            <h1 style={{
              fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
              fontSize:    "clamp(2.5rem, 6vw, 4rem)",
              fontWeight:  400,
              fontStyle:   "italic",
              color:       "var(--color-espresso)",
              lineHeight:  1.05,
              marginBottom:"1.25rem",
            }}>
              Thank you.
            </h1>

            <p style={{
              fontFamily:  "var(--font-body), Manrope, sans-serif",
              fontSize:    "clamp(0.9375rem, 2vw, 1.0625rem)",
              color:       "var(--color-espresso-muted)",
              maxWidth:    "44ch",
              lineHeight:  1.75,
              marginBottom:"0.5rem",
            }}>
              Your payment has been received and your order is confirmed.
            </p>

            {orderRef && (
              <p style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem",
                fontWeight:    600,
                letterSpacing: "0.12em",
                color:         "var(--color-espresso-muted)",
                textTransform: "uppercase",
                marginBottom:  "0.5rem",
              }}>
                Order {orderRef}
              </p>
            )}

            <p style={{
              fontFamily:  "var(--font-body), Manrope, sans-serif",
              fontSize:    "0.8125rem",
              color:       "var(--color-espresso-muted)",
              maxWidth:    "42ch",
              lineHeight:  1.65,
              fontStyle:   "italic",
              marginBottom:"2.5rem",
            }}>
              We&apos;re preparing your Veer Elegance piece with care. You&apos;ll find your order details in your account.
            </p>

            {/* CTAs */}
            <div style={{
              display:        "flex",
              alignItems:     "center",
              flexWrap:       "wrap",
              justifyContent: "center",
              gap:            "1.25rem",
            }}>
              <Link
                href="/"
                style={{
                  display:       "inline-flex",
                  alignItems:    "center",
                  gap:           "0.5rem",
                  padding:       "0.875rem 2rem",
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
                className="success-cta-primary"
              >
                Continue Shopping
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6h8M6.5 3L9 6l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <Link
                href="/account"
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
                  paddingBottom: "0.25rem",
                }}
                className="success-cta-secondary"
              >
                View Order
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6h8M6.5 3L9 6l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </>
        ) : (
          /* ── Neutral: no orderId, not logged in, payment not captured ── */
          <>
            <p style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         "var(--color-gold-muted)",
              marginBottom:  "1rem",
            }}>
              Order Received
            </p>

            <h1 style={{
              fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
              fontSize:    "clamp(2rem, 5vw, 3rem)",
              fontWeight:  400,
              fontStyle:   "italic",
              color:       "var(--color-espresso)",
              lineHeight:  1.1,
              marginBottom:"1.25rem",
            }}>
              Check your account for details.
            </h1>

            <p style={{
              fontFamily:  "var(--font-body), Manrope, sans-serif",
              fontSize:    "clamp(0.875rem, 2vw, 1rem)",
              color:       "var(--color-espresso-muted)",
              maxWidth:    "40ch",
              lineHeight:  1.75,
              marginBottom:"2.5rem",
            }}>
              If your payment was successful, your order will appear in your account shortly.
            </p>

            <div style={{
              display:        "flex",
              alignItems:     "center",
              flexWrap:       "wrap",
              justifyContent: "center",
              gap:            "1.25rem",
            }}>
              <Link
                href="/account"
                style={{
                  display:       "inline-flex",
                  alignItems:    "center",
                  gap:           "0.5rem",
                  padding:       "0.875rem 2rem",
                  background:    "var(--color-espresso)",
                  color:         "var(--color-ivory)",
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.75rem",
                  fontWeight:    600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  textDecoration:"none",
                }}
              >
                My Account
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6h8M6.5 3L9 6l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <Link
                href="/"
                style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.75rem",
                  fontWeight:    600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color:         "var(--color-espresso)",
                  textDecoration:"none",
                  borderBottom:  "1px solid var(--color-espresso)",
                  paddingBottom: "0.25rem",
                }}
              >
                Return to Shop
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
