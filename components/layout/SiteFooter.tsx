"use client";

/**
 * VEER ELEGANCE — Global Site Footer (Light Theme)
 *
 * Unified luxury brand footer rendered across all customer-facing routes.
 * Data-driven from CMS with guaranteed fallback defaults.
 *
 * Color Palette:
 *   - Background:              #F5F1E8 (warm parchment / ivory)
 *   - Primary text:            #3B2418 (deep espresso)
 *   - Secondary text:          #76685C (soft espresso muted)
 *   - Accent / small headings: #B49A68 (muted champagne gold)
 *   - Borders / dividers:      #DED6C8 (soft warm beige)
 *   - Input background:        #FBF9F4 (clean ivory surface)
 *   - Button background:       #3B2418 (deep espresso)
 *   - Button text:             #F5F1E8 (warm ivory)
 *
 * Architecture:
 *   - Automatically renders on all customer routes (/, /shop, /collections, /about, /account, etc.)
 *   - Automatically excluded on all /admin/* routes
 *   - Minimal, distraction-free security bar on /checkout and /checkout/success
 *   - Fully responsive: 3-column on desktop, flexible on tablet, stacked on mobile
 *   - Driven by centralized data/brand.ts + public.site_content CMS
 *   - Semantic HTML5, accessible ARIA landmarks, WCAG-compliant tap targets
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_FOOTER_CONFIG } from "@/data/brand";
import type { SiteContentBundle } from "@/lib/site-content";

const PALETTE = {
  bg: "#F5F1E8",
  textPrimary: "#3B2418",
  textMuted: "#76685C",
  accent: "#B49A68",
  border: "#DED6C8",
  inputBg: "#FBF9F4",
  btnBg: "#3B2418",
  btnText: "#F5F1E8",
};

export default function SiteFooter({ content }: { content?: SiteContentBundle }) {
  const pathname = usePathname();
  const [emailInput, setEmailInput] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<string | null>(null);

  // ── 1. Exclude from Admin ──────────────────────────────────────────────────
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  // ── 2. Focused Minimal Bar for Checkout ────────────────────────────────────
  if (pathname?.startsWith("/checkout")) {
    return (
      <footer
        role="contentinfo"
        aria-label="Checkout footer"
        style={{
          borderTop: `1px solid ${PALETTE.border}`,
          backgroundColor: PALETTE.bg,
          padding: "1.5rem clamp(1.5rem, 5vw, 4rem)",
          textAlign: "center",
          fontFamily: "var(--font-body), Manrope, sans-serif",
          fontSize: "0.75rem",
          color: PALETTE.textMuted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <span>🔒 256-Bit SSL Encrypted</span>
        <span aria-hidden="true">•</span>
        <span>Secure Payments via Razorpay</span>
        <span aria-hidden="true">•</span>
        <span>{BRAND_FOOTER_CONFIG.legal.copyrightText}</span>
        <span aria-hidden="true">•</span>
        <span>
          Made by{" "}
          <a
            href="https://beprompter.services"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Made🤎 by BEPROMPTER (opens in a new tab)"
            style={{
              color: PALETTE.textPrimary,
              textDecoration: "none",
              fontWeight: 600,
              letterSpacing: "0.04em",
              transition: "color 200ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = PALETTE.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = PALETTE.textPrimary)}
          >
            BEPROMPTER
          </a>
        </span>
      </footer>
    );
  }

  // ── 3. Full Global Customer Footer ─────────────────────────────────────────
  const { careLinks, exploreLinks, contact: defContact, social: defSocial, newsletter: defNewsletter, legal } = BRAND_FOOTER_CONFIG;

  const careTitle = content?.footer?.footerCareTitle || "Care & Services";
  const contactTitle = content?.footer?.footerContactTitle || "Contact & Studio";
  const contactEmail = content?.contact?.contactEmail || defContact.email;
  const contactPhone = content?.contact?.contactPhone !== undefined ? content.contact.contactPhone : (defContact.phone ?? "");

  const businessHoursLines: string[] = content?.contact?.contactBusinessHours
    ? content.contact.contactBusinessHours.split("\n").filter(Boolean)
    : defContact.businessHours.map((h) => `${h.days}: ${h.hours}`);

  const instagramUrl = content?.social?.instagramUrl !== undefined ? content.social.instagramUrl : (defSocial.instagram ?? "");
  const facebookUrl = content?.social?.facebookUrl !== undefined ? content.social.facebookUrl : (defSocial.facebook ?? "");
  const youtubeUrl = content?.social?.youtubeUrl !== undefined ? content.social.youtubeUrl : (defSocial.youtube ?? "");
  const linkedinUrl = content?.social?.linkedinUrl !== undefined ? content.social.linkedinUrl : (defSocial.linkedin ?? "");

  const newsletterHeading = content?.newsletter?.newsletterTitle || content?.footer?.footerNewsletterTitle || defNewsletter.heading;
  const newsletterSubhead = content?.newsletter?.newsletterDescription || content?.footer?.footerNewsletterDescription || defNewsletter.subheading;
  const newsletterInputPlh = content?.newsletter?.newsletterPlaceholder || defNewsletter.placeholder;
  const newsletterBtnLabel = content?.newsletter?.newsletterButtonLabel || "Join";

  function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setNewsletterStatus("Thank you for your interest. Newsletter subscriptions are opening soon.");
    setEmailInput("");
  }

  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      style={{
        backgroundColor: PALETTE.bg,
        color: PALETTE.textPrimary,
        borderTop: `1px solid ${PALETTE.border}`,
        position: "relative",
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      {/* ── Top Editorial Columns ──────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "clamp(3.5rem, 6vw, 5.5rem) clamp(1.5rem, 5vw, 4.75rem) clamp(2.5rem, 4vw, 3.5rem)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "clamp(2.5rem, 5vw, 4.5rem)",
        }}
      >
        {/* ── COLUMN 1: Care & Discovery ───────────────────────────────────── */}
        <div>
          <span
            aria-hidden="true"
            style={{
              display: "block",
              width: "2rem",
              height: "1px",
              background: PALETTE.accent,
              marginBottom: "1rem",
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: PALETTE.accent,
              marginBottom: "1.25rem",
            }}
          >
            {careTitle}
          </p>

          <nav aria-label="Customer care links">
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {careLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.875rem",
                      color: PALETTE.textMuted,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      transition: "color 200ms ease, transform 200ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = PALETTE.textPrimary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = PALETTE.textMuted)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Collection Discovery */}
          <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: `1px solid ${PALETTE.border}` }}>
            <p
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.625rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: PALETTE.accent,
                marginBottom: "0.875rem",
              }}
            >
              Collections
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem" }}>
              {exploreLinks.slice(0, 5).map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  style={{
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.8125rem",
                    color: PALETTE.textMuted,
                    textDecoration: "none",
                    transition: "color 200ms ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = PALETTE.textPrimary)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = PALETTE.textMuted)}
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── COLUMN 2: Contact & Studio ───────────────────────────────────── */}
        <div>
          <span
            aria-hidden="true"
            style={{
              display: "block",
              width: "2rem",
              height: "1px",
              background: PALETTE.accent,
              marginBottom: "1rem",
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: PALETTE.accent,
              marginBottom: "1.25rem",
            }}
          >
            {contactTitle}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: PALETTE.accent,
                  margin: "0 0 0.25rem 0",
                }}
              >
                Concierge Email
              </p>
              <a
                href={`mailto:${contactEmail}`}
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.9375rem",
                  color: PALETTE.textPrimary,
                  textDecoration: "none",
                  fontWeight: 500,
                  transition: "color 200ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = PALETTE.accent)}
                onMouseLeave={(e) => (e.currentTarget.style.color = PALETTE.textPrimary)}
              >
                {contactEmail}
              </a>
            </div>

            {contactPhone && (
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: PALETTE.accent,
                    margin: "0 0 0.25rem 0",
                  }}
                >
                  Phone
                </p>
                <a
                  href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                  style={{
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.9375rem",
                    color: PALETTE.textPrimary,
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  {contactPhone}
                </a>
              </div>
            )}

            <div>
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: PALETTE.accent,
                  margin: "0 0 0.25rem 0",
                }}
              >
                Studio Hours
              </p>
              {businessHoursLines.map((line, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.8125rem",
                    color: PALETTE.textMuted,
                    margin: "0 0 0.2rem 0",
                    lineHeight: 1.5,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              <Link
                href="/about#store-heading"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: PALETTE.textPrimary,
                  textDecoration: "none",
                  borderBottom: `1px solid ${PALETTE.accent}`,
                  paddingBottom: "2px",
                  transition: "color 200ms ease, border-color 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = PALETTE.accent;
                  e.currentTarget.style.borderBottomColor = PALETTE.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = PALETTE.textPrimary;
                  e.currentTarget.style.borderBottomColor = PALETTE.accent;
                }}
              >
                Visit Our Studio →
              </Link>
            </div>
          </div>
        </div>

        {/* ── COLUMN 3: Sign Up & Save ─────────────────────────────────────── */}
        <div>
          <span
            aria-hidden="true"
            style={{
              display: "block",
              width: "2rem",
              height: "1px",
              background: PALETTE.accent,
              marginBottom: "1rem",
            }}
          />
          <h3
            style={{
              fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
              fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)",
              fontWeight: 400,
              fontStyle: "italic",
              color: PALETTE.textPrimary,
              marginBottom: "0.625rem",
              lineHeight: 1.2,
            }}
          >
            {newsletterHeading}
          </h3>

          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.8125rem",
              color: PALETTE.textMuted,
              lineHeight: 1.65,
              marginBottom: "1.25rem",
            }}
          >
            {newsletterSubhead}
          </p>

          <form
            onSubmit={handleNewsletterSubmit}
            aria-label="Newsletter subscription"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={newsletterInputPlh}
                aria-label="Email address for newsletter"
                required
                style={{
                  flex: 1,
                  backgroundColor: PALETTE.inputBg,
                  border: `1px solid ${PALETTE.border}`,
                  color: PALETTE.textPrimary,
                  padding: "0.75rem 0.875rem",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.8125rem",
                  outline: "none",
                  minWidth: 0,
                  transition: "border-color 200ms ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = PALETTE.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = PALETTE.border)}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: PALETTE.btnBg,
                  color: PALETTE.btnText,
                  border: `1px solid ${PALETTE.btnBg}`,
                  padding: "0.75rem 1.25rem",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "opacity 200ms ease, transform 150ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {newsletterBtnLabel}
              </button>
            </div>

            <p
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.6875rem",
                color: newsletterStatus ? PALETTE.accent : PALETTE.textMuted,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {newsletterStatus || defNewsletter.note}
            </p>
          </form>

          {/* Social Links (Only rendered when valid URL is configured) */}
          {(instagramUrl || facebookUrl || youtubeUrl || linkedinUrl) && (
            <div style={{ marginTop: "1.75rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Veer Elegance on Instagram"
                  style={{ color: PALETTE.textMuted, textDecoration: "none", fontSize: "0.75rem", transition: "color 200ms ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = PALETTE.textPrimary)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = PALETTE.textMuted)}
                >
                  Instagram
                </a>
              )}
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Veer Elegance on Facebook"
                  style={{ color: PALETTE.textMuted, textDecoration: "none", fontSize: "0.75rem", transition: "color 200ms ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = PALETTE.textPrimary)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = PALETTE.textMuted)}
                >
                  Facebook
                </a>
              )}
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Veer Elegance on YouTube"
                  style={{ color: PALETTE.textMuted, textDecoration: "none", fontSize: "0.75rem", transition: "color 200ms ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = PALETTE.textPrimary)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = PALETTE.textMuted)}
                >
                  YouTube
                </a>
              )}
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Veer Elegance on LinkedIn"
                  style={{ color: PALETTE.textMuted, textDecoration: "none", fontSize: "0.75rem", transition: "color 200ms ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = PALETTE.textPrimary)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = PALETTE.textMuted)}
                >
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Bar: Legal & Verification ───────────────────────────────── */}
      <div
        style={{
          borderTop: `1px solid ${PALETTE.border}`,
          backgroundColor: PALETTE.bg,
          padding: "1.5rem clamp(1.5rem, 5vw, 4.75rem)",
        }}
      >
        <div
          style={{
            maxWidth: "1440px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.25rem",
            flexWrap: "wrap",
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.75rem",
            color: PALETTE.textMuted,
          }}
        >
          {/* Brand & Copyright */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: PALETTE.textPrimary, fontWeight: 700 }}>
              {legal.brandName}
            </span>
            <span aria-hidden="true">•</span>
            <span>{legal.copyrightText}</span>
          </div>

          {/* Value proposition & payment trust */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <span>{legal.tagline}</span>
            <span aria-hidden="true" style={{ opacity: 0.4 }}>•</span>
            <span style={{ color: PALETTE.textMuted }}>
              🔒 100% Secure Razorpay Checkout
            </span>
          </div>
        </div>

        {/* Developer / Company Credit */}
        <div
          style={{
            maxWidth: "1440px",
            margin: "1rem auto 0 auto",
            paddingTop: "0.875rem",
            borderTop: `1px solid ${PALETTE.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.6875rem",
            letterSpacing: "0.06em",
            color: PALETTE.textMuted,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0 }}>
            Made by{" "}
            <a
              href="https://beprompter.services"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Made🤎 by BEPROMPTER (opens in a new tab)"
              style={{
                color: PALETTE.textPrimary,
                textDecoration: "none",
                fontWeight: 600,
                letterSpacing: "0.08em",
                transition: "color 200ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = PALETTE.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = PALETTE.textPrimary)}
            >
              BEPROMPTER
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

// Re-export alias for clean naming flexibility
export { SiteFooter as GlobalFooter };
