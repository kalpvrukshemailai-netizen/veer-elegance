"use client";

/**
 * VEER ELEGANCE — LogoutButton
 *
 * Signs the user out via Supabase, refreshes server state,
 * then redirects to the homepage.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  /** Render as a styled text link (default) or a full-width button */
  variant?: "link" | "button";
}

export default function LogoutButton({ variant = "link" }: LogoutButtonProps) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        style={{
          width:         "100%",
          padding:       "0.875rem 2rem",
          background:    "transparent",
          color:         loading ? "var(--color-espresso-muted)" : "var(--color-espresso)",
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.75rem",
          fontWeight:    600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          border:        "1.5px solid var(--border)",
          cursor:        loading ? "not-allowed" : "pointer",
          opacity:       loading ? 0.6 : 1,
          transition:    "opacity 200ms ease",
          display:       "flex",
          alignItems:    "center",
          justifyContent:"center",
          gap:           "0.5rem",
        }}
        className="auth-submit-btn"
        aria-label="Sign out of your account"
      >
        {loading ? "Signing out…" : "Log Out"}
      </button>
    );
  }

  // link variant
  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      style={{
        background:    "none",
        border:        "none",
        padding:       0,
        cursor:        loading ? "not-allowed" : "pointer",
        fontFamily:    "var(--font-body), Manrope, sans-serif",
        fontSize:      "0.8125rem",
        fontWeight:    600,
        letterSpacing: "0.04em",
        color:         loading ? "var(--color-espresso-muted)" : "var(--color-espresso)",
        textDecoration:"none",
        opacity:       loading ? 0.6 : 1,
      }}
      aria-label="Sign out of your account"
    >
      {loading ? "Signing out…" : "Log Out →"}
    </button>
  );
}
