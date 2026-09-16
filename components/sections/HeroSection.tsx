"use client";

/**
 * VEER ELEGANCE — HeroSection
 *
 * Full-screen cinematic campaign hero with dynamic random video rotation.
 *
 * Requirements:
 *  - Randomly selects ONE video from the centralized category configuration on each load/refresh
 *  - Avoids immediate repetition by referencing sessionStorage
 *  - Hydration-safe (SSR renders stable background shell, client selects & plays video on mount)
 *  - Only ONE video asset is loaded/requested per visit (no heavy batch downloads)
 *  - Autoplay, muted, loop, playsInline
 *  - Graceful bounded fallback if a selected video fails to load
 *  - Preserves exact visual design, typography, CTA buttons, and scroll indicator
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_MAP } from "@/data/categories";

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE VIDEO POOL — derived directly from centralized categories
// ─────────────────────────────────────────────────────────────────────────────

const CANDIDATE_VIDEOS = CATEGORIES.map((c) => c.video).filter(
  (v): v is string => typeof v === "string" && v.trim().length > 0
);

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE FOCAL POINT MAP (Scoped to mobile viewport only, desktop stays center 25%)
// Calibrated per candidate video to highlight the jewellery/accessory as the primary subject
// ─────────────────────────────────────────────────────────────────────────────
const MOBILE_VIDEO_FOCAL_POINTS: Record<string, string> = {
  "/videos/products/chain-rain.mp4":     "center 45%",
  "/videos/products/ring-waterfall.mp4": "center 42%",
  "/videos/products/earrings-rain.mp4":  "center 38%",
  "/videos/products/bracelet-ocean.mp4": "center 48%",
  "/videos/products/halo.mp4":           "center 50%",
  "/videos/products/unknown.mp4":        "center 45%",
  "/videos/products/rebel.mp4":          "center 46%",
};

const DEFAULT_MOBILE_FOCAL_POINT = "center 42%";

// ─────────────────────────────────────────────────────────────────────────────

export default function HeroSection() {
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded]   = useState(false);
  const [failedVideos, setFailedVideos] = useState<Set<string>>(() => new Set());

  const videoRef     = useRef<HTMLVideoElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // ── 1. Hydration-safe random selection with non-repetition ───────────────────
  useEffect(() => {
    if (CANDIDATE_VIDEOS.length === 0) return;
    if (currentVideo && !failedVideos.has(currentVideo)) return;

    let lastVideo: string | null = null;
    try {
      lastVideo = sessionStorage.getItem("ve_hero_video_last");
    } catch {
      // sessionStorage unavailable (e.g. private mode) — continue gracefully
    }

    // Filter candidate videos excluding any currently failed
    let available = CANDIDATE_VIDEOS.filter((v) => !failedVideos.has(v));
    if (available.length === 0) available = CANDIDATE_VIDEOS;

    // Avoid immediate repetition if more than 1 choice is available
    let pool = available.length > 1 && lastVideo
      ? available.filter((v) => v !== lastVideo)
      : available;

    if (pool.length === 0) pool = available;

    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex] || CANDIDATE_VIDEOS[0];

    setCurrentVideo(chosen);

    try {
      sessionStorage.setItem("ve_hero_video_last", chosen);
    } catch {}
  }, [failedVideos]);

  // ── 2. Autoplay + reduced-motion handling ───────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      video.pause();
      video.currentTime = 0;
    } else {
      video.play().catch(() => {
        // Autoplay blocked by browser policy — first frame remains visible
      });
    }
  }, [currentVideo]);

  // ── 3. Bounded video fallback on error ──────────────────────────────────────
  const handleVideoError = useCallback(() => {
    if (!currentVideo) return;
    setFailedVideos((prev) => {
      const nextSet = new Set(prev).add(currentVideo);
      const remaining = CANDIDATE_VIDEOS.filter((v) => !nextSet.has(v));
      if (remaining.length > 0) {
        const nextChosen = remaining[Math.floor(Math.random() * remaining.length)];
        setCurrentVideo(nextChosen);
      }
      return nextSet;
    });
  }, [currentVideo]);

  // ── 4. Scroll indicator fade ───────────────────────────────────────────────
  useEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;

    const onScroll = () => {
      const scrolled = window.scrollY;
      const opacity = Math.max(0, 0.6 * (1 - scrolled / 80));
      indicator.style.opacity = String(opacity);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      id="hero"
      aria-label="Veer Elegance — cinematic hero"
      className="hero-section"
    >
      {/* ── Background video (only requested once client selects video) ───────── */}
      {currentVideo && (
        <video
          ref={videoRef}
          key={currentVideo}
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={
            // Look up the poster for the selected video via CATEGORY_MAP
            Object.values(CATEGORY_MAP).find(c => c.video === currentVideo)?.poster ?? undefined
          }
          onLoadedData={() => setVideoLoaded(true)}
          onError={handleVideoError}
          className={`hero-video ${videoLoaded ? "hero-video-loaded" : ""}`}
          style={
            {
              "--hero-video-mobile-pos":
                MOBILE_VIDEO_FOCAL_POINTS[currentVideo] || DEFAULT_MOBILE_FOCAL_POINT,
            } as React.CSSProperties
          }
        >
          <source src={currentVideo} type="video/mp4" />
        </video>
      )}

      {/* ── Readability veil ─────────────────────────────────────────── */}
      <div aria-hidden="true" className="hero-veil" />

      {/* ── Editorial content ────────────────────────────────────────── */}
      <div className="hero-content-wrapper">
        <div className="hero-content">
          {/* Eyebrow */}
          <span className="hero-eyebrow text-label">
            New Collection
          </span>

          {/* Headline */}
          <h1 className="hero-headline text-display-xl">
            Made for<br />
            <em className="text-display-italic">Every Day.</em>
          </h1>

          {/* Body */}
          <p className="hero-body text-body-md">
            Anti-tarnish jewellery designed to stay beautiful through every moment.
          </p>

          {/* CTA pair */}
          <div className="hero-actions">
            <Link
              href="/collections"
              className="btn btn-primary hero-btn-primary"
            >
              Explore Collection
            </Link>

            <Link
              href="/about"
              className="btn btn-ghost hero-btn-ghost"
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderBottomColor = "var(--color-ivory)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderBottomColor =
                  "color-mix(in srgb, var(--color-ivory) 45%, transparent)";
              }}
            >
              Discover the Story
            </Link>
          </div>
        </div>
      </div>

      {/* ── Scroll indicator ─────────────────────────────────────────── */}
      <div
        ref={indicatorRef}
        aria-hidden="true"
        className="hero-scroll-indicator"
      >
        <span
          className="text-label"
          style={{
            color:           "var(--color-ivory)",
            writingMode:     "vertical-rl",
            textOrientation: "mixed",
            letterSpacing:   "0.14em",
            fontSize:        "0.625rem",
          }}
        >
          Scroll
        </span>
        <div
          style={{
            width:      "1px",
            height:     "3rem",
            background: "linear-gradient(to bottom, var(--color-ivory), transparent)",
          }}
        />
      </div>
    </section>
  );
}
