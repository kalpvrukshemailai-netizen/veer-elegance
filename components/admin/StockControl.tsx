"use client";

/**
 * VEER ELEGANCE — StockControl
 *
 * Inline stock adjustment widget for the admin inventory page.
 * Supports: Add, Remove, Adjust modes.
 * Shows current stock, input form, and feedback after action.
 */

import { useActionState, useState } from "react";
import {
  addStockAction,
  removeStockAction,
  adjustStockAction,
  type InventoryActionState,
} from "@/app/admin/inventory/actions";
import { getStockStatus, stockStatusLabel, type StockStatus } from "@/lib/inventory-utils";

// ─────────────────────────────────────────────────────────────────────────────

type Mode = "add" | "remove" | "adjust";

interface StockControlProps {
  productId: string;
  productName: string;
  initialStock: number;
  threshold: number;
}

const INITIAL: InventoryActionState = {};

// ─────────────────────────────────────────────────────────────────────────────

export default function StockControl({
  productId,
  productName,
  initialStock,
  threshold,
}: StockControlProps) {
  const [mode, setMode] = useState<Mode>("add");

  // Separate action states for each mode
  const [addState,    addDispatch,    addPending]    = useActionState(
    addStockAction.bind(null, productId), INITIAL,
  );
  const [removeState, removeDispatch, removePending] = useActionState(
    removeStockAction.bind(null, productId), INITIAL,
  );
  const [adjustState, adjustDispatch, adjustPending] = useActionState(
    adjustStockAction.bind(null, productId), INITIAL,
  );

  // Derive displayed stock from the most recent successful action
  const displayStock =
    (mode === "add"    && addState.newStock    !== undefined ? addState.newStock    : null) ??
    (mode === "remove" && removeState.newStock !== undefined ? removeState.newStock : null) ??
    (mode === "adjust" && adjustState.newStock !== undefined ? adjustState.newStock : null) ??
    initialStock;

  const status: StockStatus = getStockStatus(displayStock, threshold);

  const activeState   = mode === "add" ? addState : mode === "remove" ? removeState : adjustState;
  const activeDispatch = mode === "add" ? addDispatch : mode === "remove" ? removeDispatch : adjustDispatch;
  const pending        = addPending || removePending || adjustPending;

  const statusColors: Record<StockStatus, { bg: string; color: string }> = {
    in_stock:    { bg: "color-mix(in srgb, #4a7c59 12%, transparent)", color: "#3a5e44" },
    low_stock:   { bg: "color-mix(in srgb, #B89A68 14%, transparent)", color: "#7a6040" },
    out_of_stock:{ bg: "color-mix(in srgb, #b84c4c 10%, transparent)", color: "#8b3a3a" },
  };
  const sc = statusColors[status];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {/* Current stock + status */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "1.75rem", fontWeight: 400, color: "var(--color-espresso)", lineHeight: 1 }}>
          {displayStock}
        </span>
        <span
          style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "0.25rem 0.5rem", background: sc.bg, color: sc.color }}
          aria-label={`Stock status: ${stockStatusLabel(status)}`}
        >
          {stockStatusLabel(status)}
        </span>
      </div>

      {/* Mode tabs */}
      <div role="tablist" aria-label="Stock adjustment mode" style={{ display: "flex", gap: "0" }}>
        {(["add", "remove", "adjust"] as Mode[]).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.625rem",
              fontWeight:    700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding:       "0.375rem 0.875rem",
              border:        "1px solid var(--border)",
              borderRight:   m !== "adjust" ? "none" : "1px solid var(--border)",
              background:    mode === m ? "var(--color-espresso)" : "var(--color-ivory)",
              color:         mode === m ? "var(--color-ivory)"    : "var(--color-espresso-muted)",
              cursor:        "pointer",
              transition:    "background 150ms ease",
            }}
          >
            {m === "add" ? "Add" : m === "remove" ? "Remove" : "Set"}
          </button>
        ))}
      </div>

      {/* Action form */}
      <form action={activeDispatch} style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label
              htmlFor={`qty-${productId}-${mode}`}
              style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}
            >
              {mode === "adjust" ? "Set to" : "Quantity"}
            </label>
            <input
              id={`qty-${productId}-${mode}`}
              name="quantity"
              type="number"
              min={mode === "adjust" ? "0" : "1"}
              step="1"
              required
              placeholder={mode === "adjust" ? `e.g. ${displayStock}` : "e.g. 10"}
              style={{
                width:      "90px",
                padding:    "0.5rem 0.625rem",
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "0.875rem",
                border:     "1px solid var(--border)",
                background: "var(--color-parchment)",
                color:      "var(--color-espresso)",
              }}
              aria-required="true"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, minWidth: "140px" }}>
            <label
              htmlFor={`reason-${productId}-${mode}`}
              style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}
            >
              Reason <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
            </label>
            <input
              id={`reason-${productId}-${mode}`}
              name="reason"
              type="text"
              placeholder={mode === "add" ? "e.g. New shipment" : mode === "remove" ? "e.g. Damaged" : "e.g. Stock count"}
              style={{
                width:      "100%",
                padding:    "0.5rem 0.625rem",
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "0.875rem",
                border:     "1px solid var(--border)",
                background: "var(--color-parchment)",
                color:      "var(--color-espresso)",
                boxSizing:  "border-box",
              }}
            />
          </div>

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
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor:        pending ? "not-allowed" : "pointer",
              opacity:       pending ? 0.7 : 1,
              transition:    "opacity 150ms ease",
              whiteSpace:    "nowrap",
              alignSelf:     "flex-end",
            }}
            aria-label={`${mode === "add" ? "Add stock to" : mode === "remove" ? "Remove stock from" : "Set stock for"} ${productName}`}
          >
            {pending ? "…" : mode === "add" ? "Add" : mode === "remove" ? "Remove" : "Set"}
          </button>
        </div>

        {/* Feedback */}
        {activeState.error && (
          <p role="alert" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "#b84c4c", margin: 0 }}>
            {activeState.error}
          </p>
        )}
        {activeState.success && (
          <p role="status" aria-live="polite" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "#3a5e44", margin: 0 }}>
            Stock updated to {displayStock}.
          </p>
        )}
      </form>
    </div>
  );
}
