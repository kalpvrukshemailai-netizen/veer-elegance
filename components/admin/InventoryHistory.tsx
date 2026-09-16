/**
 * VEER ELEGANCE — InventoryHistory
 *
 * Server component that renders the movement history for one product.
 * Passed pre-fetched movements — does not query Supabase itself.
 */

import type { InventoryMovementRow } from "@/lib/inventory";

// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const TYPE_LABELS: Record<string, string> = {
  stock_in:        "Stock In",
  stock_out:       "Stock Out",
  adjustment:      "Adjustment",
  order_reserved:  "Order Reserved",
  order_released:  "Order Released",
  order_completed: "Order Completed",
};

// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryHistory({
  movements,
}: {
  movements: InventoryMovementRow[];
}) {
  if (movements.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", fontStyle: "italic", margin: 0 }}>
        No movements yet. Add stock to begin tracking history.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }}
        aria-label="Inventory movement history"
      >
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Date", "Type", "Change", "Reason"].map(h => (
              <th key={h} scope="col" style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-espresso-muted)", whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movements.map((m, i) => {
            const isPositive = m.change_quantity > 0;
            return (
              <tr key={m.id} style={{ borderBottom: i < movements.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={td}>{formatDate(m.created_at)}</td>
                <td style={td}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 600 }}>
                    {TYPE_LABELS[m.movement_type] ?? m.movement_type}
                  </span>
                </td>
                <td style={td}>
                  <span style={{
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.875rem",
                    fontWeight:    700,
                    color:         isPositive ? "#3a5e44" : "#8b3a3a",
                  }}>
                    {isPositive ? "+" : ""}{m.change_quantity}
                  </span>
                </td>
                <td style={{ ...td, color: "var(--color-espresso-muted)" }}>
                  {m.reason ?? <span style={{ fontStyle: "italic", opacity: 0.6 }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const td: React.CSSProperties = {
  padding:       "0.625rem 0.75rem",
  verticalAlign: "middle",
  fontSize:      "0.8125rem",
  color:         "var(--color-espresso)",
};
