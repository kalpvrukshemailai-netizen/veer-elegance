/**
 * VEER ELEGANCE — /admin/reports
 *
 * Owner analytics dashboard.
 * requireAdmin() guards this page server-side.
 * Period controlled via ?period= search param.
 *
 * Revenue rule: excludes 'cancelled' orders throughout.
 */

import type { Metadata }    from "next";
import { Suspense }         from "react";
import Link                 from "next/link";
import { requireAdmin }     from "@/lib/admin";
import {
  getPeriodRange,
  getGroupingForPeriod,
  getReportSummary,
  getSalesOverTime,
  getOrderStatusBreakdown,
  getTopProducts,
  getCategoryPerformance,
  getRecentSales,
  type ReportPeriod,
} from "@/lib/reports";
import { orderDisplayRef }  from "@/lib/orders";
import { StatusBadge }      from "@/components/admin/OrderStatusComponents";
import PeriodSelector       from "@/components/admin/PeriodSelector";
import SalesChart           from "@/components/admin/SalesChart";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Reports — Veer Elegance Admin",
};

const VALID_PERIODS: ReportPeriod[] = [
  "today", "7days", "30days", "this_month", "this_year", "all_time", "custom",
];

function fmt(n: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin("/admin/reports");

  const sp     = await searchParams;
  const period = (VALID_PERIODS.includes(sp.period as ReportPeriod)
    ? sp.period
    : "30days") as ReportPeriod;

  const customRange = period === "custom" && sp.from && sp.to
    ? { from: `${sp.from}T00:00:00.000Z`, to: `${sp.to}T23:59:59.999Z` }
    : undefined;

  const range    = getPeriodRange(period, customRange);
  const grouping = getGroupingForPeriod(period);

  // ── Fetch all report data in parallel ──────────────────────────────────────
  const [summary, salesData, statusBreakdown, topProducts, categories, recentSales] =
    await Promise.all([
      getReportSummary(range),
      getSalesOverTime(range, grouping),
      getOrderStatusBreakdown(range),
      getTopProducts(range, 5),
      getCategoryPerformance(range),
      getRecentSales(8),
    ]);

  const hasSales = topProducts.length > 0 || summary.totalOrders > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

      {/* ── Page heading ──────────────────────────────────────────────── */}
      <div>
        <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
        <p style={eyebrow}>Analytics</p>
        <h2 style={pageHeading}>Reports</h2>
      </div>

      {/* ── Period selector (client component) ───────────────────────── */}
      <Suspense fallback={null}>
        <PeriodSelector current={period} />
      </Suspense>

      {/* ── Summary metrics ───────────────────────────────────────────── */}
      <section aria-labelledby="summary-heading">
        <p id="summary-heading" style={sectionEyebrow}>Summary</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))", gap: "1px", background: "var(--border)", border: "1px solid var(--border)" }}>
          <MetricCard
            label="Total Revenue"
            value={fmt(summary.totalRevenue)}
            sub="Excl. cancelled"
          />
          <MetricCard
            label="Total Orders"
            value={String(summary.totalOrders)}
          />
          <MetricCard
            label="Avg. Order Value"
            value={summary.avgOrderValue > 0 ? fmt(summary.avgOrderValue) : "—"}
            sub="Non-cancelled orders"
          />
          <MetricCard
            label="Pending"
            value={String(summary.pendingOrders)}
            accent={summary.pendingOrders > 0}
          />
          <MetricCard
            label="Delivered"
            value={String(summary.deliveredOrders)}
          />
        </div>
      </section>

      {/* ── Sales over time ───────────────────────────────────────────── */}
      <Suspense fallback={<ChartPlaceholder label="Sales Over Time" />}>
        <SalesChart data={salesData} period={period} currency="INR" />
      </Suspense>

      {/* ── Status breakdown ──────────────────────────────────────────── */}
      <section aria-labelledby="status-heading">
        <p id="status-heading" style={sectionEyebrow}>Order Status Breakdown</p>
        <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
            aria-label="Order status breakdown">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)" }}>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Orders</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                <th style={thStyle}>Bar</th>
              </tr>
            </thead>
            <tbody>
              {statusBreakdown.map((row, i) => {
                const maxCount = Math.max(...statusBreakdown.map(r => r.count), 1);
                const pct = (row.count / maxCount) * 100;
                return (
                  <tr key={row.status} style={{ borderBottom: i < statusBreakdown.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={tdStyle}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
                      {row.count}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {row.status === "cancelled" ? "—" : (row.revenue > 0 ? fmt(row.revenue) : "—")}
                    </td>
                    <td style={{ ...tdStyle, minWidth: "120px" }}>
                      {row.count > 0 && (
                        <div style={{ width: "100%", height: "6px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-espresso)", borderRadius: "2px", opacity: 0.6 }} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Two-column: Products + Categories ────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: "2rem" }}>

        {/* ── Top Products ──────────────────────────────────────────── */}
        <section aria-labelledby="products-heading">
          <p id="products-heading" style={sectionEyebrow}>Best-Selling Products</p>
          {topProducts.length === 0 ? (
            <EmptyState>No product sales data yet for this period.</EmptyState>
          ) : (
            <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
                aria-label="Best-selling products">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)" }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Product</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Units</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.product_slug ?? p.product_name} style={{ borderBottom: i < topProducts.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ ...tdStyle, color: "var(--color-espresso-muted)", fontWeight: 600, width: "2rem" }}>{i + 1}</td>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-espresso)" }}>
                          {p.product_name}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{p.units_sold}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{p.revenue > 0 ? fmt(p.revenue) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Category Performance ──────────────────────────────────── */}
        <section aria-labelledby="category-heading">
          <p id="category-heading" style={sectionEyebrow}>Category Performance</p>
          {categories.every(c => c.units_sold === 0) ? (
            <EmptyState>No category data yet for this period.</EmptyState>
          ) : (
            <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
                aria-label="Category performance">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)" }}>
                    <th style={thStyle}>Category</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Units</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c, i) => (
                    <tr key={c.category} style={{ borderBottom: i < categories.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-espresso)", textTransform: "capitalize" }}>
                          {c.category}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{c.units_sold}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{c.revenue > 0 ? fmt(c.revenue) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── Recent Sales ──────────────────────────────────────────────── */}
      <section aria-labelledby="recent-heading">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.875rem", gap: "1rem" }}>
          <p id="recent-heading" style={{ ...sectionEyebrow, marginBottom: 0 }}>Recent Sales</p>
          <Link href="/admin/orders" style={viewAllLink}>All Orders →</Link>
        </div>
        {recentSales.length === 0 ? (
          <EmptyState>No orders yet.</EmptyState>
        ) : (
          <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
              aria-label="Recent sales">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)" }}>
                  {["Order", "Customer", "Date", "Status", "Total", ""].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentSales.map((order, i) => (
                  <tr key={order.id} style={{ borderBottom: i < recentSales.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-espresso)" }}>
                        {orderDisplayRef(order.id)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso)" }}>
                        {order.customer_email ?? <em style={{ color: "var(--color-espresso-muted)" }}>Guest</em>}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>{fmtDate(order.created_at)}</span>
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      <span style={{ fontSize: "0.875rem", color: "var(--color-espresso)" }}>
                        {fmt(order.total_amount, order.currency)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "1px" }}
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
      </section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div style={{ background: "var(--color-ivory)", padding: "clamp(1rem, 2vw, 1.5rem)" }}>
      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-espresso-muted)", marginBottom: "0.5rem" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", fontWeight: 400, color: accent ? "var(--color-gold-muted)" : "var(--color-espresso)", lineHeight: 1, marginBottom: sub ? "0.375rem" : 0 }}>
        {value}
      </p>
      {sub && <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>{sub}</p>}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", padding: "2rem", textAlign: "center" }}>
      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
        {children}
      </p>
    </div>
  );
}

function ChartPlaceholder({ label }: { label: string }) {
  return (
    <div>
      <p style={sectionEyebrow}>{label}</p>
      <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", height: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>Loading…</p>
      </div>
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

const sectionEyebrow: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.5625rem",
  fontWeight:    700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color:         "var(--color-espresso-muted)",
  marginBottom:  "0.875rem",
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

const viewAllLink: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.6875rem",
  fontWeight:    600,
  letterSpacing: "0.08em",
  color:         "var(--color-espresso)",
  textDecoration:"none",
  borderBottom:  "1px solid currentColor",
  paddingBottom: "1px",
};
