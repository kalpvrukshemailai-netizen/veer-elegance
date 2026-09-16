/**
 * VEER ELEGANCE — RecentOrdersTable
 *
 * Server-rendered table of recent orders for the admin dashboard.
 * Receives pre-fetched data — does not query Supabase itself.
 */

import Link                         from "next/link";
import type { RecentOrderRow }       from "@/lib/admin";
import { orderDisplayRef }           from "@/lib/orders";

// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatAmount(amount: number, currency = "INR") {
  if (amount === 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "color-mix(in srgb, #B89A68 12%, transparent)", color: "#7a6040" },
  confirmed:  { bg: "color-mix(in srgb, #4a7c59 12%, transparent)", color: "#3a5e44" },
  processing: { bg: "color-mix(in srgb, #5a7ab8 12%, transparent)", color: "#3a5888" },
  shipped:    { bg: "color-mix(in srgb, #5a7ab8 12%, transparent)", color: "#3a5888" },
  delivered:  { bg: "color-mix(in srgb, #4a7c59 20%, transparent)", color: "#2e4d37" },
  cancelled:  { bg: "color-mix(in srgb, #b84c4c 10%, transparent)", color: "#8b3a3a" },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: "var(--border)", color: "var(--color-espresso-muted)" };
  return (
    <span
      style={{
        fontFamily:    "var(--font-body), Manrope, sans-serif",
        fontSize:      "0.625rem",
        fontWeight:    700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding:       "0.25rem 0.5rem",
        background:    colors.bg,
        color:         colors.color,
        whiteSpace:    "nowrap",
      }}
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RecentOrdersTable({ orders }: { orders: RecentOrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div style={{ padding: "2.5rem", textAlign: "center", border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
          No orders yet. When customers place orders, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
        aria-label="Recent orders"
      >
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Order", "Customer", "Date", "Items", "Status", "Total", ""].map(h => (
              <th
                key={h}
                scope="col"
                style={{
                  padding:       "0.75rem 1rem",
                  textAlign:     "left",
                  fontSize:      "0.5625rem",
                  fontWeight:    700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color:         "var(--color-espresso-muted)",
                  whiteSpace:    "nowrap",
                  background:    "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order, i) => (
            <tr
              key={order.id}
              style={{
                borderBottom:    i < orders.length - 1 ? "1px solid var(--border)" : "none",
                transition:      "background 150ms ease",
              }}
              className="admin-table-row"
            >
              {/* Order ref */}
              <td style={cellStyle}>
                <span style={{ fontWeight: 600, color: "var(--color-espresso)", fontSize: "0.8125rem" }}>
                  {orderDisplayRef(order.id)}
                </span>
              </td>

              {/* Customer */}
              <td style={cellStyle}>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>
                  {order.customer_email ?? "—"}
                </span>
              </td>

              {/* Date */}
              <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>
                  {formatDate(order.created_at)}
                </span>
              </td>

              {/* Items */}
              <td style={cellStyle}>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>
                  {order.item_count}
                </span>
              </td>

              {/* Status */}
              <td style={cellStyle}>
                <StatusBadge status={order.status} />
              </td>

              {/* Total */}
              <td style={{ ...cellStyle, fontWeight: 600, color: "var(--color-espresso)" }}>
                {formatAmount(order.total_amount, order.currency)}
              </td>

              {/* View link */}
              <td style={{ ...cellStyle, textAlign: "right" }}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  style={{
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    fontWeight:    600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color:         "var(--color-espresso)",
                    textDecoration:"none",
                    borderBottom:  "1px solid currentColor",
                    paddingBottom: "1px",
                    whiteSpace:    "nowrap",
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
  );
}

// ─── Shared cell style ────────────────────────────────────────────────────────
const cellStyle: React.CSSProperties = {
  padding:   "0.875rem 1rem",
  fontSize:  "0.8125rem",
  color:     "var(--color-espresso)",
  verticalAlign: "middle",
};
