"use client";

/**
 * VEER ELEGANCE — EditorialCategorySpotlight
 *
 * A premium cinematic editorial section that appears below the
 * Circular Collection Explorer when a category is active.
 *
 * ── DESKTOP LAYOUT ────────────────────────────────────────────────────────────
 *
 *   ┌───────────────────────────────┬─────────────────────────┐
 *   │                               │                          │
 *   │   CINEMATIC VIDEO (≈60%)     │  EDITORIAL COPY (≈35%)  │
 *   │   autoplay · muted · loop    │  Eyebrow                 │
 *   │                               │  Headline                │
 *   │                               │  Body                    │
 *   │                               │  CTA →                   │
 *   │                               │                          │
 *   └───────────────────────────────┴─────────────────────────┘
 *
 * ── MOBILE LAYOUT ────────────────────────────────────────────────────────────
 *
 *   Video (full width, cinematic height)
 *   ↓
 *   Editorial copy (padded)
 *
 * ── TRANSITION ────────────────────────────────────────────────────────────────
 *
 *   When activeId changes:
 *   - The entire section re-keys → Motion animates in fresh
 *   - Video fades + scales in from 97% → 100%
 *   - Content fades + translates up 20px → 0
 *   - Duration: ~600ms with refined ease
 *
 * ── VIEWPORT ENTRANCE ─────────────────────────────────────────────────────────
 *
 *   Uses Intersection Observer to trigger a once-only reveal
 *   when the section enters the viewport on initial scroll.
 *   (Not scroll-linked — fires once, then stops.)
 *
 * ── PRODUCT SPOTLIGHT ─────────────────────────────────────────────────────────
 *
 *   Architecture prepared for a floating product card (top-right of video).
 *   Currently renders nothing — product media will be connected in next task.
 *   No fake placeholders, no "coming soon" text.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  CATEGORY_MAP,
  EDITORIAL_CONTENT,
  type CategoryId,
} from "@/data/categories";

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

const videoVariants = {
  hidden: {
    opacity: 0,
    scale:   0.97,
  },
  visible: {
    opacity: 1,
    scale:   1,
    transition: {
      duration: 0.65,
      ease:     [0.25, 0.46, 0.45, 0.94] as [number,number,number,number],
    },
  },
  exit: {
    opacity: 0,
    scale:   0.98,
    transition: {
      duration: 0.30,
      ease:     [0.4, 0, 1, 1] as [number,number,number,number],
    },
  },
};

const contentVariants = {
  hidden: {
    opacity:   0,
    y:         22,
  },
  visible: {
    opacity:   1,
    y:         0,
    transition: {
      duration: 0.60,
      ease:     [0.25, 0.46, 0.45, 0.94] as [number,number,number,number],
      delay:    0.12,  // stagger slightly after video starts
    },
  },
  exit: {
    opacity:   0,
    y:         -10,
    transition: {
      duration: 0.22,
      ease:     [0.4, 0, 1, 1] as [number,number,number,number],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface EditorialCategorySpotlightProps {
  activeId: CategoryId;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPOTLIGHT VIDEO PLAYER (Self-cleaning media stream)
// ─────────────────────────────────────────────────────────────────────────────

function SpotlightVideoPlayer({
  videoSrc,
  activeId,
}: {
  videoSrc: string;
  activeId: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [videoSrc]);

  return (
    <video
      ref={videoRef}
      key={activeId}
      muted
      autoPlay
      playsInline
      loop
      preload="metadata"
      aria-hidden="true"
      style={{
        position:       "absolute",
        inset:          0,
        width:          "100%",
        height:         "100%",
        objectFit:      "cover",
        objectPosition: "center center",
      }}
    >
      <source src={videoSrc} type="video/mp4" />
    </video>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function EditorialCategorySpotlight({
  activeId,
}: EditorialCategorySpotlightProps) {
  const category = CATEGORY_MAP[activeId];
  const editorial = EDITORIAL_CONTENT[activeId];

  // ── Viewport entrance: fire once when section scrolls into view ────────────
  const sectionRef = useRef<HTMLElement>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          observer.disconnect(); // fire once only
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="editorial-spotlight"
      aria-label={`${category.label} editorial spotlight`}
      style={{
        background:  "var(--color-espresso)",
        overflowX:   "hidden",
        // Entrance: fade in once on viewport entry — no translateY so no visual gap
        opacity:    hasEntered ? 1 : 0,
        transition: "opacity 600ms cubic-bezier(0.25,0.46,0.45,0.94)",
      }}
    >
      {/* ── Gradient bridge — ivory → espresso seam ─────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          height:     "3rem",
          background: "linear-gradient(to bottom, var(--color-parchment), var(--color-espresso))",
          flexShrink: 0,
        }}
      />

      {/* ── UNIFIED RESPONSIVE SPOTLIGHT ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeId}
          className="spotlight-wrapper"
        >
          {/* ── LEFT / TOP: Cinematic Video ──────────────────────────────── */}
          <motion.div
            variants={videoVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="spotlight-video-col"
          >
            <SpotlightVideoPlayer videoSrc={category.video} activeId={activeId} />

            {/* Desktop right-edge gradient */}
            <div aria-hidden="true" className="spotlight-gradient-desktop" />

            {/* Mobile bottom-edge gradient */}
            <div aria-hidden="true" className="spotlight-gradient-mobile" />
          </motion.div>

          {/* ── RIGHT / BOTTOM: Editorial Content ────────────────────────── */}
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="spotlight-content-col"
          >
            {/* Champagne-gold decorative rule */}
            <span
              aria-hidden="true"
              style={{
                display:    "block",
                width:      "2rem",
                height:     "1px",
                background: "var(--color-gold-muted)",
              }}
            />

            {/* Eyebrow */}
            <p
              className="text-label"
              style={{
                color:        "var(--color-gold-muted)",
                letterSpacing:"0.18em",
              }}
            >
              {editorial.eyebrow}
            </p>

            {/* Headline (Cormorant Garamond) */}
            <h2
              className="text-display-md"
              style={{
                color:       "var(--color-ivory)",
                lineHeight:  1.08,
                fontWeight:  400,
              }}
            >
              {editorial.headline}
            </h2>

            {/* Body (Manrope) */}
            <p
              className="text-body-md"
              style={{
                color:    "color-mix(in srgb, var(--color-ivory) 72%, transparent)",
                maxWidth: "36ch",
                lineHeight: 1.8,
              }}
            >
              {editorial.body}
            </p>

            {/* CTA */}
            <div style={{ paddingTop: "0.5rem" }}>
              <Link
                href={category.href}
                aria-label={`${editorial.cta} — view all ${category.label}`}
                style={{
                  display:       "inline-flex",
                  alignItems:    "center",
                  gap:           "0.625rem",
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.75rem",
                  fontWeight:    600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color:         "var(--color-ivory)",
                  textDecoration:"none",
                  borderBottom:  "1px solid rgba(252,251,247,0.3)",
                  paddingBottom: "0.375rem",
                  transition:    "border-color 300ms ease, color 300ms ease",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "var(--color-gold-muted)";
                  el.style.color       = "var(--color-gold-muted)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "rgba(252,251,247,0.3)";
                  el.style.color       = "var(--color-ivory)";
                }}
              >
                {editorial.cta}
                <svg
                  width="13" height="13" viewBox="0 0 13 13"
                  fill="none" aria-hidden="true"
                >
                  <path
                    d="M2 6.5h9M8 3l3.5 3.5L8 10"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
