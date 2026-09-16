"use client";

/**
 * VEER ELEGANCE — Product action buttons for the admin product list.
 * Client components that call server actions with instant optimistic feedback.
 */

import { useTransition } from "react";
import { useRouter }     from "next/navigation";
import {
  archiveProductAction,
  togglePublishedAction,
} from "@/app/admin/products/actions";

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE BUTTON
// ─────────────────────────────────────────────────────────────────────────────

export function ArchiveButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleArchive() {
    if (!window.confirm(`Archive "${name}"? It will be hidden from the store but kept in order history.`)) return;
    startTransition(async () => {
      const result = await archiveProductAction(id);
      if (result.error) { alert(result.error); return; }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={pending}
      style={actionBtnStyle}
      aria-label={`Archive ${name}`}
    >
      {pending ? "…" : "Archive"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLISH TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

export function PublishToggle({
  id,
  published,
  name,
}: {
  id:        string;
  published: boolean;
  name:      string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    startTransition(async () => {
      const result = await togglePublishedAction(id, !published);
      if (result.error) { alert(result.error); return; }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      aria-label={published ? `Unpublish ${name}` : `Publish ${name}`}
      aria-pressed={published}
      style={{
        display:       "inline-flex",
        alignItems:    "center",
        gap:           "0.375rem",
        padding:       "0.25rem 0.625rem",
        fontFamily:    "var(--font-body), Manrope, sans-serif",
        fontSize:      "0.625rem",
        fontWeight:    700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        border:        "none",
        cursor:        pending ? "not-allowed" : "pointer",
        opacity:       pending ? 0.6 : 1,
        borderRadius:  "2px",
        background:    published
          ? "color-mix(in srgb, #4a7c59 14%, transparent)"
          : "color-mix(in srgb, var(--color-espresso-muted) 10%, transparent)",
        color: published ? "#3a5e44" : "var(--color-espresso-muted)",
        transition:    "opacity 150ms ease",
      }}
    >
      <span
        style={{
          width:        "6px",
          height:       "6px",
          borderRadius: "50%",
          background:   published ? "#4a7c59" : "#aaa",
          flexShrink:   0,
        }}
        aria-hidden="true"
      />
      {pending ? "…" : published ? "Live" : "Draft"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const actionBtnStyle: React.CSSProperties = {
  background:    "none",
  border:        "none",
  padding:       "0",
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.6875rem",
  fontWeight:    600,
  letterSpacing: "0.06em",
  color:         "#b84c4c",
  cursor:        "pointer",
  textDecoration:"underline",
  textUnderlineOffset: "2px",
};
