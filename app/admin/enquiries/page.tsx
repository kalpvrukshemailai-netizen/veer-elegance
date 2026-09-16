/**
 * VEER ELEGANCE — /admin/enquiries
 *
 * Admin Wholesale & Business Enquiries list.
 * requireAdmin() guards this page server-side.
 * Status filter supported via ?status= query param.
 */

import type { Metadata } from "next";
import Link              from "next/link";
import { requireAdmin }  from "@/lib/admin";
import { getAllEnquiries, type EnquiryStatus } from "@/lib/enquiries";
import { EnquiryStatusBadge } from "@/components/admin/EnquiryStatusComponents";

export const metadata: Metadata = {
  title: "Enquiries — Veer Elegance Admin",
};

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All",       value: "" },
  { label: "New",       value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Closed",    value: "closed" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin("/admin/enquiries");

  const sp     = await searchParams;
  const filter = (sp.status ?? "") as EnquiryStatus | "";

  const enquiries = await getAllEnquiries(filter || undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* ── Heading ───────────────────────────────────────────────────── */}
      <div>
        <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
        <p style={eyebrow}>B2B &amp; Partnerships</p>
        <h2 style={pageHeading}>
          {enquiries.length} {filter ? filter : "total"} enquir{enquiries.length === 1 ? "y" : "ies"}
        </h2>
      </div>

      {/* ── Status filter tabs ────────────────────────────────────────── */}
      <nav aria-label="Filter enquiries by status">
        <div
          style={{ display: "flex", gap: "0", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}
          role="tablist"
        >
          {STATUS_FILTERS.map((f) => {
            const isActive = f.value === filter;
            return (
              <Link
                key={f.value}
                href={f.value ? `/admin/enquiries?status=${f.value}` : "/admin/enquiries"}
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

      {/* ── Enquiries Table ───────────────────────────────────────────── */}
      {enquiries.length === 0 ? (
        <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", padding: "3rem", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", fontStyle: "italic", margin: 0 }}>
            No {filter || ""} enquiries found.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
            aria-label="Enquiries list"
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)" }}>
                {["Name", "Business", "Type", "Email", "Phone", "Date", "Status", ""].map((h) => (
                  <th key={h} scope="col" style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enquiries.map((enquiry, i) => (
                <tr
                  key={enquiry.id}
                  style={{ borderBottom: i < enquiries.length - 1 ? "1px solid var(--border)" : "none" }}
                  className="admin-table-row"
                >
                  {/* Name */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-espresso)" }}>
                      {enquiry.full_name}
                    </span>
                    {enquiry.city && (
                      <span style={{ display: "block", fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>
                        {enquiry.city}{enquiry.country ? `, ${enquiry.country}` : ""}
                      </span>
                    )}
                  </td>

                  {/* Business */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso)" }}>
                      {enquiry.business_name || <span style={{ fontStyle: "italic", color: "var(--color-espresso-muted)" }}>—</span>}
                    </span>
                  </td>

                  {/* Type */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-espresso)", background: "var(--color-parchment)", padding: "0.2rem 0.5rem", border: "1px solid var(--border)" }}>
                      {enquiry.enquiry_type}
                    </span>
                  </td>

                  {/* Email */}
                  <td style={tdStyle}>
                    <a href={`mailto:${enquiry.email}`} style={{ fontSize: "0.8125rem", color: "var(--color-espresso)", textDecoration: "none" }}>
                      {enquiry.email}
                    </a>
                  </td>

                  {/* Phone */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)", whiteSpace: "nowrap" }}>
                      {enquiry.phone}
                    </span>
                  </td>

                  {/* Date */}
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
                      {formatDate(enquiry.created_at)}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={tdStyle}>
                    <EnquiryStatusBadge status={enquiry.status} />
                  </td>

                  {/* Action */}
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", textAlign: "right" }}>
                    <Link
                      href={`/admin/enquiries/${enquiry.id}`}
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
                      aria-label={`View enquiry from ${enquiry.full_name}`}
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
