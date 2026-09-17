/**
 * VEER ELEGANCE — /product/[slug]
 *
 * Dynamic product detail page.
 *
 * DATA SOURCE: Supabase public.products (published + non-archived only).
 * Products are managed in Admin → Products. The slug is the canonical
 * public identifier. Unpublished or archived products render not-found.
 *
 * Structure:
 *   SiteNavbar → ProductDetail (gallery + info + related)
 */

import { notFound }  from "next/navigation";
import type { Metadata } from "next";
import SiteNavbar    from "@/components/layout/SiteNavbar";
import ProductDetail from "@/components/products/ProductDetail";
import {
  getStorefrontProductBySlug,
  getRelatedStorefrontProducts,
} from "@/lib/storefront";
import { getCompleteTheLookForProduct } from "@/lib/complete-the-look-server";
import type { ProductCategory } from "@/lib/products-db";

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE CONFIG — dynamic; unpublished products must disappear immediately
// ─────────────────────────────────────────────────────────────────────────────

// Cache for 60 seconds — admin product edits call revalidatePath("/product/[slug]")
export const revalidate = 60;

// ─────────────────────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug }  = await params;
  const product   = await getStorefrontProductBySlug(slug);

  if (!product) {
    return {
      title:       "Product Not Found — Veer Elegance",
      description: "The requested product could not be found.",
    };
  }

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://veer-elegance.vercel.app";
  const priceStr = product.price ? `\u20b9${product.price}` : null;
  const desc = [
    product.shortDescription ?? product.description ?? "Premium jewellery by Veer Elegance.",
    priceStr ? `Price: ${priceStr}.` : null,
    product.material ? `Material: ${product.material}.` : null,
    product.antiTarnish ? "100% anti-tarnish." : null,
  ].filter(Boolean).join(" ");

  return {
    title:       product.name ?? "Jewellery",
    description: desc,
    alternates:  { canonical: `${BASE_URL}/product/${slug}` },
    openGraph: {
      type:        "website",
      url:         `${BASE_URL}/product/${slug}`,
      title:       `${product.name ?? "Jewellery"} — Veer Elegance`,
      description: desc,
      images: product.image
        ? [{ url: product.image, width: 800, height: 1000, alt: product.alt }]
        : [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: "Veer Elegance" }],
    },
    twitter: {
      card:   "summary_large_image",
      title:  `${product.name ?? "Jewellery"} — Veer Elegance`,
      images: product.image ? [product.image] : ["/images/og-default.jpg"],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await getStorefrontProductBySlug(slug);

  // ── Not published / not found → not-found state ────────────────────────────
  if (!product) {
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
          <span
            aria-hidden="true"
            style={{ display: "block", width: "2rem", height: "1px", background: "var(--color-gold-muted)", margin: "0 auto" }}
          />

          <p style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color:         "var(--color-gold-muted)",
          }}>
            Product Not Found
          </p>

          <h1 style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:   "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 400,
            color:      "var(--color-espresso)",
            lineHeight: 1.1,
            fontStyle:  "italic",
          }}>
            We couldn&apos;t find this piece.
          </h1>

          <p style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.9375rem",
            color:      "var(--color-espresso-muted)",
            maxWidth:   "36ch",
            lineHeight: 1.7,
          }}>
            The product you&apos;re looking for may have moved or is no longer available.
          </p>

          <a
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
            Back to Chains
          </a>
        </main>
      </>
    );
  }

  // ── Real published product: fetch related & complete-the-look in parallel ──
  const [related, completeTheLook] = await Promise.all([
    getRelatedStorefrontProducts(slug, product.category as ProductCategory),
    getCompleteTheLookForProduct(product.id),
  ]);

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://veer-elegance.vercel.app";

  // ── JSON-LD Product Schema for Google Rich Results ────────────────────────
  const jsonLd = {
    "@context": "https://schema.org",
    "@type":    "Product",
    name:        product.name ?? "Jewellery",
    description: product.shortDescription ?? product.description ?? "Premium jewellery by Veer Elegance.",
    image:       product.images ?? (product.image ? [product.image] : []),
    sku:         product.slug,
    brand: {
      "@type": "Brand",
      name:    "Veer Elegance",
    },
    offers: {
      "@type":           "Offer",
      url:               `${BASE_URL}/product/${slug}`,
      priceCurrency:     "INR",
      price:             product.price ?? 0,
      priceValidUntil:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      availability:      product.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition:     "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name:    "Veer Elegance",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNavbar theme="light" />
      <main id="main-content" role="main">
        <ProductDetail
          product={product}
          related={related}
          completeTheLook={completeTheLook}
        />
      </main>
    </>
  );
}
