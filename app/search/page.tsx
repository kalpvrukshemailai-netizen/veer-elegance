/**
 * VEER ELEGANCE — /search
 *
 * Customer Product Search Page.
 * Server Component with live Supabase search & inventory query.
 *
 * Features:
 *   - Case-insensitive search across name, slug, description, material, and category keywords
 *   - Multi-category awareness (junction table product_categories)
 *   - Strict public filtering: only published=true and archived=false
 *   - Deduplication: a product assigned to multiple categories appears once
 *   - Category filter pills (The Everyday, The Signature, The Glow, The Motion, The Halo, etc.)
 *   - Reuses existing ProductCard component
 *   - Preserves search term in URL (?q=...&category=...)
 *   - Refined empty and initial states
 */

import type { Metadata }         from "next";
import Link                      from "next/link";
import SiteNavbar                from "@/components/layout/SiteNavbar";
import ProductCard               from "@/components/products/ProductCard";
import SearchHeader              from "@/components/search/SearchHeader";
import { SEARCH_CATEGORY_OPTIONS } from "@/components/search/search-config";
import { searchStorefrontProducts } from "@/lib/storefront";
import type { ProductCategory }  from "@/lib/products-db";
import { CATEGORIES }            from "@/data/categories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search Jewellery — Veer Elegance",
  description:
    "Search the Veer Elegance collection. Discover anti-tarnish chains, rings, earrings, bracelets, bangles, and mystery boxes.",
  openGraph: {
    title: "Search Jewellery — Veer Elegance",
    description: "Search fine anti-tarnish everyday jewellery crafted with quiet elegance.",
  },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const rawCat = typeof sp.category === "string" ? sp.category.trim() : "";
  const category = (CATEGORIES.some((c) => c.id === rawCat) ? rawCat : "") as ProductCategory | "";

  const hasSearch = Boolean(q || category);
  const products = hasSearch ? await searchStorefrontProducts(q, category) : [];

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh" }}>
      {/* Light theme navbar for cream/parchment background */}
      <SiteNavbar theme="light" />

      <main id="main-content" role="main">
        {/* ── Search Input & Filter Pills ─────────────────────────────────── */}
        <SearchHeader initialQuery={q} initialCategory={category} />

        {/* ── Results Container ──────────────────────────────────────────── */}
        <div
          style={{
            maxWidth:      "1440px",
            margin:        "0 auto",
            padding:       "clamp(2.5rem, 5vw, 4.5rem) clamp(1.5rem, 5vw, 4.75rem) clamp(4.5rem, 8vw, 7rem)",
          }}
        >
          {/* ── STATE 1: Before Search (Initial Invitation) ──────────────── */}
          {!hasSearch && (
            <div
              style={{
                maxWidth:     "680px",
                margin:       "0 auto",
                textAlign:    "center",
                padding:      "clamp(2rem, 4vw, 3.5rem) 1.5rem",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width:         "48px",
                  height:        "48px",
                  borderRadius:  "50%",
                  border:        "1px solid var(--color-gold-muted)",
                  display:       "flex",
                  alignItems:    "center",
                  justifyContent:"center",
                  margin:        "0 auto 1.25rem",
                  color:         "var(--color-gold-muted)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              <p
                style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem",
                  fontWeight:    700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color:         "var(--color-gold-muted)",
                  marginBottom:  "0.75rem",
                }}
              >
                Explore
              </p>

              <h2
                style={{
                  fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
                  fontSize:     "clamp(2rem, 4vw, 3rem)",
                  fontWeight:   400,
                  fontStyle:    "italic",
                  color:        "var(--color-espresso)",
                  marginBottom: "1rem",
                  lineHeight:   1.15,
                }}
              >
                Search the Collection
              </h2>

              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize:   "0.9375rem",
                  color:      "var(--color-espresso-muted)",
                  lineHeight: 1.75,
                  margin:     "0 auto 2.25rem",
                  maxWidth:   "520px",
                }}
              >
                Search by piece name, category, or style to discover our anti-tarnish
                chains, rings, earrings, bracelets, and signature jewellery.
              </p>

              {/* Popular quick searches */}
              <div>
                <p
                  style={{
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    fontWeight:    600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color:         "var(--color-espresso-muted)",
                    marginBottom:  "0.875rem",
                  }}
                >
                  Popular Searches
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem" }}>
                  {["Chains", "Earrings", "Bracelets", "Rings", "Bangles", "Gen Z", "Mystery Box"].map((term) => (
                    <Link
                      key={term}
                      href={`/search?q=${encodeURIComponent(term.toLowerCase())}`}
                      style={{
                        padding:       "0.5rem 1.125rem",
                        background:    "var(--color-ivory)",
                        border:        "1px solid var(--border)",
                        fontFamily:    "var(--font-body), Manrope, sans-serif",
                        fontSize:      "0.75rem",
                        color:         "var(--color-espresso)",
                        textDecoration:"none",
                        borderRadius:  "9999px",
                        transition:    "border-color 150ms ease, transform 150ms ease",
                      }}
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STATE 2: No Results Found ─────────────────────────────────── */}
          {hasSearch && products.length === 0 && (
            <div
              role="status"
              style={{
                maxWidth:     "640px",
                margin:       "0 auto",
                textAlign:    "center",
                padding:      "clamp(2.5rem, 5vw, 4rem) 1.5rem",
                background:   "var(--color-ivory)",
                border:       "1px solid var(--border)",
                boxShadow:    "0 12px 32px -10px rgba(59, 28, 15, 0.04)",
              }}
            >
              <p
                style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem",
                  fontWeight:    700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color:         "var(--color-gold-muted)",
                  marginBottom:  "0.75rem",
                }}
              >
                No Results
              </p>

              <h2
                style={{
                  fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
                  fontSize:     "clamp(1.875rem, 3.5vw, 2.5rem)",
                  fontWeight:   400,
                  fontStyle:    "italic",
                  color:        "var(--color-espresso)",
                  marginBottom: "1rem",
                }}
              >
                No Pieces Found
              </h2>

              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize:   "0.875rem",
                  color:      "var(--color-espresso-muted)",
                  lineHeight: 1.7,
                  margin:     "0 auto 2rem",
                  maxWidth:   "440px",
                }}
              >
                {q
                  ? `We could not find any pieces matching "${q}". Try checking your spelling or explore our signature collections below.`
                  : "No pieces are currently available in this selected collection."}
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                <Link
                  href="/shop"
                  style={{
                    display:       "inline-flex",
                    alignItems:    "center",
                    padding:       "0.75rem 1.75rem",
                    background:    "var(--color-espresso)",
                    color:         "var(--color-ivory)",
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    fontWeight:    600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    textDecoration:"none",
                  }}
                >
                  Browse All Jewellery
                </Link>
                <Link
                  href="/collections"
                  style={{
                    display:       "inline-flex",
                    alignItems:    "center",
                    padding:       "0.75rem 1.75rem",
                    background:    "transparent",
                    color:         "var(--color-espresso)",
                    border:        "1px solid var(--color-espresso)",
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    fontWeight:    600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    textDecoration:"none",
                  }}
                >
                  View Collections
                </Link>
              </div>
            </div>
          )}

          {/* ── STATE 3: Search Results Grid ──────────────────────────────── */}
          {hasSearch && products.length > 0 && (
            <div>
              {/* Result Count and Context Bar */}
              <div
                style={{
                  display:        "flex",
                  alignItems:     "baseline",
                  justifyContent: "space-between",
                  borderBottom:   "1px solid var(--border)",
                  paddingBottom:  "1rem",
                  marginBottom:   "clamp(2rem, 3.5vw, 3rem)",
                  flexWrap:       "wrap",
                  gap:            "0.75rem",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize:   "0.875rem",
                      fontWeight: 600,
                      color:      "var(--color-espresso)",
                      margin:     0,
                    }}
                  >
                    {products.length} piece{products.length === 1 ? "" : "s"} found
                    {q && (
                      <span style={{ fontWeight: 400, color: "var(--color-espresso-muted)", marginLeft: "0.375rem" }}>
                        for &ldquo;{q}&rdquo;
                      </span>
                    )}
                    {category && (
                      <span style={{ fontWeight: 400, color: "var(--color-gold-muted)", marginLeft: "0.375rem" }}>
                        in {SEARCH_CATEGORY_OPTIONS.find((c) => c.id === category)?.label ?? category}
                      </span>
                    )}
                  </h2>
                </div>

                <Link
                  href="/shop"
                  style={{
                    fontFamily:     "var(--font-body), Manrope, sans-serif",
                    fontSize:       "0.75rem",
                    fontWeight:     600,
                    letterSpacing:  "0.08em",
                    textTransform:  "uppercase",
                    color:          "var(--color-espresso-muted)",
                    textDecoration: "none",
                  }}
                >
                  View Full Catalogue →
                </Link>
              </div>

              {/* Product Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
                  gap: "clamp(1.5rem, 3vw, 2.5rem)",
                }}
              >
                {products.map((product, idx) => (
                  <ProductCard
                    key={product.slug}
                    product={product}
                    animationDelay={Math.min(idx * 40, 400)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
