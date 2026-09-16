/**
 * VEER ELEGANCE — /admin/complete-the-look
 *
 * Dedicated Owner / Admin Complete-the-Look Management Page.
 * requireAdmin() guard — customers are redirected.
 */

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAllAdminCompleteTheLooks } from "@/lib/complete-the-look-server";
import CompleteTheLookTableClient from "@/components/admin/complete-the-look/CompleteTheLookTableClient";

export const metadata: Metadata = {
  title: "Complete the Look — Veer Elegance Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminCompleteTheLookPage() {
  await requireAdmin("/admin/complete-the-look");
  const looks = await getAllAdminCompleteTheLooks();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ── Heading ───────────────────────────────────────────────────── */}
      <div>
        <div
          style={{
            width: "2rem",
            height: "1px",
            background: "var(--color-gold-muted)",
            marginBottom: "0.875rem",
          }}
          aria-hidden="true"
        />
        <p
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--color-gold-muted)",
            margin: "0 0 0.25rem 0",
          }}
        >
          Catalog & Merchandising
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
            fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
            fontWeight: 400,
            fontStyle: "italic",
            color: "var(--color-espresso)",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Complete the Look
        </h2>
        <p
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.8125rem",
            color: "var(--color-espresso-muted)",
            margin: "0.5rem 0 0",
            maxWidth: "60ch",
          }}
        >
          Manage curated jewelry sets, bundle pricing, coupon compatibility, and live product availability across your storefront.
        </p>
      </div>

      {/* ── Interactive List, Metrics, Filters & Modals ──────────────── */}
      <CompleteTheLookTableClient initialLooks={looks} />
    </div>
  );
}
