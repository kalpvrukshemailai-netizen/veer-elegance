/**
 * VEER ELEGANCE — /admin
 *
 * Admin dashboard overview page.
 *
 * Security:
 *   requireAdmin() is called at the top of this Server Component.
 *   - Unauthenticated  → /login?next=/admin
 *   - Authenticated customer → / (silent)
 *   - Admin → renders dashboard
 *
 * Data is fetched server-side — never exposed through client props.
 */

import type { Metadata }         from "next";
import { requireAdmin,
         getAdminOverview,
         getRecentOrders }       from "@/lib/admin";
import { getStockSummary }       from "@/lib/inventory";
import StatCard                  from "@/components/admin/StatCard";
import RecentOrdersTable         from "@/components/admin/RecentOrdersTable";
import Link                      from "next/link";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Dashboard — Veer Elegance Admin",
};

// ─────────────────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency = "INR") {
  if (amount === 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(amount);
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  // ── Auth + role guard ─────────────────────────────────────────────────
  await requireAdmin("/admin");

  // ── Fetch real data ───────────────────────────────────────────────────
  const [overview, recentOrders, stockSummary] = await Promise.all([
    getAdminOverview(),
    getRecentOrders(10),
    getStockSummary(),
  ]);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 4vw, 3rem)" }}>

      {/* ── Page heading ──────────────────────────────────────────────── */}
      <div>
        <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "1rem" }} aria-hidden="true" />
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginBottom: "0.5rem" }}>
          Overview
        </p>
        <h2 style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 400, fontStyle: "italic", color: "var(--color-espresso)", lineHeight: 1.05, margin: 0 }}>
          Welcome to your dashboard.
        </h2>
      </div>

      {/* ── Metrics grid ──────────────────────────────────────────────── */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">Key metrics</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))", gap: "1px", background: "var(--border)", border: "1px solid var(--border)" }}>
          <StatCard
            label="Total Orders"
            value={String(overview.totalOrders)}
            sub={overview.totalOrders === 1 ? "1 order placed" : `${overview.totalOrders} orders placed`}
            href="/admin/orders"
          />
          <StatCard
            label="Pending Orders"
            value={String(overview.pendingOrders)}
            sub={overview.pendingOrders > 0 ? "Awaiting processing" : "All clear"}
            accent={overview.pendingOrders > 0}
            href="/admin/orders?status=pending"
          />
          <StatCard
            label="Revenue"
            value={formatAmount(overview.totalRevenue, overview.currency)}
            sub="Excluding cancelled orders"
            accent={overview.totalRevenue > 0}
          />
          <StatCard
            label="Customers"
            value={String(overview.totalCustomers)}
            sub="Registered accounts"
          />
        </div>
      </section>

      {/* ── Recent orders ─────────────────────────────────────────────── */}
      <section aria-labelledby="orders-heading">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1rem", gap: "1rem" }}>
          <h2
            id="orders-heading"
            style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-espresso)", margin: 0 }}
          >
            Recent Orders
          </h2>
          <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
            Last {Math.min(recentOrders.length, 10)} orders
          </span>
        </div>
        <RecentOrdersTable orders={recentOrders} />
      </section>

      {/* ── Inventory summary ──────────────────────────────────────────── */}
      <section aria-labelledby="inventory-heading">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1rem", gap: "1rem" }}>
          <h2
            id="inventory-heading"
            style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-espresso)", margin: 0 }}
          >
            Inventory
          </h2>
          <Link
            href="/admin/inventory"
            style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "1px" }}
          >
            Manage →
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: "1px", background: "var(--border)", border: "1px solid var(--border)" }}>
          <StatCard
            label="Low Stock"
            value={String(stockSummary.lowStock)}
            sub={stockSummary.lowStock === 0 ? "No low-stock products" : `${stockSummary.lowStock} product${stockSummary.lowStock !== 1 ? "s" : ""} running low`}
            accent={stockSummary.lowStock > 0}
          />
          <StatCard
            label="Out of Stock"
            value={String(stockSummary.outOfStock)}
            sub={stockSummary.outOfStock === 0 ? "All products stocked" : `${stockSummary.outOfStock} product${stockSummary.outOfStock !== 1 ? "s" : ""} need restocking`}
            accent={stockSummary.outOfStock > 0}
          />
        </div>
      </section>

    </div>
  );
}
