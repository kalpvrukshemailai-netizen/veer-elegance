"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { DbProduct } from "@/lib/products-db";
import type { CompleteTheLookProduct, CompleteTheLookDetail } from "@/lib/complete-the-look";

interface Props {
  productId:    string;
  baseProduct:  DbProduct | { id: string; name: string; price: number | null; slug: string; image_url?: string | null; [key: string]: any };
  onSaved?:     (updatedDetail?: CompleteTheLookDetail) => void;
  onDeleted?:   () => void;
  onClose?:     () => void;
  inModal?:     boolean;
}

export default function CompleteTheLookManager({
  productId,
  baseProduct,
  onSaved,
  onDeleted,
  onClose,
  inModal = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isExisting, setIsExisting] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [couponAllowed, setCouponAllowed] = useState(true);
  const [bundlePrice, setBundlePrice] = useState<string>("");
  const [matchingProducts, setMatchingProducts] = useState<CompleteTheLookProduct[]>([]);

  // Search candidate state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<CompleteTheLookProduct[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load current configuration
  const loadConfiguration = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/complete-the-look?productId=${productId}`);
      if (!res.ok) throw new Error("Failed to load configuration");
      const data = await res.json();

      if (data.success && data.set) {
        setIsExisting(true);
        setEnabled(Boolean(data.set.enabled));
        setCouponAllowed(data.set.couponAllowed !== false);
        setBundlePrice(String(data.set.bundlePrice));
        setMatchingProducts(data.set.matchingProducts || []);
      } else {
        setIsExisting(false);
        setEnabled(false);
        setCouponAllowed(true);
        setBundlePrice("");
        setMatchingProducts([]);
      }
    } catch (err: any) {
      console.error("[CompleteTheLookManager:load]", err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  // Live product search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setCandidates([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const exclude = [productId, ...matchingProducts.map((p) => p.id)].join(",");
        const res = await fetch(
          `/api/admin/complete-the-look/search?baseProductId=${productId}&q=${encodeURIComponent(
            searchQuery
          )}&exclude=${encodeURIComponent(exclude)}`
        );
        const data = await res.json();
        if (data.success) {
          setCandidates(data.products || []);
        }
      } catch (err) {
        console.error("[CompleteTheLookManager:search]", err);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, productId, matchingProducts]);

  // Pricing calculations
  const basePrice = Number(baseProduct.price) || 0;
  const matchingTotal = matchingProducts.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
  const individualTotal = basePrice + matchingTotal;
  const parsedBundlePrice = Number(bundlePrice) || 0;
  const customerSavings = Math.max(0, individualTotal - parsedBundlePrice);
  const totalCount = 1 + matchingProducts.length;

  // Warning when bundle price is not lower than individual total
  const showPriceWarning =
    parsedBundlePrice > 0 && matchingProducts.length > 0 && parsedBundlePrice >= individualTotal;

  // Handlers
  const handleAddProduct = (cand: CompleteTheLookProduct) => {
    if (matchingProducts.length >= 3) {
      setFeedback({
        type: "error",
        text: "Maximum 3 matching products allowed (total 4 products in look).",
      });
      return;
    }
    setMatchingProducts((prev) => [...prev, cand]);
    setSearchQuery("");
    setCandidates([]);
    setShowSearchDropdown(false);
    setFeedback(null);
  };

  const handleRemoveProduct = (id: string) => {
    setMatchingProducts((prev) => prev.filter((p) => p.id !== id));
    setFeedback(null);
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= matchingProducts.length) return;

    const updated = [...matchingProducts];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setMatchingProducts(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (matchingProducts.length === 0) {
      setFeedback({
        type: "error",
        text: "Please add at least 1 matching product to form a look (min 2 total products).",
      });
      return;
    }

    if (parsedBundlePrice <= 0) {
      setFeedback({
        type: "error",
        text: "Please enter a valid bundle price greater than ₹0.",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/complete-the-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseProductId:  productId,
          bundlePrice:    parsedBundlePrice,
          enabled,
          couponAllowed,
          itemProductIds: matchingProducts.map((p) => p.id),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save configuration.");
      }

      setIsExisting(true);
      setFeedback({
        type: "success",
        text: "Complete the Look configuration saved successfully!",
      });
      if (onSaved) {
        onSaved(data.set);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "An unexpected error occurred while saving.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove the Complete the Look set for this product?")) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/complete-the-look?productId=${productId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete set.");
      }

      setIsExisting(false);
      setEnabled(false);
      setCouponAllowed(true);
      setBundlePrice("");
      setMatchingProducts([]);
      setFeedback({
        type: "success",
        text: "Complete the Look set removed successfully.",
      });
      if (onDeleted) {
        onDeleted();
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to delete set.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-espresso-muted)" }}>
          Loading Complete the Look configuration...
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="complete-the-look-heading" style={{ marginTop: "1rem" }}>
      <div style={containerStyle}>
        {/* ── Section Header ── */}
        <div style={headerStyle}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <h2 id="complete-the-look-heading" style={titleStyle}>
                Complete the Look
              </h2>
              {isExisting && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.15rem 0.55rem",
                    borderRadius: "999px",
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    background: enabled ? "#eef7ee" : "#f5f5f5",
                    color: enabled ? "#1e6b20" : "var(--color-espresso-muted)",
                    border: `1px solid ${enabled ? "#bce0bc" : "var(--border)"}`,
                  }}
                >
                  {enabled ? "Active" : "Disabled"}
                </span>
              )}
            </div>
            <p style={subtitleStyle}>
              Curate 1 to 3 matching pieces to pair with this product at a special bundle price.
            </p>
          </div>

          {/* ── Status Toggle ── */}
          <label style={toggleContainerStyle}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ width: "1rem", height: "1rem", cursor: "pointer", accentColor: "var(--color-gold-muted)" }}
            />
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-espresso)" }}>
              Enable Complete the Look
            </span>
          </label>
        </div>

        {/* ── Feedback Notification ── */}
        {feedback && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "4px",
              fontSize: "0.8125rem",
              background: feedback.type === "success" ? "#f2faf2" : "#fdf2f2",
              border: `1px solid ${feedback.type === "success" ? "#ccebce" : "#fad2d2"}`,
              color: feedback.type === "success" ? "#1e6b20" : "#a82020",
              lineHeight: 1.4,
            }}
          >
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* ── 1. PRODUCTS SELECTION (Base + Matching) ── */}
          <div style={blockStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.875rem" }}>
              <h3 style={blockHeadingStyle}>Included Products ({totalCount} of 4 max)</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
                Base product + {matchingProducts.length} matching {matchingProducts.length === 1 ? "item" : "items"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {/* ── Base Product Card (Fixed) ── */}
              <div style={itemCardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <div style={thumbnailStyle}>
                    {baseProduct.image_url ? (
                      <img
                        src={baseProduct.image_url}
                        alt={baseProduct.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={thumbnailFallbackStyle}>💎</div>
                    )}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)" }}>
                        {baseProduct.name}
                      </span>
                      <span style={baseBadgeStyle}>Base Product</span>
                    </div>
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
                      Category: {baseProduct.category} · Price: ₹{basePrice.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-espresso)" }}>
                    ₹{basePrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* ── Matching Products Cards ── */}
              {matchingProducts.map((item, idx) => (
                <div key={item.id} style={itemCardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <div style={thumbnailStyle}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={thumbnailFallbackStyle}>✨</div>
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)" }}>
                        {item.name}
                      </span>
                      <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
                        Matching #{idx + 1} · {item.category}
                        {item.inStock === false && (
                          <span style={{ color: "#a82020", marginLeft: "0.5rem", fontWeight: 600 }}>
                            (Out of stock)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-espresso)" }}>
                      ₹{item.price.toLocaleString("en-IN")}
                    </span>

                    {/* Reorder controls */}
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        type="button"
                        onClick={() => handleMoveItem(idx, "up")}
                        disabled={idx === 0}
                        title="Move Up"
                        style={miniButtonStyle}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveItem(idx, "down")}
                        disabled={idx === matchingProducts.length - 1}
                        title="Move Down"
                        style={miniButtonStyle}
                      >
                        ↓
                      </button>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(item.id)}
                      style={removeButtonStyle}
                      title="Remove from look"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Add Matching Products Search Picker ── */}
            {matchingProducts.length < 3 && (
              <div style={{ marginTop: "1rem", position: "relative" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    placeholder="Search matching products to add (e.g. Necklace, Bracelet)..."
                    style={inputStyle}
                  />
                  {searching && (
                    <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)", alignSelf: "center" }}>
                      Searching...
                    </span>
                  )}
                </div>

                {/* Candidate Dropdown */}
                {showSearchDropdown && candidates.length > 0 && (
                  <div style={dropdownStyle}>
                    {candidates.map((cand) => (
                      <div
                        key={cand.id}
                        onClick={() => handleAddProduct(cand)}
                        style={candidateRowStyle}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          <div style={{ width: "2rem", height: "2rem", borderRadius: "2px", overflow: "hidden", background: "#f0f0f0" }}>
                            {cand.imageUrl ? (
                              <img src={cand.imageUrl} alt={cand.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={thumbnailFallbackStyle}>✨</div>
                            )}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-espresso)" }}>
                              {cand.name}
                            </p>
                            <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>
                              {cand.category} · ₹{cand.price.toLocaleString("en-IN")}
                              {cand.inStock === false && " · Out of stock"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            borderRadius: "3px",
                            border: "1px solid var(--color-gold-muted)",
                            background: "var(--color-sand)",
                            color: "var(--color-espresso)",
                            cursor: "pointer",
                          }}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 2. BUNDLE PRICING & LIVE CALCULATION ── */}
          <div style={blockStyle}>
            <h3 style={blockHeadingStyle}>Pricing & Customer Savings</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "0.875rem" }}>
              {/* Bundle Price Input */}
              <div>
                <label style={fieldLabelStyle}>
                  Fixed Bundle Price (₹) <span style={{ color: "#a82020" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={currencySymbolStyle}>₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={bundlePrice}
                    onChange={(e) => setBundlePrice(e.target.value)}
                    placeholder="e.g. 1300"
                    style={{ ...inputStyle, paddingLeft: "1.75rem", fontWeight: 600 }}
                    required
                  />
                </div>
                <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)", display: "block", marginTop: "0.25rem" }}>
                  Fixed price charged when all {totalCount} items are selected.
                </span>
              </div>

              {/* Dynamic Calculation Summary Box */}
              <div style={pricingCardStyle}>
                <div style={summaryRowStyle}>
                  <span style={{ color: "var(--color-espresso-muted)" }}>Individual Product Total:</span>
                  <strong style={{ color: "var(--color-espresso)" }}>₹{individualTotal.toLocaleString("en-IN")}</strong>
                </div>

                <div style={summaryRowStyle}>
                  <span style={{ color: "var(--color-espresso-muted)" }}>Configured Bundle Price:</span>
                  <strong style={{ color: parsedBundlePrice > 0 ? "var(--color-espresso)" : "#999" }}>
                    {parsedBundlePrice > 0 ? `₹${parsedBundlePrice.toLocaleString("en-IN")}` : "—"}
                  </strong>
                </div>

                <div style={{ ...summaryRowStyle, borderTop: "1px dashed var(--border)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                  <span style={{ fontWeight: 600, color: customerSavings > 0 ? "#1e6b20" : "var(--color-espresso)" }}>
                    Customer Saves:
                  </span>
                  <strong style={{ fontSize: "1rem", color: customerSavings > 0 ? "#1e6b20" : "var(--color-espresso)" }}>
                    ₹{customerSavings.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            </div>

            {/* Non-blocking Price Warning */}
            {showPriceWarning && (
              <div style={warningBannerStyle}>
                ⚠️ <strong>Pricing Warning:</strong> Bundle price (₹{parsedBundlePrice.toLocaleString("en-IN")}) is not lower than the current individual total (₹{individualTotal.toLocaleString("en-IN")}).
              </div>
            )}
          </div>

          {/* ── 3. COUPON USAGE SETTING ── */}
          <div style={blockStyle}>
            <h3 style={blockHeadingStyle}>Coupon Compatibility</h3>
            <p style={{ margin: "0.25rem 0 0.875rem", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
              Controls whether customer promotional coupons may be applied when the Complete-the-Look bundle price is active.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  name="couponAllowed"
                  checked={couponAllowed === true}
                  onChange={() => setCouponAllowed(true)}
                  style={{ accentColor: "var(--color-gold-muted)" }}
                />
                <div>
                  <span style={{ fontWeight: 600, color: "var(--color-espresso)" }}>Allow regular coupons</span>
                  <span style={{ display: "block", fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>
                    Promotional coupons can be combined with this Complete-the-Look bundle discount (Default).
                  </span>
                </div>
              </label>

              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  name="couponAllowed"
                  checked={couponAllowed === false}
                  onChange={() => setCouponAllowed(false)}
                  style={{ accentColor: "var(--color-gold-muted)" }}
                />
                <div>
                  <span style={{ fontWeight: 600, color: "var(--color-espresso)" }}>Do not allow regular coupons</span>
                  <span style={{ display: "block", fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>
                    Promotional coupons are blocked when the Complete-the-Look bundle price is applied.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* ── 4. ACTION BUTTONS ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem" }}>
            {isExisting ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                style={dangerButtonStyle}
              >
                Remove Complete the Look
              </button>
            ) : <div />}

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  style={{
                    padding:       "0.75rem 1.25rem",
                    fontSize:      "0.75rem",
                    fontWeight:    600,
                    letterSpacing: "0.05em",
                    background:    "transparent",
                    color:         "var(--color-espresso-muted)",
                    border:        "1px solid var(--border)",
                    borderRadius:  "4px",
                    cursor:        "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                style={primaryButtonStyle}
              >
                {saving ? "Saving..." : isExisting ? "Update Complete the Look" : "Save Complete the Look"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

// ── Shared Micro-Styles ──
const containerStyle: React.CSSProperties = {
  background:   "var(--color-sand)",
  border:       "1px solid var(--border)",
  borderRadius: "6px",
  padding:      "1.5rem",
  fontFamily:   "var(--font-body), Manrope, sans-serif",
};

const headerStyle: React.CSSProperties = {
  display:        "flex",
  justifyContent: "space-between",
  alignItems:     "flex-start",
  paddingBottom:  "1.25rem",
  borderBottom:   "1px solid var(--border)",
  marginBottom:   "1.5rem",
};

const titleStyle: React.CSSProperties = {
  fontFamily:    "var(--font-display), 'Cormorant Garamond', serif",
  fontSize:      "1.375rem",
  fontWeight:    600,
  color:         "var(--color-espresso)",
  margin:        0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize:      "0.8125rem",
  color:         "var(--color-espresso-muted)",
  margin:        "0.25rem 0 0",
};

const toggleContainerStyle: React.CSSProperties = {
  display:    "flex",
  alignItems: "center",
  gap:        "0.5rem",
  cursor:     "pointer",
  userSelect: "none",
  background: "white",
  padding:    "0.5rem 0.75rem",
  borderRadius: "4px",
  border:     "1px solid var(--border)",
};

const blockStyle: React.CSSProperties = {
  background:   "white",
  border:       "1px solid var(--border)",
  borderRadius: "4px",
  padding:      "1.25rem",
};

const blockHeadingStyle: React.CSSProperties = {
  fontSize:      "0.875rem",
  fontWeight:    700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color:         "var(--color-espresso)",
  margin:        0,
};

const fieldLabelStyle: React.CSSProperties = {
  display:       "block",
  fontSize:      "0.75rem",
  fontWeight:    600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color:         "var(--color-espresso)",
  marginBottom:  "0.375rem",
};

const inputStyle: React.CSSProperties = {
  width:        "100%",
  padding:      "0.625rem 0.75rem",
  fontSize:     "0.875rem",
  fontFamily:   "inherit",
  color:        "var(--color-espresso)",
  background:   "var(--color-sand)",
  border:       "1px solid var(--border)",
  borderRadius: "4px",
  outline:      "none",
  boxSizing:    "border-box",
};

const currencySymbolStyle: React.CSSProperties = {
  position:  "absolute",
  left:      "0.625rem",
  top:       "50%",
  transform: "translateY(-50%)",
  fontSize:  "0.875rem",
  fontWeight: 600,
  color:     "var(--color-espresso-muted)",
};

const itemCardStyle: React.CSSProperties = {
  display:        "flex",
  alignItems:     "center",
  justifyContent: "space-between",
  padding:        "0.75rem 1rem",
  background:     "var(--color-sand)",
  border:         "1px solid var(--border)",
  borderRadius:   "4px",
};

const thumbnailStyle: React.CSSProperties = {
  width:        "2.5rem",
  height:       "2.5rem",
  borderRadius: "4px",
  overflow:     "hidden",
  background:   "#e8e6e3",
  flexShrink:   0,
};

const thumbnailFallbackStyle: React.CSSProperties = {
  width:          "100%",
  height:         "100%",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  fontSize:       "1rem",
};

const baseBadgeStyle: React.CSSProperties = {
  display:       "inline-block",
  padding:       "0.15rem 0.4rem",
  borderRadius:  "3px",
  fontSize:      "0.625rem",
  fontWeight:    700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  background:    "var(--color-gold-muted)",
  color:         "white",
};

const miniButtonStyle: React.CSSProperties = {
  width:        "1.625rem",
  height:       "1.625rem",
  display:      "flex",
  alignItems:   "center",
  justifyContent: "center",
  fontSize:     "0.75rem",
  fontWeight:   700,
  background:   "white",
  border:       "1px solid var(--border)",
  borderRadius: "3px",
  cursor:       "pointer",
  color:        "var(--color-espresso)",
};

const removeButtonStyle: React.CSSProperties = {
  padding:       "0.25rem 0.625rem",
  fontSize:      "0.6875rem",
  fontWeight:    600,
  background:    "transparent",
  border:        "1px solid #e0c8c8",
  borderRadius:  "3px",
  color:         "#a82020",
  cursor:        "pointer",
};

const dropdownStyle: React.CSSProperties = {
  position:     "absolute",
  top:          "100%",
  left:         0,
  right:        0,
  maxHeight:    "220px",
  overflowY:    "auto",
  background:   "white",
  border:       "1px solid var(--border)",
  borderRadius: "4px",
  boxShadow:    "0 4px 12px rgba(0,0,0,0.08)",
  zIndex:       50,
  marginTop:    "0.25rem",
};

const candidateRowStyle: React.CSSProperties = {
  display:        "flex",
  alignItems:     "center",
  justifyContent: "space-between",
  padding:        "0.625rem 0.875rem",
  borderBottom:   "1px solid #f0f0f0",
  cursor:         "pointer",
};

const pricingCardStyle: React.CSSProperties = {
  background:   "var(--color-sand)",
  border:       "1px solid var(--border)",
  borderRadius: "4px",
  padding:      "0.875rem 1rem",
  display:      "flex",
  flexDirection: "column",
  gap:          "0.375rem",
};

const summaryRowStyle: React.CSSProperties = {
  display:        "flex",
  justifyContent: "space-between",
  alignItems:     "center",
  fontSize:       "0.8125rem",
};

const warningBannerStyle: React.CSSProperties = {
  marginTop:    "1rem",
  padding:      "0.75rem 1rem",
  borderRadius: "4px",
  background:   "#fff9e6",
  border:       "1px solid #f5deb3",
  color:        "#8a6d1c",
  fontSize:     "0.75rem",
  lineHeight:   1.4,
};

const radioLabelStyle: React.CSSProperties = {
  display:    "flex",
  alignItems: "flex-start",
  gap:        "0.625rem",
  fontSize:   "0.8125rem",
  cursor:     "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  padding:       "0.75rem 1.75rem",
  fontSize:      "0.75rem",
  fontWeight:    700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  background:    "var(--color-espresso)",
  color:         "white",
  border:        "none",
  borderRadius:  "4px",
  cursor:        "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  padding:       "0.75rem 1.25rem",
  fontSize:      "0.75rem",
  fontWeight:    600,
  letterSpacing: "0.05em",
  background:    "transparent",
  color:         "#a82020",
  border:        "1px solid #e0c8c8",
  borderRadius:  "4px",
  cursor:        "pointer",
};
