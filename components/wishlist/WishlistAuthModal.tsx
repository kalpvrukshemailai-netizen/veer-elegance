"use client";

/**
 * VEER ELEGANCE — WishlistAuthModal
 *
 * Luxury modal displayed when an unauthenticated visitor attempts to wishlist a product.
 * Prompts user to sign in with safe return path preservation.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, X } from "lucide-react";
import { getSafeRedirectUrl } from "@/lib/auth-redirect";

interface WishlistAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WishlistAuthModal({ isOpen, onClose }: WishlistAuthModalProps) {
  const [returnPath, setReturnPath] = useState("/shop");

  // Track active location when modal opens without breaking SSG
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const current = window.location.pathname + window.location.search;
      setReturnPath(getSafeRedirectUrl(current, "/shop"));
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wishlist-auth-title"
      aria-describedby="wishlist-auth-desc"
      style={{
        position:             "fixed",
        inset:                0,
        zIndex:               99999,
        display:              "flex",
        alignItems:           "center",
        justifyContent:      "center",
        padding:              "clamp(1rem, 4vw, 2.5rem)",
        background:           "rgba(28, 18, 12, 0.65)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation:            "veerFadeIn 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <style>{`
        @keyframes veerFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes veerScaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Modal Container */}
      <div
        style={{
          position:      "relative",
          maxWidth:      "420px",
          width:         "100%",
          background:    "var(--color-ivory)",
          borderRadius:  "var(--radius-card-img, 12px)",
          padding:       "clamp(2rem, 5vw, 2.5rem) clamp(1.5rem, 4vw, 2rem)",
          boxShadow:     "0 24px 60px rgba(0, 0, 0, 0.35)",
          border:        "1px solid var(--border-accent)",
          animation:     "veerScaleUp 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          textAlign:     "center",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position:       "absolute",
            top:            "1rem",
            right:          "1rem",
            width:          "2rem",
            height:         "2rem",
            borderRadius:   "50%",
            background:     "transparent",
            color:          "var(--color-espresso)",
            border:         "none",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            cursor:         "pointer",
            transition:     "opacity 150ms ease",
          }}
        >
          <X size={18} strokeWidth={1.75} />
        </button>

        {/* Heart Icon Badge */}
        <div
          style={{
            width:          "3.25rem",
            height:         "3.25rem",
            borderRadius:   "50%",
            background:     "rgba(216, 122, 147, 0.12)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            color:          "#d87a93",
            marginBottom:   "1.25rem",
          }}
          aria-hidden="true"
        >
          <Heart size={22} strokeWidth={1.8} fill="none" color="#d87a93" />
        </div>

        {/* Eyebrow / Accent */}
        <p
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color:         "var(--color-gold-muted)",
            marginBottom:  "0.5rem",
          }}
        >
          Veer Elegance
        </p>

        {/* Heading */}
        <h2
          id="wishlist-auth-title"
          style={{
            fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:     "clamp(1.75rem, 3.5vw, 2.125rem)",
            fontWeight:   400,
            fontStyle:    "italic",
            color:        "var(--color-espresso)",
            lineHeight:   1.15,
            margin:       "0 0 0.75rem 0",
          }}
        >
          Login required
        </h2>

        {/* Message */}
        <p
          id="wishlist-auth-desc"
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.875rem",
            color:      "var(--color-espresso-muted)",
            lineHeight: 1.55,
            margin:     "0 0 2rem 0",
            maxWidth:   "280px",
          }}
        >
          Please sign in to save products to your wishlist.
        </p>

        {/* Actions */}
        <div
          style={{
            display:       "flex",
            flexDirection: "column",
            gap:           "0.75rem",
            width:         "100%",
          }}
        >
          {/* Sign In button */}
          <Link
            href={loginHref}
            onClick={onClose}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              width:          "100%",
              padding:        "0.875rem 1.5rem",
              background:     "var(--color-espresso)",
              color:          "var(--color-ivory)",
              fontFamily:     "var(--font-body), Manrope, sans-serif",
              fontSize:       "0.75rem",
              fontWeight:     600,
              letterSpacing:  "0.12em",
              textTransform:  "uppercase",
              textDecoration: "none",
              borderRadius:   "2px",
              transition:     "background 200ms ease, transform 150ms ease",
            }}
          >
            Sign In
          </Link>

          {/* Continue Shopping button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              width:          "100%",
              padding:        "0.75rem 1.5rem",
              background:     "transparent",
              color:          "var(--color-espresso-muted)",
              fontFamily:     "var(--font-body), Manrope, sans-serif",
              fontSize:       "0.75rem",
              fontWeight:     600,
              letterSpacing:  "0.1em",
              textTransform:  "uppercase",
              border:         "1px solid var(--border)",
              borderRadius:   "2px",
              cursor:         "pointer",
              transition:     "color 150ms ease, border-color 150ms ease",
            }}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
