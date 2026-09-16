"use client";

/**
 * VEER ELEGANCE — LoginForm
 *
 * Email + password sign-in and Google OAuth sign-in via Supabase Auth.
 * Inline validation, loading state, friendly error messages.
 * No browser alert(). No raw Supabase error exposure.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectUrl } from "@/lib/auth-redirect";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

interface LoginFormProps {
  initialNext?: string;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function LoginForm({ initialNext }: LoginFormProps) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [nextPath, setNextPath] = useState<string>(initialNext || "/account");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get("next");
    if (n) {
      setNextPath(getSafeRedirectUrl(n, "/account"));
    }

    const err = params.get("error");
    if (err === "oauth_conflict") {
      setError("An account with this email already exists. Please sign in using your password.");
    } else if (err === "oauth_failed" || err === "auth_callback_failed") {
      setError("Unable to sign in with Google. Please try again or use your password.");
    } else if (err === "missing_code") {
      setError("Authentication session could not be established. Please try again.");
    }
  }, []);

  // ── Client-side validation ────────────────────────────────────────────
  function validate(): string | null {
    if (!email.trim())        return "Please enter your email address.";
    if (!isValidEmail(email)) return "Please enter a valid email address.";
    if (!password)            return "Please enter your password.";
    return null;
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password,
      });

      if (authError) {
        setError("Incorrect email or password. Please try again.");
        return;
      }

      // Success — hard browser navigation guarantees auth cookies are attached to server requests
      const params = new URLSearchParams(window.location.search);
      const returnTo = getSafeRedirectUrl(params.get("next") || nextPath, "/account");
      window.location.href = returnTo;
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <form onSubmit={handleSubmit} noValidate style={{ width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="login-email" style={labelStyle}>Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder="you@example.com"
              disabled={loading}
              aria-required="true"
              style={inputStyle(!!error)}
              className="auth-input"
            />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="login-password" style={labelStyle}>Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              placeholder="Your password"
              disabled={loading}
              aria-required="true"
              style={inputStyle(!!error)}
              className="auth-input"
            />
          </div>

          {/* Error message */}
          {error && (
            <p role="alert" style={errorStyle}>{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={submitStyle(loading)}
            className="auth-submit-btn"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>
      </form>

      {/* ── Visual Divider ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "0.25rem 0" }}>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>
          OR
        </span>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      </div>

      {/* ── Continue with Google ── */}
      <GoogleSignInButton next={nextPath} disabled={loading} />

      {/* Switch to signup */}
      <p style={{ textAlign: "center", ...bodySmStyle, marginTop: "0.5rem" }}>
        New to Veer Elegance?{" "}
        <Link
          href={nextPath && nextPath !== "/account" ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup"}
          style={linkStyle}
        >
          Create an account →
        </Link>
      </p>
    </div>
  );
}

// ─── Shared micro-styles ──────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.6875rem",
  fontWeight:    500,
  letterSpacing: "0.08em",
  color:         "var(--color-espresso)",
  textTransform: "uppercase",
};

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    fontFamily:  "var(--font-body), Manrope, sans-serif",
    fontSize:    "0.9375rem",
    color:       "var(--color-espresso)",
    background:  "transparent",
    border:      `1.5px solid ${hasError ? "#b84c4c" : "var(--border)"}`,
    padding:     "0.8125rem 1rem",
    outline:     "none",
    width:       "100%",
    boxSizing:   "border-box",
  };
}

function submitStyle(loading: boolean): React.CSSProperties {
  return {
    width:         "100%",
    padding:       "1rem 2rem",
    marginTop:     "0.375rem",
    background:    loading ? "var(--color-espresso-muted)" : "var(--color-espresso)",
    color:         "var(--color-ivory)",
    fontFamily:    "var(--font-body), Manrope, sans-serif",
    fontSize:      "0.75rem",
    fontWeight:    600,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    border:        "none",
    cursor:        loading ? "not-allowed" : "pointer",
    transition:    "opacity 200ms ease, background 200ms ease",
    opacity:       loading ? 0.7 : 1,
  };
}

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize:   "0.8125rem",
  color:      "#b84c4c",
  lineHeight: 1.5,
  margin:     0,
};

const bodySmStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize:   "0.8125rem",
  color:      "var(--color-espresso-muted)",
};

const linkStyle: React.CSSProperties = {
  color:          "var(--color-espresso)",
  fontWeight:     600,
  textDecoration: "none",
  borderBottom:   "1px solid currentColor",
  paddingBottom:  "1px",
};
