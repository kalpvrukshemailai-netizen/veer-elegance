/**
 * VEER ELEGANCE — Physical Store Section
 *
 * Editorial presentation of the flagship studio & physical location.
 * Data-driven from CMS with guaranteed fallback defaults.
 */

import { PHYSICAL_STORE_CONFIG } from "@/data/about";
import type { StoreContent } from "@/lib/site-content";

export default function StoreSection({ content }: { content?: StoreContent }) {
  const eyebrow = content?.storeEyebrow || "Physical Studio";
  const sectionTitle = content?.storeTitle || "Visit Our Store";
  const storeName = content?.storeName || PHYSICAL_STORE_CONFIG.storeName;
  const tagline = content?.storeAppointmentNote || PHYSICAL_STORE_CONFIG.tagline;
  const address = content?.storeAddress !== undefined ? content.storeAddress : (PHYSICAL_STORE_CONFIG.address ?? "");
  const city = content?.storeCity || PHYSICAL_STORE_CONFIG.city || "Mumbai";
  const state = content?.storeState || PHYSICAL_STORE_CONFIG.state || "Maharashtra";
  const postalCode = content?.storePostalCode !== undefined ? content.storePostalCode : (PHYSICAL_STORE_CONFIG.postalCode ?? "");
  const country = content?.storeCountry || PHYSICAL_STORE_CONFIG.country || "India";
  const phone = content?.storePhone !== undefined ? content.storePhone : (PHYSICAL_STORE_CONFIG.phone ?? "");
  const email = content?.storeEmail || PHYSICAL_STORE_CONFIG.email || "concierge@veerelegance.com";
  const googleMapsUrl = content?.storeGoogleMapsUrl !== undefined ? content.storeGoogleMapsUrl : (PHYSICAL_STORE_CONFIG.googleMapsUrl ?? "");
  const ctaLabel = content?.storeCtaLabel || "Get Directions →";
  const appointmentNote = content?.storeAppointmentNote || PHYSICAL_STORE_CONFIG.appointmentNote;

  // Parse business hours from multiline string or fallback to array
  const businessHoursLines: string[] = content?.storeBusinessHours
    ? content.storeBusinessHours.split("\n").filter(Boolean)
    : PHYSICAL_STORE_CONFIG.businessHours.map((h) => `${h.days}: ${h.hours}`);

  return (
    <section
      aria-labelledby="store-heading"
      style={{
        paddingTop: "clamp(5rem, 8vw, 7.5rem)",
        paddingBottom: "clamp(5rem, 8vw, 7.5rem)",
        paddingLeft: "clamp(1.5rem, 5vw, 4.75rem)",
        paddingRight: "clamp(1.5rem, 5vw, 4.75rem)",
        background: "var(--color-parchment)",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
            gap: "clamp(2.5rem, 6vw, 5rem)",
            alignItems: "center",
          }}
        >
          {/* ── LEFT: Store Details ────────────────────────────────────────── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span
                aria-hidden="true"
                style={{ width: "1.75rem", height: "1px", background: "var(--color-gold-muted)" }}
              />
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--color-gold-muted)",
                  margin: 0,
                }}
              >
                {eyebrow}
              </p>
            </div>

            <h2
              id="store-heading"
              style={{
                fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)",
                fontWeight: 400,
                fontStyle: "italic",
                color: "var(--color-espresso)",
                lineHeight: 1.1,
                marginBottom: "1rem",
              }}
            >
              {sectionTitle}
            </h2>

            <p
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.9375rem",
                color: "var(--color-espresso-muted)",
                lineHeight: 1.75,
                marginBottom: "2rem",
              }}
            >
              {tagline}
            </p>

            {/* Address & Contact Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2.25rem" }}>
              <div>
                <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-espresso)", margin: "0 0 0.375rem 0" }}>
                  Location
                </p>
                <address style={{ fontStyle: "normal", fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", lineHeight: 1.6 }}>
                  {storeName}
                  <br />
                  {[address, city, state, postalCode, country].filter(Boolean).join(", ")}
                </address>
              </div>

              {businessHoursLines.length > 0 && (
                <div>
                  <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-espresso)", margin: "0 0 0.375rem 0" }}>
                    Hours
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {businessHoursLines.map((line, i) => (
                      <p key={i} style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", margin: 0 }}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {(phone || email) && (
                <div>
                  <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-espresso)", margin: "0 0 0.375rem 0" }}>
                    Concierge Contact
                  </p>
                  {phone && (
                    <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", margin: "0 0 0.25rem 0" }}>
                      Phone: <a href={`tel:${phone.replace(/\s+/g, "")}`} style={{ color: "inherit", textDecoration: "none" }}>{phone}</a>
                    </p>
                  )}
                  {email && (
                    <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", margin: 0 }}>
                      Email: <a href={`mailto:${email}`} style={{ color: "inherit", textDecoration: "none" }}>{email}</a>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Directions / Appointment Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
              {googleMapsUrl ? (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.875rem 2rem",
                    background: "var(--color-espresso)",
                    color: "var(--color-ivory)",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                  }}
                >
                  {ctaLabel}
                </a>
              ) : (
                <a
                  href="#wholesale-enquiries"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.875rem 2rem",
                    background: "var(--color-espresso)",
                    color: "var(--color-ivory)",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                  }}
                >
                  Request Private Session →
                </a>
              )}
            </div>
          </div>

          {/* ── RIGHT: Atmospheric Architectural Card ──────────────────────── */}
          <div>
            <div
              style={{
                background: "var(--color-ivory)",
                border: "1px solid var(--border)",
                padding: "clamp(1.75rem, 3.5vw, 2.25rem) clamp(1.5rem, 4vw, 2.5rem)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                position: "relative",
                boxShadow: "0 20px 40px -15px rgba(44, 24, 16, 0.05)",
              }}
            >
              {/* Studio Logo */}
              <img
                src="/images/veer-elegance-logo.png"
                alt="Veer Elegance"
                style={{
                  width: "clamp(120px, 16vw, 150px)",
                  height: "auto",
                  display: "block",
                  marginBottom: "0.75rem",
                }}
              />

              <h3
                style={{
                  fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                  fontSize: "1.75rem",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "var(--color-espresso)",
                  marginBottom: "0.375rem",
                }}
              >
                {storeName}
              </h3>

              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.8125rem",
                  color: "var(--color-espresso-muted)",
                  lineHeight: 1.7,
                  maxWidth: "340px",
                  margin: "0 0 1.25rem 0",
                }}
              >
                {appointmentNote}
              </p>

              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: "1rem",
                  width: "100%",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--color-gold-muted)",
                    margin: 0,
                  }}
                >
                  {city}, {state} · {country}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
