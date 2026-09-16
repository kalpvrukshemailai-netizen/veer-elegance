/**
 * VEER ELEGANCE — UnreadBadge
 *
 * Server component that fetches the unread notification count and renders
 * a badge. Imported by the admin layout so the count is always fresh.
 */

import Link                          from "next/link";
import { getUnreadNotificationCount } from "@/lib/notifications";

export default async function UnreadBadge() {
  let count = 0;
  try {
    count = await getUnreadNotificationCount();
  } catch {
    // Notification table may not exist yet — fail silently
    count = 0;
  }

  return (
    <Link
      href="/admin/notifications"
      aria-label={count > 0 ? `${count} unread notification${count !== 1 ? "s" : ""}` : "Notifications"}
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        "0.3rem",
        position:   "relative",
        textDecoration: "none",
        color:      "var(--color-espresso-muted)",
      }}
    >
      {/* Bell icon */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 1.5A4.5 4.5 0 0 0 3.5 6v2.5l-1 2h11l-1-2V6A4.5 4.5 0 0 0 8 1.5ZM6.5 13a1.5 1.5 0 0 0 3 0"
          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>

      {count > 0 && (
        <span
          style={{
            fontFamily:   "var(--font-body), Manrope, sans-serif",
            fontSize:     "0.5rem",
            fontWeight:   700,
            lineHeight:   1,
            padding:      "0.15rem 0.35rem",
            background:   "var(--color-espresso)",
            color:        "var(--color-ivory)",
            borderRadius: "2px",
            letterSpacing:"0.04em",
          }}
          aria-hidden="true"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
