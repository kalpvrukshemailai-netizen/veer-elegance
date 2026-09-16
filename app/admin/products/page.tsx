/**
 * VEER ELEGANCE — /admin/products
 *
 * Admin product management list.
 * requireAdmin() guards this page — customers are redirected to /.
 */

import type { Metadata } from "next";
import Link              from "next/link";
import { requireAdmin }  from "@/lib/admin";
import { getAdminProducts, getProductCategoryMapForProducts, calculateDiscountPercent } from "@/lib/products-db";
import { getCategoryById }   from "@/data/categories";
import { ArchiveButton, PublishToggle } from "@/components/admin/ProductActions";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Products — Veer Elegance Admin",
};

// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatPrice(price: number | null, currency: string) {
  if (price === null) return <span style={{ color: "var(--color-espresso-muted)", fontStyle: "italic" }}>—</span>;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin("/admin/products");

  const sp      = await searchParams;
  const created = sp.created === "1";
  const updated = sp.updated === "1";

  const products = await getAdminProducts();
  const categoryMap = await getProductCategoryMapForProducts(products.map(p => p.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* ── Heading row ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
          <p style={eyebrow}>Products</p>
          <h2 style={pageHeading}>
            {products.length} product{products.length !== 1 ? "s" : ""}
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href="/admin/products/bulk"
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           "0.5rem",
              padding:       "0.625rem 1.25rem",
              background:    "var(--color-ivory)",
              border:        "1px solid var(--color-espresso)",
              color:         "var(--color-espresso)",
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.75rem",
              fontWeight:    600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textDecoration:"none",
              flexShrink:    0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="9" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="2" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="9" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            Bulk Manage Products
          </Link>

          <Link
            href="/admin/products/new"
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           "0.5rem",
              padding:       "0.625rem 1.5rem",
              background:    "var(--color-espresso)",
              color:         "var(--color-ivory)",
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.75rem",
              fontWeight:    600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textDecoration:"none",
              flexShrink:    0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add Product
          </Link>
        </div>
      </div>

      {/* ── Success toast ─────────────────────────────────────────────── */}
      {(created || updated) && (
        <div
          role="status"
          aria-live="polite"
          style={{ padding: "0.75rem 1rem", background: "color-mix(in srgb, #4a7c59 10%, transparent)", border: "1px solid #4a7c59" }}
        >
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "#3a5e44", margin: 0, fontWeight: 500 }}>
            {created ? "Product created successfully." : "Product updated successfully."}
          </p>
        </div>
      )}

      {/* ── Product table ─────────────────────────────────────────────── */}
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
        {products.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
              No products yet. Run the SQL migration to seed the chain products, or add one now.
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }} aria-label="Product list">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)" }}>
                {["Image", "Product", "Categories", "Price", "Status", "Featured", "Created", "Actions"].map(h => (
                  <th key={h} scope="col" style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product, i) => (
                <tr
                  key={product.id}
                  style={{
                    borderBottom: i < products.length - 1 ? "1px solid var(--border)" : "none",
                    opacity:      product.archived ? 0.45 : 1,
                  }}
                  className="admin-table-row"
                >
                  {/* Image */}
                  <td style={tdStyle}>
                    <div style={{ width: "44px", height: "54px", background: "var(--color-parchment-deep)", overflow: "hidden", flexShrink: 0 }}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="10" r="3" stroke="#bbb" strokeWidth="1"/></svg>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Product name */}
                  <td style={tdStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)" }}>{product.name}</span>
                      <span style={{ fontSize: "0.625rem", color: "var(--color-espresso-muted)", letterSpacing: "0.04em" }}>{product.slug}</span>
                      {product.archived && (
                        <span style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#b84c4c" }}>Archived</span>
                      )}
                    </div>
                  </td>

                  {/* Categories */}
                  <td style={tdStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      {(() => {
                        const assigned = categoryMap.get(product.id) ?? (product.category ? [product.category] : []);
                        const primary = product.category;
                        return (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", alignItems: "center" }}>
                            {assigned.map((catId) => {
                              const cat = getCategoryById(catId);
                              const isPrimary = catId === primary;
                              return (
                                <span
                                  key={catId}
                                  style={{
                                    fontSize: "0.6875rem",
                                    padding: "0.125rem 0.375rem",
                                    background: isPrimary ? "rgba(184,154,104,0.18)" : "var(--color-parchment-deep)",
                                    border: isPrimary ? "1px solid var(--color-gold-muted)" : "1px solid var(--border)",
                                    color: "var(--color-espresso)",
                                    fontWeight: isPrimary ? 600 : 400,
                                  }}
                                  title={isPrimary ? `${cat?.collectionName || catId} (Primary)` : (cat?.collectionName || catId)}
                                >
                                  {cat?.subtitle || cat?.collectionName || catId}
                                  {isPrimary && " ★"}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </td>

                  {/* Price & MRP */}
                  <td style={tdStyle}>
                    {(() => {
                      const discount = calculateDiscountPercent(product.mrp, product.price);
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                          <span style={{ fontWeight: 600, color: "var(--color-espresso)" }}>
                            {formatPrice(product.price, product.currency)}
                          </span>
                          {product.mrp !== null && product.mrp !== undefined && (
                            <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>
                              MRP: <span style={{ textDecoration: product.price && product.mrp > product.price ? "line-through" : "none" }}>{formatPrice(product.mrp, product.currency)}</span>
                              {discount !== null && (
                                <span style={{ marginLeft: "0.3rem", color: "#2e7d32", fontWeight: 700 }}>
                                  ({discount}% off)
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Published toggle */}
                  <td style={tdStyle}>
                    {!product.archived ? (
                      <PublishToggle id={product.id} published={product.published} name={product.name} />
                    ) : (
                      <span style={{ fontSize: "0.625rem", color: "#b84c4c", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Archived</span>
                    )}
                  </td>

                  {/* Featured */}
                  <td style={tdStyle}>
                    <span style={{
                      fontSize:      "0.625rem",
                      fontWeight:    700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color:         product.featured ? "var(--color-gold-muted)" : "var(--color-espresso-muted)",
                      opacity:       product.featured ? 1 : 0.4,
                    }}>
                      {product.featured ? "Featured" : "—"}
                    </span>
                  </td>

                  {/* Created */}
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>{formatDate(product.created_at)}</span>
                  </td>

                  {/* Actions */}
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      {!product.archived && (
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "1px" }}
                        >
                          Edit
                        </Link>
                      )}
                      {!product.archived && (
                        <ArchiveButton id={product.id} name={product.name} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Shared cell styles ───────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding:       "0.625rem 1rem",
  textAlign:     "left",
  fontSize:      "0.5625rem",
  fontWeight:    700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color:         "var(--color-espresso-muted)",
  whiteSpace:    "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding:       "0.875rem 1rem",
  verticalAlign: "middle",
};

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
