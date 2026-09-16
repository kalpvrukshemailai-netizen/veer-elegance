"use client";

/**
 * VEER ELEGANCE — WishlistClient
 *
 * Client-side interactive grid for customer wishlist.
 * Reuses existing ProductCard design and dynamically updates when items
 * are added or removed from the wishlist.
 */

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/data/products";

interface WishlistClientProps {
  initialProducts?: Product[];
}

export default function WishlistClient({ initialProducts = [] }: WishlistClientProps) {
  const { wishlistSlugs, loading } = useWishlist();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isResolving, setIsResolving] = useState(false);

  // Synchronize products when wishlistSlugs changes
  useEffect(() => {
    // If empty
    if (wishlistSlugs.length === 0) {
      setProducts([]);
      return;
    }

    // Filter existing loaded products to remove any that were un-wishlisted
    const currentlyLoaded = products.filter(p => wishlistSlugs.includes(p.slug));
    const loadedSlugs = new Set(currentlyLoaded.map(p => p.slug));

    // Check if there are newly added slugs not yet loaded
    const missingSlugs = wishlistSlugs.filter(s => !loadedSlugs.has(s));

    if (missingSlugs.length === 0) {
      if (currentlyLoaded.length !== products.length) {
        setProducts(currentlyLoaded);
      }
      return;
    }

    // Fetch missing products via /api/wishlist/products
    setIsResolving(true);
    fetch("/api/wishlist/products", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ slugs: wishlistSlugs }),
    })
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (json?.success && Array.isArray(json.products)) {
          setProducts(json.products);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsResolving(false);
      });
  }, [wishlistSlugs]);

  // If initial load in progress and no initial products
  if (loading && products.length === 0) {
    return (
      <div style={{ padding: "4rem 0", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)" }}>
          Loading your saved pieces...
        </p>
      </div>
    );
  }

  // ── Empty State ─────────────────────────────────────────────────────────
  if (wishlistSlugs.length === 0 || products.length === 0) {
    return (
      <div
        style={{
          padding:       "clamp(3rem, 6vw, 5rem) 1rem",
          textAlign:     "center",
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          gap:           "1.25rem",
          background:    "var(--color-parchment-deep)",
          borderRadius:  "var(--radius-card-img, 12px)",
          border:        "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width:          "3.5rem",
            height:         "3.5rem",
            borderRadius:   "50%",
            background:     "rgba(216, 122, 147, 0.12)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            color:          "#d87a93",
          }}
          aria-hidden="true"
        >
          <Heart size={24} strokeWidth={1.75} fill="none" color="#d87a93" />
        </div>

        <div style={{ maxWidth: "420px" }}>
          <p
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         "var(--color-gold-muted)",
              marginBottom:  "0.5rem",
            }}
          >
            Your Wishlist is Empty
          </p>
          <h2
            style={{
              fontFamily:  "var(--font-display), 'Cormorant Garamond', serif",
              fontSize:    "clamp(1.5rem, 3vw, 2rem)",
              fontWeight:  400,
              fontStyle:   "italic",
              color:       "var(--color-espresso)",
              lineHeight:  1.2,
              margin:      "0 0 0.75rem 0",
            }}
          >
            Save your favorite pieces as you explore.
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.875rem",
              color:      "var(--color-espresso-muted)",
              margin:     0,
              lineHeight: 1.5,
            }}
          >
            Tap the heart on any piece to curate your personal collection.
          </p>
        </div>

        <Link
          href="/shop"
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "0.5rem",
            marginTop:      "0.5rem",
            padding:        "0.75rem 1.75rem",
            background:     "var(--color-espresso)",
            color:          "var(--color-ivory)",
            fontFamily:     "var(--font-body), Manrope, sans-serif",
            fontSize:       "0.75rem",
            fontWeight:     600,
            letterSpacing:  "0.1em",
            textTransform:  "uppercase",
            textDecoration: "none",
            borderRadius:   "2px",
            transition:     "background 200ms ease",
          }}
        >
          Explore Collections
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6h8M6.5 3L9 6l-2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    );
  }

  // ── Wishlist Grid ───────────────────────────────────────────────────────
  return (
    <div>
      {/* Count & Status bar */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          borderBottom:   "1px solid var(--border)",
          paddingBottom:  "0.875rem",
          marginBottom:   "2rem",
        }}
      >
        <p
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color:         "var(--color-espresso)",
            margin:        0,
          }}
        >
          {products.length} {products.length === 1 ? "Saved Piece" : "Saved Pieces"}
        </p>
        {isResolving && (
          <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
            Updating...
          </span>
        )}
      </div>

      {/* Grid using standard ProductCard design */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
          gap:                 "clamp(1.25rem, 3vw, 2rem)",
        }}
      >
        {products.map(product => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </div>
  );
}
