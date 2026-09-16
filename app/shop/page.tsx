/**
 * VEER ELEGANCE — /shop
 *
 * Main customer SHOP catalogue page.
 * Displays all published, non-archived products from live Supabase catalog.
 *
 * Architecture:
 *   - Server Component (force-dynamic: always reflects live inventory/products)
 *   - Uses getStorefrontProducts() from @/lib/storefront
 *   - Reuses existing ProductCard component
 *   - Dynamically groups products by category
 *   - Supports dynamic categories without hardcoded counts
 */

import type { Metadata }         from "next";
import Link                      from "next/link";
import SiteNavbar                from "@/components/layout/SiteNavbar";
import ProductCard               from "@/components/products/ProductCard";
import { getStorefrontProducts } from "@/lib/storefront";
import { CATEGORIES, getCategoryById } from "@/data/categories";
import type { Product }          from "@/data/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop All Jewellery — Veer Elegance",
  description:
    "Explore the complete Veer Elegance collection. Premium anti-tarnish everyday chains, rings, earrings, and bracelets crafted to last.",
  openGraph: {
    title: "Shop All Jewellery — Veer Elegance",
    description:
      "Discover fine anti-tarnish everyday jewellery crafted with quiet elegance and timeless design.",
  },
};

export default async function ShopPage() {
  const products = await getStorefrontProducts();

  // ── Group products by category dynamically (multi-category aware) ───────────
  const groupedProducts = new Map<string, Product[]>();

  // Ensure all known categories have an entry
  for (const cat of CATEGORIES) {
    groupedProducts.set(cat.id, []);
  }

  // Populate from live products into every assigned collection
  for (const p of products) {
    const assigned = (p.categories && p.categories.length > 0)
      ? p.categories
      : (p.category ? [p.category] : []);

    for (const catId of assigned) {
      if (!groupedProducts.has(catId)) {
        groupedProducts.set(catId, []);
      }
      groupedProducts.get(catId)!.push(p);
    }
  }

  const totalPieces = products.length;

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh" }}>
      {/* Light navbar for cream/parchment background */}
      <SiteNavbar theme="light" />

      <main id="main-content" role="main">
        {/* ── Shop Hero Header ───────────────────────────────────────────── */}
        <header
          style={{
            paddingTop:    "clamp(7rem, 14vw, 10rem)",
            paddingBottom: "clamp(2.5rem, 5vw, 4rem)",
            paddingInline: "clamp(1.5rem, 6vw, 5rem)",
            maxWidth:      "1280px",
            margin:        "0 auto",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display:      "block",
              width:        "2rem",
              height:       "1px",
              background:   "var(--color-gold-muted)",
              marginBottom: "1.25rem",
            }}
          />
          <p
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         "var(--color-gold-muted)",
              marginBottom:  "0.875rem",
            }}
          >
            The Catalogue
          </p>
          <h1
            style={{
              fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
              fontSize:     "clamp(2.5rem, 6vw, 4.5rem)",
              fontWeight:   400,
              color:        "var(--color-espresso)",
              lineHeight:   1.06,
              marginBottom: "1rem",
            }}
          >
            <em>Shop All Jewellery</em>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "clamp(0.875rem, 1.5vw, 1rem)",
              color:      "var(--color-espresso-muted)",
              maxWidth:   "46ch",
              lineHeight: 1.75,
              margin:     0,
            }}
          >
            Thoughtfully crafted everyday jewellery designed with quiet refinement,
            modern anti-tarnish endurance, and timeless balance.
          </p>

          {/* ── Category Jump Navigation ──────────────────────────────────── */}
          <nav
            aria-label="Category quick links"
            style={{
              display:   "flex",
              alignItems:"center",
              gap:       "0.75rem",
              flexWrap:  "wrap",
              marginTop: "2.25rem",
            }}
          >
            {CATEGORIES.map((cat) => {
              const count = groupedProducts.get(cat.id)?.length ?? 0;
              return (
                <a
                  key={cat.id}
                  href={`#category-${cat.id}`}
                  style={{
                    display:       "inline-flex",
                    alignItems:    "center",
                    gap:           "0.4rem",
                    padding:       "0.5rem 0.875rem",
                    background:    "var(--color-ivory)",
                    border:        "1px solid var(--border)",
                    color:         "var(--color-espresso)",
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    fontWeight:    600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    textDecoration:"none",
                    transition:    "border-color 150ms ease, background 150ms ease",
                  }}
                >
                  <span>{cat.collectionName}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize:   "0.5625rem",
                      color:      "var(--color-gold-muted)",
                      fontWeight: 600,
                    }}
                  >
                    · {cat.subtitle}
                  </span>
                  {count > 0 && (
                    <span
                      style={{
                        fontFamily: "var(--font-body), Manrope, sans-serif",
                        fontSize:   "0.625rem",
                        color:      "var(--color-espresso-muted)",
                        fontWeight: 400,
                      }}
                    >
                      ({count})
                    </span>
                  )}
                </a>
              );
            })}
          </nav>
        </header>

        {/* ── Divider ────────────────────────────────────────────────────── */}
        <div
          aria-hidden="true"
          style={{
            height:       "1px",
            background:   "color-mix(in srgb, var(--color-espresso) 10%, transparent)",
            maxWidth:     "1280px",
            margin:       "0 auto",
            marginInline: "clamp(1.5rem, 6vw, 5rem)",
          }}
        />

        {/* ── Catalogue Content ─────────────────────────────────────────── */}
        {totalPieces === 0 ? (
          /* Empty state */
          <div
            style={{
              maxWidth:      "1280px",
              margin:        "0 auto",
              paddingInline: "clamp(1.5rem, 6vw, 5rem)",
              paddingBlock:  "clamp(4rem, 8vw, 7rem)",
              textAlign:     "center",
            }}
          >
            <p
              style={{
                fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
                fontSize:     "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight:   400,
                fontStyle:    "italic",
                color:        "var(--color-espresso)",
                marginBottom: "1rem",
              }}
            >
              New pieces are currently being curated.
            </p>
            <p
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "0.875rem",
                color:      "var(--color-espresso-muted)",
                maxWidth:   "40ch",
                margin:     "0 auto 2rem",
                lineHeight: 1.7,
              }}
            >
              Our collection is updated regularly. Please check back shortly or explore our story.
            </p>
            <Link
              href="/about"
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
              Our Story →
            </Link>
          </div>
        ) : (
          /* Grouped Categories Display */
          <div
            style={{
              maxWidth:      "1280px",
              margin:        "0 auto",
              paddingInline: "clamp(1.5rem, 6vw, 5rem)",
              paddingTop:    "clamp(2.5rem, 5vw, 4rem)",
              paddingBottom: "clamp(5rem, 10vw, 8rem)",
              display:       "flex",
              flexDirection: "column",
              gap:           "clamp(4rem, 8vw, 6.5rem)",
            }}
          >
            {Array.from(groupedProducts.entries()).map(([catId, catProducts]) => {
              const catMeta = getCategoryById(catId);
              const collectionName = catMeta?.collectionName || catId.toUpperCase();
              const subtitle = catMeta?.subtitle || catId;
              const tagline = catMeta?.tagline || "Fine anti-tarnish jewellery.";
              const href = catMeta?.href || `/shop/${catId}`;

              return (
                <section
                  key={catId}
                  id={`category-${catId}`}
                  aria-labelledby={`heading-category-${catId}`}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  {/* Category Header Row */}
                  <div
                    style={{
                      display:        "flex",
                      alignItems:     "flex-end",
                      justifyContent: "space-between",
                      flexWrap:       "wrap",
                      gap:            "1rem",
                      borderBottom:   "1px solid var(--border)",
                      paddingBottom:  "1.25rem",
                      marginBottom:   "clamp(1.75rem, 3.5vw, 2.5rem)",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontFamily:    "var(--font-body), Manrope, sans-serif",
                          fontSize:      "0.625rem",
                          fontWeight:    700,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color:         "var(--color-gold-muted)",
                          margin:        "0 0 0.375rem 0",
                        }}
                      >
                        {subtitle}
                      </p>
                      <h2
                        id={`heading-category-${catId}`}
                        style={{
                          fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
                          fontSize:    "clamp(1.75rem, 3.5vw, 2.5rem)",
                          fontWeight:  400,
                          fontStyle:   "italic",
                          color:       "var(--color-espresso)",
                          margin:      0,
                          lineHeight:  1.1,
                        }}
                      >
                        {collectionName}
                      </h2>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                      <span
                        style={{
                          fontFamily:    "var(--font-body), Manrope, sans-serif",
                          fontSize:      "0.6875rem",
                          color:         "var(--color-espresso-muted)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {catProducts.length} {catProducts.length === 1 ? "piece" : "pieces"}
                      </span>
                      <Link
                        href={href}
                        style={{
                          fontFamily:    "var(--font-body), Manrope, sans-serif",
                          fontSize:      "0.6875rem",
                          fontWeight:    600,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color:         "var(--color-espresso)",
                          textDecoration:"none",
                          borderBottom:  "1px solid currentColor",
                          paddingBottom: "2px",
                        }}
                      >
                        Explore {collectionName} →
                      </Link>
                    </div>
                  </div>

                  {/* Category Products Grid or Editorial Placeholder */}
                  {catProducts.length > 0 ? (
                    <div className="shop-chains-grid">
                      {catProducts.map((product, idx) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          animationDelay={idx * 40}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "var(--color-ivory)",
                        border:     "1px solid var(--border)",
                        padding:    "clamp(2.5rem, 5vw, 3.5rem)",
                        textAlign:  "center",
                      }}
                    >
                      <p
                        style={{
                          fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
                          fontSize:     "1.375rem",
                          fontStyle:    "italic",
                          color:        "var(--color-espresso)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Curating {collectionName}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-body), Manrope, sans-serif",
                          fontSize:   "0.8125rem",
                          color:      "var(--color-espresso-muted)",
                          margin:     0,
                        }}
                      >
                        {tagline} New pieces will be unveiled soon.
                      </p>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
