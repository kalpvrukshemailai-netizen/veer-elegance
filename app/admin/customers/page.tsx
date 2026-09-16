/**
 * VEER ELEGANCE — /admin/customers
 *
 * Admin customer management list.
 * requireAdmin() guards this page server-side.
 * Filter + search via URL query params.
 */

import type { Metadata }          from "next";
import Link                       from "next/link";
import { requireAdmin }           from "@/lib/admin";
import { getCustomers, type CustomerFilter } from "@/lib/customers";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Customers — Veer Elegance Admin",
};

const FILTERS: { label: string; value: CustomerFilter }[] = [
  { label: "All",           value: "all" },
  { label: "With Orders",   value: "with_orders" },
  { label: "Without Orders",value: "without_orders" },
];

function fmt(n: number, currency = "INR") {
  if (n === 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function initials(first: string | null, last: string | null) {
  return [(first ?? "")[0], (last ?? "")[0]].filter(Boolean).join("").toUpperCase() || "?";
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin("/admin/customers");

  const sp     = await searchParams;
  const filter = (["all", "with_orders", "without_orders"].includes(sp.filter ?? "")
    ? sp.filter
    : "all") as CustomerFilter;
  const search = sp.search ?? "";

  const customers = await getCustomers(filter, search);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* ── Heading ───────────────────────────────────────────────────── */}
      <div>
        <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
        <p style={eyebrow}>Customers</p>
        <h2 style={pageHeading}>{customers.length} customer{customers.length !== 1 ? "s" : ""}</h2>
      </div>

      {/* ── Search + Filter ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        {/* Search form */}
        <form method="GET" action="/admin/customers" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input type="hidden" name="filter" value={filter} />
          <label htmlFor="customer-search" style={labelStyle}>Search</label>
          <input
            id="customer-search"
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Name or email…"
            style={inputStyle}
            aria-label="Search customers by name or email"
          />
          <button type="submit" style={btnStyle}>Go</button>
          {search && (
            <Link href={`/admin/customers?filter=${filter}`} style={{ ...btnStyle, background: "var(--color-parchment)", color: "var(--color-espresso)", border: "1px solid var(--border)" }}>
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────────── */}
      <nav aria-label="Filter customers" role="tablist">
        <div style={{ display: "flex", gap: 0, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
          {FILTERS.map(f => {
            const isActive = f.value === filter;
            const href = `/admin/customers?filter=${f.value}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
            return (
              <Link key={f.value} href={href} role="tab" aria-selected={isActive}
                style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem", fontWeight: isActive ? 700 : 500,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  padding:       "0.5rem 0.875rem",
                  textDecoration:"none",
                  color:         isActive ? "var(--color-espresso)" : "var(--color-espresso-muted)",
                  borderBottom:  isActive ? "2px solid var(--color-espresso)" : "2px solid transparent",
                  marginBottom:  "-1px", whiteSpace: "nowrap",
                }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {customers.length === 0 ? (
        <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", padding: "3rem", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
            {search ? `No customers matching "${search}".` : "No customers found."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", background: "var(--color-ivory)" }} className="customers-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
              aria-label="Customer list">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)" }}>
                  {["Customer", "Email", "Orders", "Total Spend", "Latest Order", "Joined", ""].map(h => (
                    <th key={h} scope="col" style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => {
                  const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
                  return (
                    <tr key={c.id} style={{ borderBottom: i < customers.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          <div style={avatar} aria-hidden="true">{initials(c.first_name, c.last_name)}</div>
                          <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-espresso)" }}>{name}</span>
                        </div>
                      </td>
                      <td style={tdStyle}><span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>{c.email ?? "—"}</span></td>
                      <td style={{ ...tdStyle, textAlign: "center" }}><span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)" }}>{c.order_count}</span></td>
                      <td style={tdStyle}><span style={{ fontSize: "0.875rem", fontWeight: c.total_spend > 0 ? 600 : 400, color: "var(--color-espresso)" }}>{fmt(c.total_spend)}</span></td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}><span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>{fmtDate(c.latest_order_at)}</span></td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}><span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>{fmtDate(c.created_at)}</span></td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <Link href={`/admin/customers/${c.id}`}
                          style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "1px" }}
                          aria-label={`View customer ${name}`}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} className="customers-cards" aria-label="Customer list (mobile)">
            {customers.map(c => {
              const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
              return (
                <Link key={c.id} href={`/admin/customers/${c.id}`}
                  style={{ display: "block", textDecoration: "none", border: "1px solid var(--border)", background: "var(--color-ivory)", padding: "1rem" }}
                  aria-label={`View customer ${name}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem" }}>
                    <div style={avatar} aria-hidden="true">{initials(c.first_name, c.last_name)}</div>
                    <div>
                      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)", margin: 0 }}>{name}</p>
                      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)", margin: 0 }}>{c.email ?? "—"}</p>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.375rem 1rem" }}>
                    <MicroStat label="Orders" value={String(c.order_count)} />
                    <MicroStat label="Spend" value={fmt(c.total_spend)} />
                    <MicroStat label="Latest" value={fmtDate(c.latest_order_at)} />
                    <MicroStat label="Joined" value={fmtDate(c.created_at)} />
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        .customers-table-wrap { display: block; }
        .customers-cards      { display: none; }
        @media (max-width: 640px) {
          .customers-table-wrap { display: none; }
          .customers-cards      { display: flex; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MicroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-espresso-muted)", margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso)", margin: 0, fontWeight: 500 }}>{value}</p>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700,
  letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginBottom: "0.5rem",
};
const pageHeading: React.CSSProperties = {
  fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 3vw, 2rem)",
  fontWeight: 400, fontStyle: "italic", color: "var(--color-espresso)", lineHeight: 1.05, margin: 0,
};
const thStyle: React.CSSProperties = {
  padding: "0.625rem 1rem", textAlign: "left", fontSize: "0.5625rem", fontWeight: 700,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-espresso-muted)", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = { padding: "0.875rem 1rem", verticalAlign: "middle" };
const avatar: React.CSSProperties = {
  width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
  background: "color-mix(in srgb, var(--color-espresso) 10%, transparent)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700,
  color: "var(--color-espresso)", letterSpacing: "0.06em",
};
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700,
  letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso-muted)",
};
const inputStyle: React.CSSProperties = {
  padding: "0.45rem 0.75rem", fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize: "0.8125rem", border: "1px solid var(--border)", background: "var(--color-ivory)",
  color: "var(--color-espresso)", minWidth: "200px",
};
const btnStyle: React.CSSProperties = {
  padding: "0.45rem 1rem", background: "var(--color-espresso)", color: "var(--color-ivory)",
  border: "none", fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem",
  fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", textDecoration: "none",
};
