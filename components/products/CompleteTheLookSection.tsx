"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import {
  type CompleteTheLookDetail,
  type CompleteTheLookProduct,
  getCompleteLookMessaging,
} from "@/lib/complete-the-look";

interface CompleteTheLookSectionProps {
  completeTheLook?: CompleteTheLookDetail | null;
  productId?:       string;
  previewMode?:     boolean;
}

export default function CompleteTheLookSection({
  completeTheLook: initialSet,
  productId,
  previewMode = false,
}: CompleteTheLookSectionProps) {
  const { addToCart, addBundleToCart } = useCart();
  const [set, setSet] = useState<CompleteTheLookDetail | null>(initialSet ?? null);
  const [loading, setLoading] = useState<boolean>(!initialSet && Boolean(productId));
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);

  // Fetch set dynamically if not provided via SSR prop
  useEffect(() => {
    if (initialSet) {
      setSet(initialSet);
      return;
    }

    if (!productId) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/complete-the-look?productId=${productId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.set) {
          setSet(data.set);
        }
      })
      .catch((err) => {
        console.error("[CompleteTheLookSection:fetch]", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialSet, productId]);

  // If loading or no enabled look with at least 2 items, do not render
  const allProducts = set?.allProducts ?? [];
  const hasValidSet = Boolean(set && (set.enabled || previewMode) && allProducts.length >= 2);

  // Available products (in-stock + published + non-archived)
  const availableProductIds = useMemo(() => {
    if (!hasValidSet) return [];
    return allProducts
      .filter((p) => p.inStock !== false && p.published && !p.archived)
      .map((p) => p.id);
  }, [hasValidSet, allProducts]);

  // Initial selection: all available products in the look are selected by default
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (hasValidSet && availableProductIds.length > 0) {
      setSelectedIds(availableProductIds);
    }
  }, [hasValidSet, availableProductIds]);

  // Calculate dynamic persuasion & pricing messaging via pure helper
  const messaging = useMemo(() => {
    if (!set) {
      return getCompleteLookMessaging({
        allProducts: [],
        selectedIds: [],
        bundlePrice: 0,
      });
    }

    return getCompleteLookMessaging({
      allProducts,
      selectedIds,
      bundlePrice: set.bundlePrice,
    });
  }, [set, allProducts, selectedIds]);

  if (loading || !hasValidSet || !set || !messaging) {
    return null;
  }

  // Toggle single item selection
  const handleToggleProduct = (product: CompleteTheLookProduct, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Do not toggle if out of stock
    if (product.inStock === false || !product.published || product.archived) {
      return;
    }

    setSelectedIds((prev) => {
      if (prev.includes(product.id)) {
        return prev.filter((id) => id !== product.id);
      } else {
        return [...prev, product.id];
      }
    });
  };

  // Add Complete Look or partial selection to cart
  const handleAddToCart = async () => {
    if (selectedIds.length === 0 || !set) return;

    if (previewMode) {
      setPreviewNotice("Preview Mode: Cart addition simulated. No items were added to your bag.");
      setTimeout(() => setPreviewNotice(null), 4000);
      return;
    }

    setAdding(true);
    setAddError(null);

    try {
      if (messaging.isComplete) {
        // Full Complete-the-Look bundle addition
        const res = await fetch("/api/cart/complete-the-look", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseProductId: set.baseProductId,
            productIds: selectedIds,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setAddError(data.error || "Could not add Complete the Look to bag.");
          return;
        }

        addBundleToCart(data.bundle, data.items);
      } else {
        // Partial selection: individual add-to-cart (no bundle created)
        const selectedProducts = allProducts.filter(p => selectedIds.includes(p.id));
        for (const p of selectedProducts) {
          addToCart(p.slug, {
            slug: p.slug,
            name: p.name,
            price: p.price,
            imageUrl: p.imageUrl ?? "",
            antiTarnish: false,
          });
        }
      }
    } catch (err: any) {
      setAddError("Failed to add items to bag. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <section
      id="complete-the-look"
      aria-labelledby="complete-the-look-heading"
      style={{
        background: "var(--color-sand)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        paddingTop: "clamp(2.5rem, 5vw, 4rem)",
        paddingBottom: "clamp(2.5rem, 5vw, 4rem)",
        paddingInline: "clamp(1.5rem, 5vw, 4rem)",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* ── Section Header ── */}
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--color-gold-muted)",
              marginBottom: "0.5rem",
            }}
          >
            <span>Complete the Look</span>
            <span aria-hidden="true">✨</span>
          </div>

          <h2
            id="complete-the-look-heading"
            style={{
              fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
              fontSize: "clamp(1.75rem, 3vw, 2.35rem)",
              fontWeight: 400,
              color: "var(--color-espresso)",
              lineHeight: 1.15,
              margin: 0,
              fontStyle: "italic",
            }}
          >
            Curated pieces made to pair beautifully together.
          </h2>
        </div>

        {/* ── Product Items Grid / Row ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          {allProducts.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const isAvailable = item.inStock !== false && item.published && !item.archived;
            const isBase = item.id === set.baseProductId;
            const isMissing = !isSelected && isAvailable;

            return (
              <div
                key={item.id}
                style={{
                  background: isSelected
                    ? "#ffffff"
                    : isMissing
                    ? "rgba(255, 255, 255, 0.75)"
                    : "rgba(255, 255, 255, 0.4)",
                  border: isSelected
                    ? "1px solid var(--color-espresso)"
                    : isMissing
                    ? "1px dashed var(--color-gold-muted)"
                    : "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  transition: "border-color 0.2s ease, opacity 0.2s ease, background-color 0.2s ease",
                  opacity: isAvailable ? (isSelected ? 1 : 0.85) : 0.45,
                  boxShadow: isSelected ? "0 2px 8px rgba(0, 0, 0, 0.04)" : "none",
                }}
              >
                {/* ── Checkbox Selection Control ── */}
                <button
                  type="button"
                  onClick={(e) => handleToggleProduct(item, e)}
                  disabled={!isAvailable}
                  aria-label={
                    isAvailable
                      ? isSelected
                        ? `Deselect ${item.name}`
                        : `Select ${item.name}`
                      : `${item.name} is out of stock`
                  }
                  style={{
                    width: "1.375rem",
                    height: "1.375rem",
                    borderRadius: "3px",
                    border: isSelected
                      ? "1px solid var(--color-espresso)"
                      : isMissing
                      ? "1px dashed var(--color-gold-muted)"
                      : "1px solid var(--border)",
                    background: isSelected ? "var(--color-espresso)" : "transparent",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isAvailable ? "pointer" : "not-allowed",
                    flexShrink: 0,
                    padding: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSelected && (
                    <svg
                      width="11"
                      height="9"
                      viewBox="0 0 11 9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="1 4.5 4 7.5 10 1" />
                    </svg>
                  )}
                </button>

                {/* ── Product Thumbnail ── */}
                <Link
                  href={`/product/${item.slug}`}
                  style={{
                    width: "4.25rem",
                    height: "4.25rem",
                    borderRadius: "3px",
                    overflow: "hidden",
                    background: "var(--color-parchment)",
                    flexShrink: 0,
                    display: "block",
                    textDecoration: "none",
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.25rem",
                      }}
                    >
                      ✨
                    </div>
                  )}
                </Link>

                {/* ── Product Metadata ── */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.25rem" }}>
                    {isBase && (
                      <span
                        style={{
                          fontSize: "0.5625rem",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--color-gold-muted)",
                          border: "1px solid var(--color-gold-muted)",
                          padding: "0.05rem 0.3rem",
                          borderRadius: "2px",
                        }}
                      >
                        This Piece
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: "var(--font-body), Manrope, sans-serif",
                        fontSize: "0.6875rem",
                        color: "var(--color-espresso-muted)",
                        textTransform: "capitalize",
                      }}
                    >
                      {item.category}
                    </span>
                  </div>

                  <Link
                    href={`/product/${item.slug}`}
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--color-espresso)",
                      textDecoration: "none",
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.name}
                  </Link>

                  <div style={{ marginTop: "0.375rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-body), Manrope, sans-serif",
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: "var(--color-espresso)",
                        }}
                      >
                        ₹{item.price.toLocaleString("en-IN")}
                      </span>

                      {!isAvailable && (
                        <span
                          style={{
                            fontFamily: "var(--font-body), Manrope, sans-serif",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            color: "#a82020",
                          }}
                        >
                          Out of stock
                        </span>
                      )}
                    </div>

                    {/* Subtle "Add to complete" prompt for missing pieces */}
                    {isMissing && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleProduct(item, e)}
                        style={{
                          fontFamily: "var(--font-body), Manrope, sans-serif",
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--color-gold-muted)",
                          background: "#fdfaf4",
                          border: "1px solid var(--color-gold-muted)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "2px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        + Add piece
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pricing & Persuasion Summary Box ── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "clamp(1.25rem, 3vw, 2rem)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
          }}
        >
          {/* ── Left Column: Persuasion Messaging & Amounts ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", maxWidth: "680px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: messaging.isComplete ? "#1e6b20" : "var(--color-gold-muted)",
                  background: messaging.isComplete ? "#eef7ee" : "rgba(181, 142, 78, 0.12)",
                  padding: "0.18rem 0.55rem",
                  borderRadius: "2px",
                }}
              >
                {messaging.badgeText}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.75rem",
                  color: "var(--color-espresso-muted)",
                }}
              >
                ({selectedIds.length} of {allProducts.length} pieces selected)
              </span>
            </div>

            {/* Headline Persuasion Message */}
            <h3
              style={{
                fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                fontSize: "clamp(1.25rem, 2.5vw, 1.625rem)",
                fontWeight: 600,
                color: "var(--color-espresso)",
                lineHeight: 1.25,
                margin: "0.25rem 0 0",
                fontStyle: "italic",
              }}
            >
              {messaging.primaryMessage}
            </h3>

            {/* Secondary Persuasion / Missing Piece Message */}
            {messaging.secondaryMessage && (
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.8125rem",
                  color: "var(--color-espresso-muted)",
                  lineHeight: 1.4,
                  margin: "0.125rem 0 0",
                }}
              >
                {messaging.secondaryMessage}
              </p>
            )}

            {/* Pricing Breakdowns */}
            {messaging.isComplete ? (
              /* Complete Look Breakdown */
              <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.8125rem",
                    color: "var(--color-espresso-muted)",
                  }}
                >
                  Individual Total:{" "}
                  <span style={{ textDecoration: "line-through" }}>
                    ₹{messaging.individualTotal.toLocaleString("en-IN")}
                  </span>
                </span>

                <div style={{ display: "flex", alignItems: "baseline", gap: "0.375rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--color-espresso)",
                    }}
                  >
                    Complete Look:
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                      fontSize: "1.875rem",
                      fontWeight: 700,
                      color: "var(--color-espresso)",
                    }}
                  >
                    ₹{messaging.bundlePrice.toLocaleString("en-IN")}
                  </span>
                </div>

                {messaging.savings > 0 && (
                  <span
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#1e6b20",
                      background: "#eef7ee",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "2px",
                    }}
                  >
                    SAVE ₹{messaging.savings.toLocaleString("en-IN")} ({set.savingsPercent}% OFF)
                  </span>
                )}
              </div>
            ) : (
              /* Partial Selection Breakdown */
              <div style={{ display: "flex", alignItems: "baseline", gap: "1.5rem", marginTop: "0.625rem", flexWrap: "wrap" }}>
                <div>
                  <span
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--color-espresso-muted)",
                      display: "block",
                      marginBottom: "0.125rem",
                    }}
                  >
                    Selected Items
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                      fontSize: "1.625rem",
                      fontWeight: 700,
                      color: "var(--color-espresso)",
                    }}
                  >
                    ₹{messaging.selectedTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <div
                  style={{
                    width: "1px",
                    height: "2.25rem",
                    background: "var(--border)",
                  }}
                  aria-hidden="true"
                />

                <div>
                  <span
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--color-espresso-muted)",
                      display: "block",
                      marginBottom: "0.125rem",
                    }}
                  >
                    Complete Look Price
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                      fontSize: "1.625rem",
                      fontWeight: 700,
                      color: "var(--color-gold-muted)",
                    }}
                  >
                    ₹{messaging.bundlePrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Action Button & Explanatory Note ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "0.75rem",
              textAlign: "right",
            }}
          >
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding || selectedIds.length === 0}
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.8125rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "0.875rem 1.75rem",
                background: selectedIds.length === 0 ? "var(--border)" : "var(--color-espresso)",
                color: selectedIds.length === 0 ? "var(--color-espresso-muted)" : "#ffffff",
                border: "none",
                borderRadius: "3px",
                cursor: selectedIds.length === 0 || adding ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: selectedIds.length > 0 ? "0 2px 8px rgba(26, 17, 11, 0.12)" : "none",
              }}
            >
              {adding ? (
                "Adding to Bag..."
              ) : messaging.isComplete ? (
                <>
                  <span>Add Complete Look</span>
                  <span>·</span>
                  <span>₹{messaging.bundlePrice.toLocaleString("en-IN")}</span>
                </>
              ) : selectedIds.length > 0 ? (
                <>
                  <span>Add Selected Pieces</span>
                  <span>·</span>
                  <span>₹{messaging.selectedTotal.toLocaleString("en-IN")}</span>
                </>
              ) : (
                "Select Pieces Above"
              )}
            </button>

            {previewNotice && (
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#1e5e3a",
                  background: "#e8f5e9",
                  padding: "0.375rem 0.625rem",
                  borderRadius: "3px",
                  margin: 0,
                  maxWidth: "32ch",
                  lineHeight: 1.4,
                }}
              >
                {previewNotice}
              </p>
            )}

            {addError && (
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.75rem",
                  color: "#a82020",
                  margin: 0,
                  maxWidth: "30ch",
                }}
              >
                {addError}
              </p>
            )}

            <div
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.75rem",
                color: "var(--color-espresso-muted)",
                maxWidth: "32ch",
                lineHeight: 1.45,
              }}
            >
              {messaging.isComplete
                ? "All pieces in this curated look are selected. Special look pricing unlocked."
                : "Bundle pricing applies only when the complete curated look is selected. Check items above to unlock savings."}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
