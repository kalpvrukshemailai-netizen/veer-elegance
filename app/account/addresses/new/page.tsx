/**
 * VEER ELEGANCE — /account/addresses/new
 *
 * Add a new saved address.
 */

import type { Metadata }  from "next";
import { redirect }       from "next/navigation";
import Link               from "next/link";
import { createClient }   from "@/lib/supabase/server";
import AddressForm        from "@/components/account/AddressForm";

export const metadata: Metadata = {
  title: "Add Address — Veer Elegance",
};

export default async function NewAddressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/addresses/new");

  const headingStyle: React.CSSProperties = {
    fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
    fontSize:    "clamp(1.75rem, 4vw, 2.5rem)",
    fontWeight:  400,
    fontStyle:   "italic",
    color:       "var(--color-espresso)",
    lineHeight:  1.05,
  };

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--color-parchment)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem, 5vw, 4rem)", height: "clamp(3.5rem, 6vw, 4.5rem)", display: "flex", alignItems: "center" }}>
          <a href="/" aria-label="Veer Elegance — return to homepage">
            <img src="/images/veer-elegance-logo.png" alt="Veer Elegance" style={{ width: "clamp(85px, 10vw, 120px)", height: "auto", display: "block" }} />
          </a>
        </div>
      </header>

      <main id="main-content" role="main" style={{ flex: 1, maxWidth: "680px", margin: "0 auto", width: "100%", padding: "clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)" }}>

        <Link href="/account/addresses" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.375rem", marginBottom: "2rem" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M10 6H2M5.5 3L2 6l3.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Saved Addresses
        </Link>

        <div style={{ marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "1.25rem" }} aria-hidden="true" />
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginBottom: "0.75rem" }}>
            Account
          </p>
          <h1 style={headingStyle}>Add New Address</h1>
        </div>

        <AddressForm mode="new" />
      </main>
    </div>
  );
}
