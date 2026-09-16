/**
 * VEER ELEGANCE — StatCard
 *
 * A single metric card for the admin overview dashboard.
 * Server component — no client state needed.
 */

interface StatCardProps {
  label:       string;
  value:       string;
  sub?:        string;        // optional supporting context line
  accent?:     boolean;       // highlights the value in gold
  href?:       string;        // optional link destination
}

export default function StatCard({ label, value, sub, accent, href }: StatCardProps) {
  const inner = (
    <div
      style={{
        background:    "var(--color-ivory)",
        border:        "1px solid var(--border)",
        padding:       "clamp(1.25rem, 2.5vw, 1.75rem) clamp(1.25rem, 2.5vw, 1.75rem)",
        display:       "flex",
        flexDirection: "column",
        gap:           "0.625rem",
        height:        "100%",
        transition:    href ? "background 150ms ease" : undefined,
      }}
    >
      {/* Label */}
      <p
        style={{
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.625rem",
          fontWeight:    700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color:         "var(--color-espresso-muted)",
          margin:        0,
        }}
      >
        {label}
      </p>

      {/* Value */}
      <p
        style={{
          fontFamily:    "var(--font-display), 'Cormorant Garamond', serif",
          fontSize:      "clamp(1.75rem, 3.5vw, 2.5rem)",
          fontWeight:    400,
          color:         accent ? "var(--color-gold-muted)" : "var(--color-espresso)",
          lineHeight:    1,
          margin:        0,
        }}
      >
        {value}
      </p>

      {/* Sub-line */}
      {sub && (
        <p
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.75rem",
            color:      "var(--color-espresso-muted)",
            margin:     0,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} style={{ display: "block", textDecoration: "none" }} className="stat-card-link">
        {inner}
      </a>
    );
  }

  return inner;
}

