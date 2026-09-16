"use client";

/**
 * VEER ELEGANCE — HomepagePopup
 *
 * Promotional advertisement modal for the storefront homepage.
 * Display rules:
 *   - Only renders when popup.enabled === true and imageUrl is non-empty.
 *   - Displayed at most ONCE per browser session using sessionStorage ('veer_popup_dismissed').
 *   - Clicking the image navigates to redirectUrl (internal path or external HTTPS).
 *   - Accessible close button (✕) dismisses modal cleanly.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { PopupContent } from "@/lib/site-content";

const SESSION_STORAGE_KEY = "veer_popup_dismissed";

interface HomepagePopupProps {
  content?: PopupContent | null;
}

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function sanitizeRedirectUrl(url?: string | null): string {
  if (!url) return "/shop";
  const trimmed = url.trim();

  // Reject dangerous schemes
  if (
    trimmed.toLowerCase().startsWith("javascript:") ||
    trimmed.toLowerCase().startsWith("data:") ||
    trimmed.toLowerCase().startsWith("vbscript:")
  ) {
    return "/shop";
  }

  // Safe internal path
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\")
  ) {
    return trimmed;
  }

  // Safe external URL
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }

  return "/shop";
}

export default function HomepagePopup({ content }: HomepagePopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);

    if (!content?.enabled || !content.imageUrl) {
      return;
    }

    try {
      const alreadyDismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!alreadyDismissed) {
        // Small graceful delay so page content loads first
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // In private browsing mode where sessionStorage might throw, fallback gracefully
      setIsOpen(true);
    }
  }, [content]);

  function handleDismiss() {
    setIsOpen(false);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    } catch {
      // Ignore
    }
  }

  if (!hasMounted || !isOpen || !content?.enabled || !content.imageUrl) {
    return null;
  }

  const destination = sanitizeRedirectUrl(content.redirectUrl);
  const external = isExternalUrl(destination);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Promotional announcement"
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         9999,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "clamp(1rem, 4vw, 2.5rem)",
        background:     "rgba(28, 18, 12, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation:      "veerFadeIn 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      <style>{`
        @keyframes veerFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes veerScaleUp {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Modal Container */}
      <div
        style={{
          position:     "relative",
          maxWidth:     "480px",
          width:        "100%",
          maxHeight:    "90vh",
          background:   "var(--color-ivory)",
          borderRadius: "var(--radius-card-img, 12px)",
          overflow:     "hidden",
          boxShadow:    "0 20px 50px rgba(0, 0, 0, 0.35)",
          border:       "1px solid var(--border-accent)",
          animation:    "veerScaleUp 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          display:      "flex",
          flexDirection:"column",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close promotion"
          style={{
            position:       "absolute",
            top:            "0.75rem",
            right:          "0.75rem",
            zIndex:         20,
            width:          "2rem",
            height:         "2rem",
            borderRadius:   "50%",
            background:     "rgba(28, 18, 12, 0.75)",
            color:          "#FAF8F5",
            border:         "1px solid rgba(255,255,255,0.2)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            cursor:         "pointer",
            backdropFilter: "blur(4px)",
            transition:     "background 150ms ease, transform 150ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(28, 18, 12, 0.95)";
            (e.currentTarget as HTMLElement).style.transform = "scale(1.06)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(28, 18, 12, 0.75)";
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
        >
          <X size={16} />
        </button>

        {/* Ad Image / Click Target */}
        {external ? (
          <a
            href={destination}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleDismiss}
            style={{ display: "block", width: "100%", height: "100%", textDecoration: "none" }}
          >
            <img
              src={content.imageUrl}
              alt="Promotional advertisement"
              style={{
                width:        "100%",
                height:       "auto",
                maxHeight:    "75vh",
                objectFit:    "cover",
                display:      "block",
              }}
            />
          </a>
        ) : (
          <Link
            href={destination}
            onClick={handleDismiss}
            style={{ display: "block", width: "100%", height: "100%", textDecoration: "none" }}
          >
            <img
              src={content.imageUrl}
              alt="Promotional advertisement"
              style={{
                width:        "100%",
                height:       "auto",
                maxHeight:    "75vh",
                objectFit:    "cover",
                display:      "block",
              }}
            />
          </Link>
        )}
      </div>
    </div>
  );
}
