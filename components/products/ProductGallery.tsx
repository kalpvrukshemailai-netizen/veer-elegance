"use client";

/**
 * VEER ELEGANCE — ProductGallery
 *
 * Displays the product image(s) in an editorial large-format presentation.
 *
 * Architecture supports multiple images via images[] array.
 * When only one image exists, it renders that image elegantly without
 * duplicating it into a fake multi-image gallery.
 *
 * When multiple images exist (future), thumbnail strip appears below.
 *
 * Entrance animation: opacity + very slight scale on mount.
 * No scroll-scrub. No parallax.
 */

import { useState } from "react";
import Image        from "next/image";
import type { Product } from "@/data/products";

// ─────────────────────────────────────────────────────────────────────────────

interface ProductGalleryProps {
  product: Product;
}

export default function ProductGallery({ product }: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [imgError,  setImgError]  = useState(false);
  const hasMultiple = product.images.length > 1;
  const activeImage = product.images[activeIdx] ?? product.image;
  const activeAlt   = product.alt;
  // Guard: only render image when we have a real src
  const hasSrc = Boolean(activeImage && activeImage.trim() !== "");

  return (
    <div
      style={{
        display:       "flex",
        flexDirection: "column",
        gap:           "0.875rem",
      }}
    >
      {/* ── Primary image ──────────────────────────────────────────────── */}
      <div
        className="pdp-gallery-main"
        style={{
          position:     "relative",
          width:        "100%",
          height:       "clamp(420px, 78vh, 720px)",
          overflow:     "hidden",
          borderRadius: "var(--radius-card-img, 12px)",
          transform:    "translateZ(0)",
          background:   "var(--color-parchment-deep)",
        }}
      >
        {hasSrc && !imgError ? (
          <Image
            key={activeImage}
            src={activeImage}
            alt={activeAlt}
            fill
            priority
            quality={75}
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{
              objectFit:      "contain",
              objectPosition: "center",
              padding:        "clamp(1.25rem, 2.5vw, 2rem)",
            }}
            className="pdp-gallery-img"
            onError={() => setImgError(true)}
          />
        ) : hasSrc && imgError ? (
          <img
            key={activeImage}
            src={activeImage}
            alt={activeAlt}
            style={{
              width:          "100%",
              height:         "100%",
              objectFit:      "contain",
              objectPosition: "center",
              padding:        "clamp(1.25rem, 2.5vw, 2rem)",
            }}
            className="pdp-gallery-img"
          />
        ) : (
          /* No image yet — neutral parchment state */
          <div style={{
            position:       "absolute",
            inset:          0,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
          }}>
            <p style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color:         "var(--color-espresso-muted)",
              opacity:       0.5,
            }}>
              Image coming soon
            </p>
          </div>
        )}
      </div>

      {/* ── Thumbnail strip — only shown when multiple images exist ───── */}
      {hasMultiple && (
        <div
          style={{
            display:   "flex",
            gap:       "0.5rem",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
          role="tablist"
          aria-label="Product image gallery"
        >
          {product.images.map((src, idx) => (
            <button
              key={src}
              role="tab"
              aria-selected={idx === activeIdx}
              aria-label={`View image ${idx + 1}`}
              onClick={() => {
                setActiveIdx(idx);
                setImgError(false);
              }}
              style={{
                flexShrink:   0,
                width:        "72px",
                aspectRatio:  "3/4",
                overflow:     "hidden",
                borderRadius: "6px",
                transform:    "translateZ(0)",
                border:       `1.5px solid ${idx === activeIdx ? "var(--color-espresso)" : "var(--border)"}`,
                background:   "var(--color-parchment-deep)",
                padding:      0,
                cursor:       "pointer",
                position:     "relative",
                transition:   "border-color 200ms ease",
                outline:      "none",
              }}
              className="pdp-thumb-btn"
            >
              <Image
                src={src}
                alt={`${product.alt} — view ${idx + 1}`}
                fill
                quality={60}
                sizes="72px"
                style={{ objectFit: "contain", padding: "0.25rem" }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
