/**
 * VEER ELEGANCE — Brand Philosophy Section ("Why Veer Elegance")
 *
 * Highlights core pillars of the brand.
 * Data-driven from CMS with guaranteed fallback to data/about.ts.
 */

import { BRAND_PHILOSOPHY } from "@/data/about";
import type { PhilosophyContent } from "@/lib/site-content";

export default function BrandPhilosophySection({ content }: { content?: PhilosophyContent }) {
  const eyebrow    = content?.philosophyEyebrow || BRAND_PHILOSOPHY.eyebrow;
  const headline   = content?.philosophyTitle   || BRAND_PHILOSOPHY.headline;
  const subheading = content?.philosophyBody    || BRAND_PHILOSOPHY.subheading;

  const principles = [
    {
      number:      "01",
      title:       content?.philosophyPoint1Title || BRAND_PHILOSOPHY.principles[0]?.title || "Anti-Tarnish Everyday Wear",
      description: content?.philosophyPoint1Body  || BRAND_PHILOSOPHY.principles[0]?.description || "",
    },
    {
      number:      "02",
      title:       content?.philosophyPoint2Title || BRAND_PHILOSOPHY.principles[1]?.title || "Understated Luxury",
      description: content?.philosophyPoint2Body  || BRAND_PHILOSOPHY.principles[1]?.description || "",
    },
    {
      number:      "03",
      title:       content?.philosophyPoint3Title || BRAND_PHILOSOPHY.principles[2]?.title || "Effortless Comfort",
      description: content?.philosophyPoint3Body  || BRAND_PHILOSOPHY.principles[2]?.description || "",
    },
    {
      number:      "04",
      title:       content?.philosophyPoint4Title || BRAND_PHILOSOPHY.principles[3]?.title || "Enduring Craftsmanship",
      description: content?.philosophyPoint4Body  || BRAND_PHILOSOPHY.principles[3]?.description || "",
    },
  ];

  return (
    <section
      aria-labelledby="philosophy-heading"
      style={{
        paddingTop:    "clamp(5rem, 8vw, 7.5rem)",
        paddingBottom: "clamp(5rem, 8vw, 7.5rem)",
        paddingLeft:   "clamp(1.5rem, 5vw, 4.75rem)",
        paddingRight:  "clamp(1.5rem, 5vw, 4.75rem)",
        background:    "var(--color-parchment)",
        borderBottom:  "1px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto clamp(3rem, 6vw, 4.5rem)" }}>
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
            id="philosophy-heading"
            style={{
              fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
              fontSize:    "clamp(2.25rem, 4.5vw, 3.5rem)",
              fontWeight:  400,
              fontStyle:   "italic",
              color:       "var(--color-espresso)",
              lineHeight:  1.12,
              marginBottom:"1rem",
            }}
          >
            {headline}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.9375rem",
              color:      "var(--color-espresso-muted)",
              lineHeight: 1.7,
              margin:     0,
            }}
          >
            {subheading}
          </p>
        </div>

        {/* 4-Column Grid of Principles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            gap: "clamp(1.5rem, 3vw, 2.5rem)",
          }}
        >
          {principles.map((p) => (
            <article
              key={p.number}
              style={{
                background:    "var(--color-ivory)",
                border:        "1px solid var(--border)",
                padding:       "clamp(1.75rem, 3vw, 2.25rem)",
                display:       "flex",
                flexDirection: "column",
                position:      "relative",
                transition:    "transform 250ms ease, box-shadow 250ms ease",
              }}
            >
              {/* Number Badge */}
              <span
                style={{
                  fontFamily:    "var(--font-display), 'Cormorant Garamond', serif",
                  fontSize:      "1.75rem",
                  fontStyle:     "italic",
                  color:         "var(--color-gold-muted)",
                  lineHeight:    1,
                  marginBottom:  "1rem",
                }}
              >
                {p.number}
              </span>

              {/* Title */}
              <h3
                style={{
                  fontFamily:   "var(--font-body), Manrope, sans-serif",
                  fontSize:     "1rem",
                  fontWeight:   600,
                  color:        "var(--color-espresso)",
                  marginBottom: "0.625rem",
                  lineHeight:   1.3,
                }}
              >
                {p.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize:   "0.875rem",
                  color:      "var(--color-espresso-muted)",
                  lineHeight: 1.65,
                  margin:     0,
                }}
              >
                {p.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
