/**
 * VEER ELEGANCE — /admin/products/[id]/edit
 *
 * Edit an existing product.
 * requireAdmin() guards this page server-side.
 *
 * MEDIA SECTION:
 * ProductImageManager is rendered directly on this page (not inside ProductForm).
 * This avoids the "save first" message showing on the edit page — the image
 * manager has no dependency on ProductForm's action state.
 */

import type { Metadata }       from "next";
import { notFound }            from "next/navigation";
import { requireAdmin }        from "@/lib/admin";
import { getAdminProductById, getProductCategoryIds } from "@/lib/products-db";
import { getProductImages }    from "@/lib/product-images";
import ProductForm             from "@/components/admin/ProductForm";
import ProductImageManager     from "@/components/admin/ProductImageManager";
import CompleteTheLookManager from "@/components/admin/products/CompleteTheLookManager";
import { updateProductAction } from "@/app/admin/products/actions";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Edit Product — Veer Elegance Admin",
};

// ─────────────────────────────────────────────────────────────────────────────

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/products");

  const { id } = await params;

  // Fetch product + images + assigned categories in parallel
  const [product, images, assignedCategories] = await Promise.all([
    getAdminProductById(id),
    getProductImages(id),
    getProductCategoryIds(id),
  ]);

  if (!product) notFound();

  // Bind the product ID into the server action
  const boundAction = updateProductAction.bind(null, id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* ── Breadcrumb ────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb">
        <ol style={{ display: "flex", alignItems: "center", gap: "0.5rem", listStyle: "none", margin: 0, padding: 0, fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
          <li><a href="/admin/products" style={{ color: "inherit", textDecoration: "none" }}>Products</a></li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" style={{ color: "var(--color-espresso)", fontWeight: 600 }}>{product.name}</li>
        </ol>
      </nav>

      {/* ── Heading ───────────────────────────────────────────────────── */}
      <div>
        <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
        <p style={eyebrow}>Edit Product</p>
        <h2 style={pageHeading}>{product.name}</h2>
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", marginTop: "0.375rem" }}>
          Slug: <code style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{product.slug}</code>
        </p>
      </div>

      {/* ── MEDIA SECTION — always visible on edit; independent of form state ── */}
      <section aria-labelledby="media-heading">
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          <h2
            id="media-heading"
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.625rem",
              fontWeight:    700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         "var(--color-espresso)",
              margin:        0,
              paddingBottom: "0.75rem",
              borderBottom:  "1px solid var(--border)",
              marginBottom:  "1.25rem",
            }}
          >
            Media
          </h2>
          <ProductImageManager productId={id} images={images} />
        </div>
      </section>

      {/* ── Complete the Look section ──────────────────────────────────── */}
      <CompleteTheLookManager productId={id} baseProduct={product} />

      {/* ── Product form (below media) ─────────────────────────────────── */}
      <ProductForm
        action={boundAction}
        product={product}
        assignedCategories={assignedCategories}
        mode="edit"
      />
    </div>
  );
}

// ─── Shared micro-styles ──────────────────────────────────────────────────────
const eyebrow: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.625rem",
  fontWeight:    700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color:         "var(--color-gold-muted)",
  marginBottom:  "0.5rem",
};

const pageHeading: React.CSSProperties = {
  fontFamily:    "var(--font-display), 'Cormorant Garamond', serif",
  fontSize:      "clamp(1.5rem, 3vw, 2rem)",
  fontWeight:    400,
  fontStyle:     "italic",
  color:         "var(--color-espresso)",
  lineHeight:    1.05,
  margin:        0,
};
