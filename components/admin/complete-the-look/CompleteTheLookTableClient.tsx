"use client";

/**
 * VEER ELEGANCE — CompleteTheLookTableClient
 *
 * Dedicated Admin Management component for Complete the Look sets.
 * Features:
 *  - Overview metrics cards (Total, Active, Disabled, Potential Savings)
 *  - Real-time search across base and included products (names & slugs)
 *  - Simple Status and Coupon compatibility filters
 *  - Full desktop table & mobile responsive cards
 *  - Availability issue warnings (Out of Stock, Unpublished, Archived)
 *  - Direct instant Enable / Disable toggle
 *  - Deletion with confirmation prompt
 *  - Storefront-accurate Preview Modal (using CompleteTheLookSection in previewMode)
 *  - Edit & Create Modals (reusing CompleteTheLookManager directly)
 */

import React, { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CompleteTheLookDetail, CompleteTheLookProduct } from "@/lib/complete-the-look";
import CompleteTheLookSection from "@/components/products/CompleteTheLookSection";
import CompleteTheLookManager from "@/components/admin/products/CompleteTheLookManager";

interface Props {
  initialLooks: CompleteTheLookDetail[];
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function CompleteTheLookTableClient({ initialLooks }: Props) {
  const router = useRouter();
  const [looks, setLooks] = useState<CompleteTheLookDetail[]>(initialLooks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [couponFilter, setCouponFilter] = useState<"all" | "allowed" | "not_allowed">("all");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal states
  const [previewLook, setPreviewLook] = useState<CompleteTheLookDetail | null>(null);
  const [editingLook, setEditingLook] = useState<CompleteTheLookDetail | null>(null);
  const [creatingLook, setCreatingLook] = useState(false);

  // Create look — base product search
  const [baseSearchQuery, setBaseSearchQuery] = useState("");
  const [baseCandidates, setBaseCandidates] = useState<CompleteTheLookProduct[]>([]);
  const [baseSearching, setBaseSearching] = useState(false);
  const [selectedBaseProduct, setSelectedBaseProduct] = useState<CompleteTheLookProduct | null>(null);

  // ── Metrics ────────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalLooks = looks.length;
    const activeLooks = looks.filter((l) => l.enabled).length;
    const disabledLooks = looks.filter((l) => !l.enabled).length;
    const totalPotentialSavings = looks
      .filter((l) => l.enabled)
      .reduce((acc, l) => acc + (l.customerSavings || 0), 0);

    return { totalLooks, activeLooks, disabledLooks, totalPotentialSavings };
  }, [looks]);

