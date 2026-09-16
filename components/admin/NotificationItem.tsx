"use client";

/**
 * VEER ELEGANCE — Notification Item
 *
 * Interactive notification card with mark-as-read action.
 * Navigates to linked record when clicked.
 */

import { useActionState, useRef } from "react";
import { markReadAction, type NotificationActionState } from "@/app/admin/notifications/actions";
import type { NotificationRow, NotificationType }       from "@/lib/notifications";

// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, { icon: string; label: string }> = {
  new_order:         { icon: "🛍",  label: "New Order" },
  low_stock:         { icon: "⚠",   label: "Low Stock" },
  out_of_stock:      { icon: "📦",  label: "Out of Stock" },
  order_status:      { icon: "📋",  label: "Order Status" },
  wholesale_enquiry: { icon: "📩",  label: "Enquiry" },
  system:            { icon: "⚙",   label: "System" },
};

function resolveHref(n: NotificationRow): string | null {
  if (!n.reference_id) return null;
  if (n.reference_type === "order")   return `/admin/orders/${n.reference_id}`;
  if (n.reference_type === "product") return `/admin/products/${n.reference_id}`;
  if (n.reference_type === "enquiry") return `/admin/enquiries/${n.reference_id}`;
  return null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "Just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────

export function NotificationItem({ n }: { n: NotificationRow }) {
  const config    = TYPE_CONFIG[n.type] ?? { icon: "•", label: n.type };
  const href      = resolveHref(n);
  const [, dispatch, pending] = useActionState(
    markReadAction.bind(null, n.id),
    {} as NotificationActionState,
  );

  return (
    <div
      role="listitem"
      aria-label={`${n.is_read ? "Read" : "Unread"} notification: ${n.title}`}
      style={{
        display:        "flex",
        alignItems:     "flex-start",
        gap:            "0.875rem",
        padding:        "1rem 1.25rem",
        background:     n.is_read
          ? "var(--color-ivory)"
          : "color-mix(in srgb, var(--color-gold-muted) 6%, var(--color-ivory))",
        borderLeft:     n.is_read ? "3px solid transparent" : "3px solid var(--color-gold-muted)",
        transition:     "background 200ms ease",
        position:       "relative",
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: "1.125rem", lineHeight: 1, flexShrink: 0, marginTop: "2px" }} aria-hidden="true">
        {config.icon}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>
            {config.label}
          </span>
          {!n.is_read && (
            <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "var(--color-gold-muted)", color: "var(--color-ivory)", padding: "0.1rem 0.375rem" }}
              aria-label="Unread">
              NEW
            </span>
          )}
        </div>
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)", margin: 0, lineHeight: 1.4 }}>
          {n.title}
        </p>
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", margin: "0.2rem 0 0", lineHeight: 1.5 }}>
          {n.message}
        </p>
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", color: "var(--color-espresso-muted)", margin: "0.375rem 0 0", letterSpacing: "0.04em" }}>
          {timeAgo(n.created_at)}
        </p>

        {/* Actions row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginTop: "0.625rem", flexWrap: "wrap" }}>
          {href && (
            <a href={href} style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "1px" }}>
              View {n.reference_type} →
            </a>
          )}
          {!n.is_read && (
            <form action={dispatch}>
              <button
                type="submit"
                disabled={pending}
                style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "transparent", border: "none", color: "var(--color-espresso-muted)", cursor: pending ? "not-allowed" : "pointer", padding: 0, opacity: pending ? 0.5 : 1 }}
                aria-label="Mark this notification as read"
              >
                Mark as read
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
