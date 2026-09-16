/**
 * VEER ELEGANCE — /account/addresses
 *
 * Saved addresses list page.
 * Shows all saved addresses with default indicator, edit, delete, set-default actions.
 */

import type { Metadata }  from "next";
import { redirect }       from "next/navigation";
import Link               from "next/link";
import { createClient }   from "@/lib/supabase/server";
import { getUserAddresses } from "@/lib/addresses";
import AddressActions     from "./AddressActions";

export const metadata: Metadata = {
  title: "Saved Addresses — Veer Elegance",
};

// ─────────────────────────────────────────────────────────────────────────────

export default async function AddressesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/addresses");

  const addresses = await getUserAddresses();

  const eyebrowStyle: React.CSSProperties = {
    fontFamily:    "var(--font-body), Manrope, sans-serif",
    fontSize:      "0.6875rem",
    fontWeight:    600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color:         "var(--color-gold-muted)",
    marginBottom:  "0.75rem",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
    fontSize:    "clamp(1.75rem, 4vw, 2.5rem)",
    fontWeight:  400,
    fontStyle:   "italic",
    color:       "var(--color-espresso)",
    lineHeight:  1.05,
    marginBottom: "0",
  };

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--color-parchment)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem, 5vw, 4rem)", height: "clamp(3.5rem, 6vw, 4.5rem)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" aria-label="Veer Elegance — return to homepage">
            <img src="/images/veer-elegance-logo.png" alt="Veer Elegance" style={{ width: "clamp(85px, 10vw, 120px)", height: "auto", display: "block" }} />
          </a>
        </div>
      </header>

      <main id="main-content" role="main" style={{ flex: 1, maxWidth: "860px", margin: "0 auto", width: "100%", padding: "clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)" }}>

        {/* Back */}
        <Link href="/account" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.375rem", marginBottom: "2rem" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M10 6H2M5.5 3L2 6l3.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          My Account
        </Link>

        {/* Heading */}
        <div style={{ marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "1.25rem" }} aria-hidden="true" />
          <p style={eyebrowStyle}>Account</p>
          <h1 style={headingStyle}>Saved Addresses</h1>
        </div>

        {addresses.length === 0 ? (
          /* Empty state */
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "clamp(2rem, 4vw, 3rem)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
              You have no saved addresses yet.
            </p>
            <Link href="/account/addresses/new" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-parchment)", background: "var(--color-espresso)", padding: "0.875rem 2rem", textDecoration: "none" }}>
              Add Address
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 5h8M5.5 2L8 5l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {/* Add button */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem", paddingBottom: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <Link href="/account/addresses/new" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid var(--color-espresso)", paddingBottom: "1px" }}>
                Add Address
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 5h8M5.5 2L8 5l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>

            {/* Address cards */}
            {addresses.map((addr, i) => (
              <div
                key={addr.id}
                style={{
                  borderTop:   i === 0 ? "none" : "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  padding:     "1.5rem 0",
                  display:     "flex",
                  justifyContent: "space-between",
                  alignItems:  "flex-start",
                  gap:         "1rem",
                  flexWrap:    "wrap",
                }}
              >
                {/* Address info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: 1, minWidth: "200px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-espresso)" }}>
                      {addr.first_name} {addr.last_name}
                    </p>
                    {addr.is_default && (
                      <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-gold-muted)", background: "color-mix(in srgb, var(--color-gold-muted) 12%, transparent)", padding: "0.25rem 0.5rem" }}>
                        Default
                      </span>
                    )}
                    {addr.label && (
                      <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>
                        {addr.label}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", lineHeight: 1.5 }}>
                    {addr.address}{addr.apartment ? `, ${addr.apartment}` : ""}
                  </p>
                  <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)" }}>
                    {[addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ")}
                  </p>
                  <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>
                    {addr.phone}
                  </p>
                </div>

                {/* Actions (client component for interactivity) */}
                <AddressActions address={addr} />
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
