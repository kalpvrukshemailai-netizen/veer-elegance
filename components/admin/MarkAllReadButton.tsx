"use client";

import { useActionState } from "react";
import { markAllReadAction, type NotificationActionState } from "@/app/admin/notifications/actions";

export function MarkAllReadButton() {
  const [, dispatch, pending] = useActionState(markAllReadAction, {} as NotificationActionState);

  return (
    <form action={dispatch}>
      <button
        type="submit"
        disabled={pending}
        style={{
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.625rem",
          fontWeight:    700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          background:    "transparent",
          border:        "1px solid var(--border)",
          color:         "var(--color-espresso)",
          padding:       "0.45rem 1rem",
          cursor:        pending ? "not-allowed" : "pointer",
          opacity:       pending ? 0.6 : 1,
        }}
        aria-label="Mark all notifications as read"
      >
        {pending ? "Marking…" : "Mark all as read"}
      </button>
    </form>
  );
}
