/**
 * VEER ELEGANCE — /admin/notifications
 *
 * Admin notification center.
 * requireAdmin() guards this page server-side.
 * Filter: ?tab=all (default) or ?tab=unread
 */

import type { Metadata }        from "next";
import Link                     from "next/link";
import { requireAdmin }         from "@/lib/admin";
import { getAdminNotifications, getUnreadNotificationCount } from "@/lib/notifications";
import { NotificationItem }     from "@/components/admin/NotificationItem";
import { MarkAllReadButton }    from "@/components/admin/MarkAllReadButton";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Notifications — Veer Elegance Admin",
};

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin("/admin/notifications");

  const sp       = await searchParams;
  const tab      = sp.tab === "unread" ? "unread" : "all";
  const unreadOnly = tab === "unread";

  const [notifications, unreadCount] = await Promise.all([
    getAdminNotifications(unreadOnly),
    getUnreadNotificationCount(),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* ── Heading ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
          <p style={eyebrow}>Notifications</p>
          <h2 style={pageHeading}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </h2>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <nav aria-label="Notification filter" role="tablist">
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
          {[
            { label: "All",    value: "all" },
            { label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`, value: "unread" },
          ].map(t => {
            const isActive = tab === t.value;
            return (
              <Link key={t.value} href={`/admin/notifications?tab=${t.value}`} role="tab" aria-selected={isActive}
                style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem", fontWeight: isActive ? 700 : 500,
                  letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.5rem 0.875rem",
                  textDecoration:"none",
                  color:         isActive ? "var(--color-espresso)" : "var(--color-espresso-muted)",
                  borderBottom:  isActive ? "2px solid var(--color-espresso)" : "2px solid transparent",
                  marginBottom:  "-1px", whiteSpace: "nowrap",
                }}>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Notification list ─────────────────────────────────────────── */}
      {notifications.length === 0 ? (
        <div style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", padding: "3rem", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
            {tab === "unread" ? "No unread notifications." : "No notifications yet."}
          </p>
        </div>
      ) : (
        <div
          role="list"
          aria-label="Notifications"
          style={{ border: "1px solid var(--border)", background: "var(--color-ivory)", overflow: "hidden", display: "flex", flexDirection: "column", gap: 0 }}
        >
          {notifications.map((n, i) => (
            <div key={n.id} style={{ borderBottom: i < notifications.length - 1 ? "1px solid var(--border)" : "none" }}>
              <NotificationItem n={n} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700,
  letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginBottom: "0.5rem",
};
const pageHeading: React.CSSProperties = {
  fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 3vw, 2rem)",
  fontWeight: 400, fontStyle: "italic", color: "var(--color-espresso)", lineHeight: 1.05, margin: 0,
};
