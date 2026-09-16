"use client";

/**
 * VEER ELEGANCE — SignupForm
 *
 * Email + password account creation and Google OAuth sign-up via Supabase Auth.
 * Handles both email-confirmation-required and auto-confirm flows.
 * All validation is inline — no browser alert().
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectUrl } from "@/lib/auth-redirect";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

interface SignupFormProps {
  initialNext?: string;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

type FieldErrors = Partial<Record<
  "firstName" | "lastName" | "email" | "password" | "confirmPassword",
  string
>>;

export default function SignupForm({ initialNext }: SignupFormProps) {
  const router = useRouter();

  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nextPath,        setNextPath]        = useState<string>(initialNext || "/account");

  const [errors,  setErrors]  = useState<FieldErrors>({});
  const [apiError,setApiError]= useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false); // email-confirmation flow

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get("next");
    if (n) {
      setNextPath(getSafeRedirectUrl(n, "/account"));
    }
  }, []);

  // ── Validation ────────────────────────────────────────────────────────
  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!firstName.trim())          e.firstName       = "First name is required.";
    if (!lastName.trim())           e.lastName        = "Last name is required.";
    if (!email.trim())              e.email           = "Email address is required.";
    else if (!isValidEmail(email))  e.email           = "Please enter a valid email address.";
    if (!password)                  e.password        = "Password is required.";
    else if (password.length < 8)   e.password        = "Password must be at least 8 characters.";
    if (!confirmPassword)           e.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword)
      e.confirmPassword = "Passwords do not match.";
    return e;
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email:    email.trim(),
        password,
        options:  {
          data: {
            first_name: firstName.trim(),
            last_name:  lastName.trim(),
          },
        },
      });

      if (authError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Supabase signup error:", {
            message: authError.message,
            status:  authError.status,
            code:    (authError as { code?: string }).code,
          });
        }

        const msg = authError.message?.toLowerCase() ?? "";

        if (msg.includes("signups not allowed") || msg.includes("signup is disabled") || msg.includes("email signups are disabled")) {
          setApiError("Email sign-ups are currently disabled. Please contact support.");
        } else if (msg.includes("already registered") || msg.includes("user already exists") || msg.includes("email address is already registered")) {
          setApiError("An account with this email already exists. Please sign in instead.");
        } else if (msg.includes("password") && (msg.includes("weak") || msg.includes("short") || msg.includes("characters"))) {
          setApiError("Your password is too weak. Please choose a stronger password.");
        } else if (msg.includes("invalid email") || msg.includes("valid email")) {
          setApiError("Please enter a valid email address.");
        } else if (msg.includes("rate limit") || msg.includes("too many requests")) {
          setApiError("Too many attempts. Please wait a moment and try again.");
        } else if (msg.includes("network") || msg.includes("fetch")) {
          setApiError("Network error. Please check your connection and try again.");
        } else {
          setApiError(
            process.env.NODE_ENV !== "production"
              ? `Unable to create account: ${authError.message}`
              : "Unable to create account. Please try again.",
          );
        }
        return;
      }

      const sessionExists = Boolean(data.session);

      if (sessionExists) {
        // Auto-confirm: user is immediately logged in
        router.refresh();
        const destination = getSafeRedirectUrl(nextPath, "/account");
        router.push(destination);
      } else {
        // Email confirmation required
        setSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Success state (email confirmation required) ───────────────────────
  if (success) {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          border: "1.5px solid var(--color-gold-muted)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto",
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10l4 4 8-8" stroke="var(--color-gold-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginBottom: "0.75rem" }}>
            Account Created
          </p>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.9375rem", color: "var(--color-espresso-muted)", lineHeight: 1.7 }}>
            Please check your email to confirm your account before signing in.
          </p>
        </div>
        <Link
          href={nextPath && nextPath !== "/account" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
          style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "2px" }}
        >
          Back to Sign In →
        </Link>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <form onSubmit={handleSubmit} noValidate style={{ width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>

          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }} className="auth-name-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label htmlFor="signup-first-name" style={labelStyle}>First name</label>
              <input
                id="signup-first-name"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); clearErr("firstName"); }}
                disabled={loading}
                aria-required="true"
                style={inputStyle(!!errors.firstName)}
                className="auth-input"
              />
              {errors.firstName && <p role="alert" style={errorStyle}>{errors.firstName}</p>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label htmlFor="signup-last-name" style={labelStyle}>Last name</label>
              <input
                id="signup-last-name"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={e => { setLastName(e.target.value); clearErr("lastName"); }}
                disabled={loading}
                aria-required="true"
                style={inputStyle(!!errors.lastName)}
                className="auth-input"
              />
              {errors.lastName && <p role="alert" style={errorStyle}>{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="signup-email" style={labelStyle}>Email address</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => { setEmail(e.target.value); clearErr("email"); }}
              placeholder="you@example.com"
              disabled={loading}
              aria-required="true"
              style={inputStyle(!!errors.email)}
              className="auth-input"
            />
            {errors.email && <p role="alert" style={errorStyle}>{errors.email}</p>}
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="signup-password" style={labelStyle}>Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => { setPassword(e.target.value); clearErr("password"); }}
              placeholder="At least 8 characters"
              disabled={loading}
              aria-required="true"
              style={inputStyle(!!errors.password)}
              className="auth-input"
            />
            {errors.password && <p role="alert" style={errorStyle}>{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="signup-confirm-password" style={labelStyle}>Confirm password</label>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); clearErr("confirmPassword"); }}
              placeholder="Repeat your password"
              disabled={loading}
              aria-required="true"
              style={inputStyle(!!errors.confirmPassword)}
              className="auth-input"
            />
            {errors.confirmPassword && <p role="alert" style={errorStyle}>{errors.confirmPassword}</p>}
          </div>

          {/* API-level error */}
          {apiError && <p role="alert" style={errorStyle}>{apiError}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={submitStyle(loading)}
            className="auth-submit-btn"
          >
            {loading ? "Creating account…" : "Create Account"}
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

      {/* Switch to login */}
      <p style={{ textAlign: "center", fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", marginTop: "0.5rem" }}>
        Already have an account?{" "}
        <Link
          href={nextPath && nextPath !== "/account" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
          style={{ color: "var(--color-espresso)", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "1px" }}
        >
          Sign in →
        </Link>
      </p>
    </div>
  );

  function clearErr(k: keyof FieldErrors) {
    setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  }
}

// ─── Shared styles ────────────────────────────────────────────────────────────

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
    opacity:       loading ? 0.7 : 1,
    transition:    "opacity 200ms ease",
  };
}

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize:   "0.8125rem",
  color:      "#b84c4c",
  lineHeight: 1.5,
};
