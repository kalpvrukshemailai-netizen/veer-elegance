/**
 * VEER ELEGANCE — Wholesale & Bulk Enquiries Section
 *
 * Dedicated section for business partnerships, boutique buyers,
 * retail stockists, and bulk corporate orders.
 * Data-driven from CMS with guaranteed fallback defaults.
 */

import WholesaleEnquiryForm from "./WholesaleEnquiryForm";
import type { WholesaleContent } from "@/lib/site-content";

export default function WholesaleSection({ content }: { content?: WholesaleContent }) {
  const eyebrow     = content?.wholesaleEyebrow     || "B2B & Partnerships";
  const title       = content?.wholesaleTitle       || "Wholesale & Bulk Enquiries";
  const description = content?.wholesaleDescription || "We partner with discerning boutiques, multi-brand retailers, and corporate gifting clients across India and internationally. Connect with our partnership concierge below.";

  return (
    <section
      id="wholesale-enquiries"
      aria-labelledby="wholesale-heading"
      style={{
        paddingTop:    "clamp(5rem, 8vw, 7.5rem)",
        paddingBottom: "clamp(5rem, 8vw, 7.5rem)",
        paddingLeft:   "clamp(1.5rem, 5vw, 4.75rem)",
        paddingRight:  "clamp(1.5rem, 5vw, 4.75rem)",
        background:    "var(--color-ivory)",
        borderBottom:  "1px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Section Header */}
        <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto clamp(2.5rem, 5vw, 4rem)" }}>
          <span
            aria-hidden="true"
            style={{
              display:      "block",
              width:        "2rem",
              height:       "1px",
              background:   "var(--color-gold-muted)",
              margin:       "0 auto 1rem",
            }}
          />
          <p
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         "var(--color-gold-muted)",
              marginBottom:  "0.75rem",
            }}
          >
            {eyebrow}
          </p>
          <h2
            id="wholesale-heading"
            style={{
              fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
              fontSize:     "clamp(2.25rem, 4.5vw, 3.5rem)",
              fontWeight:   400,
              fontStyle:    "italic",
              color:        "var(--color-espresso)",
              lineHeight:   1.12,
              marginBottom: "1rem",
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.9375rem",
              color:      "var(--color-espresso-muted)",
              lineHeight: 1.75,
              margin:     0,
            }}
          >
            {description}
          </p>
        </div>

        {/* Enquiry Form */}
        <WholesaleEnquiryForm buttonLabel={content?.wholesaleButtonLabel} />
      </div>
    </section>
  );
}
