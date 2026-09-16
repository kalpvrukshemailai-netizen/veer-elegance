"use client";

/**
 * VEER ELEGANCE — GoogleSignInButton
 *
 * Initiates Supabase Google OAuth sign-in with safe redirect URL preservation.
 * Includes loading, disabled, and friendly inline error states.
 * Uses the Veer Elegance design language (understated luxury, parchment background, clean typography).
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";

interface GoogleSignInButtonProps {
  next?: string;
  label?: string;
  disabled?: boolean;
}

export default function GoogleSignInButton({
  next,
  label = "Continue with Google",
  disabled = false,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleGoogleSignIn() {
    if (loading || disabled) return;
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = getAuthCallbackUrl(next);

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (authError) {
        console.error("[GoogleSignIn]", authError.message);
        if (
          authError.message?.toLowerCase().includes("conflict") ||
          authError.message?.toLowerCase().includes("already registered")
        ) {
          setError("An account with this email already exists. Please sign in with your email and password.");
        } else {
          setError("Unable to connect with Google. Please try again or use your password.");
        }
        setLoading(false);
      }
      // If successful, Supabase navigates the browser to the Google OAuth consent screen.
    } catch {
      setError("An unexpected error occurred. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading || disabled}
        style={{
          width:           "100%",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          gap:             "0.75rem",
          padding:         "0.875rem 1.5rem",
          background:      "transparent",
          border:          "1.5px solid var(--border)",
          color:           "var(--color-espresso)",
          fontFamily:      "var(--font-body), Manrope, sans-serif",
          fontSize:        "0.75rem",
          fontWeight:      600,
          letterSpacing:   "0.12em",
          textTransform:   "uppercase",
          cursor:          loading || disabled ? "not-allowed" : "pointer",
          opacity:         loading || disabled ? 0.65 : 1,
          transition:      "border-color 200ms ease, background 200ms ease, opacity 200ms ease",
        }}
        className="google-auth-btn"
        aria-label={label}
      >
        {/* Google G logo */}
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.41 7.34 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.59 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>

        <span>{loading ? "Connecting to Google…" : label}</span>
      </button>

      {error && (
        <p role="alert" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "#b84c4c", lineHeight: 1.5, margin: 0, textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}
