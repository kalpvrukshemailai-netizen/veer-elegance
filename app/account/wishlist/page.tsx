/**
 * VEER ELEGANCE — /account/wishlist
 *
 * Customer Wishlist Page.
 * Strictly requires authentication:
 *  - Authenticated: displays saved products in standard editorial grid with real-time removal.
 *  - Unauthenticated: displays luxury login-required state with direct sign-in action.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserWishlistSlugs } from "@/lib/wishlist-server";
import { getStorefrontProductsBySlugs } from "@/lib/storefront";
import WishlistClient from "./WishlistClient";

export const metadata: Metadata = {
  title: "My Wishlist — Veer Elegance",
  description: "View and manage your saved Veer Elegance pieces.",
};

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialProducts: any[] = [];
  if (user) {
    const slugs = await getUserWishlistSlugs(user.id, supabase);
    if (slugs.length > 0) {
      initialProducts = await getStorefrontProductsBySlugs(slugs);
    }
  }

  const eyebrowStyle: React.CSSProperties = {
    fontFamily:    "var(--font-body), Manrope, sans-serif",
    fontSize:      "0.6875rem",
    fontWeight:    600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color:         "var(--color-gold-muted)",
    marginBottom:  "0.75rem",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
    fontSize:     "clamp(1.75rem, 4vw, 2.5rem)",
    fontWeight:   400,
    fontStyle:    "italic",
    color:        "var(--color-espresso)",
    lineHeight:   1.05,
    marginBottom: "0.5rem",
  };

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--color-parchment)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem, 5vw, 4rem)", height: "clamp(3.5rem, 6vw, 4.5rem)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" aria-label="Veer Elegance — return to homepage">
            <img src="/images/veer-elegance-logo.png" alt="Veer Elegance" style={{ width: "clamp(85px, 10vw, 120px)", height: "auto", display: "block" }} />
          </a>
          <Link
            href="/shop"
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.75rem",
              fontWeight:    600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color:         "var(--color-espresso)",
              textDecoration:"none",
            }}
          >
            Shop Collection
          </Link>
        </div>
      </header>

      <main id="main-content" role="main" style={{ flex: 1, maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 5vw, 4rem)" }}>
        {/* Back Link */}
        <Link
          href="/account"
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color:         "var(--color-espresso-muted)",
            textDecoration:"none",
            display:       "inline-flex",
            alignItems:    "center",
            gap:           "0.375rem",
            marginBottom:  "2rem",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M10 6H2M5.5 3L2 6l3.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          My Account
        </Link>

        {/* Heading */}
        <div style={{ marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "1.25rem" }} aria-hidden="true" />
          <p style={eyebrowStyle}>Account</p>
          <h1 style={headingStyle}>My Wishlist</h1>
        </div>

        {/* Unauthenticated / Login-Required State */}
        {!user ? (
          <div
            style={{
              padding:       "clamp(3rem, 6vw, 5rem) 1.5rem",
              textAlign:     "center",
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              gap:           "1.25rem",
              background:    "var(--color-parchment-deep)",
              borderRadius:  "var(--radius-card-img, 12px)",
              border:        "1px solid var(--border)",
              maxWidth:      "560px",
              margin:        "0 auto",
            }}
          >
            <div
              style={{
                width:          "3.5rem",
                height:         "3.5rem",
                borderRadius:   "50%",
                background:     "rgba(216, 122, 147, 0.12)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                color:          "#d87a93",
              }}
              aria-hidden="true"
            >
              <Heart size={24} strokeWidth={1.75} fill="none" color="#d87a93" />
            </div>

            <div>
              <h2
                style={{
                  fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
                  fontSize:    "clamp(1.5rem, 3.5vw, 2rem)",
                  fontWeight:  400,
                  fontStyle:   "italic",
                  color:       "var(--color-espresso)",
                  lineHeight:  1.2,
                  margin:      "0 0 0.5rem 0",
                }}
              >
                Sign in to view and manage your saved products.
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize:   "0.875rem",
                  color:      "var(--color-espresso-muted)",
                  margin:     0,
                  lineHeight: 1.5,
                }}
              >
                Your saved pieces are stored securely in your account.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
              <Link
                href="/login?next=/account/wishlist"
                style={{
                  display:        "inline-flex",
                  alignItems:     "center",
                  gap:            "0.5rem",
                  padding:        "0.875rem 2rem",
                  background:     "var(--color-espresso)",
                  color:          "var(--color-ivory)",
                  fontFamily:     "var(--font-body), Manrope, sans-serif",
                  fontSize:       "0.75rem",
                  fontWeight:     600,
                  letterSpacing:  "0.12em",
                  textTransform:  "uppercase",
                  textDecoration: "none",
                  borderRadius:   "2px",
                  transition:     "background 200ms ease",
                }}
              >
                Sign In
              </Link>

              <Link
                href="/shop"
                style={{
                  display:        "inline-flex",
                  alignItems:     "center",
                  padding:        "0.875rem 1.75rem",
                  background:     "transparent",
                  color:          "var(--color-espresso-muted)",
                  fontFamily:     "var(--font-body), Manrope, sans-serif",
                  fontSize:       "0.75rem",
                  fontWeight:     600,
                  letterSpacing:  "0.1em",
                  textTransform:  "uppercase",
                  textDecoration: "none",
                  border:         "1px solid var(--border)",
                  borderRadius:   "2px",
                  transition:     "border-color 200ms ease",
                }}
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          /* Authenticated Wishlist interactive grid */
          <WishlistClient initialProducts={initialProducts} />
        )}
      </main>
    </div>
  );
}
