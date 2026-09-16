"use client";

/**
 * VEER ELEGANCE — HomepageSections
 *
 * Client component that owns the shared `activeId` category state.
 * Renders in order:
 *   2. CollectionExplorer        — circular category selector
 *   3. EditorialCategorySpotlight — cinematic editorial per category
 *   4. FeaturedProducts           — product grid for active category
 *
 * State:
 *   activeId: CategoryId — starts as "rings" (RINGS is default)
 *
 * FeaturedProducts is an async Server Component that uses next/headers
 * via the Supabase server client. It CANNOT be imported here directly
 * (this file is "use client"). Instead, each category's featured section
 * is pre-rendered at the Server Component level (app/page.tsx) and passed
 * in as the `featuredByCategory` prop — a Map<CategoryId, ReactNode>.
 *
 * This is the canonical RSC pattern for mixing client state with server data.
 */

import { useState, useCallback, useEffect } from "react";
import CollectionExplorer          from "@/components/sections/CollectionExplorer";
import EditorialCategorySpotlight  from "@/components/sections/EditorialCategorySpotlight";
import { CATEGORIES, type CategoryId } from "@/data/categories";

// ─────────────────────────────────────────────────────────────────────────────

export default function HomepageSections({
  featuredByCategory,
  initialActiveId = "rings",
}: {
  /**
   * Pre-rendered featured sections, keyed by CategoryId.
   * Each value is a ReactNode (already-resolved Server Component output)
   * or null if there are no featured products for that category.
   */
  featuredByCategory: Partial<Record<CategoryId, React.ReactNode>>;
  initialActiveId?:   CategoryId;
}) {
  const [activeId, setActiveId] = useState<CategoryId>(initialActiveId);

  const handleSelect = useCallback((id: CategoryId) => {
    setActiveId(id);
  }, []);

  return (
    <>
      {/* ── 2. Circular Collection Explorer ─────────────────────────── */}
      <CollectionExplorer
        activeId={activeId}
        onSelect={handleSelect}
      />

      {/* ── 3. Editorial Category Spotlight ─────────────────────────── */}
      <EditorialCategorySpotlight
        activeId={activeId}
      />

      {/* ── 4. Featured Products for the active category ──────────────── */}
      {featuredByCategory[activeId] ?? null}
    </>
  );
}
