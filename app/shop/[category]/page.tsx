/**
 * VEER ELEGANCE — /shop/[category]
 *
 * Single dynamic server route covering all four jewellery categories:
 *   /shop/chains
 *   /shop/rings
 *   /shop/earrings
 *   /shop/bracelets
 *
 * DATA SOURCE: Supabase public.products (published + non-archived only).
 * Products are managed in Admin → Products. No code change needed to
 * add, remove, or reorder products on the storefront.
 *
 * Invalid category slugs render a graceful COLLECTION NOT FOUND state.
 * Categories with zero published products render the editorial coming-soon state.
 *
 * Structure:
 *   SiteNavbar (light theme)
 *   → editorial hero + optional cinematic video + product grid or coming-soon
 */

import Link       from "next/link";
import SiteNavbar from "@/components/layout/SiteNavbar";
import ProductCard from "@/components/products/ProductCard";
import {
  getCategoryById,
  isValidCategoryId,
  CATEGORIES,
  type Category,
} from "@/data/categories";
import {
  getStorefrontProductsByCategory,
} from "@/lib/storefront";
import type { Product } from "@/data/products";

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE CONFIG — dynamic; do not cache between admin edits
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";  // always fetch latest published products

// ─────────────────────────────────────────────────────────────────────────────
// STATIC PARAMS — still enumerate known categories for route pre-generation
// ─────────────────────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return CATEGORIES.map(c => ({ category: c.id }));
}

