/**
 * VEER ELEGANCE — /admin/orders
 *
 * Admin order management list.
 * requireAdmin() guards this page server-side.
 * Status filter via ?status= query param.
 */

import type { Metadata } from "next";
import Link              from "next/link";
import { requireAdmin }  from "@/lib/admin";
import { getAllOrders, orderDisplayRef, type OrderStatus } from "@/lib/orders";
import { StatusBadge }   from "@/components/admin/OrderStatusComponents";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Orders — Veer Elegance Admin",
};

// ─────────────────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All",        value: "" },
  { label: "Pending",    value: "pending" },
  { label: "Confirmed",  value: "confirmed" },
  { label: "Processing", value: "processing" },
  { label: "Shipped",    value: "shipped" },
  { label: "Delivered",  value: "delivered" },
  { label: "Cancelled",  value: "cancelled" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatAmount(n: number, currency = "INR") {
  if (!n) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(n);
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin("/admin/orders");

  const sp     = await searchParams;
  const filter = (sp.status ?? "") as OrderStatus | "";

  const orders = await getAllOrders(filter || undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* ── Heading ───────────────────────────────────────────────────── */}
      <div>
        <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
        <p style={eyebrow}>Orders</p>
        <h2 style={pageHeading}>
          {orders.length} order{orders.length !== 1 ? "s" : ""}
          {filter ? ` — ${filter}` : ""}
        </h2>
      </div>

      {/* ── Status filter tabs ────────────────────────────────────────── */}
      <nav aria-label="Filter orders by status">
        <div
          style={{ display: "flex", gap: "0", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}
          role="tablist"
        >
          {STATUS_FILTERS.map(f => {
            const isActive = f.value === filter;
            return (
              <Link
                key={f.value}
                href={f.value ? `/admin/orders?status=${f.value}` : "/admin/orders"}
                role="tab"
                aria-selected={isActive}
                style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem",
                  fontWeight:    isActive ? 700 : 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding:       "0.625rem 1rem",
                  textDecoration:"none",
                  color:         isActive ? "var(--color-espresso)" : "var(--color-espresso-muted)",
                  borderBottom:  isActive ? "2px solid var(--color-espresso)" : "2px solid transparent",
                  marginBottom:  "-1px",
                  whiteSpace:    "nowrap",
                  transition:    "color 150ms ease",
                }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Orders table ─────────────────────────────────────────────── */}
      {orders.length === 0 ? (
        <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", padding: "3rem", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
            No {filter || ""} orders found.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
            aria-label="Orders list"
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)" }}>
                {["Order", "Customer", "Date", "Items", "Status", "Total", ""].map(h => (
                  <th key={h} scope="col" style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <tr
                  key={order.id}
                  style={{ borderBottom: i < orders.length - 1 ? "1px solid var(--border)" : "none" }}
                  className="admin-table-row"
                >
                  {/* Reference */}
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-espresso)", letterSpacing: "0.06em" }}>
                      {orderDisplayRef(order.id)}
                    </span>
                  </td>

                  {/* Customer */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso)" }}>
                      {order.customer_email ?? <span style={{ fontStyle: "italic", color: "var(--color-espresso-muted)" }}>Guest</span>}
                    </span>
                  </td>

                  {/* Date */}
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>{formatDate(order.created_at)}</span>
                  </td>

                  {/* Items */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>
                      {order.item_count} item{order.item_count !== 1 ? "s" : ""}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={tdStyle}>
                    <StatusBadge status={order.status} />
                  </td>

                  {/* Total */}
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--color-espresso)" }}>
                      {formatAmount(order.total_amount, order.currency)}
                    </span>
                  </td>

                  {/* Action */}
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      style={{
                        fontFamily:    "var(--font-body), Manrope, sans-serif",
                        fontSize:      "0.625rem",
                        fontWeight:    700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color:         "var(--color-espresso)",
                        textDecoration:"none",
                        borderBottom:  "1px solid currentColor",
                        paddingBottom: "1px",
                      }}
                      aria-label={`View order ${orderDisplayRef(order.id)}`}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Cell styles ─────────────────────────────────────────────────────────────
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
