"use client";

/**
 * VEER ELEGANCE — CouponFormClient
 *
 * Reusable form for creating and editing coupons in Admin.
 */

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { normalizeCouponCode, type CouponInput, type CouponRow } from "@/lib/coupon-utils";
import { createCouponAction, updateCouponAction } from "@/app/admin/coupons/actions";

interface CouponFormClientProps {
  initialData?: CouponRow;
  mode:         "create" | "edit";
}

export default function CouponFormClient({ initialData, mode }: CouponFormClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [code, setCode] = useState(initialData?.code ?? "");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(initialData?.discount_type ?? "percentage");
  const [discountValue, setDiscountValue] = useState<string>(initialData ? String(initialData.discount_value) : "");
  const [minOrder, setMinOrder] = useState<string>(initialData?.minimum_order_value ? String(initialData.minimum_order_value) : "");
  const [maxDiscount, setMaxDiscount] = useState<string>(initialData?.maximum_discount ? String(initialData.maximum_discount) : "");
  const [usageLimit, setUsageLimit] = useState<string>(initialData?.usage_limit ? String(initialData.usage_limit) : "");
  const [startsAt, setStartsAt] = useState<string>(
    initialData?.starts_at ? new Date(initialData.starts_at).toISOString().slice(0, 16) : ""
  );
  const [expiresAt, setExpiresAt] = useState<string>(
    initialData?.expires_at ? new Date(initialData.expires_at).toISOString().slice(0, 16) : ""
  );
  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active ?? true);
  const [firstOrderOnly, setFirstOrderOnly] = useState<boolean>(initialData?.first_order_only ?? false);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const canonicalCode = normalizeCouponCode(code);
    if (!canonicalCode) {
      setError("Please enter a coupon code.");
      return;
    }

    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      setError("Discount value must be a positive number.");
      return;
    }

    if (discountType === "percentage" && val > 100) {
      setError("Percentage discount cannot exceed 100%.");
      return;
    }

    const minVal = minOrder.trim() ? Number(minOrder) : null;
    if (minVal !== null && (isNaN(minVal) || minVal < 0)) {
      setError("Minimum order value cannot be negative.");
      return;
    }

    const maxDisc = maxDiscount.trim() ? Number(maxDiscount) : null;
    if (maxDisc !== null && (isNaN(maxDisc) || maxDisc < 0)) {
      setError("Maximum discount cannot be negative.");
      return;
    }

    const limit = usageLimit.trim() ? parseInt(usageLimit, 10) : null;
    if (limit !== null && (isNaN(limit) || limit < 0)) {
      setError("Usage limit cannot be negative.");
      return;
    }

    if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
      setError("Expiry date must be after start date.");
      return;
    }

    const payload: CouponInput = {
      code:                canonicalCode,
      discount_type:       discountType,
      discount_value:      val,
      minimum_order_value: minVal,
      maximum_discount:    maxDisc,
      usage_limit:         limit,
      starts_at:           startsAt ? new Date(startsAt).toISOString() : null,
      expires_at:          expiresAt ? new Date(expiresAt).toISOString() : null,
      is_active:           isActive,
      first_order_only:    firstOrderOnly,
    };

    startTransition(async () => {
      if (mode === "create") {
        const res = await createCouponAction(payload);
        if (!res.success) {
          setError(res.error || "Failed to create coupon.");
        } else {
          router.push("/admin/coupons");
          router.refresh();
        }
      } else if (mode === "edit" && initialData) {
        const res = await updateCouponAction(initialData.id, payload);
        if (!res.success) {
          setError(res.error || "Failed to update coupon.");
        } else {
          router.push("/admin/coupons");
          router.refresh();
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "640px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {error && (
        <div style={{ padding: "0.875rem 1rem", background: "#fdf2f2", border: "1px solid #f8b4b4", color: "#9b1c1c", fontSize: "0.8125rem", borderRadius: "2px" }}>
          {error}
        </div>
      )}

      {initialData && (
        <div style={{ padding: "0.75rem 1rem", background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)", border: "1px solid var(--border)", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
          Total historical orders using this coupon: <strong>{initialData.used_count}</strong>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", background: "var(--color-ivory)", border: "1px solid var(--border)", padding: "1.5rem" }}>
        {/* Code */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label style={labelStyle}>Coupon Code *</label>
          <input
            type="text"
            required
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. VEER10"
            style={inputStyle}
          />
          <span style={helperStyle}>Normalized to uppercase automatically (e.g. VEER10).</span>
        </div>

        {/* Discount Type */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label style={labelStyle}>Discount Type *</label>
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.25rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="discount_type"
                value="percentage"
                checked={discountType === "percentage"}
                onChange={() => setDiscountType("percentage")}
              />
              Percentage (%)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="discount_type"
                value="fixed"
                checked={discountType === "fixed"}
                onChange={() => setDiscountType("fixed")}
              />
              Fixed Amount (₹)
            </label>
          </div>
        </div>

        {/* Discount Value */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label style={labelStyle}>
            {discountType === "percentage" ? "Discount Percentage (%) *" : "Discount Amount (₹) *"}
          </label>
          <input
            type="number"
            required
            min="0.01"
            max={discountType === "percentage" ? "100" : undefined}
            step="0.01"
            value={discountValue}
            onChange={e => setDiscountValue(e.target.value)}
            placeholder={discountType === "percentage" ? "10" : "100"}
            style={inputStyle}
          />
        </div>

        {/* Minimum Order Value */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label style={labelStyle}>Minimum Order Subtotal (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={minOrder}
            onChange={e => setMinOrder(e.target.value)}
            placeholder="e.g. 500 (leave blank for no minimum)"
            style={inputStyle}
          />
          <span style={helperStyle}>Coupon cannot be applied if cart subtotal is below this amount.</span>
        </div>

        {/* Maximum Discount (Percentage only) */}
        {discountType === "percentage" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={labelStyle}>Maximum Discount Cap (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxDiscount}
              onChange={e => setMaxDiscount(e.target.value)}
              placeholder="e.g. 200 (leave blank for unlimited discount)"
              style={inputStyle}
            />
            <span style={helperStyle}>Caps the maximum discount in rupees for high-value carts.</span>
          </div>
        )}

        {/* Usage Limit */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label style={labelStyle}>Total Usage Limit</label>
          <input
            type="number"
            min="0"
            step="1"
            value={usageLimit}
            onChange={e => setUsageLimit(e.target.value)}
            placeholder="e.g. 100 (leave blank for unlimited)"
            style={inputStyle}
          />
          <span style={helperStyle}>Maximum number of successful orders that can use this coupon.</span>
        </div>

        {/* Date Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={labelStyle}>Start Date & Time</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={labelStyle}>Expiry Date & Time</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Customer Eligibility */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
          <label style={labelStyle}>Customer Eligibility</label>
          <div style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8125rem", color: "var(--color-espresso)" }}>
              <input
                type="radio"
                name="customerEligibility"
                checked={!firstOrderOnly}
                onChange={() => setFirstOrderOnly(false)}
                style={{ accentColor: "var(--color-espresso)", cursor: "pointer" }}
              />
              <span>All Customers</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8125rem", color: "var(--color-espresso)" }}>
              <input
                type="radio"
                name="customerEligibility"
                checked={firstOrderOnly}
                onChange={() => setFirstOrderOnly(true)}
                style={{ accentColor: "var(--color-espresso)", cursor: "pointer" }}
              />
              <span><strong>First Order Only</strong></span>
            </label>
          </div>
          <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>
            {firstOrderOnly
              ? "Restricted: Only customers placing their first successful order can apply this coupon."
              : "Default: Any customer can apply this coupon."}
          </span>
        </div>

        {/* Active Checkbox */}
        <div style={{ marginTop: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.8125rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <span><strong>Active</strong> (uncheck to immediately disable coupon)</span>
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding:       "0.75rem 1.75rem",
            background:    "var(--color-espresso)",
            color:         "var(--color-ivory)",
            fontSize:      "0.75rem",
            fontWeight:    600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            border:        "none",
            borderRadius:  "2px",
            cursor:        isPending ? "not-allowed" : "pointer",
            opacity:       isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Saving..." : mode === "create" ? "Create Coupon" : "Save Changes"}
        </button>

        <Link
          href="/admin/coupons"
          style={{
            fontSize: "0.75rem",
            color: "var(--color-espresso-muted)",
            textDecoration: "underline",
          }}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.6875rem",
  fontWeight:    600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color:         "var(--color-espresso)",
};

const inputStyle: React.CSSProperties = {
  padding:    "0.625rem 0.875rem",
  background: "transparent",
  border:     "1px solid var(--border)",
  color:      "var(--color-espresso)",
  fontSize:   "0.875rem",
  outline:    "none",
};

const helperStyle: React.CSSProperties = {
  fontSize: "0.6875rem",
  color:    "var(--color-espresso-muted)",
};
