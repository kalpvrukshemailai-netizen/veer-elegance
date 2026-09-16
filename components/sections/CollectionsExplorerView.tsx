"use client";

/**
 * VEER ELEGANCE — CollectionsExplorerView
 *
 * Client interactive container for the /collections route.
 * Reuses the existing Circular CollectionExplorer component.
 *
 * Clicking any category circle smoothly navigates to /shop/[category].
 */

import { useState, useCallback } from "react";
import { useRouter }             from "next/navigation";
import CollectionExplorer        from "@/components/sections/CollectionExplorer";
import type { CategoryId }       from "@/data/categories";

export default function CollectionsExplorerView() {
  const router = useRouter();
  const [activeId, setActiveId] = useState<CategoryId>("rings");

  const handleSelect = useCallback((id: CategoryId) => {
    setActiveId(id);
    router.push(`/shop/${id}`);
  }, [router]);

  return (
    <CollectionExplorer
      activeId={activeId}
      onSelect={handleSelect}
    />
  );
}
