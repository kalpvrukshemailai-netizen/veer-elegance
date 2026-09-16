"use client";

/**
 * VEER ELEGANCE — Enquiry Status Components
 *
 * EnquiryStatusBadge: read-only status pill.
 * EnquiryStatusControl: admin select + submit to transition enquiry status.
 */

import { useActionState } from "react";
import { updateEnquiryStatusAction, type EnquiryActionState } from "@/app/admin/enquiries/actions";
import type { EnquiryStatus } from "@/lib/enquiries";

// ─────────────────────────────────────────────────────────────────────────────
// LABELS & COLOURS
// ─────────────────────────────────────────────────────────────────────────────

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new:       "New",
  contacted: "Contacted",
  qualified: "Qualified",
  closed:    "Closed",
};

const ENQUIRY_STATUS_COLORS: Record<EnquiryStatus, { bg: string; color: string }> = {
  new:       { bg: "color-mix(in srgb, #B89A68 14%, transparent)", color: "#7a6040" },
  contacted: { bg: "color-mix(in srgb, #6B8FB5 14%, transparent)", color: "#3a5e80" },
  qualified: { bg: "color-mix(in srgb, #4a7c59 14%, transparent)", color: "#2a5a34" },
  closed:    { bg: "color-mix(in srgb, var(--color-espresso) 8%, transparent)", color: "var(--color-espresso-muted)" },
};

const ALL_STATUSES: EnquiryStatus[] = ["new", "contacted", "qualified", "closed"];

// ─────────────────────────────────────────────────────────────────────────────
// ENQUIRY STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

export function EnquiryStatusBadge({ status }: { status: string }) {
  const s  = (status as EnquiryStatus) in ENQUIRY_STATUS_LABELS ? (status as EnquiryStatus) : "new";
  const sc = ENQUIRY_STATUS_COLORS[s] ?? { bg: "transparent", color: "inherit" };

  return (
    <span
      aria-label={`Enquiry status: ${ENQUIRY_STATUS_LABELS[s] ?? status}`}
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
      {ENQUIRY_STATUS_LABELS[s] ?? status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENQUIRY STATUS CONTROL (Admin)
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE: EnquiryActionState = {};

export function EnquiryStatusControl({
  enquiryId,
  currentStatus,
}: {
  enquiryId:     string;
  currentStatus: EnquiryStatus;
}) {
  const [state, dispatch, pending] = useActionState(
    updateEnquiryStatusAction.bind(null, enquiryId),
    INITIAL_STATE,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Current status display */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>
          Current Status
        </span>
        <EnquiryStatusBadge status={currentStatus} />
      </div>

      {/* Form to update status */}
      <form action={dispatch} style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
        <label
          htmlFor={`status-select-${enquiryId}`}
          style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}
        >
          Change to
        </label>
        <select
          id={`status-select-${enquiryId}`}
          name="status"
          defaultValue={currentStatus}
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
          aria-label="Select new enquiry status"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ENQUIRY_STATUS_LABELS[s]}
            </option>
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
            transition:    "all 150ms ease",
          }}
        >
          {pending ? "Updating…" : "Update"}
        </button>
      </form>

      {/* Feedback */}
      {state.error && (
        <p role="alert" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "#b84c4c", margin: 0 }}>
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" aria-live="polite" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "#2a5a34", margin: 0 }}>
          ✓ {state.message}
        </p>
      )}
    </div>
  );
}