  // ── Filter & Search Logic ──────────────────────────────────────────────────
  const filteredLooks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return looks.filter((look) => {
      // 1. Search across base product and all included products
      if (query) {
        const baseNameMatch = look.baseProduct?.name?.toLowerCase().includes(query);
        const baseSlugMatch = look.baseProduct?.slug?.toLowerCase().includes(query);
        const includedMatch = (look.allProducts || []).some(
          (p) =>
            p.name?.toLowerCase().includes(query) ||
            p.slug?.toLowerCase().includes(query)
        );

        if (!baseNameMatch && !baseSlugMatch && !includedMatch) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter === "active" && !look.enabled) return false;
      if (statusFilter === "disabled" && look.enabled) return false;

      // 3. Coupon filter
      if (couponFilter === "allowed" && !look.couponAllowed) return false;
      if (couponFilter === "not_allowed" && look.couponAllowed) return false;

      return true;
    });
  }, [looks, search, statusFilter, couponFilter]);

  // ── Handlers: Status Toggle ────────────────────────────────────────────────
  const handleToggleStatus = (lookId: string, currentEnabled: boolean) => {
    setActionError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/complete-the-look", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: lookId, enabled: !currentEnabled }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to update status.");
        }

        setLooks((prev) =>
          prev.map((l) => (l.id === lookId ? { ...l, enabled: !currentEnabled } : l))
        );
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to update status.");
      }
    });
  };

  // ── Handlers: Delete ───────────────────────────────────────────────────────
  const handleDelete = (look: CompleteTheLookDetail) => {
    const baseName = look.baseProduct?.name || "this look";
    if (
      !confirm(
        `Are you sure you want to delete the Complete the Look configuration for "${baseName}"?\n\nActual products will NOT be deleted. Only the look configuration will be removed.`
      )
    ) {
      return;
    }

    setActionError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/complete-the-look?id=${look.id}`, {
          method: "DELETE",
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to delete Complete the Look set.");
        }

        setLooks((prev) => prev.filter((l) => l.id !== look.id));
        if (previewLook?.id === look.id) setPreviewLook(null);
        if (editingLook?.id === look.id) setEditingLook(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to delete look.");
      }
    });
  };

  // ── Handlers: Base Product Search for New Look ─────────────────────────────
  const handleBaseSearch = async (term: string) => {
    setBaseSearchQuery(term);
    if (!term.trim()) {
      setBaseCandidates([]);
      setBaseSearching(false);
      return;
    }

    setBaseSearching(true);
    try {
      const res = await fetch(
        `/api/admin/complete-the-look/search?q=${encodeURIComponent(term.trim())}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setBaseCandidates(data.products);
      }
    } catch (err) {
      console.error("[CompleteTheLookTable:baseSearch]", err);
    } finally {
      setBaseSearching(false);
    }
  };

  // Check if a product already has a look configured
  const isProductConfigured = (prodId: string) => {
    return looks.some((l) => l.baseProductId === prodId);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {actionError && (
        <div
          role="alert"
          style={{
            padding: "0.875rem 1.25rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            color: "#991b1b",
            fontSize: "0.8125rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#991b1b",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 1. SUMMARY CARDS ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <MetricCard
          label="Total Looks"
          value={metrics.totalLooks}
          subtext="Configured sets in catalog"
          accent="var(--color-espresso)"
        />
        <MetricCard
          label="Active Looks"
          value={metrics.activeLooks}
          subtext="Visible to shoppers on PDP"
          accent="#2e7d32"
        />
        <MetricCard
          label="Disabled Looks"
          value={metrics.disabledLooks}
          subtext="Hidden draft sets"
          accent="#757575"
        />
        <MetricCard
          label="Max Potential Savings"
          value={formatINR(metrics.totalPotentialSavings)}
          subtext="Combined customer value"
          accent="#b8860b"
        />
      </div>

      {/* ── 2. SEARCH, FILTERS & CREATE BUTTON ──────────────────────────────── */}
      <div
        style={{
          background: "var(--color-sand)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          {/* Search bar */}
          <div style={{ position: "relative", flex: "1 1 280px", maxWidth: "450px" }}>
            <span
              style={{
                position: "absolute",
                left: "0.875rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-espresso-muted)",
                pointerEvents: "none",
                fontSize: "0.875rem",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Complete the Look..."
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem 0.625rem 2.25rem",
                fontSize: "0.8125rem",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                background: "#ffffff",
                color: "var(--color-espresso)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-espresso-muted)",
                  fontSize: "0.75rem",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Primary Create Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedBaseProduct(null);
              setBaseSearchQuery("");
              setBaseCandidates([]);
              setCreatingLook(true);
            }}
            style={{
              padding: "0.6875rem 1.375rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: "var(--color-espresso)",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "opacity 0.15s ease",
            }}
          >
            <span>+ Create New Look</span>
          </button>
        </div>

        {/* Filter Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            flexWrap: "wrap",
            paddingTop: "0.5rem",
            borderTop: "1px solid color-mix(in srgb, var(--border) 60%, transparent)",
          }}
        >
          {/* Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-espresso-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Status:
            </span>
            <div style={{ display: "inline-flex", background: "#ffffff", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px" }}>
              {(["all", "active", "disabled"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: "0.25rem 0.625rem",
                    fontSize: "0.75rem",
                    fontWeight: statusFilter === st ? 600 : 500,
                    background: statusFilter === st ? "var(--color-espresso)" : "transparent",
                    color: statusFilter === st ? "#ffffff" : "var(--color-espresso-muted)",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Coupon Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-espresso-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Coupon:
            </span>
            <div style={{ display: "inline-flex", background: "#ffffff", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px" }}>
              {(
                [
                  { key: "all", label: "All" },
                  { key: "allowed", label: "Allowed" },
                  { key: "not_allowed", label: "Not Allowed" },
                ] as const
              ).map((cp) => (
                <button
                  key={cp.key}
                  type="button"
                  onClick={() => setCouponFilter(cp.key)}
                  style={{
                    padding: "0.25rem 0.625rem",
                    fontSize: "0.75rem",
                    fontWeight: couponFilter === cp.key ? 600 : 500,
                    background: couponFilter === cp.key ? "var(--color-espresso)" : "transparent",
                    color: couponFilter === cp.key ? "#ffffff" : "var(--color-espresso-muted)",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  {cp.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
            Showing <strong>{filteredLooks.length}</strong> of {looks.length} look{looks.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* ── 3. BUNDLE LIST (TABLE ON DESKTOP, CARDS ON MOBILE) ─────────────── */}
      {filteredLooks.length === 0 ? (
        <div
          style={{
            padding: "3.5rem 1.5rem",
            textAlign: "center",
            background: "var(--color-sand)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
              fontSize: "1.25rem",
              fontStyle: "italic",
              color: "var(--color-espresso)",
              margin: "0 0 0.5rem 0",
            }}
          >
            No Complete the Look sets match your criteria
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)", margin: 0 }}>
            Try resetting your search or filter settings, or click &ldquo;+ Create New Look&rdquo; to configure a new set.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.8125rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--color-sand)",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--color-espresso-muted)",
                    fontSize: "0.6875rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: "0.875rem 1rem" }}>Base Product</th>
                  <th style={{ padding: "0.875rem 1rem" }}>Included Pieces</th>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "right" }}>Individual Value</th>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "right" }}>Bundle Price</th>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "right" }}>Savings</th>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "center" }}>Coupons</th>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLooks.map((look) => {
                  const issues = getLookIssues(look);

                  return (
                    <tr
                      key={look.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.12s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#faf8f5")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Base Product */}
                      <td style={{ padding: "1rem", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "4px",
                              overflow: "hidden",
                              background: "var(--color-sand)",
                              position: "relative",
                              flexShrink: 0,
                              border: "1px solid var(--border)",
                            }}
                          >
                            {look.baseProduct?.imageUrl ? (
                              <Image
                                src={look.baseProduct.imageUrl}
                                alt={look.baseProduct.name}
                                fill
                                sizes="44px"
                                style={{ objectFit: "cover" }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.875rem",
                                  color: "var(--color-espresso-muted)",
                                }}
                              >
                                ✨
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-espresso)", fontSize: "0.875rem" }}>
                              {look.baseProduct?.name || "Unknown Product"}
                            </div>
                            <div style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>
                              slug: {look.baseProduct?.slug || "—"}
                            </div>
                            {/* Base product availability warning */}
                            {getProductWarning(look.baseProduct) && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginTop: "0.25rem",
                                  padding: "0.15rem 0.375rem",
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  borderRadius: "3px",
                                  fontSize: "0.625rem",
                                  fontWeight: 600,
                                }}
                              >
                                ⚠ {getProductWarning(look.baseProduct)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Included Pieces */}
                      <td style={{ padding: "1rem", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
                            {look.allProducts?.map((p) => {
                              const isBase = p.id === look.baseProductId;
                              const warning = getProductWarning(p);

                              return (
                                <div
                                  key={p.id}
                                  title={`${p.name} (${formatINR(p.price)})${warning ? ` — ${warning}` : ""}`}
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "4px",
                                    overflow: "hidden",
                                    position: "relative",
                                    background: "var(--color-sand)",
                                    border: isBase
                                      ? "2px solid var(--color-espresso)"
                                      : warning
                                      ? "2px solid #eab308"
                                      : "1px solid var(--border)",
                                    boxSizing: "border-box",
                                    cursor: "pointer",
                                  }}
                                >
                                  {p.imageUrl ? (
                                    <Image
                                      src={p.imageUrl}
                                      alt={p.name}
                                      fill
                                      sizes="32px"
                                      style={{ objectFit: "cover" }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.625rem",
                                      }}
                                    >
                                      💍
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>
                            {look.allProducts?.length || 0} pieces total ({look.matchingProducts?.length || 0} paired)
                          </span>

                          {/* Render specific piece warnings if any */}
                          {issues.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
                              {issues.map((iss, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: "0.625rem",
                                    color: "#b45309",
                                    fontWeight: 600,
                                  }}
                                >
                                  ⚠ {iss}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Individual Value (live selling prices sum) */}
                      <td style={{ padding: "1rem", verticalAlign: "middle", textAlign: "right" }}>
                        <span style={{ color: "var(--color-espresso-muted)", fontWeight: 500 }}>
                          {formatINR(look.individualTotal)}
                        </span>
                      </td>

                      {/* Complete Look Price */}
                      <td style={{ padding: "1rem", verticalAlign: "middle", textAlign: "right" }}>
                        <span style={{ fontWeight: 700, color: "var(--color-espresso)", fontSize: "0.9375rem" }}>
                          {formatINR(look.bundlePrice)}
                        </span>
                      </td>

                      {/* Savings */}
                      <td style={{ padding: "1rem", verticalAlign: "middle", textAlign: "right" }}>
                        {look.customerSavings > 0 ? (
                          <div>
                            <span style={{ color: "#2e7d32", fontWeight: 700 }}>
                              {formatINR(look.customerSavings)}
                            </span>
                            <div style={{ fontSize: "0.6875rem", color: "#2e7d32" }}>
                              {look.savingsPercent}% off
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-espresso-muted)" }}>₹0</span>
                        )}
                      </td>

                      {/* Coupon Compatibility */}
                      <td style={{ padding: "1rem", verticalAlign: "middle", textAlign: "center" }}>
                        {look.couponAllowed ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.2rem 0.5rem",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              borderRadius: "3px",
                              background: "color-mix(in srgb, #2e7d32 12%, transparent)",
                              color: "#2e7d32",
                            }}
                          >
                            Allowed
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.2rem 0.5rem",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              borderRadius: "3px",
                              background: "color-mix(in srgb, #5f6368 12%, transparent)",
                              color: "#5f6368",
                            }}
                          >
                            Not Allowed
                          </span>
                        )}
                      </td>

                      {/* Status + Instant Toggle */}
                      <td style={{ padding: "1rem", verticalAlign: "middle", textAlign: "center" }}>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleStatus(look.id, look.enabled)}
                          title={`Click to ${look.enabled ? "disable" : "enable"}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            padding: "0.25rem 0.625rem",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            borderRadius: "12px",
                            cursor: "pointer",
                            border: "1px solid",
                            background: look.enabled
                              ? "color-mix(in srgb, #2e7d32 14%, transparent)"
                              : "color-mix(in srgb, #757575 12%, transparent)",
                            color: look.enabled ? "#2e7d32" : "#5f6368",
                            borderColor: look.enabled
                              ? "color-mix(in srgb, #2e7d32 30%, transparent)"
                              : "color-mix(in srgb, #757575 30%, transparent)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: look.enabled ? "#2e7d32" : "#757575",
                            }}
                          />
                          {look.enabled ? "Active" : "Disabled"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "1rem", verticalAlign: "middle", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                          {/* Preview action */}
                          <button
                            type="button"
                            onClick={() => setPreviewLook(look)}
                            title="Preview customer view"
                            style={actionButtonStyle}
                          >
                            👁 Preview
                          </button>

                          {/* Edit action */}
                          <button
                            type="button"
                            onClick={() => setEditingLook(look)}
                            title="Edit configuration"
                            style={actionButtonStyle}
                          >
                            ✎ Edit
                          </button>

                          {/* Delete action */}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDelete(look)}
                            title="Delete look"
                            style={{
                              ...actionButtonStyle,
                              color: "#a82020",
                              borderColor: "#fca5a5",
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. PREVIEW MODAL (STOREFRONT EXACT FIDELITY) ────────────────────── */}
      {previewLook && (
        <ModalBackdrop onClose={() => setPreviewLook(null)}>
          <div style={{ maxWidth: "1000px", width: "100%", background: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            {/* Modal Header */}
            <div
              style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--color-sand)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-gold-muted)" }}>
                  Storefront Customer Preview
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                    fontSize: "1.375rem",
                    fontWeight: 600,
                    color: "var(--color-espresso)",
                    margin: "0.15rem 0 0",
                  }}
                >
                  {previewLook.baseProduct?.name} — Complete the Look
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLook(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  color: "var(--color-espresso-muted)",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Representative CompleteTheLookSection */}
            <div style={{ padding: "1.5rem", maxHeight: "80vh", overflowY: "auto" }}>
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "#fdf8ec",
                  border: "1px solid #f2e3be",
                  borderRadius: "4px",
                  marginBottom: "1.25rem",
                  fontSize: "0.75rem",
                  color: "#8a6d1c",
                }}
              >
                ℹ️ <strong>Preview Mode:</strong> This view renders the live customer-facing Complete-the-Look section. Product selections and pricing calculations mirror the product page. Cart additions are simulated and will not modify your cart.
              </div>

              <CompleteTheLookSection
                completeTheLook={previewLook}
                previewMode={true}
              />
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* ── 5. EDIT MODAL (REUSING CompleteTheLookManager) ─────────────────── */}
      {editingLook && (
        <ModalBackdrop onClose={() => setEditingLook(null)}>
          <div style={{ maxWidth: "880px", width: "100%", background: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div
              style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--color-sand)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-gold-muted)" }}>
                  Admin Look Builder
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                    fontSize: "1.375rem",
                    fontWeight: 600,
                    color: "var(--color-espresso)",
                    margin: "0.15rem 0 0",
                  }}
                >
                  Edit Complete the Look — {editingLook.baseProduct?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingLook(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  color: "var(--color-espresso-muted)",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "1.5rem", maxHeight: "82vh", overflowY: "auto" }}>
              <CompleteTheLookManager
                productId={editingLook.baseProductId}
                baseProduct={editingLook.baseProduct as any}
                inModal={true}
                onSaved={(updatedSet) => {
                  if (updatedSet) {
                    setLooks((prev) =>
                      prev.map((l) => (l.id === updatedSet.id ? updatedSet : l))
                    );
                  }
                  setEditingLook(null);
                  router.refresh();
                }}
                onDeleted={() => {
                  setLooks((prev) => prev.filter((l) => l.id !== editingLook.id));
                  setEditingLook(null);
                  router.refresh();
                }}
                onClose={() => setEditingLook(null)}
              />
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* ── 6. CREATE NEW LOOK MODAL (BASE PRODUCT SELECTOR & BUILDER) ─────── */}
      {creatingLook && (
        <ModalBackdrop onClose={() => setCreatingLook(false)}>
          <div style={{ maxWidth: "880px", width: "100%", background: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div
              style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--color-sand)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-gold-muted)" }}>
                  Curated Bundle Builder
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                    fontSize: "1.375rem",
                    fontWeight: 600,
                    color: "var(--color-espresso)",
                    margin: "0.15rem 0 0",
                  }}
                >
                  {selectedBaseProduct ? `Configure Look for: ${selectedBaseProduct.name}` : "Step 1: Select Base Product"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreatingLook(false);
                  setSelectedBaseProduct(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  color: "var(--color-espresso-muted)",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "1.5rem", maxHeight: "82vh", overflowY: "auto" }}>
              {!selectedBaseProduct ? (
                <div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)", margin: "0 0 1rem" }}>
                    Search and pick the primary jewelry piece around which the Complete the Look set will be built.
                  </p>

                  <div style={{ position: "relative", marginBottom: "1rem" }}>
                    <input
                      type="text"
                      value={baseSearchQuery}
                      onChange={(e) => handleBaseSearch(e.target.value)}
                      placeholder="Search base product by name or slug..."
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        fontSize: "0.875rem",
                        border: "1px solid var(--border)",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                    {baseSearching && (
                      <span style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
                        Searching...
                      </span>
                    )}
                  </div>

                  {baseCandidates.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "400px", overflowY: "auto" }}>
                      {baseCandidates.map((cand) => {
                        const configured = isProductConfigured(cand.id);

                        return (
                          <div
                            key={cand.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.75rem 1rem",
                              border: "1px solid var(--border)",
                              borderRadius: "4px",
                              background: configured ? "#faf8f5" : "#ffffff",
                              gap: "1rem",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <div
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                  background: "var(--color-sand)",
                                  position: "relative",
                                  flexShrink: 0,
                                }}
                              >
                                {cand.imageUrl ? (
                                  <Image src={cand.imageUrl} alt={cand.name} fill sizes="40px" style={{ objectFit: "cover" }} />
                                ) : (
                                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>💍</div>
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-espresso)" }}>
                                  {cand.name}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
                                  {formatINR(cand.price)} · slug: {cand.slug}
                                </div>
                              </div>
                            </div>

                            {configured ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCreatingLook(false);
                                  const existing = looks.find((l) => l.baseProductId === cand.id);
                                  if (existing) setEditingLook(existing);
                                }}
                                style={{
                                  padding: "0.375rem 0.75rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  background: "transparent",
                                  color: "var(--color-espresso-muted)",
                                  border: "1px solid var(--border)",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                Look Exists (Edit)
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedBaseProduct(cand)}
                                style={{
                                  padding: "0.4375rem 0.875rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  background: "var(--color-espresso)",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                Select Base Product →
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : baseSearchQuery.trim() && !baseSearching ? (
                    <p style={{ fontSize: "0.8125rem", color: "var(--color-espresso-muted)", textAlign: "center", margin: "2rem 0" }}>
                      No matching products found. Try a different search term.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: "1rem" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedBaseProduct(null)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-gold-muted)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      ← Choose different base product
                    </button>
                  </div>

                  <CompleteTheLookManager
                    productId={selectedBaseProduct.id}
                    baseProduct={selectedBaseProduct as any}
                    inModal={true}
                    onSaved={(newSet) => {
                      if (newSet) {
                        setLooks((prev) => [newSet, ...prev.filter((l) => l.id !== newSet.id)]);
                      }
                      setCreatingLook(false);
                      setSelectedBaseProduct(null);
                      router.refresh();
                    }}
                    onClose={() => {
                      setCreatingLook(false);
                      setSelectedBaseProduct(null);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents & Helpers
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  subtext,
  accent,
}: {
  label: string;
  value: string | number;
  subtext: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "1.125rem 1.25rem",
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso-muted)", marginBottom: "0.375rem" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "1.75rem", fontWeight: 600, color: "var(--color-espresso)", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)", marginTop: "0.25rem" }}>
        {subtext}
      </div>
    </div>
  );
}

function ModalBackdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(26, 17, 11, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

const actionButtonStyle: React.CSSProperties = {
  padding: "0.3125rem 0.625rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--color-espresso)",
  background: "#ffffff",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  cursor: "pointer",
  transition: "all 0.1s ease",
};

/**
 * Returns any stock or catalog availability issues for a single product.
 */
function getProductWarning(product?: CompleteTheLookProduct): string | null {
  if (!product) return null;
  if (product.inStock === false) return "Out of Stock";
  if (!product.published) return "Unpublished";
  if (product.archived) return "Archived";
  return null;
}

/**
 * Returns all issues for a look's configured products.
 */
function getLookIssues(look: CompleteTheLookDetail): string[] {
  const issues: string[] = [];
  look.allProducts?.forEach((p) => {
    const warning = getProductWarning(p);
    if (warning) {
      issues.push(`${p.name} — ${warning}`);
    }
  });
  return issues;
}
