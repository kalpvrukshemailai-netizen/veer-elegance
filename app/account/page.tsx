/**
 * VEER ELEGANCE — /account
 *
 * Protected account page — server-side session guard.
 * Unauthenticated visitors → /login?next=/account
 * Authenticated users see: profile, real order history, logout.
 */

import type { Metadata }    from "next";
import { redirect }         from "next/navigation";
import Link                 from "next/link";
import { createClient }     from "@/lib/supabase/server";
import { getUserOrders, orderDisplayRef } from "@/lib/orders";
import { getUserAddresses }  from "@/lib/addresses";
import LogoutButton         from "@/components/auth/LogoutButton";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       "My Account — Veer Elegance",
  description: "Manage your Veer Elegance account and view your orders.",
};

// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatAmount(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(amount);
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending:    "Pending",
    confirmed:  "Confirmed",
    processing: "Processing",
    shipped:    "Shipped",
    delivered:  "Delivered",
    cancelled:  "Cancelled",
  };
  return map[status] ?? status;
}

function paymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending:    "Awaiting Payment",
    authorized: "Authorized",
    captured:   "Paid",
    failed:     "Payment Failed",
    refunded:   "Refunded",
  };
  return map[status] ?? status;
}

function paymentStatusColor(status: string): string {
  switch (status) {
    case "captured":   return "#2d7a3f";
    case "failed":     return "#b84c4c";
    case "authorized": return "#7a6b2d";
    case "refunded":   return "#5a5a8a";
    default:           return "var(--color-espresso-muted)";
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  // Fetch profile from public.profiles with fallback to user_metadata
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const meta = user.user_metadata ?? {};
  const firstName =
    profile?.first_name ||
    (meta.first_name as string | undefined) ||
    (meta.given_name as string | undefined) ||
    ((meta.full_name || meta.name || "") as string).split(" ")[0] ||
    "";

  const lastName =
    profile?.last_name ||
    (meta.last_name as string | undefined) ||
    (meta.family_name as string | undefined) ||
    ((meta.full_name || meta.name || "") as string).split(" ").slice(1).join(" ") ||
    "";

  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const orders    = await getUserOrders();
  const addresses = await getUserAddresses();

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

      {/* ── Minimal header ──────────────────────────────────────────────── */}
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--color-parchment)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem, 5vw, 4rem)", height: "clamp(3.5rem, 6vw, 4.5rem)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" aria-label="Veer Elegance — return to homepage">
            <img src="/images/veer-elegance-logo.png" alt="Veer Elegance" style={{ width: "clamp(85px, 10vw, 120px)", height: "auto", display: "block" }} />
          </a>
          <LogoutButton variant="link" />
        </div>
      </header>

      <main id="main-content" role="main" style={{ flex: 1, maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)" }}>

        {/* Page heading */}
        <div style={{ marginBottom: "clamp(2.5rem, 5vw, 4rem)" }}>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "1.25rem" }} aria-hidden="true" />
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginBottom: "0.75rem" }}>
            My Account
          </p>
          <h1 style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 400, fontStyle: "italic", color: "var(--color-espresso)", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            Welcome{firstName ? `, ${firstName}` : " back"}.
          </h1>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.9375rem", color: "var(--color-espresso-muted)" }}>
            {user.email}
          </p>
        </div>

        {/* ── Account grid ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "clamp(1rem, 3vw, 1.75rem)", marginBottom: "clamp(3rem, 6vw, 5rem)" }}>

          {/* Profile */}
          <AccountSection title="Profile">
            <Row label="Name" value={fullName || "—"} />
            <Row label="Email" value={user.email ?? "—"} />
          </AccountSection>

          {/* Saved Addresses */}
          <AccountSection title="Saved Addresses">
            {addresses.length === 0 ? (
              <p style={mutedBodyStyle}>No saved addresses yet.</p>
            ) : (
              <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)" }}>
                {addresses.length} saved {addresses.length === 1 ? "address" : "addresses"}
                {addresses.find(a => a.is_default) ? ` · ${addresses.find(a => a.is_default)!.city}` : ""}
              </p>
            )}
            <a
              href="/account/addresses"
              style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.375rem", borderBottom: "1px solid currentColor", paddingBottom: "1px", marginTop: "0.25rem" }}
            >
              {addresses.length === 0 ? "Add address" : "Manage addresses"}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 5h8M5.5 2L8 5l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </AccountSection>

          {/* Wishlist */}
          <AccountSection title="Wishlist">
            <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)" }}>
              View and manage your saved pieces
            </p>
            <Link
              href="/account/wishlist"
              style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.375rem", borderBottom: "1px solid currentColor", paddingBottom: "1px", marginTop: "0.25rem" }}
            >
              View wishlist
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 5h8M5.5 2L8 5l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </AccountSection>

          {/* My Reviews */}
          <AccountSection title="My Reviews">
            <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)" }}>
              View and manage your product reviews
            </p>
            <Link
              href="/account/reviews"
              style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.375rem", borderBottom: "1px solid currentColor", paddingBottom: "1px", marginTop: "0.25rem" }}
            >
              View reviews
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 5h8M5.5 2L8 5l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </AccountSection>
        </div>

        {/* ── Order History ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "clamp(3rem, 6vw, 5rem)" }}>
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.875rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-espresso)" }}>
              Order History
            </p>
            <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </span>
          </div>

          {orders.length === 0 ? (
            /* Empty state */
            <div style={{ padding: "clamp(2.5rem, 5vw, 4rem) 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-gold-muted)" }}>
                No orders yet
              </p>
              <p style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 400, fontStyle: "italic", color: "var(--color-espresso)", lineHeight: 1.1 }}>
                Your first Veer Elegance piece is waiting.
              </p>
              <Link href="/shop/chains" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid var(--color-espresso)", paddingBottom: "2px" }}>
                Explore Collection
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8M6.5 3L9 6l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>
          ) : (
            /* Order rows */
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {orders.map((order, i) => {
                const ref      = orderDisplayRef(order.id);
                const hasTotal = order.total_amount > 0;
                return (
                  <div
                    key={order.id}
                    style={{ borderTop: i === 0 ? "1px solid var(--border)" : "none", borderBottom: "1px solid var(--border)", padding: "1.125rem 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}
                  >
                    {/* Left: ref + date + status */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "180px" }}>
                      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)", letterSpacing: "0.04em" }}>
                        {ref}
                      </p>
                      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
                        {formatDate(order.created_at)}
                      </p>
                      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-gold-muted)" }}>
                        {statusLabel(order.status)}
                      </p>
                      <p style={{
                        fontFamily:    "var(--font-body), Manrope, sans-serif",
                        fontSize:      "0.625rem",
                        fontWeight:    600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color:         paymentStatusColor((order as unknown as { payment_status?: string }).payment_status ?? "pending"),
                      }}>
                        {paymentStatusLabel((order as unknown as { payment_status?: string }).payment_status ?? "pending")}
                      </p>
                    </div>

                    {/* Right: total + CTA */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-espresso)" }}>
                        {hasTotal ? formatAmount(order.total_amount, order.currency) : "—"}
                      </p>
                      <Link
                        href={`/account/orders/${order.id}`}
                        style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.375rem", borderBottom: "1px solid currentColor", paddingBottom: "1px" }}
                        aria-label={`View order ${ref}`}
                      >
                        View
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 5h8M5.5 2L8 5l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Log out ─────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: "280px" }}>
          <div style={{ width: "2rem", height: "1px", background: "var(--border)", marginBottom: "1.5rem" }} aria-hidden="true" />
          <LogoutButton variant="button" />
        </div>

        {/* ── Continue shopping ─────────────────────────────────────────── */}
        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/shop/chains" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M10 6H2M5.5 3L2 6l3.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Continue shopping
          </Link>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AccountSection({ title, children, comingSoon = false }: { title: string; children: React.ReactNode; comingSoon?: boolean }) {
  return (
    <div style={{ border: "1px solid var(--border)", padding: "clamp(1.5rem, 3vw, 2rem)", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "0.875rem" }}>
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-espresso)" }}>{title}</p>
        {comingSoon && <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-gold-muted)", background: "color-mix(in srgb, var(--color-gold-muted) 10%, transparent)", padding: "0.25rem 0.5rem" }}>Coming soon</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)" }}>{value}</span>
    </div>
  );
}

const mutedBodyStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize:   "0.875rem",
  color:      "var(--color-espresso-muted)",
  fontStyle:  "italic",
  lineHeight: 1.6,
};
