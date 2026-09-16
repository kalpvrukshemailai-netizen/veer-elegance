/**
 * VEER ELEGANCE — About Hero Section
 *
 * Compact luxury editorial hero introducing the brand story.
 * Data-driven from CMS with guaranteed fallback defaults.
 */

import type { AboutContent } from "@/lib/site-content";

export default function AboutHero({ content }: { content?: AboutContent }) {
  const eyebrow  = content?.aboutEyebrow || "Our Story";
  const title    = content?.aboutTitle   || "Veer Elegance";
  const intro    = content?.aboutIntro   || "Thoughtfully crafted everyday jewellery designed with quiet refinement, modern anti-tarnish endurance, and timeless balance.";

  return (
    <section
      aria-labelledby="about-hero-title"
      style={{
        position:   "relative",
        paddingTop: "clamp(7rem, 12vw, 10rem)",
        paddingBottom: "clamp(3.5rem, 6vw, 5.5rem)",
        paddingLeft: "clamp(1.5rem, 5vw, 4.75rem)",
        paddingRight: "clamp(1.5rem, 5vw, 4.75rem)",
        background: "var(--color-parchment)",
        borderBottom: "1px solid var(--border)",
        overflow:   "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin:   "0 auto",
          textAlign: "center",
          display:  "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Subtle accent bar */}
        <span
          aria-hidden="true"
          style={{
            display:      "block",
            width:        "2.5rem",
            height:       "1px",
            background:   "var(--color-gold-muted)",
            marginBottom: "1.25rem",
          }}
        />

        {/* Eyebrow */}
        <p
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "clamp(0.6875rem, 1vw, 0.75rem)",
            fontWeight:    600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color:         "var(--color-gold-muted)",
            marginBottom:  "1rem",
          }}
        >
          {eyebrow}
        </p>

        {/* Headline */}
        <h1
          id="about-hero-title"
          style={{
            fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:     "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight:   400,
            fontStyle:    "italic",
            color:        "var(--color-espresso)",
            lineHeight:   1.08,
            marginBottom: "1.75rem",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>

        {/* Supporting statement */}
        <p
          style={{
            fontFamily:   "var(--font-body), Manrope, sans-serif",
            fontSize:     "clamp(1rem, 2vw, 1.1875rem)",
            fontWeight:   300,
            color:        "var(--color-espresso-muted)",
            lineHeight:   1.85,
            maxWidth:     "640px",
            margin:       "0 auto",
          }}
        >
          {intro}
        </p>
      </div>
    </section>
  );
}
