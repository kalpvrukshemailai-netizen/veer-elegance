"use client";

/**
 * VEER ELEGANCE — ReviewTableClient
 *
 * Interactive Admin Review Management Table:
 *  - Filter by moderation status: [ All ] [ Pending ] [ Approved ] [ Rejected ]
 *  - Filter by star rating: [ All ] [ 5★ ] [ 4★ ] [ 3★ ] [ 2★ ] [ 1★ ]
 *  - Live search across product, reviewer display name, review text
 *  - Inline actions: [ Approve ] [ Reject ] [ Delete ]
 *  - Photo lightbox preview
 */

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Star, ShieldCheck, Check, X, Trash2, Search, ExternalLink } from "lucide-react";
import type { AdminReviewRecord } from "@/lib/reviews-server";
import type { ReviewStatus } from "@/lib/reviews";
import { formatReviewDate } from "@/lib/reviews";

interface ReviewTableClientProps {
  initialReviews: AdminReviewRecord[];
}

export default function ReviewTableClient({ initialReviews }: ReviewTableClientProps) {
  const [reviews, setReviews] = useState<AdminReviewRecord[]>(initialReviews);
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter in memory for instantaneous feedback
  const filtered = reviews.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (ratingFilter !== "all" && r.rating !== ratingFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchProduct = r.productName.toLowerCase().includes(q);
      const matchReviewer = r.reviewerDisplayName.toLowerCase().includes(q);
      const matchText = r.reviewText.toLowerCase().includes(q);
      if (!matchProduct && !matchReviewer && !matchText) return false;
    }
    return true;
  });

  const handleStatusChange = async (reviewId: string, newStatus: "approved" | "rejected") => {
    setActionError(null);
    try {
      const res = await fetch("/api/admin/reviews", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reviewId, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.error || "Failed to update review status.");
      } else {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r))
        );
      }
    } catch {
      setActionError("A network error occurred.");
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;
    setActionError(null);
    try {
      const res = await fetch("/api/admin/reviews", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reviewId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.error || "Failed to delete review.");
      } else {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } catch {
      setActionError("A network error occurred.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <div
        style={{
          background:   "var(--color-ivory)",
          borderRadius: "var(--radius-card-img, 8px)",
          border:       "1px solid var(--border)",
          padding:      "1.25rem",
          display:      "flex",
          flexDirection:"column",
          gap:          "1rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", justifyContent: "space-between" }}>
          {/* Status Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)", fontWeight: 600, textTransform: "uppercase", marginRight: "0.25rem" }}>
              Status:
            </span>
            {(["all", "pending", "approved", "rejected"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding:       "0.375rem 0.75rem",
                  fontSize:      "0.6875rem",
                  fontWeight:    600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  border:        "1px solid " + (statusFilter === st ? "var(--color-espresso)" : "var(--border)"),
                  background:    statusFilter === st ? "var(--color-espresso)" : "transparent",
                  color:         statusFilter === st ? "var(--color-ivory)" : "var(--color-espresso)",
                  borderRadius:  "2px",
                  cursor:        "pointer",
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Rating filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)", fontWeight: 600, textTransform: "uppercase", marginRight: "0.25rem" }}>
              Rating:
            </span>
            {(["all", 5, 4, 3, 2, 1] as const).map((rt) => (
              <button
                key={rt}
                type="button"
                onClick={() => setRatingFilter(rt)}
                style={{
                  padding:       "0.375rem 0.625rem",
                  fontSize:      "0.6875rem",
                  fontWeight:    600,
                  border:        "1px solid " + (ratingFilter === rt ? "var(--color-espresso)" : "var(--border)"),
                  background:    ratingFilter === rt ? "var(--color-espresso)" : "transparent",
                  color:         ratingFilter === rt ? "var(--color-ivory)" : "var(--color-espresso)",
                  borderRadius:  "2px",
                  cursor:        "pointer",
                }}
              >
                {rt === "all" ? "All" : `${rt}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Live Search Input */}
        <div style={{ position: "relative", width: "100%", maxWidth: "450px" }}>
          <Search size={16} color="var(--color-espresso-muted)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search by product, customer, or review text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width:        "100%",
              padding:      "0.625rem 0.75rem 0.625rem 2.25rem",
              borderRadius: "2px",
              border:       "1px solid var(--border)",
              background:   "var(--color-parchment)",
              fontFamily:   "var(--font-body), Manrope, sans-serif",
              fontSize:     "0.8125rem",
              color:        "var(--color-espresso)",
            }}
          />
        </div>
      </div>

      {actionError && (
        <div style={{ color: "#c62828", fontSize: "0.8125rem", background: "rgba(198, 40, 40, 0.08)", padding: "0.75rem", borderRadius: "4px" }}>
          {actionError}
        </div>
      )}

      {/* ── Reviews Table ────────────────────────────────────────────────── */}
      <div
        style={{
          background:   "var(--color-ivory)",
          borderRadius: "var(--radius-card-img, 8px)",
          border:       "1px solid var(--border)",
          overflowX:    "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(44, 24, 16, 0.02)" }}>
              <th style={{ padding: "0.875rem 1rem", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", color: "var(--color-espresso-muted)" }}>Product</th>
              <th style={{ padding: "0.875rem 1rem", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", color: "var(--color-espresso-muted)" }}>Customer</th>
              <th style={{ padding: "0.875rem 1rem", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", color: "var(--color-espresso-muted)" }}>Rating</th>
              <th style={{ padding: "0.875rem 1rem", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", color: "var(--color-espresso-muted)", minWidth: "220px" }}>Review</th>
              <th style={{ padding: "0.875rem 1rem", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", color: "var(--color-espresso-muted)" }}>Photo</th>
              <th style={{ padding: "0.875rem 1rem", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", color: "var(--color-espresso-muted)" }}>Verified</th>
              <th style={{ padding: "0.875rem 1rem", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", color: "var(--color-espresso-muted)" }}>Status</th>
              <th style={{ padding: "0.875rem 1rem", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", color: "var(--color-espresso-muted)" }}>Date</th>
              <th style={{ padding: "0.875rem 1rem", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", color: "var(--color-espresso-muted)", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "2.5rem", textAlign: "center", color: "var(--color-espresso-muted)" }}>
                  No reviews match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  {/* Product */}
                  <td style={{ padding: "0.875rem 1rem", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 600, color: "var(--color-espresso)" }}>{r.productName}</div>
                    {r.productSlug && (
                      <Link
                        href={`/product/${r.productSlug}`}
                        target="_blank"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", color: "var(--color-espresso-muted)", textDecoration: "none", marginTop: "0.25rem" }}
                      >
                        <span>View Piece</span>
                        <ExternalLink size={10} />
                      </Link>
                    )}
                  </td>

                  {/* Customer */}
                  <td style={{ padding: "0.875rem 1rem", verticalAlign: "top", color: "var(--color-espresso)" }}>
                    {r.reviewerDisplayName}
                  </td>

                  {/* Rating */}
                  <td style={{ padding: "0.875rem 1rem", verticalAlign: "top" }}>
                    <div style={{ display: "flex", gap: "2px", color: "var(--color-gold-muted)" }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={13} fill={s <= r.rating ? "var(--color-gold-muted)" : "none"} strokeWidth={1.75} />
                      ))}
                    </div>
                  </td>

                  {/* Review Text */}
                  <td style={{ padding: "0.875rem 1rem", verticalAlign: "top", color: "var(--color-espresso)", lineHeight: 1.5 }}>
                    {r.reviewText}
                  </td>

                  {/* Photo */}
                  <td style={{ padding: "0.875rem 1rem", verticalAlign: "top" }}>
                    {r.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setActivePhoto(r.imageUrl!)}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                        aria-label="View uploaded photo"
                      >
                        <img
                          src={r.imageUrl}
                          alt="Review attachment"
                          style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "4px", border: "1px solid var(--border)" }}
                        />
                      </button>
                    ) : (
                      <span style={{ color: "var(--color-espresso-muted)", fontSize: "0.75rem" }}>None</span>
                    )}
                  </td>

                  {/* Verified */}
                  <td style={{ padding: "0.875rem 1rem", verticalAlign: "top" }}>
                    {r.verifiedPurchase ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#2e7d32", fontSize: "0.75rem", fontWeight: 600 }}>
                        <ShieldCheck size={14} /> Yes
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-espresso-muted)", fontSize: "0.75rem" }}>No</span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "0.875rem 1rem", verticalAlign: "top" }}>
                    <span
                      style={{
                        padding:       "0.25rem 0.5rem",
                        borderRadius:  "2px",
                        fontSize:      "0.6875rem",
                        fontWeight:    600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        background:
                          r.status === "approved"
                            ? "rgba(46, 125, 50, 0.1)"
                            : r.status === "rejected"
                            ? "rgba(198, 40, 40, 0.1)"
                            : "rgba(245, 124, 0, 0.1)",
                        color:
                          r.status === "approved"
                            ? "#2e7d32"
                            : r.status === "rejected"
                            ? "#c62828"
                            : "#e65100",
                      }}
                    >
                      {r.status}
                    </span>
                  </td>

                  {/* Date */}
                  <td style={{ padding: "0.875rem 1rem", verticalAlign: "top", color: "var(--color-espresso-muted)", fontSize: "0.75rem" }}>
                    {formatReviewDate(r.createdAt)}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "0.875rem 1rem", verticalAlign: "top", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.375rem" }}>
                      {r.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.id, "approved")}
                          title="Approve Review"
                          style={{
                            padding:      "0.3125rem 0.5rem",
                            background:   "#2e7d32",
                            color:        "#fff",
                            border:       "none",
                            borderRadius: "2px",
                            cursor:       "pointer",
                            fontSize:     "0.6875rem",
                            display:      "flex",
                            alignItems:   "center",
                            gap:          "0.25rem",
                          }}
                        >
                          <Check size={12} /> Approve
                        </button>
                      )}

                      {r.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.id, "rejected")}
                          title="Reject Review"
                          style={{
                            padding:      "0.3125rem 0.5rem",
                            background:   "transparent",
                            color:        "#c62828",
                            border:       "1px solid #c62828",
                            borderRadius: "2px",
                            cursor:       "pointer",
                            fontSize:     "0.6875rem",
                            display:      "flex",
                            alignItems:   "center",
                            gap:          "0.25rem",
                          }}
                        >
                          <X size={12} /> Reject
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        title="Delete Review"
                        style={{
                          padding:      "0.3125rem 0.5rem",
                          background:   "transparent",
                          color:        "var(--color-espresso-muted)",
                          border:       "1px solid var(--border)",
                          borderRadius: "2px",
                          cursor:       "pointer",
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── LIGHTBOX PHOTO PREVIEW ───────────────────────────────────────── */}
      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         99999,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "2rem",
            background:     "rgba(0, 0, 0, 0.8)",
          }}
          onClick={() => setActivePhoto(null)}
        >
          <div style={{ position: "relative", maxWidth: "800px", maxHeight: "80vh" }}>
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              aria-label="Close photo"
              style={{
                position:     "absolute",
                top:          "-2.5rem",
                right:        0,
                color:        "#fff",
                background:   "none",
                border:       "none",
                cursor:       "pointer",
              }}
            >
              <X size={24} />
            </button>
            <img
              src={activePhoto}
              alt="Review attachment enlarged"
              style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: "4px" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