// ─────────────────────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategoryById(category);
  if (!cat) {
    return {
      title:       "Collection Not Found — Veer Elegance",
      description: "The collection you are looking for could not be found.",
    };
  }
  return {
    title:       `${cat.shopHeadline} — Veer Elegance`,
    description: cat.shopDescription,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CINEMATIC CATEGORY VIDEO
// ─────────────────────────────────────────────────────────────────────────────

function CategoryVideo({ src, label }: { src: string; label: string }) {
  if (!src || src.trim() === "") return null;

  return (
    <div
      style={{
        position:  "relative",
        width:     "100%",
        maxHeight: "60vh",
        overflow:  "hidden",
        background:"#1a110b",
      }}
      aria-label={`${label} cinematic preview`}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={src}
        autoPlay
        muted
        playsInline
        loop
        style={{
          width: "100%", height: "100%",
          objectFit: "cover", display: "block", maxHeight: "60vh",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position:   "absolute",
          inset:      0,
          background: "linear-gradient(to bottom, rgba(26,17,11,0.15) 0%, transparent 30%, transparent 70%, rgba(26,17,11,0.25) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITORIAL COMING SOON STATE — when category has 0 published products
// ─────────────────────────────────────────────────────────────────────────────

function ComingSoonState({ cat }: { cat: Category }) {
  return (
    <div
      style={{
        maxWidth:      "1280px",
        margin:        "0 auto",
        paddingBlock:  "clamp(4rem, 8vw, 7rem)",
        paddingInline: "clamp(1.5rem, 6vw, 5rem)",
        display:       "flex",
        flexDirection: "column",
        alignItems:    "flex-start",
        gap:           "clamp(1.5rem, 3vw, 2rem)",
      }}
    >
      <span aria-hidden="true" style={{ display: "block", width: "2rem", height: "1px", background: "var(--color-gold-muted)" }} />
      <p style={{
        fontFamily: "var(--font-body), Manrope, sans-serif",
        fontSize: "0.6875rem", fontWeight: 600,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--color-gold-muted)",
      }}>
        {cat.shopEyebrow}
      </p>
      <div style={{ maxWidth: "44ch" }}>
        <p style={{
          fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
          fontSize:     "clamp(1.5rem, 3vw, 2.25rem)",
          fontWeight:   400,
          fontStyle:    "italic",
          color:        "var(--color-espresso)",
          lineHeight:   1.2,
          marginBottom: "1rem",
        }}>
          New pieces are being curated for {cat.collectionName}.
        </p>
        <p style={{
          fontFamily: "var(--font-body), Manrope, sans-serif",
          fontSize:   "0.9375rem",
          color:      "var(--color-espresso-muted)",
          lineHeight: 1.75,
        }}>
          {cat.shopDescription}
        </p>
      </div>
      <Link
        href="/"
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
          borderBottom:  "1px solid color-mix(in srgb, var(--color-espresso) 40%, transparent)",
          paddingBottom: "0.3rem",
          marginTop:     "0.5rem",
        }}
      >
        Back to Collections
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default async function CategoryShopPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  // ── Invalid category → graceful not-found ──────────────────────────────────
  if (!isValidCategoryId(category)) {
    return (
      <>
        <SiteNavbar theme="light" />
        <main
          id="main-content"
          role="main"
          style={{
            minHeight:      "100dvh",
            background:     "var(--color-parchment)",
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "1.5rem",
            padding:        "clamp(6rem, 12vw, 10rem) clamp(1.5rem, 5vw, 4rem)",
            textAlign:      "center",
          }}
        >
          <span aria-hidden="true" style={{ display: "block", width: "2rem", height: "1px", background: "var(--color-gold-muted)", margin: "0 auto" }} />
          <p style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.6875rem", fontWeight: 600,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--color-gold-muted)",
          }}>
            Collection Not Found
          </p>
          <h1 style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 400,
            color: "var(--color-espresso)", lineHeight: 1.1, fontStyle: "italic",
          }}>
            <em>We couldn&apos;t find this collection.</em>
          </h1>
          <p style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.9375rem", color: "var(--color-espresso-muted)",
            maxWidth: "36ch", lineHeight: 1.7,
          }}>
            The collection you&apos;re looking for may have moved or is not yet available.
          </p>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--color-espresso)",
            textDecoration: "none",
            borderBottom: "1px solid var(--color-espresso)", paddingBottom: "0.375rem",
            marginTop: "0.5rem",
          }}>
            Back to Collections
          </Link>
        </main>
      </>
    );
  }

  const cat = getCategoryById(category)!;

  // ── Fetch published products from Supabase ──────────────────────────────────
  const products = await getStorefrontProductsByCategory(cat.id as Parameters<typeof getStorefrontProductsByCategory>[0]);
  const hasProducts = products.length > 0;

  return (
    <>
      <SiteNavbar theme="light" />

      <main
        id="main-content"
        role="main"
        style={{ background: "var(--color-parchment)", minHeight: "100dvh" }}
      >
        {/* ── Editorial page hero ────────────────────────────────────────── */}
        <header
          style={{
            paddingTop:    "clamp(7rem, 14vw, 10rem)",
            paddingBottom: "clamp(2rem, 4vw, 3rem)",
            paddingInline: "clamp(1.5rem, 6vw, 5rem)",
            maxWidth:      "1280px",
            margin:        "0 auto",
          }}
        >
          <span aria-hidden="true" style={{ display: "block", width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "1.25rem" }} />
          <p style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem", fontWeight: 600,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color:         "var(--color-gold-muted)", marginBottom: "0.875rem",
          }}>
            {cat.shopEyebrow}
          </p>
          <h1 style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:   "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 400, color: "var(--color-espresso)",
            lineHeight: 1.06, marginBottom: "1rem",
          }}>
            <em>{cat.shopHeadline}</em>
          </h1>
          <p style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "clamp(0.875rem, 1.5vw, 1rem)",
            color:      "var(--color-espresso-muted)",
            maxWidth:   "44ch", lineHeight: 1.75,
          }}>
            {cat.shopDescription}
          </p>
        </header>

        {/* ── Cinematic category video ───────────────────────────────────── */}
        <div style={{
          maxWidth:      "1280px",
          margin:        "0 auto",
          paddingInline: "clamp(1.5rem, 6vw, 5rem)",
          paddingBottom: "clamp(2rem, 4vw, 3rem)",
        }}>
          <CategoryVideo src={cat.shopVideo} label={cat.label} />
        </div>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div aria-hidden="true" style={{
          height:       "1px",
          background:   "color-mix(in srgb, var(--color-espresso) 10%, transparent)",
          maxWidth:     "1280px",
          margin:       "0 auto",
          marginInline: "clamp(1.5rem, 6vw, 5rem)",
        }} />

        {/* ── Content: product grid OR coming-soon ──────────────────────── */}
        {hasProducts ? (
          <>
            {/* Collection toolbar */}
            <div style={{
              maxWidth: "1280px", margin: "0 auto",
              paddingInline: "clamp(1.5rem, 6vw, 5rem)",
              paddingBlock:  "1.25rem",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <p style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.75rem", fontWeight: 500,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color:         "var(--color-espresso)",
              }}>
                {cat.label}
              </p>
              <p style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem", fontWeight: 400,
                color:         "var(--color-espresso-muted)", letterSpacing: "0.06em",
              }}>
                {products.length} {products.length === 1 ? "piece" : "pieces"}
              </p>
            </div>

            <div aria-hidden="true" style={{
              height: "1px",
              background: "color-mix(in srgb, var(--color-espresso) 10%, transparent)",
              maxWidth: "1280px", margin: "0 auto",
              marginInline: "clamp(1.5rem, 6vw, 5rem)",
            }} />

            {/* Product grid */}
            <div style={{
              maxWidth:      "1280px", margin: "0 auto",
              paddingInline: "clamp(1.5rem, 6vw, 5rem)",
              paddingTop:    "clamp(2rem, 4vw, 3rem)",
              paddingBottom: "clamp(5rem, 10vw, 8rem)",
            }}>
              <div className="shop-chains-grid">
                {products.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    animationDelay={idx * 40}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          /* No published products — editorial coming-soon state */
          <ComingSoonState cat={cat} />
        )}

        {/* ── Back to homepage ──────────────────────────────────────────── */}
        <div style={{ textAlign: "center", paddingBottom: "clamp(4rem, 8vw, 6rem)" }}>
          <Link href="/" style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem", fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color:         "var(--color-espresso-muted)",
            textDecoration:"none",
            borderBottom:  "1px solid color-mix(in srgb, var(--color-espresso) 30%, transparent)",
            paddingBottom: "0.25rem",
          }}>
            ← Back to Homepage
          </Link>
        </div>
      </main>
    </>
  );
}
