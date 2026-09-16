/**
 * VEER ELEGANCE — /admin/inventory
 *
 * Owner inventory management page with live quick search and stock controls.
 * requireAdmin() guard — customers redirected to /.
 */

import type { Metadata }    from "next";
import { requireAdmin }     from "@/lib/admin";
import { getInventory }     from "@/lib/inventory";
import InventoryTableClient from "@/components/admin/InventoryTableClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inventory — Veer Elegance Admin",
};

export default async function AdminInventoryPage() {
  await requireAdmin("/admin/inventory");

  const inventory = await getInventory();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ── Heading ───────────────────────────────────────────────────── */}
      <div>
        <div
          style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }}
          aria-hidden="true"
        />
        <p style={eyebrow}>Inventory</p>
        <h2 style={pageHeading}>Stock Management</h2>
      </div>

      {/* ── Client table with search, filters & inline controls ───────── */}
      <InventoryTableClient initialInventory={inventory} />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const eyebrow: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.625rem",
  fontWeight:    700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color:         "var(--color-gold-muted)",
  marginBottom:  "0.5rem",
};

const pageHeading: React.CSSProperties = {
  fontFamily:    "var(--font-display), 'Cormorant Garamond', serif",
  fontSize:      "clamp(1.5rem, 3vw, 2rem)",
  fontWeight:    400,
  fontStyle:     "italic",
  color:         "var(--color-espresso)",
  lineHeight:    1.05,
  margin:        0,
};
