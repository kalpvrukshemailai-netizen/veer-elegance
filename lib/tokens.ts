/**
 * VEER ELEGANCE — Design Token Reference
 *
 * Source of truth for brand tokens as TypeScript constants.
 * These mirror the CSS custom properties defined in globals.css.
 *
 * Use CSS variables directly in stylesheets.
 * Use these TS constants when you need tokens in JS/TS logic
 * (e.g., canvas rendering, dynamic style calculations, tests).
 */

// ── Raw Brand Palette ────────────────────────────────────────────────
export const palette = {
  parchment:      "#F4F1EA", // Primary background
  parchmentDeep:  "#EAE4DA", // Secondary background
  espresso:       "#3B1C0F", // Primary text / dark
  espressoMuted:  "#765E50", // Secondary / muted text
  goldMuted:      "#B89A68", // Accent
  ivory:          "#FCFBF7", // Surface / near-white
} as const;

// ── Semantic Token Keys ──────────────────────────────────────────────
// These map 1-to-1 with CSS custom properties on :root
export const tokens = {
  background:          "var(--background)",
  backgroundSecondary: "var(--background-secondary)",
  foreground:          "var(--foreground)",
  foregroundMuted:     "var(--foreground-muted)",
  accent:              "var(--accent)",
  surface:             "var(--surface)",
  border:              "var(--border)",
  borderAccent:        "var(--border-accent)",
  focusRing:           "var(--focus-ring)",
} as const;

// ── Font Families ────────────────────────────────────────────────────
export const fonts = {
  display: "var(--font-display)", // Cormorant Garamond
  body:    "var(--font-body)",    // Manrope
} as const;

// ── Section Spacing ──────────────────────────────────────────────────
export const spacing = {
  sectionXs: "var(--spacing-section-xs)", // 3rem  / 48px
  sectionSm: "var(--spacing-section-sm)", // 5rem  / 80px
  sectionMd: "var(--spacing-section-md)", // 7rem  / 112px
  sectionLg: "var(--spacing-section-lg)", // 10rem / 160px
  sectionXl: "var(--spacing-section-xl)", // 14rem / 224px
} as const;

// ── Border Radius ────────────────────────────────────────────────────
export const radius = {
  none: "var(--radius-none)",
  sm:   "var(--radius-sm)",
  md:   "var(--radius-md)",
  lg:   "var(--radius-lg)",
  full: "var(--radius-full)",
} as const;

// ── Transition Presets ───────────────────────────────────────────────
export const transitions = {
  base:    "var(--transition-base)",
  smooth:  "var(--transition-smooth)",
  elegant: "var(--transition-elegant)",
} as const;
