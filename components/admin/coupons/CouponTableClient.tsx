"use client";

/**
 * VEER ELEGANCE — CouponTableClient
 *
 * Interactive client table for viewing, searching, toggling status,
 * and deactivating/deleting coupons.
 */

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CouponWithStatus, CouponStatus } from "@/lib/coupon-utils";
import { toggleCouponActiveAction, deleteOrDeactivateCouponAction } from "@/app/admin/coupons/actions";

interface CouponTableClientProps {
  initialCoupons: CouponWithStatus[];
}

const STATUS_BADGES: Record<CouponStatus, { label: string; bg: string; color: string; border: string }> = {
  active: {
    label:  "Active",
    bg:     "color-mix(in srgb, #4a7c59 12%, transparent)",
    color:  "#2e7d32",
    border: "color-mix(in srgb, #4a7c59 25%, transparent)",
  },
  scheduled: {
    label:  "Scheduled",
    bg:     "color-mix(in srgb, #1976d2 10%, transparent)",
    color:  "#1565c0",
    border: "color-mix(in srgb, #1976d2 25%, transparent)",
  },
  expired: {
    label:  "Expired",
    bg:     "color-mix(in srgb, #e65100 10%, transparent)",
    color:  "#b23c00",
    border: "color-mix(in srgb, #e65100 25%, transparent)",
  },
  disabled: {
    label:  "Disabled",
    bg:     "color-mix(in srgb, #757575 10%, transparent)",
    color:  "#5f6368",
    border: "color-mix(in srgb, #757575 25%, transparent)",
  },
  limit_reached: {
    label:  "Limit Reached",
    bg:     "color-mix(in srgb, #b84c4c 10%, transparent)",
    color:  "#8b3a3a",
    border: "color-mix(in srgb, #b84c4c 25%, transparent)",
  },
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function CouponTableClient({ initialCoupons }: CouponTableClientProps) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initialCoupons);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition]   = useTransition();
  const [actionError, setActionError]  = useState<string | null>(null);

  const filteredCoupons = coupons.filter(c => {
    const matchSearch = c.code.toLowerCase().includes(search.trim().toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleToggleActive = (id: string, currentActive: boolean) => {
    setActionError(null);
    startTransition(async () => {
      const res = await toggleCouponActiveAction(id, !currentActive);
      if (!res.success) {
        setActionError(res.error || "Failed to update status.");
      } else {
        setCoupons(prev => prev.map(c => (c.id === id ? { ...c, is_active: !currentActive } : c)));
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string, code: string, usedCount: number) => {
    const promptMsg = usedCount > 0
      ? `Coupon "${code}" has been used in ${usedCount} order(s). It cannot be deleted, but it will be deactivated. Continue?`
      : `Are you sure you want to permanently delete coupon "${code}"?`;

    if (!window.confirm(promptMsg)) return;

    setActionError(null);
    startTransition(async () => {
      const res = await deleteOrDeactivateCouponAction(id);
      if (!res.success) {
        setActionError(res.error || "Failed to remove coupon.");
      } else {
        if (res.action === "deleted") {
          setCoupons(prev => prev.filter(c => c.id !== id));
        } else {
          setCoupons(prev => prev.map(c => (c.id === id ? { ...c, is_active: false } : c)));
        }
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {actionError && (
        <div style={{ padding: "0.75rem 1rem", background: "#fdf2f2", border: "1px solid #f8b4b4", color: "#9b1c1c", fontSize: "0.8125rem", borderRadius: "2px" }}>
          {actionError}
        </div>
      )}

      {/* ── Toolbar: Search & Filter ──────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flex: 1, maxWidth: "480px" }}>
          <input
            type="text"
            placeholder="Search coupon code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "0.625rem 0.875rem",
              background: "var(--color-ivory)",
              border: "1px solid var(--border)",
              color: "var(--color-espresso)",
              fontSize: "0.8125rem",
              outline: "none",
            }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: "0.625rem 0.875rem",
              background: "var(--color-ivory)",
              border: "1px solid var(--border)",
              color: "var(--color-espresso)",
              fontSize: "0.8125rem",
              outline: "none",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
            <option value="limit_reached">Limit Reached</option>
          </select>
        </div>

        <Link
          href="/admin/coupons/new"
          style={{
            padding: "0.625rem 1.25rem",
            background: "var(--color-espresso)",
            color: "var(--color-ivory)",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "2px",
          }}
        >
          + New Coupon
        </Link>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {filteredCoupons.length === 0 ? (
        <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", padding: "3rem", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", fontStyle: "italic", margin: 0 }}>
            {search || statusFilter !== "all" ? "No coupons match your filter." : "No coupons created yet."}
          </p>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)", borderBottom: "1px solid var(--border)" }}>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Discount</th>
                <th style={thStyle}>Min Order</th>
                <th style={thStyle}>Max Discount</th>
                <th style={thStyle}>Usage</th>
                <th style={thStyle}>Validity</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map(coupon => {
                const badge = STATUS_BADGES[coupon.status] || STATUS_BADGES.disabled;
                const isFixed = coupon.discount_type === "fixed";

                return (
                  <tr key={coupon.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 150ms ease" }}>
                    {/* Code */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "var(--font-body), monospace", fontWeight: 700, fontSize: "0.875rem", color: "var(--color-espresso)", letterSpacing: "0.06em" }}>
                            {coupon.code}
                          </span>
                          {coupon.first_order_only && (
                            <span
                              style={{
                                fontSize: "0.5625rem",
                                padding: "0.15rem 0.45rem",
                                background: "color-mix(in srgb, var(--color-gold-muted) 15%, transparent)",
                                color: "#8a6d3b",
                                border: "1px solid color-mix(in srgb, var(--color-gold-muted) 40%, transparent)",
                                borderRadius: "2px",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                              }}
                            >
                              First Order Only
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)", textTransform: "capitalize" }}>
                          {coupon.discount_type}
                        </span>
                      </div>
                    </td>

                    {/* Discount Value */}
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: "var(--color-espresso)" }}>
                        {isFixed ? formatINR(coupon.discount_value) : `${coupon.discount_value}% OFF`}
                      </span>
                    </td>

                    {/* Minimum Order */}
                    <td style={tdStyle}>
                      {coupon.minimum_order_value ? formatINR(coupon.minimum_order_value) : <span style={{ color: "var(--color-espresso-muted)" }}>None</span>}
                    </td>

                    {/* Max Discount */}
                    <td style={tdStyle}>
                      {coupon.maximum_discount ? formatINR(coupon.maximum_discount) : <span style={{ color: "var(--color-espresso-muted)" }}>No Cap</span>}
                    </td>

                    {/* Usage Count / Limit */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span style={{ fontWeight: 600, color: "var(--color-espresso)" }}>
                          {coupon.used_count}
                        </span>
                        <span style={{ color: "var(--color-espresso-muted)" }}>
                          / {coupon.usage_limit !== null ? coupon.usage_limit : "∞"}
                        </span>
                      </div>
                    </td>

                    {/* Dates */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexDirection: "column", fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>
                        {coupon.starts_at && <span>From: {formatDate(coupon.starts_at)}</span>}
                        {coupon.expires_at ? <span>Exp: {formatDate(coupon.expires_at)}</span> : <span>No Expiry</span>}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={tdStyle}>
                      <span
                        style={{
                          display:       "inline-block",
                          padding:       "0.2rem 0.5rem",
                          borderRadius:  "2px",
                          fontSize:      "0.625rem",
                          fontWeight:    700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          background:    badge.bg,
                          color:         badge.color,
                          border:        `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.625rem" }}>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleActive(coupon.id, coupon.is_active)}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            color: coupon.is_active ? "#b84c4c" : "#2e7d32",
                            textDecoration: "underline",
                          }}
                        >
                          {coupon.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <span style={{ color: "var(--border)" }}>|</span>

                        <Link
                          href={`/admin/coupons/${coupon.id}/edit`}
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            color: "var(--color-espresso)",
                            textDecoration: "underline",
                          }}
                        >
                          Edit
                        </Link>

                        <span style={{ color: "var(--border)" }}>|</span>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(coupon.id, coupon.code, coupon.used_count)}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            color: "#8b3a3a",
                            textDecoration: "underline",
                          }}
                          title={coupon.used_count > 0 ? "Deactivate used coupon" : "Delete coupon"}
                        >
                          {coupon.used_count > 0 ? "Disable" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding:       "0.75rem 1rem",
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.625rem",
  fontWeight:    700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color:         "var(--color-espresso-muted)",
};

const tdStyle: React.CSSProperties = {
  padding:       "0.875rem 1rem",
  verticalAlign: "middle",
};
