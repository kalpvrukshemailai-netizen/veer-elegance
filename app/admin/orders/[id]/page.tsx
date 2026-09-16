/**
 * VEER ELEGANCE — /admin/orders/[id]
 *
 * Admin order detail page with full customer info and status controls.
 * requireAdmin() guards this page server-side.
 */

import type { Metadata }       from "next";
import { notFound }            from "next/navigation";
import Link                    from "next/link";
import { requireAdmin }        from "@/lib/admin";
import { getAdminOrderById, orderDisplayRef, resolveOrderItemImage } from "@/lib/orders";
import type { OrderStatus }    from "@/lib/order-utils";
import { StatusBadge, StatusControl } from "@/components/admin/OrderStatusComponents";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Order Detail — Veer Elegance Admin",
};

// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmt(n: number | null, currency = "INR") {
  if (n === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(n);
}

function paymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending:    "Pending",
    authorized: "Authorized",
    captured:   "Captured",
    failed:     "Failed",
    refunded:   "Refunded",
  };
  return map[status] ?? status;
}

function paymentStatusColor(status: string): string {
  switch (status) {
    case "captured":   return "#2d7a3f";
    case "failed":     return "#b84c4c";
    case "authorized": return "#7a6b2d";
    case "refunded":   return "#5a5a8a";
    default:           return "var(--color-espresso-muted)";
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/orders");

  const { id } = await params;
  const order  = await getAdminOrderById(id);

  if (!order) notFound();

  const ref   = orderDisplayRef(order.id);
  const items = order.order_items ?? [];

  // Resolve images for all items in parallel (Server Component — safe to await)
  const imageUrls = await Promise.all(
    items.map(item => resolveOrderItemImage(item))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ── Breadcrumb ────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb">
        <ol style={{ display: "flex", alignItems: "center", gap: "0.5rem", listStyle: "none", margin: 0, padding: 0, fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
          <li><Link href="/admin/orders" style={{ color: "inherit", textDecoration: "none" }}>Orders</Link></li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" style={{ color: "var(--color-espresso)", fontWeight: 600 }}>{ref}</li>
        </ol>
      </nav>

      {/* ── Order header ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
          <p style={eyebrow}>Order Reference</p>
          <h2 style={pageHeading}>{ref}</h2>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", marginTop: "0.375rem" }}>
            {formatDate(order.created_at)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* ── Three-column grid on desktop ─────────────────────────────── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "1.5rem" }}
      >

        {/* ── Status control ────────────────────────────────────────── */}
        <section aria-labelledby="status-heading" style={sectionCard}>
          <SectionLabel id="status-heading">Update Status</SectionLabel>
          <StatusControl orderId={order.id} currentStatus={order.status as OrderStatus} />
        </section>

        {/* ── Payment + Inventory ────────────────────────────────────── */}
        <section aria-labelledby="payment-heading" style={sectionCard}>
          <SectionLabel id="payment-heading">Payment &amp; Inventory</SectionLabel>
          <dl style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Payment status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <dt style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>Payment</dt>
              <dd style={{ margin: 0 }}>
                <span style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.8125rem",
                  fontWeight:    600,
                  color:         paymentStatusColor((order as unknown as { payment_status?: string }).payment_status ?? "pending"),
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  {paymentStatusLabel((order as unknown as { payment_status?: string }).payment_status ?? "pending")}
                </span>
              </dd>
            </div>

            {/* Inventory status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <dt style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>Inventory</dt>
              <dd style={{ margin: 0 }}>
                {(() => {
                  const finalized = (order as unknown as { inventory_finalized?: boolean }).inventory_finalized;
                  return (
                    <span style={{
                      fontFamily:    "var(--font-body), Manrope, sans-serif",
                      fontSize:      "0.8125rem",
                      fontWeight:    600,
                      color:         finalized ? "#2d7a3f" : "#8a4f10",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}>
                      {finalized ? "Finalized" : "Pending"}
                    </span>
                  );
                })()}
              </dd>
            </div>

            {/* Razorpay IDs */}
            {(order as unknown as { razorpay_order_id?: string }).razorpay_order_id && (
              <DataRow
                label="Razorpay Order ID"
                value={(order as unknown as { razorpay_order_id: string }).razorpay_order_id}
              />
            )}
            {(order as unknown as { razorpay_payment_id?: string }).razorpay_payment_id && (
              <DataRow
                label="Razorpay Payment ID"
                value={(order as unknown as { razorpay_payment_id: string }).razorpay_payment_id}
              />
            )}
            {!(order as unknown as { razorpay_order_id?: string }).razorpay_order_id && (
              <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>No payment processed yet.</p>
            )}
          </dl>

          {/* Stock issue alert */}
          {order.status === "payment_captured_stock_issue" && (
            <div style={{
              marginTop:  "1rem",
              padding:    "0.75rem 1rem",
              background: "color-mix(in srgb, #c47a2a 8%, transparent)",
              border:     "1px solid color-mix(in srgb, #c47a2a 30%, transparent)",
            }}>
              <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "#8a4f10", lineHeight: 1.5, margin: 0 }}>
                <strong>Stock Issue:</strong> Payment was captured but stock was insufficient at finalization time. Manual admin reconciliation required.
              </p>
            </div>
          )}
        </section>

        {/* ── Customer ──────────────────────────────────────────────── */}
        <section aria-labelledby="customer-heading" style={sectionCard}>
          <SectionLabel id="customer-heading">Customer</SectionLabel>
          <dl style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {order.shipping_first_name && (
              <DataRow label="Name" value={[order.shipping_first_name, order.shipping_last_name].filter(Boolean).join(" ")} />
            )}
            {order.customer_email && (
              <DataRow label="Email" value={order.customer_email} />
            )}
            {order.customer_phone && (
              <DataRow label="Phone" value={order.customer_phone} />
            )}
          </dl>
        </section>

        {/* ── Shipping ─────────────────────────────────────────────── */}
        <section aria-labelledby="shipping-heading" style={sectionCard}>
          <SectionLabel id="shipping-heading">Shipping Address</SectionLabel>
          <address style={{ fontStyle: "normal", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {[
              [order.shipping_first_name, order.shipping_last_name].filter(Boolean).join(" "),
              order.shipping_address,
              order.shipping_apartment,
              [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", "),
              order.shipping_country,
            ].filter(Boolean).map((line, i) => (
              <span key={i} style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)", lineHeight: 1.6 }}>
                {line}
              </span>
            ))}
          </address>
        </section>
      </div>

      {/* ── Order items ───────────────────────────────────────────────── */}
      <section aria-labelledby="items-heading">
        <SectionLabel id="items-heading">Order Items</SectionLabel>
        <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
          {items.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", padding: "1.5rem", fontStyle: "italic" }}>
              No items found.
            </p>
          ) : (
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
              aria-label="Order items"
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)" }}>
                  {["", "Product", "Qty", "Unit Price", "Total"].map(h => (
                    <th key={h} scope="col" style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const imageSrc    = imageUrls[i];
                  const displayName = item.product_name ?? item.product_id;

                  return (
                    <tr key={item.id} style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "0.75rem 1rem", width: "52px" }}>
                        <div style={{ width: "44px", height: "54px", background: "var(--color-parchment-deep)", overflow: "hidden" }}>
                          {imageSrc ? (
                            <img src={imageSrc} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="10" r="3" stroke="#bbb" strokeWidth="1"/></svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-espresso)", margin: 0 }}>{displayName}</p>
                        {item.product_slug && <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", color: "var(--color-espresso-muted)", margin: "0.1rem 0 0" }}>{item.product_slug}</p>}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{item.quantity}</td>
                      <td style={tdStyle}>{fmt(item.unit_price)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(item.line_total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Totals ────────────────────────────────────────────────────── */}
      <section aria-labelledby="totals-heading" style={{ maxWidth: "360px", marginLeft: "auto", width: "100%" }}>
        <SectionLabel id="totals-heading">Order Totals</SectionLabel>
        <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", padding: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <TotalRow label="Subtotal" value={fmt(order.subtotal, order.currency)} />
            {order.coupon_code && (
              <TotalRow
                label={`Coupon (${order.coupon_code})`}
                value={`-${fmt(order.discount_amount, order.currency)}`}
              />
            )}
            <TotalRow label="Shipping" value={order.shipping_amount > 0 ? fmt(order.shipping_amount, order.currency) : "Free"} />
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.625rem", marginTop: "0.25rem" }}>
              <TotalRow label="Total" value={fmt(order.total_amount, order.currency)} bold />
            </div>
          </div>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", color: "var(--color-espresso-muted)", marginTop: "0.75rem", letterSpacing: "0.06em" }}>
            Currency: {order.currency}
          </p>
        </div>
      </section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-espresso-muted)", marginBottom: "1rem" }}
    >
      {children}
    </p>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
      <dt style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>{label}</dt>
      <dd style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)", margin: 0 }}>{value}</dd>
    </div>
  );
}

function TotalRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: bold ? "var(--color-espresso)" : "var(--color-espresso-muted)", fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: bold ? "1rem" : "0.875rem", color: "var(--color-espresso)", fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
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

const sectionCard: React.CSSProperties = {
  border:     "1px solid var(--border)",
  background: "var(--color-ivory)",
  padding:    "1.25rem",
};

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
  fontSize:      "0.8125rem",
  color:         "var(--color-espresso)",
};
