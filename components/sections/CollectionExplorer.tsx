"use client";

/**
 * VEER ELEGANCE — CollectionExplorer
 *
 * Editorial circular category discovery section supporting all 7 collections:
 *   1. THE EVERYDAY   (Chains)
 *   2. THE SIGNATURE  (Rings)
 *   3. THE GLOW       (Earrings)
 *   4. THE MOTION     (Bracelets)
 *   5. THE HALO       (Bangles)
 *   6. THE UNKNOWN    (Mystery Box)
 *   7. THE REBEL      (Gen-Z Accessories)
 *
 * ── DESKTOP COMPOSITION ──────────────────────────────────────────────────────
 *   Left column:   ONE large active circle (~420–480px)
 *   Right column:  SIX small inactive circles in a balanced 2-column grid
 *
 * ── MOBILE COMPOSITION ───────────────────────────────────────────────────────
 *   Top:           Active circle large and centred
 *   Bottom:        6 inactive circles in a responsive 3-column grid
 */

import { useState, useCallback } from "react";
import CategoryCircle from "./CategoryCircle";
import { CATEGORIES, type CategoryId } from "@/data/categories";

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface CollectionExplorerProps {
  /** Controlled: which category is currently active */
  activeId:  CategoryId;
  /** Controlled: called when user selects a new category */
  onSelect:  (id: CategoryId) => void;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CollectionExplorer({ activeId, onSelect }: CollectionExplorerProps) {
  const [hoveredId, setHoveredId] = useState<CategoryId | null>(null);

  const handleHover = useCallback((id: CategoryId | null) => {
    setHoveredId(id);
  }, []);

  // Split: active circle vs the other six
  const activeCategory     = CATEGORIES.find(c => c.id === activeId) ?? CATEGORIES[0];
  const inactiveCategories = CATEGORIES.filter(c => c.id !== activeId);

  const anyHovered = hoveredId !== null;

  return (
    <section
      id="collection-explorer"
      aria-label="Explore the collection"
      style={{
        background:    "var(--color-parchment)",
        paddingTop:    "clamp(4rem, 8vw, 6.5rem)",
        paddingBottom: "clamp(2.5rem, 5vw, 4rem)",
        overflowX:     "hidden",
      }}
    >
      <div className="container-editorial">

        {/* ── Section heading ──────────────────────────────────────────── */}
        <header
          style={{
            textAlign:    "center",
            marginBottom: "clamp(2.5rem, 5vw, 4rem)",
          }}
        >
          {/* Champagne-gold rule */}
          <span
            aria-hidden="true"
            style={{
              display:      "block",
              width:        "2rem",
              height:       "1px",
              background:   "var(--color-gold-muted)",
              margin:       "0 auto 1.25rem",
            }}
          />

          {/* Small Manrope label */}
          <p
            className="text-label"
            style={{
              color:        "var(--color-gold-muted)",
              marginBottom: "0.75rem",
            }}
          >
            Explore
          </p>

          {/* Cormorant Garamond heading */}
          <h2
            className="text-display-lg"
            style={{
              color:      "var(--color-espresso)",
              lineHeight: 1.08,
            }}
          >
            <em className="text-display-italic">the Collections</em>
          </h2>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            UNIFIED RESPONSIVE COLLECTION EXPLORER
            - Desktop: Left large active circle, Right 2x3 inactive grid
            - Mobile: Top large active circle, Bottom 3x2 inactive grid
            ══════════════════════════════════════════════════════════════ */}
        <div className="explorer-layout-wrapper">
          {/* ── Active Circle Area ───────────────────────────────────── */}
          <div className="explorer-active-wrapper">
            <CategoryCircle
              key={`active-${activeId}`}
              categoryId={activeId}
              isActive={true}
              isHovered={hoveredId === activeId}
              anyHovered={anyHovered}
              activeDiameter="var(--explorer-active-diameter)"
              inactiveDiameter="var(--explorer-active-diameter)"
              onHover={handleHover}
              onSelect={onSelect}
            />

            {/* Mobile Active Title & Subtitle */}
            <div className="explorer-active-caption-mobile">
              <p
                style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.8125rem",
                  fontWeight:    700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color:         "var(--color-espresso)",
                  margin:        "0.75rem 0 0.25rem 0",
                }}
              >
                {activeCategory.collectionName}
              </p>
              <p
                style={{
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.625rem",
                  fontWeight:    600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color:         "var(--color-gold-muted)",
                  margin:        0,
                }}
              >
                {activeCategory.subtitle}
              </p>
            </div>
          </div>

          {/* Vertical decorative separator on desktop */}
          <div aria-hidden="true" className="explorer-separator" />

          {/* ── 6 Inactive Circles Grid (Video inside, labels outside below) ── */}
          <div className="explorer-inactive-grid">
            {inactiveCategories.map((cat) => (
              <div key={cat.id} className="explorer-inactive-item">
                <CategoryCircle
                  categoryId={cat.id}
                  isActive={false}
                  isHovered={hoveredId === cat.id}
                  anyHovered={anyHovered}
                  activeDiameter="var(--explorer-inactive-diameter)"
                  inactiveDiameter="var(--explorer-inactive-diameter)"
                  onHover={handleHover}
                  onSelect={onSelect}
                />

                {/* External Label below circle */}
                <div className="explorer-inactive-label-below">
                  <span
                    className="explorer-inactive-label-name"
                    style={{
                      color: hoveredId === cat.id ? "var(--color-espresso)" : "var(--color-espresso)",
                      opacity: hoveredId === cat.id ? 1 : 0.85,
                    }}
                  >
                    {cat.collectionName}
                  </span>
                  <span className="explorer-inactive-label-sub">
                    {cat.subtitle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Active Category Caption (Desktop, below composition) ── */}
        <div className="explorer-active-caption-desktop">
          <span
            aria-hidden="true"
            style={{
              display:         "block",
              width:           "1.5rem",
              height:          "1px",
              background:      "var(--color-gold-muted)",
              margin:          "0 auto 1rem",
            }}
          />
          <p
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         "var(--color-espresso-muted)",
              margin:        0,
            }}
          >
            Currently viewing:&ensp;
            <span style={{ color: "var(--color-espresso)", fontWeight: 700 }}>
              {activeCategory.collectionName}
            </span>
            &ensp;·&ensp;
            <span style={{ color: "var(--color-gold-muted)", fontWeight: 600 }}>
              {activeCategory.subtitle}
            </span>
          </p>
        </div>

      </div>
    </section>
  );
}
