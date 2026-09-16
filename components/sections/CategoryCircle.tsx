"use client";

/**
 * VEER ELEGANCE — CategoryCircle
 *
 * A single circular category element for the Collection Explorer.
 *
 * Visual structure:
 *   <button>
 *     <div [circle mask: border-radius 50%, overflow hidden]>
 *       <video [object-fit: cover, fills circle] />
 *       <div [gradient overlay for readability] />
 *       <div [text: category name + discover] />
 *     </div>
 *   </button>
 *
 * Props:
 *   categoryId    — which category this circle represents
 *   isActive      — this is the currently selected category
 *   isHovered     — this circle is being hovered
 *   anyHovered    — any circle in the explorer is currently hovered
 *   activeDiameter — resolved CSS size for when this circle is active
 *   inactiveDiameter — resolved CSS size for when inactive
 *   onHover       — callback when mouse enters / leaves
 *   onSelect      — callback when clicked / keyboard-activated
 *
 * The parent controls ALL sizing logic — this component is display-only.
 * This keeps the layout engine in one place (CollectionExplorer).
 */

import { useRef, useCallback, useEffect } from "react";
import { CATEGORY_MAP, type CategoryId } from "@/data/categories";

// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryCircleProps {
  categoryId:       CategoryId;
  isActive:         boolean;
  isHovered:        boolean;
  anyHovered:       boolean;
  /** CSS size value for active/large state, e.g. "clamp(280px,36vw,480px)" */
  activeDiameter:   string;
  /** CSS size value for inactive/small state, e.g. "clamp(130px,14vw,210px)" */
  inactiveDiameter: string;
  onHover:          (id: CategoryId | null) => void;
  onSelect:         (id: CategoryId) => void;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CategoryCircle({
  categoryId,
  isActive,
  isHovered,
  anyHovered,
  activeDiameter,
  inactiveDiameter,
  onHover,
  onSelect,
}: CategoryCircleProps) {
  const category = CATEGORY_MAP[categoryId];
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Derived display state ────────────────────────────────────────────────
  // "prominent" = this circle should display at full vibrancy
  const isProminent = isActive || isHovered;
  // "subdued"   = another circle is hovered, this one steps back
  const isSubdued   = anyHovered && !isHovered;

  // ── Resolved diameter ────────────────────────────────────────────────────
  // When hovered (even if inactive), snap to activeDiameter for that moment
  const diameter = (isActive || isHovered) ? activeDiameter : inactiveDiameter;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleMouseEnter = useCallback(() => {
    onHover(categoryId);
    const v = videoRef.current;
    if (v && v.paused) {
      v.preload = "auto";
      v.play().catch(() => {});
    }
  }, [categoryId, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback(() => {
    onSelect(categoryId);
  }, [categoryId, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(categoryId);
    }
  }, [categoryId, onSelect]);

  // ── Auto-play / pause logic based on active/hover state ────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    if (isActive || isHovered) {
      v.preload = "auto";
      v.play().catch(() => {});
    } else {
      v.pause();
      // Optionally reset to beginning so it always starts fresh when hovered again
      // v.currentTime = 0; 
    }
  }, [isActive, isHovered]);

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => onHover(categoryId)}
      onBlur={() => onHover(null)}
      onKeyDown={handleKeyDown}
      aria-label={`Explore ${category.label} collection`}
      aria-pressed={isActive}
      style={{
        /* Reset button defaults */
        background:  "none",
        border:      "none",
        padding:     0,
        cursor:      "pointer",
        /* Size: the button itself matches the circle so touch target = circle */
        width:       diameter,
        height:      diameter,
        flexShrink:  0,
        /* Stack order: active/hovered on top */
        position:    "relative",
        zIndex:      isProminent ? 3 : isSubdued ? 1 : 2,
        /* Opacity: dim others while one is hovered */
        opacity:     isSubdued ? 0.72 : 1,
        /* Single smooth transition for width + height + opacity */
        transition:  [
          "width 550ms cubic-bezier(0.4,0,0.2,1)",
          "height 550ms cubic-bezier(0.4,0,0.2,1)",
          "opacity 350ms ease",
        ].join(", "),
      }}
    >
      {/* ── Circle mask ─────────────────────────────────────────────────── */}
      <div
        style={{
          width:        "100%",
          height:       "100%",
          borderRadius: "50%",
          overflow:     "hidden",
          position:     "relative",
          /*
           * Champagne-gold ring:
           *  active   → solid 2px ring
           *  hovered  → hairline 1.5px ring at 60% opacity
           *  inactive → subtle diffuse shadow only
           */
          boxShadow: isActive
            ? [
                "0 0 0 2px var(--color-gold-muted)",
                "0 12px 48px rgba(59,28,15,0.22)",
              ].join(", ")
            : isHovered
            ? [
                "0 0 0 1.5px rgba(184,154,104,0.55)",
                "0 8px 32px rgba(59,28,15,0.16)",
              ].join(", ")
            : "0 4px 20px rgba(59,28,15,0.10)",
          transition: "box-shadow 400ms ease",
        }}
      >
        {/* ── Media: Restored category video for all circles ── */}
        <video
          ref={videoRef}
          muted
          playsInline
          loop
          preload={isActive ? "auto" : "none"}
          poster={category.poster}
          aria-hidden="true"
          style={{
            position:       "absolute",
            inset:          0,
            width:          "100%",
            height:         "100%",
            objectFit:      "cover",
            objectPosition: "center center",
            /* Slight brightness/saturation lift when prominent */
            filter: isProminent
              ? "brightness(1.06) saturate(1.12)"
              : "brightness(0.82) saturate(0.90)",
            transition: "filter 400ms ease",
          }}
        >
          <source src={category.video} type="video/mp4" />
        </video>

        {/* ── Readability gradient overlay (only on active circle) ──────── */}
        {isActive && (
          <div
            aria-hidden="true"
            style={{
              position:     "absolute",
              inset:        0,
              borderRadius: "50%",
              background:   "linear-gradient(175deg, transparent 30%, rgba(20,8,3,0.60) 100%)",
              transition:   "background 400ms ease",
              pointerEvents:"none",
            }}
          />
        )}

        {/* ── Text overlay (only on large selected circle) ──────── */}
        {isActive && (
          <div
            style={{
              position:        "absolute",
              bottom:          "1.75rem",
              left:            0,
              right:           0,
              display:         "flex",
              flexDirection:   "column",
              alignItems:      "center",
              gap:             "0.3rem",
              transition:      "bottom 400ms cubic-bezier(0.4,0,0.2,1)",
              pointerEvents:   "none",
            }}
          >
            {/* Collection Name */}
            <span
              style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontWeight:    600,
                fontSize:      "0.8125rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color:         "var(--color-ivory)",
                textShadow:    "0 1px 6px rgba(0,0,0,0.5)",
                textAlign:     "center",
                lineHeight:    1.2,
              }}
            >
              {category.collectionName}
            </span>

            {/* Subtitle */}
            <span
              style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontWeight:    500,
                fontSize:      "0.625rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color:         "var(--color-gold-muted)",
                textShadow:    "0 1px 4px rgba(0,0,0,0.4)",
              }}
            >
              {category.subtitle}
            </span>

            {/* "Discover →" */}
            <span
              style={{
                display:       "inline-flex",
                alignItems:    "center",
                gap:           "0.3rem",
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontWeight:    500,
                fontSize:      "0.5625rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color:         "var(--color-gold-muted)",
                opacity:       1,
                transform:     "translateY(0)",
              }}
            >
              Discover
              <svg
                width="9" height="9" viewBox="0 0 9 9"
                fill="none" aria-hidden="true"
              >
                <path
                  d="M1 4.5h7M5.5 2l2.5 2.5L5.5 7"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
