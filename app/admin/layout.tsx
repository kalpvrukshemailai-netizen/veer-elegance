/**
 * VEER ELEGANCE — /admin layout
 *
 * Shared layout for all /admin/* routes.
 * Does NOT duplicate auth check — each page calls requireAdmin() directly
 * so the guard runs at the correct RSC level.
 *
 * UnreadBadge is passed as rightSlot into AdminHeader so it renders inside
 * the header's own flex row — no absolute positioning, no overlap.
 */

import type { Metadata } from "next";
import AdminSidebar      from "@/components/admin/AdminSidebar";
import AdminHeader       from "@/components/admin/AdminHeader";
import UnreadBadge       from "@/components/admin/UnreadBadge";

export const metadata: Metadata = {
  title: "Admin — Veer Elegance",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display:    "flex",
      minHeight:  "100dvh",
      background: "var(--color-parchment)",
      fontFamily: "var(--font-body), Manrope, sans-serif",
    }}>
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <AdminSidebar />

      {/* ── Main area ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/*
          Pass UnreadBadge as a server-rendered rightSlot prop.
          AdminHeader renders it inline in its flex row — between Store and Logout.
        */}
        <AdminHeader rightSlot={<UnreadBadge />} />

        <main
          id="admin-main"
          role="main"
          style={{
            flex:      1,
            overflowY: "auto",
            padding:   "clamp(1.5rem, 3vw, 2.5rem) clamp(1.5rem, 4vw, 3rem)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
