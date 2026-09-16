"use client";

/**
 * VEER ELEGANCE — AddressActions
 *
 * Client component for Set Default / Edit / Delete actions on saved addresses.
 * Rendered inside the server-side addresses list page.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AddressRow } from "@/lib/addresses";

const linkStyle: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.625rem",
  fontWeight:    600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  textDecoration: "none",
  color:         "var(--color-espresso-muted)",
  cursor:        "pointer",
  background:    "none",
  border:        "none",
  padding:       0,
};

export default function AddressActions({ address }: { address: AddressRow }) {
  const router  = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSetDefault() {
    if (busy || address.is_default) return;
    setBusy(true);
    await fetch(`/api/addresses/${address.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ is_default: true }),
    });
    router.refresh();
    setBusy(false);
  }

  async function handleDelete() {
    if (busy) return;
    if (!confirm("Delete this address?")) return;
    setBusy(true);
    await fetch(`/api/addresses/${address.id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", alignItems: "flex-end", flexShrink: 0 }}>
      {!address.is_default && (
        <button onClick={handleSetDefault} disabled={busy} style={{ ...linkStyle, opacity: busy ? 0.5 : 1 }}>
          Set Default
        </button>
      )}
      <a href={`/account/addresses/${address.id}/edit`} style={linkStyle}>
        Edit
      </a>
      <button onClick={handleDelete} disabled={busy} style={{ ...linkStyle, color: "#b84c4c", opacity: busy ? 0.5 : 1 }}>
        {busy ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
