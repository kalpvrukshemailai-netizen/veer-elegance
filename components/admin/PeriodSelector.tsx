"use client";

/**
 * VEER ELEGANCE — Report Period Selector
 *
 * URL-driven tab strip — no client state, fully server-renderable for the
 * initial load. Custom range uses date inputs and redirects on submit.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { ReportPeriod } from "@/lib/reports";

// ─────────────────────────────────────────────────────────────────────────────

const PERIODS: { label: string; value: ReportPeriod }[] = [
  { label: "Today",      value: "today" },
  { label: "7 Days",     value: "7days" },
  { label: "30 Days",    value: "30days" },
  { label: "This Month", value: "this_month" },
  { label: "This Year",  value: "this_year" },
  { label: "All Time",   value: "all_time" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function PeriodSelector({
  current,
}: {
  current: ReportPeriod;
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (period: ReportPeriod, extraParams?: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", period);
      // Clear custom range when switching to a preset
      if (period !== "custom") { params.delete("from"); params.delete("to"); }
      if (extraParams) Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));
      router.push(`/admin/reports?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleCustomSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd   = new FormData(e.currentTarget);
      const from = fd.get("from") as string;
      const to   = fd.get("to")   as string;
      if (!from || !to) return;
      navigate("custom", { from, to });
    },
    [navigate],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

      {/* Preset tabs */}
      <nav aria-label="Report period" role="tablist">
        <div style={{ display: "flex", gap: 0, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
          {PERIODS.map(p => {
            const isActive = current === p.value;
            return (
              <button
                key={p.value}
                role="tab"
                aria-selected={isActive}
                onClick={() => navigate(p.value)}
                style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem",
                  fontWeight:    isActive ? 700 : 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding:       "0.5rem 0.875rem",
                  background:    "transparent",
                  border:        "none",
                  borderBottom:  isActive ? "2px solid var(--color-espresso)" : "2px solid transparent",
                  marginBottom:  "-1px",
                  color:         isActive ? "var(--color-espresso)" : "var(--color-espresso-muted)",
                  cursor:        "pointer",
                  whiteSpace:    "nowrap",
                  transition:    "color 120ms ease",
                }}
              >
                {p.label}
              </button>
            );
          })}
          <button
            role="tab"
            aria-selected={current === "custom"}
            onClick={() => navigate("custom")}
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    current === "custom" ? 700 : 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding:       "0.5rem 0.875rem",
              background:    "transparent",
              border:        "none",
              borderBottom:  current === "custom" ? "2px solid var(--color-espresso)" : "2px solid transparent",
              marginBottom:  "-1px",
              color:         current === "custom" ? "var(--color-espresso)" : "var(--color-espresso-muted)",
              cursor:        "pointer",
              whiteSpace:    "nowrap",
            }}
          >
            Custom
          </button>
        </div>
      </nav>

      {/* Custom range form — only shown when "custom" is selected */}
      {current === "custom" && (
        <form
          onSubmit={handleCustomSubmit}
          style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}
        >
          <label style={labelStyle} htmlFor="report-from">From</label>
          <input
            id="report-from"
            type="date"
            name="from"
            defaultValue={searchParams.get("from") ?? ""}
            required
            style={inputStyle}
          />
          <label style={labelStyle} htmlFor="report-to">To</label>
          <input
            id="report-to"
            type="date"
            name="to"
            defaultValue={searchParams.get("to") ?? ""}
            required
            style={inputStyle}
          />
          <button type="submit" style={applyBtnStyle}>Apply</button>
        </form>
      )}
    </div>
  );
}

// ─── Shared micro-styles ──────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.625rem",
  fontWeight:    700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color:         "var(--color-espresso-muted)",
};

const inputStyle: React.CSSProperties = {
  padding:    "0.4rem 0.625rem",
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize:   "0.8125rem",
  border:     "1px solid var(--border)",
  background: "var(--color-ivory)",
  color:      "var(--color-espresso)",
};

const applyBtnStyle: React.CSSProperties = {
  padding:       "0.4rem 1rem",
  background:    "var(--color-espresso)",
  color:         "var(--color-ivory)",
  border:        "none",
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.625rem",
  fontWeight:    700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor:        "pointer",
};
