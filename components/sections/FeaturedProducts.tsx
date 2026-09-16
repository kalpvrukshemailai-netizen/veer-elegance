/**
 * VEER ELEGANCE — FeaturedProducts
 *
 * Server Component: fetches ALL featured products from Supabase,
 * across all categories (chains, rings, earrings, bracelets).
 *
 * DATA SOURCE: Supabase public.products
 *   filter: published = true AND featured = true AND archived = false
 *   order:  display_order ASC, created_at DESC
 *
 * No code change is needed to control what appears here.
 * Admin → Edit Product → Featured = ON / OFF controls visibility instantly.
 *
 * Accepts an optional `category` prop so the homepage can show only
 * products matching the currently-active category tab.
 * If no featured products exist for that category, renders null.
 *
 * ── DESKTOP: 3-column editorial grid ───────────────────────────────────────
 * ── MOBILE:  2-column grid ─────────────────────────────────────────────────
 */

import Link  from "next/link";
import { getFeaturedStorefrontProducts } from "@/lib/storefront";
import type { ProductCategory } from "@/lib/products-db";
import ProductCard from "@/components/products/ProductCard";

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY LABELS
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ProductCategory, { eyebrow: string; heading: string; cta: string; ctaHref: string }> = {
  chains:              { eyebrow: "THE EVERYDAY", heading: "Featured Chains",           cta: "Explore THE EVERYDAY",   ctaHref: "/shop/chains" },
  rings:               { eyebrow: "THE SIGNATURE", heading: "Featured Rings",           cta: "Explore THE SIGNATURE",  ctaHref: "/shop/rings" },
  earrings:            { eyebrow: "THE GLOW",      heading: "Featured Earrings",        cta: "Explore THE GLOW",       ctaHref: "/shop/earrings" },
  bracelets:           { eyebrow: "THE MOTION",    heading: "Featured Bracelets",       cta: "Explore THE MOTION",     ctaHref: "/shop/bracelets" },
  bangles:             { eyebrow: "THE HALO",      heading: "Featured Bangles",         cta: "Explore THE HALO",       ctaHref: "/shop/bangles" },
  "mystery-box":       { eyebrow: "THE UNKNOWN",   heading: "Featured Mystery Boxes",   cta: "Explore THE UNKNOWN",    ctaHref: "/shop/mystery-box" },
  "gen-z-accessories": { eyebrow: "THE REBEL",     heading: "Featured Gen-Z Jewellery", cta: "Explore THE REBEL",      ctaHref: "/shop/gen-z-accessories" },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface FeaturedProductsProps {
  /** Only show featured products for this category. Defaults to all categories. */
  category?: ProductCategory;
}

export default async function FeaturedProducts({ category }: FeaturedProductsProps) {
  // Fetch featured products from Supabase (published + featured + !archived).
  // Pass category to filter; if no category is given, returns all featured.
  const featured = await getFeaturedStorefrontProducts(category);

  // Nothing to show — render null (no empty section visible to customer)
  if (featured.length === 0) return null;

  // Show up to 6 featured products
  const display = featured.slice(0, 6);

  // Determine labels based on the active category, or derive from the products
  const resolvedCategory = category ?? (display[0]?.category as ProductCategory | undefined);
  const labels = resolvedCategory
    ? CATEGORY_LABELS[resolvedCategory]
    : { eyebrow: "Curated Picks", heading: "Featured Collection", cta: "Explore All", ctaHref: "/shop/chains" };

  return (
    <section
      id="featured-products"
      aria-label={`Featured ${resolvedCategory ?? "collection"}`}
      style={{
        background:   "var(--color-parchment)",
        paddingBlock: "clamp(4rem, 8vw, 7rem)",
        overflowX:    "hidden",
      }}
    >
      <div className="container-editorial">

        {/* ── Section header ────────────────────────────────────────────── */}
        <header style={{ marginBottom: "clamp(2.5rem, 5vw, 4rem)" }}>
          <span
            aria-hidden="true"
            style={{ display: "block", width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "1.25rem" }}
          />
          <p className="text-label" style={{ color: "var(--color-gold-muted)", marginBottom: "0.75rem" }}>
            {labels.eyebrow}
          </p>
          <h2 className="text-display-lg" style={{ color: "var(--color-espresso)", lineHeight: 1.08, marginBottom: "0.625rem" }}>
            <em className="text-display-italic">{labels.heading}</em>
          </h2>
          <p className="text-body-md" style={{ color: "var(--color-espresso-muted)" }}>
            Everyday elegance, designed to stay.
          </p>
        </header>

        {/* ── Product grid ─────────────────────────────────────────────── */}
        <div className="chains-grid">
          {display.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              animationDelay={idx * 40}
            />
          ))}
        </div>

        {/* ── View All CTA ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "clamp(2.5rem, 5vw, 4rem)" }}>
          <Link
            href={labels.ctaHref}
            aria-label={labels.cta}
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           "0.625rem",
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.75rem",
              fontWeight:    600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color:         "var(--color-espresso)",
              textDecoration:"none",
              borderBottom:  "1px solid var(--color-espresso)",
              paddingBottom: "0.375rem",
              transition:    "color 300ms ease, border-color 300ms ease",
            }}
          >
            {labels.cta}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 7h10M8 3.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

      </div>
    </section>
  );
}
