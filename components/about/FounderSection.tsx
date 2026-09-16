/**
 * VEER ELEGANCE — Founder Section
 *
 * Intimate, editorial founder section featuring portrait/media area on the left
 * and founder story/quote on the right.
 *
 * Data-driven from CMS with guaranteed fallback to data/about.ts.
 */

import { FOUNDER_CONTENT } from "@/data/about";
import type { FounderContentModel } from "@/lib/site-content";

export default function FounderSection({ content }: { content?: FounderContentModel }) {
  const eyebrow  = content?.founderEyebrow || "The Founder";
  const name     = content?.founderName    || FOUNDER_CONTENT.name;
  const role     = content?.founderRole    || FOUNDER_CONTENT.role;
  const quote    = content?.founderQuote   || FOUNDER_CONTENT.quote;
  const imageUrl = content?.founderImageUrl || FOUNDER_CONTENT.image?.src || "";

  const storyParagraphs = content?.founderStory
    ? content.founderStory.split("\n\n").filter(Boolean)
    : FOUNDER_CONTENT.story;

  return (
    <section
      aria-labelledby="founder-heading"
      style={{
        paddingTop:    "clamp(4.5rem, 8vw, 7.5rem)",
        paddingBottom: "clamp(4.5rem, 8vw, 7.5rem)",
        paddingLeft:   "clamp(1.5rem, 5vw, 4.75rem)",
        paddingRight:  "clamp(1.5rem, 5vw, 4.75rem)",
        background:    "var(--color-ivory)",
        borderBottom:  "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin:   "0 auto",
          display:  "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
          gap:      "clamp(2.5rem, 6vw, 5.5rem)",
          alignItems: "center",
        }}
      >
        {/* ── LEFT: Founder Portrait / Media Area ─────────────────────────── */}
        <div style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              position:        "relative",
              width:           "100%",
              aspectRatio:     "4 / 5",
              maxHeight:       "620px",
              background:      "linear-gradient(135deg, color-mix(in srgb, var(--color-parchment-deep) 70%, #efe7dc), color-mix(in srgb, var(--color-parchment) 90%, #dfd3c3))",
              border:          "1px solid var(--border)",
              overflow:        "hidden",
              display:         "flex",
              flexDirection:   "column",
              alignItems:      "center",
              justifyContent:  "center",
              padding:         "2.5rem",
              boxShadow:       "0 20px 40px -15px rgba(44, 24, 16, 0.06)",
            }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${name} — ${role}`}
                style={{
                  position:   "absolute",
                  inset:      0,
                  width:      "100%",
                  height:     "100%",
                  objectFit:  "cover",
                  objectPosition: "top center",
                }}
              />
            ) : (
              /* Architectural brand placeholder */
              <div
                style={{
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  textAlign:      "center",
                  maxWidth:       "280px",
                }}
              >
                {/* Refined Monogram Seal */}
                <div
                  aria-hidden="true"
                  style={{
                    width:         "4rem",
                    height:        "4rem",
                    borderRadius:  "50%",
                    border:        "1px solid var(--color-gold-muted)",
                    display:       "flex",
                    alignItems:    "center",
                    justifyContent:"center",
                    marginBottom:  "1.5rem",
                    background:    "rgba(255, 255, 255, 0.4)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                      fontSize:   "1.625rem",
                      fontStyle:  "italic",
                      color:      "var(--color-espresso)",
                      lineHeight: 1,
                    }}
                  >
                    VE
                  </span>
                </div>

                <p
                  style={{
                    fontFamily:    "var(--font-display), 'Cormorant Garamond', serif",
                    fontSize:      "1.375rem",
                    fontStyle:     "italic",
                    color:         "var(--color-espresso)",
                    margin:        "0 0 0.5rem 0",
                    lineHeight:    1.2,
                  }}
                >
                  Veer Elegance
                </p>

                <p
                  style={{
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    fontWeight:    600,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color:         "var(--color-gold-muted)",
                    margin:        0,
                  }}
                >
                  Atelier &amp; Studio
                </p>
              </div>
            )}

            {/* Corner aesthetic framing accents */}
            <div
              aria-hidden="true"
              style={{
                position:    "absolute",
                top:         "1rem",
                left:        "1rem",
                width:       "1rem",
                height:      "1rem",
                borderTop:   "1px solid var(--color-gold-muted)",
                borderLeft:  "1px solid var(--color-gold-muted)",
                opacity:     0.7,
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position:    "absolute",
                bottom:      "1rem",
                right:       "1rem",
                width:       "1rem",
                height:      "1rem",
                borderBottom:"1px solid var(--color-gold-muted)",
                borderRight: "1px solid var(--color-gold-muted)",
                opacity:     0.7,
              }}
            />
          </div>
        </div>

        {/* ── RIGHT: Founder Narrative ────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <span
              aria-hidden="true"
              style={{ width: "1.75rem", height: "1px", background: "var(--color-gold-muted)" }}
            />
            <p
              style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem",
                fontWeight:    600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color:         "var(--color-gold-muted)",
                margin:        0,
              }}
            >
              {eyebrow}
            </p>
          </div>

          {/* Name & Role */}
          <h2
            id="founder-heading"
            style={{
              fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
              fontSize:     "clamp(2rem, 4vw, 3.25rem)",
              fontWeight:   400,
              fontStyle:    "italic",
              color:        "var(--color-espresso)",
              lineHeight:   1.1,
              margin:       "0 0 0.375rem 0",
            }}
          >
            {name}
          </h2>
          <p
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.8125rem",
              fontWeight:    500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color:         "var(--color-espresso-muted)",
              marginBottom:  "2rem",
            }}
          >
            {role}
          </p>

          {/* Intimate Quote */}
          <blockquote
            style={{
              margin:       "0 0 2rem 0",
              paddingLeft:  "1.5rem",
              borderLeft:   "2px solid var(--color-gold-muted)",
            }}
          >
            <p
              style={{
                fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
                fontSize:    "clamp(1.1875rem, 2.2vw, 1.5rem)",
                fontStyle:   "italic",
                color:       "var(--color-espresso)",
                lineHeight:  1.45,
                margin:      0,
              }}
            >
              &ldquo;{quote}&rdquo;
            </p>
          </blockquote>

          {/* Story Paragraphs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            {storyParagraphs.map((paragraph, idx) => (
              <p
                key={idx}
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize:   "clamp(0.875rem, 1.2vw, 0.9375rem)",
                  color:      "var(--color-espresso-muted)",
                  lineHeight: 1.8,
                  margin:     0,
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
