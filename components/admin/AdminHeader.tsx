"use client";

/**
 * VEER ELEGANCE — AdminHeader
 *
 * Compact top bar for the admin area.
 * Shows current page title (derived from pathname), admin indicator,
 * and quick actions.
 *
 * rightSlot: optional server-rendered node (e.g. UnreadBadge) injected
 * between the Store link and Logout button — sits in the same flex row,
 * eliminating any absolute-position collision.
 */

import { usePathname } from "next/navigation";
import Link            from "next/link";
import LogoutButton    from "@/components/auth/LogoutButton";

// ── Map pathnames to human-readable page titles ───────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/admin":               "Overview",
  "/admin/orders":        "Orders",
  "/admin/products":      "Products",
  "/admin/inventory":     "Inventory",
  "/admin/customers":     "Customers",
  "/admin/reports":       "Reports",
  "/admin/notifications": "Notifications",
};

// ─────────────────────────────────────────────────────────────────────────────

interface AdminHeaderProps {
  /** Server-rendered slot rendered between Store and Logout. */
  rightSlot?: React.ReactNode;
}

export default function AdminHeader({ rightSlot }: AdminHeaderProps) {
  const pathname = usePathname();
  const title    = PAGE_TITLES[pathname] ?? "Admin";

  return (
    <header
      style={{
        height:         "clamp(3rem, 4vw, 3.5rem)",
        borderBottom:   "1px solid var(--border)",
        background:     "var(--color-ivory)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0 clamp(1.5rem, 4vw, 3rem)",
        flexShrink:     0,
        gap:            "1rem",
      }}
    >
      {/* ── Page title ─────────────────────────────────────────────── */}
      <h1
        style={{
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.875rem",
          fontWeight:    600,
          letterSpacing: "0.06em",
          color:         "var(--color-espresso)",
          margin:        0,
          flexShrink:    0,
        }}
      >
        {title}
      </h1>

      {/* ── Right actions — single flat flex row, no absolute children ── */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "1.5rem",         // 24px — consistent between every item
          flexShrink: 0,
        }}
      >
        {/* Admin badge */}
        <span
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.5625rem",
            fontWeight:    700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color:         "var(--color-gold-muted)",
            background:    "color-mix(in srgb, var(--color-gold-muted) 12%, transparent)",
            padding:       "0.25rem 0.625rem",
            lineHeight:    1,
            whiteSpace:    "nowrap",
          }}
          aria-label="Admin access"
        >
          Admin
        </span>

        {/* Store link */}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.75rem",
            fontWeight:    600,
            letterSpacing: "0.08em",
            color:         "var(--color-espresso-muted)",
            textDecoration:"none",
            display:       "flex",
            alignItems:    "center",
            gap:           "0.3rem",
            whiteSpace:    "nowrap",
          }}
          aria-label="View storefront in new tab"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M5 2H2v8h8V7M7 2h3v3M10 2 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Store
        </Link>

        {/*
          Notification bell slot — rendered by the server layout as <UnreadBadge />.
          Sits in its own flex cell; badge count is position:relative inside UnreadBadge
          so it does not affect the surrounding layout.
        */}
        {rightSlot}

        {/* Logout */}
        <LogoutButton variant="link" />
      </div>
    </header>
  );
}
