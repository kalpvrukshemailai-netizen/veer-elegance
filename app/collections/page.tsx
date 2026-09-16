/**
 * VEER ELEGANCE — /collections
 *
 * Broader collection discovery experience.
 * Reuses the existing Circular Collection Explorer component architecture.
 *
 * Clicking a category navigates to /shop/[category] using the existing
 * dynamic category routes.
 */

import type { Metadata }         from "next";
import Link                      from "next/link";
import SiteNavbar                from "@/components/layout/SiteNavbar";
import CollectionsExplorerView   from "@/components/sections/CollectionsExplorerView";
import { CATEGORIES }            from "@/data/categories";

export const metadata: Metadata = {
  title: "Collections — Veer Elegance",
  description:
    "Explore the Veer Elegance jewellery collections. Circular discovery across anti-tarnish chains, rings, earrings, and bracelets.",
  openGraph: {
    title: "Collections — Veer Elegance",
    description:
      "Discover the signature anti-tarnish jewellery collections from Veer Elegance.",
  },
};

export default function CollectionsPage() {
  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh" }}>
      {/* Light navbar for cream/parchment background */}
      <SiteNavbar theme="light" />

      <main id="main-content" role="main" style={{ paddingTop: "clamp(3.5rem, 6vw, 4.5rem)" }}>
        {/* ── Circular Collection Explorer (reused architecture) ─────────── */}
        <CollectionsExplorerView />

        {/* ── Editorial Category Grid List ──────────────────────────────── */}
        <section
          aria-labelledby="all-collections-heading"
          style={{
            maxWidth:      "1280px",
            margin:        "0 auto",
            paddingInline: "clamp(1.5rem, 6vw, 5rem)",
            paddingBottom: "clamp(5rem, 10vw, 8rem)",
          }}
        >
          <div
            style={{
              borderTop:     "1px solid var(--border)",
              paddingTop:    "clamp(3rem, 6vw, 4.5rem)",
              textAlign:     "center",
              marginBottom:  "clamp(2.5rem, 5vw, 3.5rem)",
            }}
          >
            <p
              style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem",
                fontWeight:    600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color:         "var(--color-gold-muted)",
                marginBottom:  "0.75rem",
              }}
            >
              All Categories
            </p>
            <h2
              id="all-collections-heading"
              style={{
                fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
                fontSize:    "clamp(2rem, 4vw, 3rem)",
                fontWeight:  400,
                fontStyle:   "italic",
                color:       "var(--color-espresso)",
                lineHeight:  1.15,
                margin:      0,
              }}
            >
              Curated Collections
            </h2>
          </div>

          {/* 4-Card Category Directory */}
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              gap:                 "clamp(1.5rem, 3vw, 2rem)",
            }}
          >
            {CATEGORIES.map((cat) => (
              <article
                key={cat.id}
                style={{
                  background:     "var(--color-ivory)",
                  border:         "1px solid var(--border)",
                  padding:        "clamp(1.75rem, 3vw, 2.25rem)",
                  display:        "flex",
                  flexDirection:  "column",
                  justifyContent: "space-between",
                  transition:     "transform 250ms ease, box-shadow 250ms ease",
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily:    "var(--font-body), Manrope, sans-serif",
                      fontSize:      "0.625rem",
                      fontWeight:    700,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color:         "var(--color-gold-muted)",
                      marginBottom:  "0.75rem",
                    }}
                  >
                    {cat.subtitle}
                  </p>
                  <h3
                    style={{
                      fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
                      fontSize:     "1.625rem",
                      fontWeight:   400,
                      fontStyle:    "italic",
                      color:        "var(--color-espresso)",
                      marginBottom: "0.625rem",
                      lineHeight:   1.2,
                    }}
                  >
                    {cat.collectionName}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize:   "0.8125rem",
                      color:      "var(--color-espresso-muted)",
                      lineHeight: 1.65,
                      margin:     "0 0 1.75rem 0",
                    }}
                  >
                    {cat.tagline}
                  </p>
                </div>

                <Link
                  href={cat.href}
                  style={{
                    display:       "inline-flex",
                    alignItems:    "center",
                    gap:           "0.5rem",
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    fontWeight:    700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color:         "var(--color-espresso)",
                    textDecoration:"none",
                    borderBottom:  "1px solid currentColor",
                    paddingBottom: "2px",
                    width:         "fit-content",
                  }}
                >
                  Explore {cat.collectionName} →
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
