"use client";

/**
 * VEER ELEGANCE — AnnouncementBar
 *
 * Continuous horizontal marquee scrolling offer banner.
 * Evaluates route-based display targeting rules against current pathname.
 * Loops seamlessly with no visual jumps. Respects prefers-reduced-motion.
 */

import React from "react";
import { usePathname } from "next/navigation";
import type { AnnouncementContent } from "@/lib/site-content";
import { isAnnouncementVisibleOnRoute } from "@/lib/announcement-targeting";

interface AnnouncementBarProps {
  content?: AnnouncementContent | null;
}

export default function AnnouncementBar({ content }: AnnouncementBarProps) {
  const pathname = usePathname();

  if (!isAnnouncementVisibleOnRoute(content, pathname)) {
    return null;
  }

  const text = content!.text.trim();
  const bg   = content!.backgroundColor || "#2C1810";
  const clr  = content!.textColor || "#FAF8F5";
  const acc  = content!.accentColor || "#B89A68";

  // Repeat text item for continuous seamless flow
  const items = [text, text, text, text];

  return (
    <div
      role="region"
      aria-label="Promotional announcement"
      style={{
        width:           "100%",
        background:      bg,
        color:           clr,
        borderBottom:    `1px solid ${acc}33`,
        position:        "relative",
        overflow:        "hidden",
        zIndex:          101,
        height:          "32px",
        display:         "flex",
        alignItems:      "center",
      }}
    >
      <style>{`
        @keyframes veerMarqueeScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .veer-marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: veerMarqueeScroll 28s linear infinite;
        }
        .veer-marquee-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .veer-marquee-track {
            animation: none !important;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="veer-marquee-track" aria-hidden="true">
        {/* Set 1 */}
        <div style={{ display: "flex", alignItems: "center", gap: "2.5rem", paddingRight: "2.5rem", whiteSpace: "nowrap" }}>
          {items.map((t, idx) => (
            <span
              key={`s1-${idx}`}
              style={{
                display:       "inline-flex",
                alignItems:    "center",
                gap:           "0.75rem",
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem",
                fontWeight:    600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <span>{t}</span>
              <span style={{ color: acc, fontSize: "0.5rem" }} aria-hidden="true">◆</span>
            </span>
          ))}
        </div>

        {/* Set 2 (Identical duplicate for seamless 0% -> -50% loop) */}
        <div style={{ display: "flex", alignItems: "center", gap: "2.5rem", paddingRight: "2.5rem", whiteSpace: "nowrap" }}>
          {items.map((t, idx) => (
            <span
              key={`s2-${idx}`}
              style={{
                display:       "inline-flex",
                alignItems:    "center",
                gap:           "0.75rem",
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem",
                fontWeight:    600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <span>{t}</span>
              <span style={{ color: acc, fontSize: "0.5rem" }} aria-hidden="true">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
