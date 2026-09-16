"use client";

/**
 * VEER ELEGANCE — InventoryTableClient
 *
 * Interactive client-side inventory table with quick search and status filtering.
 * Features:
 *  - Real-time search across name, slug, SKU/ID, category
 *  - Clear / reset button when search is active
 *  - Stock status filter pills with counts
 *  - Dynamic summary metric cards
 *  - Inline stock adjustment widgets
 *  - Responsive desktop grid / mobile expandable rows
 */

import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { InventoryWithProduct } from "@/lib/inventory";
import {
  getStockStatus,
  stockStatusLabel,
  type StockStatus,
} from "@/lib/inventory-utils";
import StockControl from "@/components/admin/StockControl";

// ─────────────────────────────────────────────────────────────────────────────

interface InventoryTableClientProps {
  initialInventory: InventoryWithProduct[];
}

const STATUS_COLORS: Record<StockStatus, { bg: string; color: string }> = {
  in_stock:     { bg: "color-mix(in srgb, #4a7c59 12%, transparent)", color: "#3a5e44" },
  low_stock:    { bg: "color-mix(in srgb, #B89A68 14%, transparent)", color: "#7a6040" },
  out_of_stock: { bg: "color-mix(in srgb, #b84c4c 10%, transparent)", color: "#8b3a3a" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function InventoryTableClient({ initialInventory }: InventoryTableClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | StockStatus>("all");

  // Overall metric counts (across full inventory)
  const metrics = useMemo(() => {
    let lowCount = 0, outCount = 0, inCount = 0;
    for (const row of initialInventory) {
      const s = getStockStatus(row.stock_quantity, row.low_stock_threshold);
      if (s === "out_of_stock") outCount++;
      else if (s === "low_stock") lowCount++;
      else inCount++;
    }
    return { inCount, lowCount, outCount, total: initialInventory.length };
  }, [initialInventory]);

  // Filtered rows based on search + status
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return initialInventory.filter((row) => {
      const status = getStockStatus(row.stock_quantity, row.low_stock_threshold);
      if (selectedStatus !== "all" && status !== selectedStatus) {
        return false;
      }

      if (!q) return true;

      const p = row.products;
      const nameMatch = p.name?.toLowerCase().includes(q) ?? false;
      const slugMatch = p.slug?.toLowerCase().includes(q) ?? false;
      const catMatch  = p.category?.toLowerCase().includes(q) ?? false;
      const idMatch   = p.id?.toLowerCase().includes(q) ?? false;

      return nameMatch || slugMatch || catMatch || idMatch;
    });
  }, [initialInventory, searchQuery, selectedStatus]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "1px",
          background: "var(--border)",
          border: "1px solid var(--border)",
        }}
      >
        {[
          { label: "In Stock",      value: metrics.inCount,  color: "#3a5e44" },
          { label: "Low Stock",     value: metrics.lowCount, color: "#7a6040" },
          { label: "Out of Stock",  value: metrics.outCount, color: "#8b3a3a" },
          { label: "Total Products",value: metrics.total,    color: "var(--color-espresso)" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--color-ivory)", padding: "1.25rem 1rem" }}>
            <p
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.5625rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--color-espresso-muted)",
                margin: "0 0 0.5rem",
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                fontSize: "2rem",
                fontWeight: 400,
                color: s.color,
                lineHeight: 1,
                margin: 0,
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.25rem",
          background: "var(--color-ivory)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Search input with icons */}
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: "480px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.875rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-espresso-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search by name, slug, SKU, category…"
            aria-label="Quick search inventory"
            style={{
              width: "100%",
              padding: "0.625rem 2.25rem 0.625rem 2.375rem",
              background: "var(--color-parchment)",
              border: "1px solid var(--border)",
              color: "var(--color-espresso)",
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.8125rem",
              outline: "none",
              borderRadius: "0",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search input"
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0.25rem",
                color: "var(--color-espresso-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            flexWrap: "wrap",
          }}
          role="group"
          aria-label="Filter inventory by stock status"
        >
          {[
            { key: "all",          label: "All",         count: initialInventory.length },
            { key: "in_stock",     label: "In Stock",    count: metrics.inCount },
            { key: "low_stock",    label: "Low Stock",   count: metrics.lowCount },
            { key: "out_of_stock", label: "Out of Stock",count: metrics.outCount },
          ].map((tab) => {
            const active = selectedStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedStatus(tab.key as "all" | StockStatus)}
                style={{
                  padding: "0.5rem 0.75rem",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: active ? "var(--color-espresso)" : "var(--color-parchment)",
                  color: active ? "var(--color-ivory)" : "var(--color-espresso-muted)",
                  border: active ? "1px solid var(--color-espresso)" : "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Filters / Result Count ─────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "var(--color-espresso-muted)",
          padding: "0 0.25rem",
        }}
      >
        <span>
          Showing <strong>{filteredRows.length}</strong> of {initialInventory.length} products
          {searchQuery && (
            <> matching &ldquo;{searchQuery}&rdquo;</>
          )}
        </span>
        {(searchQuery || selectedStatus !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedStatus("all");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-gold-muted)",
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Inventory table ───────────────────────────────────────────── */}
      {filteredRows.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--border)",
            background: "var(--color-ivory)",
            padding: "3.5rem 2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.875rem",
              color: "var(--color-espresso)",
              fontWeight: 600,
              margin: "0 0 0.5rem",
            }}
          >
            No products found
          </p>
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.8125rem",
              color: "var(--color-espresso-muted)",
              margin: "0 0 1.25rem",
            }}
          >
            No inventory records matched your search &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedStatus("all");
            }}
            style={{
              padding: "0.625rem 1.25rem",
              background: "var(--color-espresso)",
              color: "var(--color-ivory)",
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: "none",
              cursor: "pointer",
            }}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1px",
            background: "var(--border)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Table header — desktop */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "44px 1fr 100px 80px 100px 80px",
              gap: "1rem",
              alignItems: "center",
              padding: "0.625rem 1.25rem",
              background: "color-mix(in srgb, var(--color-parchment-deep) 60%, transparent)",
            }}
            role="row"
            aria-label="Inventory table header"
          >
            {["", "Product", "Category", "Stock", "Status", "Updated"].map((h) => (
              <span
                key={h}
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.5625rem",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--color-espresso-muted)",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Product rows */}
          {filteredRows.map((row) => {
            const status = getStockStatus(row.stock_quantity, row.low_stock_threshold);
            const sc     = STATUS_COLORS[status];
            const p      = row.products;

            return (
              <details
                key={row.id}
                style={{ background: "var(--color-ivory)" }}
                className="inventory-row"
              >
                <summary
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr 100px 80px 100px 80px",
                    gap: "1rem",
                    alignItems: "center",
                    padding: "0.875rem 1.25rem",
                    cursor: "pointer",
                    listStyle: "none",
                    opacity: p.archived ? 0.4 : 1,
                  }}
                  aria-label={`${p.name} — ${stockStatusLabel(status)} — click to expand`}
                >
                  {/* Image */}
                  <div
                    style={{
                      width: "44px",
                      height: "52px",
                      background: "var(--color-parchment-deep)",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle cx="8" cy="10" r="3" stroke="#bbb" strokeWidth="1" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Name & Slug */}
                  <div style={{ overflow: "hidden" }}>
                    <p
                      style={{
                        fontFamily: "var(--font-body), Manrope, sans-serif",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "var(--color-espresso)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-body), Manrope, sans-serif",
                        fontSize: "0.625rem",
                        color: "var(--color-espresso-muted)",
                        margin: 0,
                      }}
                    >
                      {p.slug}
                    </p>
                  </div>

                  {/* Category */}
                  <span
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.75rem",
                      color: "var(--color-espresso-muted)",
                      textTransform: "capitalize",
                    }}
                  >
                    {p.category}
                  </span>

                  {/* Stock qty */}
                  <span
                    style={{
                      fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                      fontSize: "1.5rem",
                      fontWeight: 400,
                      color: "var(--color-espresso)",
                      lineHeight: 1,
                    }}
                  >
                    {row.stock_quantity}
                  </span>

                  {/* Status badge */}
                  <span
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.5625rem",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      padding: "0.25rem 0.5rem",
                      background: sc.bg,
                      color: sc.color,
                      whiteSpace: "nowrap",
                      display: "inline-block",
                    }}
                    aria-label={`Status: ${stockStatusLabel(status)}`}
                  >
                    {stockStatusLabel(status)}
                  </span>

                  {/* Updated */}
                  <span
                    style={{
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.75rem",
                      color: "var(--color-espresso-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(row.updated_at)}
                  </span>
                </summary>

                {/* ── Expanded: stock controls + threshold ──────────── */}
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    padding: "1.5rem 1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.75rem",
                  }}
                >
                  {/* Stock controls */}
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-body), Manrope, sans-serif",
                        fontSize: "0.5625rem",
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--color-espresso-muted)",
                        margin: "0 0 1rem",
                      }}
                    >
                      Adjust Stock
                    </p>
                    <StockControl
                      productId={p.id}
                      productName={p.name}
                      initialStock={row.stock_quantity}
                      threshold={row.low_stock_threshold}
                    />
                  </div>

                  {/* Threshold info */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    <p
                      style={{
                        fontFamily: "var(--font-body), Manrope, sans-serif",
                        fontSize: "0.75rem",
                        color: "var(--color-espresso-muted)",
                        margin: 0,
                      }}
                    >
                      Low stock threshold:{" "}
                      <strong style={{ color: "var(--color-espresso)" }}>
                        {row.low_stock_threshold}
                      </strong>{" "}
                      units — stock at or below this triggers &ldquo;Low Stock&rdquo; status.
                    </p>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
