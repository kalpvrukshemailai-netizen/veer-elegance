/**
 * VEER ELEGANCE — /account/complete-profile
 *
 * Dedicated smart profile completion step for Google / new users before checkout.
 * Collects name, phone, and delivery address to populate public.profiles and public.addresses.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl } from "@/lib/auth-redirect";
import CompleteProfileForm from "@/components/auth/CompleteProfileForm";

export const metadata: Metadata = {
  title:       "Complete Your Details — Veer Elegance",
  description: "Save your delivery details for seamless orders and checkout.",
};

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const safeNext = getSafeRedirectUrl(sp.next, "/checkout");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/account/complete-profile")}`);
  }

  // ── Fetch existing profile row ─────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const meta = user.user_metadata ?? {};
  const initialFirstName =
    profile?.first_name ||
    (meta.first_name as string | undefined) ||
    (meta.given_name as string | undefined) ||
    ((meta.full_name || meta.name || "") as string).split(" ")[0] ||
    "";

  const initialLastName =
    profile?.last_name ||
    (meta.last_name as string | undefined) ||
    (meta.family_name as string | undefined) ||
    ((meta.full_name || meta.name || "") as string).split(" ").slice(1).join(" ") ||
    "";

  // ── Check if user already has a complete address ───────────────────────────
  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, phone, address, city, state, postal_code")
    .eq("user_id", user.id);

  const hasCompleteAddress = Boolean(
    addresses &&
    addresses.length > 0 &&
    addresses.some(
      a =>
        Boolean(a.phone?.trim()) &&
        Boolean(a.address?.trim()) &&
        Boolean(a.city?.trim()) &&
        Boolean(a.state?.trim()) &&
        Boolean(a.postal_code?.trim()),
    ),
  );

  // If already complete, skip directly to destination
  if (hasCompleteAddress && (initialFirstName || initialLastName)) {
    redirect(safeNext);
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
        <div style={{ width: "100%", maxWidth: "480px" }}>

          {/* Eyebrow */}
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginBottom: "0.875rem" }}>
            My Account
          </p>

          {/* Heading */}
          <h1 style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 2.75rem)", fontWeight: 400, fontStyle: "italic", color: "var(--color-espresso)", lineHeight: 1.05, marginBottom: "0.625rem" }}>
            Complete Your Details
          </h1>

          {/* Supporting copy */}
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.9375rem", color: "var(--color-espresso-muted)", lineHeight: 1.7, marginBottom: "2.25rem" }}>
            You&apos;re almost ready to shop. Save your details for seamless delivery and order updates.
          </p>

          {/* Divider */}
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "2.25rem" }} aria-hidden="true" />

          <CompleteProfileForm
            initialFirstName={initialFirstName}
            initialLastName={initialLastName}
            userEmail={user.email ?? ""}
            next={safeNext}
          />
        </div>
      </main>
    </div>
  );
}
