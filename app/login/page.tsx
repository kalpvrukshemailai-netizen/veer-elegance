/**
 * VEER ELEGANCE — /login
 *
 * Server component shell. Redirects already-authenticated users to /account or safe ?next=.
 * Renders the LoginForm client component for unauthenticated visitors.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl } from "@/lib/auth-redirect";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title:       "Sign In — Veer Elegance",
  description: "Sign in to your Veer Elegance account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const destination = getSafeRedirectUrl(sp.next, "/account");

  // If already authenticated, redirect to next parameter or /account
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect(destination);
  }

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

      {/* ── Minimal header ──────────────────────────────────────────────── */}
      <header style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem, 5vw, 4rem)", height: "clamp(3.5rem, 6vw, 4.5rem)", display: "flex", alignItems: "center" }}>
          <a href="/" aria-label="Veer Elegance — return to homepage" style={{ display: "flex", alignItems: "center" }}>
            <img src="/images/veer-elegance-logo.png" alt="Veer Elegance" style={{ width: "clamp(85px, 10vw, 120px)", height: "auto", display: "block" }} />
          </a>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main
        id="main-content"
        style={{
          flex:           1,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)",
        }}
      >
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {/* Eyebrow */}
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginBottom: "0.875rem" }}>
            My Account
          </p>

          {/* Heading */}
          <h1 style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 2.75rem)", fontWeight: 400, fontStyle: "italic", color: "var(--color-espresso)", lineHeight: 1.05, marginBottom: "0.625rem" }}>
            Welcome back.
          </h1>

          {/* Supporting copy */}
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.9375rem", color: "var(--color-espresso-muted)", lineHeight: 1.7, marginBottom: "2.25rem" }}>
            Sign in to continue your Veer Elegance journey.
          </p>

          {/* Divider */}
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "2.25rem" }} aria-hidden="true" />

          <LoginForm initialNext={destination !== "/account" ? destination : undefined} />
        </div>
      </main>
    </div>
  );
}
