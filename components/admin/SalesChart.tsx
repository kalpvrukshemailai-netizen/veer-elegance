"use client";

/**
 * VEER ELEGANCE — Inline SVG Bar Chart
 *
 * Zero dependencies — rendered as SVG.
 * Accessible: includes a visually-hidden summary table.
 */

import type { SalesDataPoint } from "@/lib/reports";

// ─────────────────────────────────────────────────────────────────────────────

interface SalesChartProps {
  data:     SalesDataPoint[];
  period:   string;
  currency: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SalesChart({ data, period, currency }: SalesChartProps) {
  const hasData = data.some(d => d.revenue > 0 || d.orders > 0);

  if (!hasData) {
    return (
      <div style={emptyWrap}>
        <p style={eyebrow}>Sales Over Time</p>
        <div style={emptyBox}>
          <p style={emptyMsg}>No sales data yet for this period.</p>
        </div>
      </div>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const maxRev = Math.max(...data.map(d => d.revenue), 1);

  const W        = 640;
  const H        = 180;
  const PAD_L    = 56;
  const PAD_R    = 16;
  const PAD_TOP  = 16;
  const PAD_BOT  = 36;
  const plotW    = W - PAD_L - PAD_R;
  const plotH    = H - PAD_TOP - PAD_BOT;
  const barW     = Math.max(4, Math.floor(plotW / data.length) - 2);

  // Y-axis labels (4 levels)
  const yLevels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y:     PAD_TOP + plotH - f * plotH,
    label: fmt(maxRev * f),
  }));

  // Format x label based on period
  const xLabel = (s: string) => {
    if (s.includes(":")) return s;           // hour: "14:00"
    if (s.length === 7) {                    // YYYY-MM → "Aug"
      return new Date(s + "-01").toLocaleDateString("en-IN", { month: "short" });
    }
    // YYYY-MM-DD → "22 Aug" (abbreviated)
    return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  // X-axis: show at most 8 labels evenly spaced
  const xStep = Math.ceil(data.length / 8);

  return (
    <section aria-labelledby="chart-heading">
      <p id="chart-heading" style={eyebrow}>Sales Over Time</p>

      {/* SVG chart */}
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: "320px", height: "auto", display: "block" }}
          role="img"
          aria-label={`Sales chart for selected period`}
        >
          {/* Grid lines */}
          {yLevels.map(({ y }, i) => (
            <line key={i} x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
              stroke="var(--border, #e8e0d4)" strokeWidth={0.5} strokeDasharray={i === 0 ? "none" : "3 3"}
            />
          ))}

          {/* Y-axis labels */}
          {yLevels.map(({ y, label }, i) => (
            <text key={i} x={PAD_L - 6} y={y + 4} textAnchor="end"
              fontFamily="Manrope, sans-serif" fontSize={9} fill="#9a8878">
              {label}
            </text>
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const barH = (d.revenue / maxRev) * plotH;
            const x    = PAD_L + i * (plotW / data.length) + (plotW / data.length - barW) / 2;
            const y    = PAD_TOP + plotH - barH;

            return (
              <g key={i} aria-label={`${d.label}: ${fmt(d.revenue)}`}>
                <title>{d.label}: {fmt(d.revenue)} · {d.orders} order{d.orders !== 1 ? "s" : ""}</title>
                <rect
                  x={x} y={y}
                  width={barW} height={barH}
                  fill="var(--color-espresso, #3a2e1e)"
                  opacity={0.75}
                  rx={1}
                />
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.map((d, i) => {
            if (i % xStep !== 0 && i !== data.length - 1) return null;
            const x = PAD_L + i * (plotW / data.length) + plotW / data.length / 2;
            return (
              <text key={i} x={x} y={H - PAD_BOT + 14} textAnchor="middle"
                fontFamily="Manrope, sans-serif" fontSize={8} fill="#9a8878">
                {xLabel(d.label)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Accessible summary table */}
      <details style={{ marginTop: "0.5rem" }}>
        <summary style={detailsToggle}>View data table</summary>
        <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem" }}
            aria-label="Sales data table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={th}>Period</th>
                <th style={th}>Revenue</th>
                <th style={th}>Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.filter(d => d.revenue > 0 || d.orders > 0).map((d, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={td}>{d.label}</td>
                  <td style={td}>{fmt(d.revenue)}</td>
                  <td style={td}>{d.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const eyebrow: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.5625rem",
  fontWeight:    700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color:         "var(--color-espresso-muted)",
  marginBottom:  "0.75rem",
};
const emptyWrap: React.CSSProperties = { display: "flex", flexDirection: "column" };
const emptyBox: React.CSSProperties = {
  border:     "1px solid var(--border)",
  background: "var(--color-ivory)",
  padding:    "2.5rem",
  textAlign:  "center",
};
const emptyMsg: React.CSSProperties = {
  fontFamily:  "var(--font-body), Manrope, sans-serif",
  fontSize:    "0.8125rem",
  color:       "var(--color-espresso-muted)",
  fontStyle:   "italic",
};
const detailsToggle: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.625rem",
  letterSpacing: "0.08em",
  color:         "var(--color-espresso-muted)",
  cursor:        "pointer",
};
const th: React.CSSProperties = {
  padding: "0.375rem 0.625rem", textAlign: "left",
  fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
  color: "var(--color-espresso-muted)",
};
const td: React.CSSProperties = { padding: "0.375rem 0.625rem", color: "var(--color-espresso)" };
