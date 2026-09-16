/**
 * VEER ELEGANCE — /admin/coupons
 *
 * Owner Coupon Management Page.
 * requireAdmin() guard — customers redirected.
 */

import type { Metadata } from "next";
import { requireAdmin }   from "@/lib/admin";
import { getAdminCoupons } from "@/lib/coupons";
import CouponTableClient  from "@/components/admin/coupons/CouponTableClient";

export const metadata: Metadata = {
  title: "Coupons — Veer Elegance Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAdmin("/admin/coupons");
  const coupons = await getAdminCoupons();

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
          Marketing & Promotions
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
          Coupons & Promo Codes
        </h2>
      </div>

      {/* ── Table & Interactive Controls ──────────────────────────────── */}
      <CouponTableClient initialCoupons={coupons} />
    </div>
  );
}
