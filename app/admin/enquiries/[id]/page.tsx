/**
 * VEER ELEGANCE — /admin/enquiries/[id]
 *
 * Admin Enquiry Detail Page.
 * Displays full contact info, business requirements, customer message,
 * and allows status transitions (new → contacted → qualified → closed).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { getEnquiryById, type EnquiryStatus } from "@/lib/enquiries";
import { EnquiryStatusBadge, EnquiryStatusControl } from "@/components/admin/EnquiryStatusComponents";

export const metadata: Metadata = {
  title: "Enquiry Detail — Veer Elegance Admin",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function AdminEnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/enquiries");

  const { id } = await params;
  const enquiry = await getEnquiryById(id);

  if (!enquiry) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ── Breadcrumb ────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb">
        <ol style={{ display: "flex", alignItems: "center", gap: "0.5rem", listStyle: "none", margin: 0, padding: 0, fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
          <li><Link href="/admin/enquiries" style={{ color: "inherit", textDecoration: "none" }}>Enquiries</Link></li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" style={{ color: "var(--color-espresso)", fontWeight: 600 }}>{enquiry.full_name}</li>
        </ol>
      </nav>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
          <p style={eyebrow}>Enquiry Details</p>
          <h2 style={pageHeading}>{enquiry.full_name}</h2>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", marginTop: "0.375rem" }}>
            Submitted on {formatDate(enquiry.created_at)}
          </p>
        </div>
        <EnquiryStatusBadge status={enquiry.status} />
      </div>

      {/* ── Grid: Status Control + Contact Info + Business Details ─────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: "1.5rem" }}>
        {/* Status Control Card */}
        <section aria-labelledby="status-card-heading" style={sectionCard}>
          <SectionLabel id="status-card-heading">Manage Status</SectionLabel>
          <EnquiryStatusControl enquiryId={enquiry.id} currentStatus={enquiry.status as EnquiryStatus} />
        </section>

        {/* Contact Information Card */}
        <section aria-labelledby="contact-card-heading" style={sectionCard}>
          <SectionLabel id="contact-card-heading">Contact Information</SectionLabel>
          <dl style={{ display: "flex", flexDirection: "column", gap: "0.875rem", margin: 0 }}>
            <DataRow label="Full Name" value={enquiry.full_name} />
            <DataRow
              label="Email"
              value={enquiry.email}
              href={`mailto:${enquiry.email}`}
            />
            <DataRow
              label="Phone"
              value={enquiry.phone}
              href={`tel:${enquiry.phone.replace(/\s+/g, "")}`}
            />
            {(enquiry.city || enquiry.country) && (
              <DataRow
                label="Location"
                value={[enquiry.city, enquiry.country].filter(Boolean).join(", ")}
              />
            )}
          </dl>
        </section>

        {/* Business & Enquiry Card */}
        <section aria-labelledby="business-card-heading" style={sectionCard}>
          <SectionLabel id="business-card-heading">Business &amp; Requirements</SectionLabel>
          <dl style={{ display: "flex", flexDirection: "column", gap: "0.875rem", margin: 0 }}>
            <DataRow
              label="Business / Boutique"
              value={enquiry.business_name || "—"}
            />
            <DataRow
              label="Enquiry Type"
              value={enquiry.enquiry_type}
            />
            <DataRow
              label="Expected Quantity"
              value={enquiry.expected_quantity ? `${enquiry.expected_quantity} units` : "Not specified"}
            />
          </dl>
        </section>
      </div>

      {/* ── Message Card ──────────────────────────────────────────────── */}
      <section aria-labelledby="message-card-heading" style={sectionCard}>
        <SectionLabel id="message-card-heading">Client Message</SectionLabel>
        <div style={{ background: "var(--color-parchment)", border: "1px solid var(--border)", padding: "1.25rem 1.5rem" }}>
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.9375rem",
              color: "var(--color-espresso)",
              lineHeight: 1.8,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {enquiry.message}
          </p>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components & Helpers
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      style={{
        fontFamily: "var(--font-body), Manrope, sans-serif",
        fontSize: "0.5625rem",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--color-espresso-muted)",
        marginBottom: "1rem",
      }}
    >
      {children}
    </p>
  );
}

function DataRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <dt style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>
        {label}
      </dt>
      <dd style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)", margin: 0 }}>
        {href ? (
          <a href={href} style={{ color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid color-mix(in srgb, var(--color-espresso) 30%, transparent)" }}>
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

const sectionCard: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--color-ivory)",
  padding: "1.25rem 1.5rem",
};

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize: "0.625rem",
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--color-gold-muted)",
  marginBottom: "0.5rem",
};

const pageHeading: React.CSSProperties = {
  fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
  fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
  fontWeight: 400,
  fontStyle: "italic",
  color: "var(--color-espresso)",
  lineHeight: 1.05,
  margin: 0,
};
