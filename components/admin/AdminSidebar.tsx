"use client";

/**
 * VEER ELEGANCE — AdminSidebar
 *
 * Responsive admin sidebar navigation.
 * Desktop: fixed left panel.
 * Mobile: hamburger-triggered slide-in drawer.
 *
 * Future routes are listed but marked inactive — they never 404.
 */

import { useState }     from "react";
import Link             from "next/link";
import { usePathname }  from "next/navigation";
import LogoutButton     from "@/components/auth/LogoutButton";

// ─────────────────────────────────────────────────────────────────────────────

type NavItem = {
  label:  string;
  href:   string;
  ready:  boolean;        // false = not yet built; renders as inactive
  icon:   React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview",          href: "/admin",                   ready: true,  icon: <GridIcon /> },
  { label: "Orders",            href: "/admin/orders",            ready: true,  icon: <BagIcon /> },
  { label: "Products",          href: "/admin/products",          ready: true,  icon: <TagIcon /> },
  { label: "Complete the Look", href: "/admin/complete-the-look", ready: true,  icon: <SparklesIcon /> },
  { label: "Inventory",         href: "/admin/inventory",         ready: true,  icon: <BoxIcon /> },
  { label: "Coupons",           href: "/admin/coupons",           ready: true,  icon: <TicketIcon /> },
  { label: "Reviews",           href: "/admin/reviews",           ready: true,  icon: <StarIcon /> },
  { label: "Customers",         href: "/admin/customers",         ready: true,  icon: <UsersIcon /> },
  { label: "Enquiries",         href: "/admin/enquiries",         ready: true,  icon: <MailIcon /> },
  { label: "Content",           href: "/admin/content",           ready: true,  icon: <ContentIcon /> },
  { label: "Reports",           href: "/admin/reports",           ready: true,  icon: <ChartIcon /> },
  { label: "Notifications",     href: "/admin/notifications",     ready: true,  icon: <BellIcon /> },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminSidebar() {
  const pathname     = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Mobile hamburger button ──────────────────────────────── */}
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        style={{
          display:   "none",
          position:  "fixed",
          top:       "1rem",
          left:      "1rem",
          zIndex:    200,
          background:"var(--color-espresso)",
          border:    "none",
          borderRadius: "2px",
          padding:   "0.5rem",
          cursor:    "pointer",
          color:     "var(--color-ivory)",
        }}
        className="admin-hamburger"
      >
        <MenuIcon />
      </button>

      {/* ── Mobile overlay ───────────────────────────────────────── */}
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          style={{
            display:  "none",
            position: "fixed",
            inset:    0,
            background: "rgba(0,0,0,0.4)",
            zIndex:   149,
          }}
          className="admin-overlay"
        />
      )}

      {/* ── Sidebar panel ────────────────────────────────────────── */}
      <aside
        aria-label="Admin navigation"
        style={{
          width:          "220px",
          flexShrink:     0,
          borderRight:    "1px solid var(--border)",
          background:     "var(--color-ivory)",
          display:        "flex",
          flexDirection:  "column",
          height:         "100dvh",
          position:       "sticky",
          top:            0,
          overflowY:      "auto",
        }}
        className={`admin-sidebar${open ? " admin-sidebar--open" : ""}`}
      >
        {/* Brand */}
        <div style={{ padding: "1.5rem 1.25rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <Link href="/" tabIndex={-1} aria-hidden="true">
            <img
              src="/images/veer-elegance-logo.png"
              alt="Veer Elegance"
              style={{ width: "100px", height: "auto", display: "block" }}
            />
          </Link>
          <p style={{ marginTop: "0.5rem", fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-gold-muted)" }}>
            Admin
          </p>
        </div>

        {/* Nav */}
        <nav aria-label="Admin sections" style={{ flex: 1, padding: "1rem 0" }}>
          <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.125rem" }}>
            {NAV_ITEMS.map(({ label, href, ready, icon }) => {
              const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));

              if (!ready) {
                return (
                  <li key={href}>
                    <span
                      aria-disabled="true"
                      title={`${label} — coming soon`}
                      style={{
                        display:     "flex",
                        alignItems:  "center",
                        gap:         "0.625rem",
                        padding:     "0.5625rem 1.25rem",
                        fontSize:    "0.8125rem",
                        fontWeight:  500,
                        color:       "var(--color-espresso-muted)",
                        opacity:     0.45,
                        cursor:      "default",
                        userSelect:  "none",
                      }}
                    >
                      {icon}
                      {label}
                    </span>
                  </li>
                );
              }

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    style={{
                      display:     "flex",
                      alignItems:  "center",
                      gap:         "0.625rem",
                      padding:     "0.5625rem 1.25rem",
                      fontSize:    "0.8125rem",
                      fontWeight:  isActive ? 600 : 500,
                      color:       isActive ? "var(--color-espresso)" : "var(--color-espresso-muted)",
                      background:  isActive ? "color-mix(in srgb, var(--color-espresso) 6%, transparent)" : "transparent",
                      borderLeft:  isActive ? "2px solid var(--color-espresso)" : "2px solid transparent",
                      textDecoration: "none",
                      transition:  "background 150ms ease, color 150ms ease",
                    }}
                    className="admin-nav-link"
                  >
                    {icon}
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <Link
            href="/"
            style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-espresso-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.375rem" }}
          >
            <StoreIcon />
            View Store
          </Link>
          <LogoutButton variant="link" />
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon components — clean 16px stroked icons
// ─────────────────────────────────────────────────────────────────────────────

function GridIcon()  { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><rect x="1" y="1" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/></svg>; }
function BagIcon()   { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M2 4h11l-1.5 8H3.5L2 4Z" stroke="currentColor" strokeWidth="1.2"/><path d="M5 4V3a2.5 2.5 0 0 1 5 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function TagIcon()   { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M1 8.5 8.5 1H14v5.5L6.5 14 1 8.5Z" stroke="currentColor" strokeWidth="1.2"/><circle cx="11" cy="4" r="1" fill="currentColor"/></svg>; }
function BoxIcon()   { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M7.5 1.5 13 4v7l-5.5 2.5L2 11V4l5.5-2.5Z" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 1.5v12M2 4l5.5 3M13 4l-5.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function UsersIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 13c0-2.761 2.239-4 5-4s5 1.239 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M11 3.5a2 2 0 0 1 0 4M13 13c0-1.864-1.07-3.148-2.5-3.65" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function ChartIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M1 13h13M4 13V7M7.5 13V4M11 13V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function MailIcon()    { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><rect x="1.5" y="3" width="12" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 4.5L7.5 8.5L13.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function ContentIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M2.5 1.5h7l3 3v9h-10v-12Z" stroke="currentColor" strokeWidth="1.2"/><path d="M9.5 1.5v3h3M4.5 7h6M4.5 9.5h6M4.5 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function BellIcon()    { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M7.5 1.5a5 5 0 0 1 5 5v3.5H2.5V6.5a5 5 0 0 1 5-5ZM6 10.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function TicketIcon()  { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M1 4.5A1.5 1.5 0 0 1 2.5 3h10A1.5 1.5 0 0 1 14 4.5v1.5a1.5 1.5 0 0 0 0 3v1.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 1 10.5V9a1.5 1.5 0 0 0 0-3V4.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M5.5 5v5M9.5 7.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function StoreIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1 5h11M2 5V11h9V5M5.5 11V7.5h2V11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 5l1.5-3h8L12 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>; }
function MenuIcon()  { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function StarIcon()  { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M7.5 1.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function SparklesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M7.5 1.5C7.5 4.8 4.8 7.5 1.5 7.5C4.8 7.5 7.5 10.2 7.5 13.5C7.5 10.2 10.2 7.5 13.5 7.5C10.2 7.5 7.5 4.8 7.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="12" cy="3" r="1" fill="currentColor" />
    </svg>
  );
}
