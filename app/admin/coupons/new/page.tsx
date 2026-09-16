/**
 * VEER ELEGANCE — /admin/coupons/new
 *
 * Create a new coupon / promo code.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import CouponFormClient from "@/components/admin/coupons/CouponFormClient";

export const metadata: Metadata = {
  title: "New Coupon — Veer Elegance Admin",
};

export default async function NewCouponPage() {
  await requireAdmin("/admin/coupons/new");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Back link */}
      <div>
        <Link
          href="/admin/coupons"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-espresso-muted)",
            textDecoration: "none",
          }}
        >
          ← Back to Coupons
        </Link>
      </div>

      {/* Heading */}
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
          New Promo Code
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
            fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)",
            fontWeight: 400,
            fontStyle: "italic",
            color: "var(--color-espresso)",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Create Coupon
        </h2>
      </div>

      {/* Form */}
      <CouponFormClient mode="create" />
    </div>
  );
}
