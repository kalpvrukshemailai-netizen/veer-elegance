"use client";

/**
 * VEER ELEGANCE — Search Header & Filters Component
 *
 * Client Component that manages search term input with debounced URL synchronization,
 * immediate submit on Enter, active category filter tabs, and instant clearing.
 */

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search as SearchIcon, X as ClearIcon } from "lucide-react";
import { SEARCH_CATEGORY_OPTIONS } from "./search-config";

export default function SearchHeader({
  initialQuery = "",
  initialCategory = "",
}: {
  initialQuery?: string;
  initialCategory?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  // Sync state if URL query params change via navigation
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setActiveCategory(searchParams.get("category") ?? "");
  }, [searchParams]);

  function updateSearchUrl(newQuery: string, newCategory: string) {
    const params = new URLSearchParams();
    const q = newQuery.trim();
    if (q) params.set("q", q);
    if (newCategory) params.set("category", newCategory);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  }

  // Debounced auto-search when typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") ?? "";
      const currentCat = searchParams.get("category") ?? "";
      if (query.trim() !== currentQ.trim() || activeCategory !== currentCat) {
        updateSearchUrl(query, activeCategory);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, activeCategory]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateSearchUrl(query, activeCategory);
  }

  function handleCategoryClick(catId: string) {
    const nextCat = catId === activeCategory ? "" : catId;
    setActiveCategory(nextCat);
    updateSearchUrl(query, nextCat);
  }

  function handleClear() {
    setQuery("");
    updateSearchUrl("", activeCategory);
  }

  return (
    <section
      aria-label="Product search"
      style={{
        paddingTop:    "clamp(6rem, 10vw, 8.5rem)",
        paddingBottom: "clamp(2rem, 4vw, 3rem)",
        paddingLeft:   "clamp(1.5rem, 5vw, 4.75rem)",
        paddingRight:  "clamp(1.5rem, 5vw, 4.75rem)",
        background:    "var(--color-parchment)",
        borderBottom:  "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: "880px",
          margin:   "0 auto",
          textAlign:"center",
        }}
      >
        {/* Subtle accent bar */}
        <span
          aria-hidden="true"
          style={{
            display:      "block",
            width:        "2rem",
            height:       "1px",
            background:   "var(--color-gold-muted)",
            margin:       "0 auto 1rem",
          }}
        />

        {/* Eyebrow */}
        <p
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color:         "var(--color-gold-muted)",
            marginBottom:  "0.75rem",
          }}
        >
          Search
        </p>

        {/* Heading */}
        <h1
          style={{
            fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:     "clamp(2.25rem, 5vw, 3.75rem)",
            fontWeight:   400,
            fontStyle:    "italic",
            color:        "var(--color-espresso)",
            lineHeight:   1.1,
            marginBottom: "clamp(1.5rem, 3vw, 2.25rem)",
            letterSpacing: "-0.01em",
          }}
        >
          Discover Fine Pieces
        </h1>

        {/* ── Large Search Input Box ─────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Search Veer Elegance jewellery"
          style={{
            position:   "relative",
            width:      "100%",
            maxWidth:   "680px",
            margin:     "0 auto clamp(1.75rem, 3vw, 2.5rem)",
          }}
        >
          <div
            style={{
              position:        "relative",
              display:         "flex",
              alignItems:      "center",
              background:      "var(--color-ivory)",
              border:          "1.5px solid var(--border)",
              boxShadow:       "0 12px 32px -10px rgba(59, 28, 15, 0.06)",
              transition:      "border-color 200ms ease, box-shadow 200ms ease",
            }}
          >
            {/* Search Icon */}
            <div
              aria-hidden="true"
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                paddingLeft:    "1.25rem",
                color:          "var(--color-gold-muted)",
                flexShrink:     0,
              }}
            >
              <SearchIcon size={20} strokeWidth={1.5} />
            </div>

            {/* Input field */}
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jewellery..."
              aria-label="Search jewellery by name, category, or style"
              autoComplete="off"
              spellCheck="false"
              style={{
                flex:       1,
                border:     "none",
                background: "transparent",
                padding:    "clamp(0.875rem, 2vw, 1.125rem) 1rem",
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "clamp(0.9375rem, 1.5vw, 1.0625rem)",
                color:      "var(--color-espresso)",
                outline:    "none",
                minWidth:   0,
              }}
            />

            {/* Clear button when text exists */}
            {query.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search input"
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  background:     "none",
                  border:         "none",
                  color:          "var(--color-espresso-muted)",
                  padding:        "0.5rem",
                  marginRight:    "0.25rem",
                  cursor:         "pointer",
                }}
              >
                <ClearIcon size={18} strokeWidth={1.5} />
              </button>
            )}

            {/* Search Button */}
            <button
              type="submit"
              aria-label="Submit search"
              style={{
                background:    "var(--color-espresso)",
                color:         "var(--color-ivory)",
                border:        "none",
                padding:       "clamp(0.875rem, 2vw, 1.125rem) clamp(1.25rem, 3vw, 1.75rem)",
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.75rem",
                fontWeight:    600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor:        "pointer",
                transition:    "opacity 200ms ease",
                flexShrink:    0,
              }}
            >
              {isPending ? "Searching…" : "Search"}
            </button>
          </div>
        </form>

        {/* ── Category Filter Pills ───────────────────────────────────────── */}
        <div
          role="group"
          aria-label="Filter search results by collection"
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "0.5rem",
            flexWrap:       "wrap",
          }}
        >
          {SEARCH_CATEGORY_OPTIONS.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id || "all"}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                aria-pressed={isSelected}
                style={{
                  display:       "inline-flex",
                  alignItems:    "center",
                  gap:           "0.375rem",
                  padding:       "0.5rem 1rem",
                  fontFamily:    "var(--font-body), Manrope, sans-serif",
                  fontSize:      "0.6875rem",
                  fontWeight:    isSelected ? 700 : 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  borderRadius:  "9999px",
                  border:        `1px solid ${isSelected ? "var(--color-espresso)" : "var(--border)"}`,
                  background:    isSelected ? "var(--color-espresso)" : "var(--color-ivory)",
                  color:         isSelected ? "var(--color-ivory)" : "var(--color-espresso-muted)",
                  cursor:        "pointer",
                  transition:    "all 180ms ease",
                  whiteSpace:    "nowrap",
                }}
              >
                <span>{cat.label}</span>
                {cat.id && (
                  <span
                    style={{
                      opacity:       0.7,
                      fontSize:      "0.625rem",
                      letterSpacing: "0.08em",
                      fontStyle:     "italic",
                    }}
                  >
                    ({cat.themeTitle})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
