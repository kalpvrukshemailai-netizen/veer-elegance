/**
 * VEER ELEGANCE — /admin/customers/[id]
 *
 * Admin customer detail page.
 * requireAdmin() guards this page server-side.
 */

import type { Metadata }     from "next";
import { notFound }          from "next/navigation";
import Link                  from "next/link";
import { requireAdmin }      from "@/lib/admin";
import { getCustomerById }   from "@/lib/customers";
import { orderDisplayRef }   from "@/lib/orders";
import { StatusBadge }       from "@/components/admin/OrderStatusComponents";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Customer Detail — Veer Elegance Admin",
};

function fmt(n: number, currency = "INR") {
  if (n === 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string | null, long = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", long
    ? { day: "numeric", month: "long", year: "numeric" }
    : { day: "numeric", month: "short", year: "numeric" },
  );
}

function initials(first: string | null, last: string | null) {
  return [(first ?? "")[0], (last ?? "")[0]].filter(Boolean).join("").toUpperCase() || "?";
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/customers");

  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Anonymous";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb">
        <ol style={{ display: "flex", alignItems: "center", gap: "0.5rem", listStyle: "none", margin: 0, padding: 0, fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
          <li><Link href="/admin/customers" style={{ color: "inherit", textDecoration: "none" }}>Customers</Link></li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" style={{ color: "var(--color-espresso)", fontWeight: 600 }}>{fullName}</li>
        </ol>
      </nav>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
        <div style={{ ...avatarLg }} aria-hidden="true">{initials(customer.first_name, customer.last_name)}</div>
        <div>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.75rem" }} aria-hidden="true" />
          <p style={eyebrow}>Customer Profile</p>
          <h2 style={pageHeading}>{fullName}</h2>
          {customer.email && (
            <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", marginTop: "0.25rem" }}>
              {customer.email}
            </p>
          )}
        </div>
      </div>

      {/* ── Metrics grid ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))", gap: "1px", background: "var(--border)", border: "1px solid var(--border)" }}>
        <MetricCard label="Orders"        value={String(customer.order_count)} />
        <MetricCard label="Total Spend"   value={fmt(customer.total_spend)} sub="Excl. cancelled" />
        <MetricCard label="Latest Order"  value={fmtDate(customer.latest_order_at)} />
        <MetricCard label="Member Since"  value={fmtDate(customer.created_at, true)} />
      </div>

      {/* ── Order history ────────────────────────────────────────────── */}
      <section aria-labelledby="orders-heading">
        <p id="orders-heading" style={sectionEyebrow}>Order History</p>
        {customer.orders.length === 0 ? (
          <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", padding: "2rem", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
              This customer has no orders yet.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
              aria-label="Customer orders">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)" }}>
                  {["Order", "Date", "Items", "Status", "Total", ""].map(h => (
                    <th key={h} scope="col" style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((o, i) => (
                  <tr key={o.id} style={{ borderBottom: i < customer.orders.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-espresso)" }}>
                        {orderDisplayRef(o.id)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>{fmtDate(o.created_at)}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>{o.item_count}</span>
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={o.status} />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      <span style={{ fontSize: "0.875rem", color: "var(--color-espresso)" }}>{fmt(o.total_amount, o.currency)}</span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <Link href={`/admin/orders/${o.id}`}
                        style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "1px" }}
                        aria-label={`View order ${orderDisplayRef(o.id)}`}>
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "var(--color-ivory)", padding: "clamp(1rem, 2vw, 1.5rem)" }}>
      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-espresso-muted)", marginBottom: "0.5rem" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(1.25rem, 3vw, 1.875rem)", fontWeight: 400, color: "var(--color-espresso)", lineHeight: 1, marginBottom: sub ? "0.375rem" : 0 }}>{value}</p>
      {sub && <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>{sub}</p>}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700,
  letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginBottom: "0.5rem",
};
const pageHeading: React.CSSProperties = {
  fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 3vw, 2rem)",
  fontWeight: 400, fontStyle: "italic", color: "var(--color-espresso)", lineHeight: 1.05, margin: 0,
};
const sectionEyebrow: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5625rem", fontWeight: 700,
  letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-espresso-muted)", marginBottom: "0.875rem",
};
const thStyle: React.CSSProperties = {
  padding: "0.625rem 1rem", textAlign: "left", fontSize: "0.5625rem", fontWeight: 700,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-espresso-muted)", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = { padding: "0.875rem 1rem", verticalAlign: "middle", fontSize: "0.8125rem", color: "var(--color-espresso)" };
const avatarLg: React.CSSProperties = {
  width: "52px", height: "52px", borderRadius: "50%", flexShrink: 0,
  background: "color-mix(in srgb, var(--color-espresso) 10%, transparent)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "1rem", fontWeight: 700,
  color: "var(--color-espresso)", letterSpacing: "0.06em",
};
