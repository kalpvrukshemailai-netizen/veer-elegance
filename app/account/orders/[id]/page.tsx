/**
 * VEER ELEGANCE — /account/orders/[id]
 *
 * Authenticated order detail page.
 * Reads order + items from Supabase using getUserOrderById().
 *
 * Security:
 *   - Server-side auth check via getUser() (validates JWT)
 *   - getUserOrderById() enforces user_id ownership — RLS + explicit filter
 *   - Returns the same "not found" state whether the order doesn't exist
 *     or belongs to another user — no information leakage
 */

import type { Metadata }  from "next";
import { redirect }       from "next/navigation";
import Link               from "next/link";
import { createClient }   from "@/lib/supabase/server";
import { getUserOrderById, orderDisplayRef, resolveOrderItemImage } from "@/lib/orders";

// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Order Details — Veer Elegance",
};

// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatAmount(amount: number | null, currency = "INR") {
  if (amount === null) return "—";
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
    pending:    "Payment Pending",
    authorized: "Payment Authorized",
    captured:   "Payment Captured",
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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth guard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/account/orders/${id}`);

  // Fetch order — returns null if not found OR belongs to another user
  const order = await getUserOrderById(id);

  if (!order) {
    return (
      <div style={{ background: "var(--color-parchment)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <MinimalHeader />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)", textAlign: "center", gap: "1.25rem" }}>
          <p style={eyebrowStyle}>Order not found</p>
          <h1 style={headingStyle}>This order doesn&apos;t exist.</h1>
          <p style={bodyStyle}>It may have been removed, or it may not belong to your account.</p>
          <Link href="/account" style={linkStyle}>← Back to my account</Link>
        </main>
      </div>
    );
  }

  const ref   = orderDisplayRef(order.id);
  const items = order.order_items ?? [];

  // Resolve images for all items in parallel (Server Component — safe to await)
  const imageUrls = await Promise.all(
    items.map(item => resolveOrderItemImage(item))
  );

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <MinimalHeader />

      <main id="main-content" role="main" style={{ flex: 1, maxWidth: "1024px", margin: "0 auto", width: "100%", padding: "clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)" }}>

        {/* Back link */}
        <Link href="/account" style={{ ...linkStyle, display: "inline-flex", alignItems: "center", gap: "0.375rem", marginBottom: "2rem" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M10 6H2M5.5 3L2 6l3.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          My Account
        </Link>

        {/* Order header */}
        <div style={{ marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "1.25rem" }} aria-hidden="true" />
          <p style={eyebrowStyle}>Order Reference</p>
          <h1 style={{ ...headingStyle, marginBottom: "0.75rem" }}>{ref}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "center" }}>
            <span style={metaStyle}>{formatDate(order.created_at)}</span>
            <span aria-label={`Order status: ${statusLabel(order.status)}`} style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-gold-muted)" }}>
              {statusLabel(order.status)}
            </span>
            {/* Payment status badge */}
            <span
              aria-label={`Payment status: ${paymentStatusLabel((order as unknown as { payment_status?: string }).payment_status ?? "pending")}`}
              style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem",
                fontWeight:    600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color:         paymentStatusColor((order as unknown as { payment_status?: string }).payment_status ?? "pending"),
              }}
            >
              {paymentStatusLabel((order as unknown as { payment_status?: string }).payment_status ?? "pending")}
            </span>
          </div>
        </div>

        {/* Two-column layout on desktop */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "clamp(2rem, 4vw, 3rem)" }} className="order-detail-grid">

          {/* ── Items ─────────────────────────────────────────────────── */}
          <section aria-label="Order items">
            <SectionHeading>Items</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {items.map((item, i) => {
                const imageSrc    = imageUrls[i];
                const displayName = item.product_name ?? item.product_id;

                return (
                  <div
                    key={item.id}
                    style={{ borderTop: i === 0 ? "1px solid var(--border)" : "none", borderBottom: "1px solid var(--border)", padding: "1.25rem 0", display: "flex", alignItems: "flex-start", gap: "1.25rem" }}
                  >
                    {/* Product image */}
                    <div style={{ width: "72px", height: "88px", background: "var(--color-parchment-deep)", flexShrink: 0, overflow: "hidden" }}>
                      {imageSrc ? (
                        <img src={imageSrc} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="12" r="3" stroke="var(--color-espresso-muted)" strokeWidth="1" opacity="0.4"/></svg>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-espresso)" }}>
                        {displayName}
                      </p>
                      <p style={metaStyle}>Qty {item.quantity}</p>
                    </div>

                    {/* Prices */}
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {item.unit_price !== null && (
                        <p style={metaStyle}>{formatAmount(item.unit_price)} × {item.quantity}</p>
                      )}
                      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-espresso)" }}>
                        {formatAmount(item.line_total)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <TotalRow label="Subtotal"         value={formatAmount(order.subtotal, order.currency)} />
              {order.coupon_code && (
                <TotalRow
                  label={`Coupon (${order.coupon_code})`}
                  value={`-${formatAmount(order.discount_amount, order.currency)}`}
                />
              )}
              <TotalRow label="Shipping"         value={order.shipping_amount > 0 ? formatAmount(order.shipping_amount, order.currency) : "Free"} />
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                <TotalRow label="Total" value={formatAmount(order.total_amount, order.currency)} bold />
              </div>
            </div>
          </section>

          {/* ── Shipping ──────────────────────────────────────────────── */}
          <section aria-label="Shipping address">
            <SectionHeading>Shipping Address</SectionHeading>
            <address style={{ fontStyle: "normal", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {[
                [order.shipping_first_name, order.shipping_last_name].filter(Boolean).join(" "),
                order.shipping_address,
                order.shipping_apartment,
                [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", "),
                order.shipping_country,
              ].filter(Boolean).map((line, i) => (
                <span key={i} style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.9375rem", color: "var(--color-espresso)", lineHeight: 1.6 }}>
                  {line}
                </span>
              ))}
            </address>

            {/* Contact */}
            {(order.customer_email || order.customer_phone) && (
              <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {order.customer_email && <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)" }}>{order.customer_email}</span>}
                {order.customer_phone && <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)" }}>{order.customer_phone}</span>}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MinimalHeader() {
  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--color-parchment)", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem, 5vw, 4rem)", height: "clamp(3.5rem, 6vw, 4.5rem)", display: "flex", alignItems: "center" }}>
        <a href="/" aria-label="Veer Elegance — return to homepage">
          <img src="/images/veer-elegance-logo.png" alt="Veer Elegance" style={{ width: "clamp(85px, 10vw, 120px)", height: "auto", display: "block" }} />
        </a>
      </div>
    </header>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-espresso)", marginBottom: "1rem" }}>
      {children}
    </p>
  );
}

function TotalRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: bold ? "var(--color-espresso)" : "var(--color-espresso-muted)", fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: bold ? "1rem" : "0.875rem", color: "var(--color-espresso)", fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}

// ─── Shared micro-styles ──────────────────────────────────────────────────────
const eyebrowStyle: React.CSSProperties = { fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginBottom: "0.625rem" };
const headingStyle: React.CSSProperties = { fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 400, fontStyle: "italic", color: "var(--color-espresso)", lineHeight: 1.05 };
const bodyStyle:    React.CSSProperties = { fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.9375rem", color: "var(--color-espresso-muted)", lineHeight: 1.7 };
const metaStyle:    React.CSSProperties = { fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)" };
const linkStyle:    React.CSSProperties = { fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso)", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "1px" };
