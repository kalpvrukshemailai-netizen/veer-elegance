"use client";

/**
 * VEER ELEGANCE — Order Status components
 *
 * StatusBadge: read-only pill for displaying current status.
 * StatusControl: admin select + submit to change status.
 */

import { useActionState, useTransition } from "react";
import { updateOrderStatusAction, type OrderActionState } from "@/app/admin/orders/actions";
import { allowedNextStatuses, type OrderStatus } from "@/lib/order-utils";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED LABEL + COLOUR HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:                      "Pending",
  confirmed:                    "Confirmed",
  processing:                   "Processing",
  shipped:                      "Shipped",
  delivered:                    "Delivered",
  cancelled:                    "Cancelled",
  payment_captured_stock_issue: "Stock Issue",
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; color: string }> = {
  pending:                      { bg: "color-mix(in srgb, #B89A68 12%, transparent)", color: "#7a6040" },
  confirmed:                    { bg: "color-mix(in srgb, #6B8FB5 12%, transparent)", color: "#3a5e80" },
  processing:                   { bg: "color-mix(in srgb, #7B68A0 12%, transparent)", color: "#4a3870" },
  shipped:                      { bg: "color-mix(in srgb, #4a7c59 12%, transparent)", color: "#3a5e44" },
  delivered:                    { bg: "color-mix(in srgb, #4a7c59 20%, transparent)", color: "#2a4e34" },
  cancelled:                    { bg: "color-mix(in srgb, #b84c4c 10%, transparent)", color: "#8b3a3a" },
  payment_captured_stock_issue: { bg: "color-mix(in srgb, #c47a2a 12%, transparent)", color: "#8a4f10" },
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const s  = status as OrderStatus;
  const sc = STATUS_COLORS[s] ?? { bg: "transparent", color: "inherit" };

  return (
    <span
      aria-label={`Order status: ${STATUS_LABELS[s] ?? status}`}
      style={{
        display:       "inline-flex",
        alignItems:    "center",
        gap:           "0.375rem",
        fontFamily:    "var(--font-body), Manrope, sans-serif",
        fontSize:      "0.625rem",
        fontWeight:    700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding:       "0.25rem 0.625rem",
        background:    sc.bg,
        color:         sc.color,
      }}
    >
      <span
        style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor", flexShrink: 0 }}
        aria-hidden="true"
      />
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONTROL (admin)
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL: OrderActionState = {};

export function StatusControl({
  orderId,
  currentStatus,
}: {
  orderId:       string;
  currentStatus: OrderStatus;
}) {
  const [state, dispatch, pending] = useActionState(
    updateOrderStatusAction.bind(null, orderId),
    INITIAL,
  );

  const nextOptions = allowedNextStatuses(currentStatus);
  const isTerminal  = nextOptions.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {/* Current status */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>
          Current
        </span>
        <StatusBadge status={currentStatus} />
      </div>

      {/* Transition form */}
      {isTerminal ? (
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
          This order is in a terminal state and cannot be updated further.
        </p>
      ) : (
        <form action={dispatch} style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
          <label
            htmlFor={`status-select-${orderId}`}
            style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}
          >
            Update to
          </label>
          <select
            id={`status-select-${orderId}`}
            name="status"
            defaultValue=""
            required
            disabled={pending}
            style={{
              padding:    "0.5rem 0.75rem",
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.8125rem",
              border:     "1px solid var(--border)",
              background: "var(--color-parchment)",
              color:      "var(--color-espresso)",
              cursor:     "pointer",
            }}
            aria-label="Select new order status"
          >
            <option value="" disabled>— Select —</option>
            {nextOptions.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <button
            type="submit"
            disabled={pending}
            style={{
              padding:       "0.5rem 1.25rem",
              background:    pending ? "var(--color-espresso-muted)" : "var(--color-espresso)",
              color:         "var(--color-ivory)",
              border:        "none",
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.625rem",
              fontWeight:    700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor:        pending ? "not-allowed" : "pointer",
              opacity:       pending ? 0.7 : 1,
            }}
          >
            {pending ? "Updating…" : "Update"}
          </button>
        </form>
      )}

      {/* Feedback */}
      {state.error && (
        <p role="alert" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "#b84c4c", margin: 0 }}>
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" aria-live="polite" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "#3a5e44", margin: 0 }}>
          ✓ {state.message}
        </p>
      )}
    </div>
  );
}
