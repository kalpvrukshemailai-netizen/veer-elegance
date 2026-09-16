/**
 * VEER ELEGANCE — /admin/products/new
 *
 * Create a new product.
 * requireAdmin() guards this page server-side.
 *
 * Media section on this page shows an informational message only.
 * After successful creation, ProductForm's useEffect navigates to
 * /admin/products/[id]/edit where the real ProductImageManager renders.
 */

import type { Metadata }      from "next";
import { requireAdmin }       from "@/lib/admin";
import ProductForm            from "@/components/admin/ProductForm";
import { createProductAction } from "@/app/admin/products/actions";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Add Product — Veer Elegance Admin",
};

// ─────────────────────────────────────────────────────────────────────────────

export default async function NewProductPage() {
  await requireAdmin("/admin/products/new");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* ── Breadcrumb ────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb">
        <ol style={{ display: "flex", alignItems: "center", gap: "0.5rem", listStyle: "none", margin: 0, padding: 0, fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
          <li><a href="/admin/products" style={{ color: "inherit", textDecoration: "none" }}>Products</a></li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" style={{ color: "var(--color-espresso)", fontWeight: 600 }}>Add Product</li>
        </ol>
      </nav>

      {/* ── Heading ───────────────────────────────────────────────────── */}
      <div>
        <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
        <p style={eyebrow}>New Product</p>
        <h2 style={pageHeading}>Add a product.</h2>
      </div>

      {/* ── Media — informational only in create mode ─────────────────── */}
      <section aria-label="Media (unavailable until product is saved)">
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <h2
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
          <div
            style={{
              border:     "1px dashed var(--border)",
              padding:    "1.25rem 1.5rem",
              background: "var(--color-parchment)",
              maxWidth:   "720px",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "0.8125rem",
                color:      "var(--color-espresso-muted)",
                margin:     0,
                lineHeight: 1.6,
              }}
            >
              Save the product first — you will be taken directly to the edit page to upload images.
            </p>
          </div>
        </div>
      </section>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <ProductForm action={createProductAction} mode="create" />
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
