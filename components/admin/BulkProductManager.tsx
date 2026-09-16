"use client";

/**
 * VEER ELEGANCE — BulkProductManager
 *
 * Rich interactive admin bulk product management interface.
 * Features:
 *  - Persistent selection across bulk operations, filters, sorting, search, and pagination.
 *  - Multi-criteria filtering (Category, Status, Stock, Featured, Care Instructions, Price, MRP, Search).
 *  - Multi-category support (product_categories + primary products.category).
 *  - Stable deterministic sorting with 14 sort criteria.
 *  - URL query state synchronization for filters, sort, search, and page.
 *  - Non-blocking inline notification banner on mutation success / partial failure.
 *  - Explicit Clear Selection and Select All Filtered / Visible controls.
 *  - Preflight publish validation with safety guardrails.
 */

import { useState, useMemo, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminProductWithDetails } from "@/lib/products-db";
import { calculateDiscountPercent } from "@/data/products";
import { CATEGORIES, getCategoryById } from "@/data/categories";
import {
  bulkSetPriceAction,
  bulkSetMrpAction,
  bulkSetStockAction,
  bulkSetPublishedAction,
  bulkSetFeaturedAction,
  bulkSetArchivedAction,
  bulkEditCategoriesAction,
  bulkRenameAction,
  bulkSetCareInstructionsAction,
  validatePublishReadinessAction,
  type BulkActionResult,
  type PublishReadinessCheckResult,
} from "@/app/admin/products/bulk/actions";

interface BulkProductManagerProps {
  initialProducts: AdminProductWithDetails[];
}

export type SortOption =
  | "created-desc"
  | "created-asc"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "mrp-asc"
  | "mrp-desc"
  | "stock-asc"
  | "stock-desc"
  | "updated-desc"
  | "updated-asc"
  | "category-asc"
  | "category-desc";

interface InlineNotification {
  type: "success" | "warning" | "error";
  title: string;
  message: string;
  failures?: { id: string; name: string; reason: string }[];
  timestamp: number;
}

export default function BulkProductManager({ initialProducts }: BulkProductManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Local Products State (optimistic updates & server sync) ────────────────
  const [products, setProducts] = useState<AdminProductWithDetails[]>(initialProducts);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // ── Filters & Sort State ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<string>("all");
  const [careFilter, setCareFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [mrpFilter, setMrpFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("created-desc");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // ── Selection State (Persistent Set of Product UUIDs) ──────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Inline Notification Banner State ───────────────────────────────────────
  const [notification, setNotification] = useState<InlineNotification | null>(null);

  // ── Modal & Action State ───────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState<
    | "price"
    | "mrp"
    | "stock"
    | "categories"
    | "rename"
    | "publish"
    | "unpublish"
    | "feature"
    | "unfeature"
    | "archive"
    | "unarchive"
    | "include_care"
    | "remove_care"
    | null
  >(null);

  // Form states
  const [priceInput, setPriceInput] = useState<string>("");
  const [mrpInput, setMrpInput] = useState<string>("");
  const [clearMrpMode, setClearMrpMode] = useState<boolean>(false);
  const [stockInput, setStockInput] = useState<string>("");
  const [categoryMode, setCategoryMode] = useState<"add" | "remove" | "replace">("add");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [primaryCategoryInput, setPrimaryCategoryInput] = useState<string>("");

  const [renameType, setRenameType] = useState<"prefix" | "replace">("prefix");
  const [renamePrefix, setRenamePrefix] = useState<string>("");
  const [renameFind, setRenameFind] = useState<string>("");
  const [renameReplace, setRenameReplace] = useState<string>("");

  // Publish validation state
  const [isValidatingPublish, setIsValidatingPublish] = useState<boolean>(false);
  const [publishReadiness, setPublishReadiness] = useState<PublishReadinessCheckResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── URL Query State Sync ───────────────────────────────────────────────────
  // 1. Read initial state from URL on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const q = params.get("search");
    if (q !== null) setSearchQuery(q);

    const cat = params.get("category");
    if (cat !== null) setCategoryFilter(cat);

    const st = params.get("status");
    if (st !== null) setStatusFilter(st);

    const stk = params.get("stock");
    if (stk !== null) setStockFilter(stk);

    const ft = params.get("featured");
    if (ft !== null) setFeaturedFilter(ft);

    const cr = params.get("care");
    if (cr !== null) setCareFilter(cr);

    const pr = params.get("price");
    if (pr !== null) setPriceFilter(pr);

    const mr = params.get("mrp");
    if (mr !== null) setMrpFilter(mr);

    const srt = params.get("sort") as SortOption | null;
    if (srt !== null) setSortOption(srt);

    const ps = params.get("pageSize");
    if (ps !== null) {
      const parsedPs = parseInt(ps, 10);
      if ([25, 50, 100, 200].includes(parsedPs)) setPageSize(parsedPs);
    }

    const pg = params.get("page");
    if (pg !== null) {
      const parsedPg = parseInt(pg, 10);
      if (parsedPg > 0) setCurrentPage(parsedPg);
    }
  }, []);

  // 2. Sync state changes back to URL (replaceState avoids extra history pushes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();

    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (stockFilter !== "all") params.set("stock", stockFilter);
    if (featuredFilter !== "all") params.set("featured", featuredFilter);
    if (careFilter !== "all") params.set("care", careFilter);
    if (priceFilter !== "all") params.set("price", priceFilter);
    if (mrpFilter !== "all") params.set("mrp", mrpFilter);
    if (sortOption !== "created-desc") params.set("sort", sortOption);
    if (pageSize !== 50) params.set("pageSize", pageSize.toString());
    if (currentPage > 1) params.set("page", currentPage.toString());

    const qs = params.toString();
    const targetUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", targetUrl);
  }, [
    searchQuery,
    categoryFilter,
    statusFilter,
    stockFilter,
    featuredFilter,
    careFilter,
    priceFilter,
    mrpFilter,
    sortOption,
    pageSize,
    currentPage,
  ]);

  // ── Multi-Criteria Filtered & Sorted Products Computation ──────────────────
  const filteredAndSortedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // 1. Filter
    const filtered = products.filter((p) => {
      // Search (Name or Slug)
      if (q) {
        const nameMatch = (p.name || "").toLowerCase().includes(q);
        const slugMatch = (p.slug || "").toLowerCase().includes(q);
        if (!nameMatch && !slugMatch) return false;
      }

      // Category Filter (multi-category aware)
      if (categoryFilter !== "all") {
        const assigned = p.categoryIds && p.categoryIds.length > 0
          ? p.categoryIds
          : (p.category ? [p.category] : []);
        if (!assigned.includes(categoryFilter)) return false;
      }

      // Status Filter
      if (statusFilter === "live") {
        if (!p.published || p.archived) return false;
      } else if (statusFilter === "draft") {
        if (p.published || p.archived) return false;
      } else if (statusFilter === "archived") {
        if (!p.archived) return false;
      }

      // Stock Filter
      if (stockFilter === "in_stock") {
        if (p.stock_quantity <= p.low_stock_threshold) return false;
      } else if (stockFilter === "low_stock") {
        if (p.stock_quantity <= 0 || p.stock_quantity > p.low_stock_threshold) return false;
      } else if (stockFilter === "out_of_stock") {
        if (p.stock_quantity > 0) return false;
      }

      // Featured Filter
      if (featuredFilter === "featured") {
        if (!p.featured) return false;
      } else if (featuredFilter === "not_featured") {
        if (p.featured) return false;
      }

      // Care Instructions Filter
      if (careFilter === "included") {
        if (!p.show_care_instructions) return false;
      } else if (careFilter === "not_included") {
        if (p.show_care_instructions) return false;
      }

      // Price Filter
      if (priceFilter === "has_price") {
        if (p.price === null || p.price === undefined || p.price <= 0) return false;
      } else if (priceFilter === "missing_price") {
        if (p.price !== null && p.price !== undefined && p.price > 0) return false;
      }

      // MRP Filter
      if (mrpFilter === "has_mrp") {
        if (p.mrp === null || p.mrp === undefined || p.mrp <= 0) return false;
      } else if (mrpFilter === "missing_mrp") {
        if (p.mrp !== null && p.mrp !== undefined && p.mrp > 0) return false;
      }

      return true;
    });

    // 2. Sort (with deterministic tie-breaker on p.id)
    return filtered.sort((a, b) => {
      switch (sortOption) {
        case "name-asc": {
          const comp = (a.name || a.slug).localeCompare(b.name || b.slug);
          return comp !== 0 ? comp : a.id.localeCompare(b.id);
        }
        case "name-desc": {
          const comp = (b.name || b.slug).localeCompare(a.name || a.slug);
          return comp !== 0 ? comp : a.id.localeCompare(b.id);
        }
        case "price-asc": {
          const diff = (a.price ?? 0) - (b.price ?? 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "price-desc": {
          const diff = (b.price ?? 0) - (a.price ?? 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "mrp-asc": {
          const diff = (a.mrp ?? 0) - (b.mrp ?? 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "mrp-desc": {
          const diff = (b.mrp ?? 0) - (a.mrp ?? 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "stock-asc": {
          const diff = (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "stock-desc": {
          const diff = (b.stock_quantity ?? 0) - (a.stock_quantity ?? 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "created-asc": {
          const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "created-desc": {
          const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "updated-asc": {
          const tA = new Date(a.updated_at || a.created_at).getTime();
          const tB = new Date(b.updated_at || b.created_at).getTime();
          const diff = tA - tB;
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "updated-desc": {
          const tA = new Date(a.updated_at || a.created_at).getTime();
          const tB = new Date(b.updated_at || b.created_at).getTime();
          const diff = tB - tA;
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "category-asc": {
          const catA = a.category || "";
          const catB = b.category || "";
          const comp = catA.localeCompare(catB);
          return comp !== 0 ? comp : a.id.localeCompare(b.id);
        }
        case "category-desc": {
          const catA = a.category || "";
          const catB = b.category || "";
          const comp = catB.localeCompare(catA);
          return comp !== 0 ? comp : a.id.localeCompare(b.id);
        }
        default:
          return 0;
      }
    });
  }, [
    products,
    searchQuery,
    categoryFilter,
    statusFilter,
    stockFilter,
    featuredFilter,
    careFilter,
    priceFilter,
    mrpFilter,
    sortOption,
  ]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedProducts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAndSortedProducts.slice(start, start + pageSize);
  }, [filteredAndSortedProducts, safeCurrentPage, pageSize]);

  // ── Selected Product Objects & Statistics ──────────────────────────────────
  const selectedProductList = useMemo(() => {
    const selectedSet = selectedIds;
    return products.filter((p) => selectedSet.has(p.id));
  }, [products, selectedIds]);

  const visibleSelectedCount = useMemo(() => {
    return paginatedProducts.filter((p) => selectedIds.has(p.id)).length;
  }, [paginatedProducts, selectedIds]);

  const filteredSelectedCount = useMemo(() => {
    return filteredAndSortedProducts.filter((p) => selectedIds.has(p.id)).length;
  }, [filteredAndSortedProducts, selectedIds]);

  // ── Selection Handlers ─────────────────────────────────────────────────────
  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAllVisible = () => {
    const next = new Set(selectedIds);
    const visibleIds = paginatedProducts.map((p) => p.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => next.has(id));

    if (allVisibleSelected) {
      visibleIds.forEach((id) => next.delete(id));
    } else {
      visibleIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedIds);
    filteredAndSortedProducts.forEach((p) => next.add(p.id));
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const resetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockFilter("all");
    setFeaturedFilter("all");
    setCareFilter("all");
    setPriceFilter("all");
    setMrpFilter("all");
    setSortOption("created-desc");
    setCurrentPage(1);
    // Note: selectedIds is PRESERVED!
  };

  const isAllVisibleSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedIds.has(p.id));

  const isSomeVisibleSelected =
    paginatedProducts.some((p) => selectedIds.has(p.id)) && !isAllVisibleSelected;

  // ── Action Completion Helper (PERSISTS SELECTION) ──────────────────────────
  const handleActionCompleted = useCallback((res: BulkActionResult) => {
    if (res.failedCount === 0 && res.skippedCount === 0) {
      setNotification({
        type: "success",
        title: "Bulk Action Completed",
        message: `${res.updatedCount} product${res.updatedCount !== 1 ? "s" : ""} updated successfully.`,
        timestamp: Date.now(),
      });
    } else {
      setNotification({
        type: "warning",
        title: "Bulk Action Completed with Notices",
        message: `Updated: ${res.updatedCount} · Skipped: ${res.skippedCount} · Failed: ${res.failedCount}`,
        failures: res.failures,
        timestamp: Date.now(),
      });
    }
    // CRITICAL: DO NOT clear selection!
  }, []);

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handleOpenPublishModal = async () => {
    setActiveModal("publish");
    setIsValidatingPublish(true);
    setActionError(null);
    try {
      const res = await validatePublishReadinessAction(Array.from(selectedIds));
      setPublishReadiness(res);
    } catch (err: any) {
      setActionError(err.message || "Failed to validate publish readiness.");
    } finally {
      setIsValidatingPublish(false);
    }
  };

  const handleApplyPrice = () => {
    const num = parseFloat(priceInput);
    if (isNaN(num) || num < 0) {
      setActionError("Please enter a valid price greater than or equal to 0.");
      return;
    }
    const targetIds = Array.from(selectedIds);
    startTransition(async () => {
      try {
        const res = await bulkSetPriceAction(targetIds, num);
        // Optimistic local state update
        setProducts((prev) =>
          prev.map((p) => (selectedIds.has(p.id) ? { ...p, price: num } : p))
        );
        handleActionCompleted(res);
        setActiveModal(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to update prices.");
      }
    });
  };

  const handleApplyMrp = () => {
    const targetIds = Array.from(selectedIds);
    if (clearMrpMode) {
      startTransition(async () => {
        try {
          const res = await bulkSetMrpAction(targetIds, null);
          setProducts((prev) =>
            prev.map((p) => (selectedIds.has(p.id) ? { ...p, mrp: null } : p))
          );
          handleActionCompleted(res);
          setActiveModal(null);
          router.refresh();
        } catch (err: any) {
          setActionError(err.message || "Failed to clear MRP.");
        }
      });
      return;
    }

    const num = parseFloat(mrpInput);
    if (isNaN(num) || num <= 0) {
      setActionError("Please enter a valid MRP greater than 0.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkSetMrpAction(targetIds, num);
        setProducts((prev) =>
          prev.map((p) => (selectedIds.has(p.id) ? { ...p, mrp: num } : p))
        );
        handleActionCompleted(res);
        setActiveModal(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to update MRP.");
      }
    });
  };

  const handleApplyStock = () => {
    const num = parseInt(stockInput, 10);
    if (isNaN(num) || num < 0) {
      setActionError("Please enter a valid non-negative whole number.");
      return;
    }
    const targetIds = Array.from(selectedIds);
    startTransition(async () => {
      try {
        const res = await bulkSetStockAction(targetIds, num);
        setProducts((prev) =>
          prev.map((p) => (selectedIds.has(p.id) ? { ...p, stock_quantity: num } : p))
        );
        handleActionCompleted(res);
        setActiveModal(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to update stock.");
      }
    });
  };

  const handleApplyPublish = (targetProductIds?: string[]) => {
    const ids = targetProductIds ?? (publishReadiness?.readyIds || Array.from(selectedIds));
    if (ids.length === 0) {
      setActionError("No ready products available to publish.");
      return;
    }
    const idSet = new Set(ids);
    startTransition(async () => {
      try {
        const res = await bulkSetPublishedAction(ids, true);
        setProducts((prev) =>
          prev.map((p) => (idSet.has(p.id) ? { ...p, published: true, archived: false } : p))
        );
        handleActionCompleted(res);
        setActiveModal(null);
        setPublishReadiness(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to publish products.");
      }
    });
  };

  const handleApplyUnpublish = () => {
    const targetIds = Array.from(selectedIds);
    startTransition(async () => {
      try {
        const res = await bulkSetPublishedAction(targetIds, false);
        setProducts((prev) =>
          prev.map((p) => (selectedIds.has(p.id) ? { ...p, published: false } : p))
        );
        handleActionCompleted(res);
        setActiveModal(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to unpublish products.");
      }
    });
  };

  const handleApplyFeature = (featured: boolean) => {
    const targetIds = Array.from(selectedIds);
    startTransition(async () => {
      try {
        const res = await bulkSetFeaturedAction(targetIds, featured);
        setProducts((prev) =>
          prev.map((p) => (selectedIds.has(p.id) ? { ...p, featured } : p))
        );
        handleActionCompleted(res);
        setActiveModal(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to update featured status.");
      }
    });
  };

  const handleApplyArchive = (archived: boolean) => {
    const targetIds = Array.from(selectedIds);
    startTransition(async () => {
      try {
        const res = await bulkSetArchivedAction(targetIds, archived);
        setProducts((prev) =>
          prev.map((p) =>
            selectedIds.has(p.id)
              ? { ...p, archived, published: archived ? false : p.published }
              : p
          )
        );
        handleActionCompleted(res);
        setActiveModal(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to update archived status.");
      }
    });
  };

  const handleApplyCareInstructions = (showCare: boolean) => {
    const targetIds = Array.from(selectedIds);
    startTransition(async () => {
      try {
        const res = await bulkSetCareInstructionsAction(targetIds, showCare);
        setProducts((prev) =>
          prev.map((p) =>
            selectedIds.has(p.id) ? { ...p, show_care_instructions: showCare } : p
          )
        );
        handleActionCompleted(res);
        setActiveModal(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to update care instructions status.");
      }
    });
  };

  const handleApplyCategories = () => {
    if (categoryMode === "replace" && selectedCategoryIds.length === 0) {
      setActionError("Replace mode requires selecting at least one category.");
      return;
    }
    if (categoryMode !== "replace" && selectedCategoryIds.length === 0) {
      setActionError("Please select at least one category to add or remove.");
      return;
    }
    const targetIds = Array.from(selectedIds);
    const primary = primaryCategoryInput || selectedCategoryIds[0];

    startTransition(async () => {
      try {
        const res = await bulkEditCategoriesAction(targetIds, {
          mode: categoryMode,
          categoryIds: selectedCategoryIds,
          primaryCategory: primary,
        });
        setProducts((prev) =>
          prev.map((p) => {
            if (!selectedIds.has(p.id)) return p;
            let nextCats = [...(p.categoryIds || (p.category ? [p.category] : []))];
            if (categoryMode === "replace") {
              nextCats = [...selectedCategoryIds];
            } else if (categoryMode === "add") {
              nextCats = Array.from(new Set([...nextCats, ...selectedCategoryIds]));
            } else if (categoryMode === "remove") {
              nextCats = nextCats.filter((c) => !selectedCategoryIds.includes(c));
            }
            return {
              ...p,
              categoryIds: nextCats,
              category: nextCats.includes(primary) ? (primary as any) : (nextCats[0] as any) || p.category,
            };
          })
        );
        handleActionCompleted(res);
        setActiveModal(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to edit categories.");
      }
    });
  };

  const handleApplyRename = () => {
    if (renameType === "prefix" && !renamePrefix.trim()) {
      setActionError("Please enter a prefix.");
      return;
    }
    if (renameType === "replace" && !renameFind.trim()) {
      setActionError("Please enter text to find.");
      return;
    }
    const targetIds = Array.from(selectedIds);
    startTransition(async () => {
      try {
        const res = await bulkRenameAction(targetIds, {
          type: renameType,
          prefix: renamePrefix.trim(),
          findText: renameFind,
          replaceText: renameReplace,
        });
        setProducts((prev) =>
          prev.map((p) => {
            if (!selectedIds.has(p.id)) return p;
            const cur = p.name || p.slug;
            let nextName = cur;
            if (renameType === "prefix" && renamePrefix.trim()) {
              nextName = `${renamePrefix.trim()} ${cur}`;
            } else if (renameType === "replace" && renameFind) {
              nextName = cur.replaceAll(renameFind, renameReplace);
            }
            return { ...p, name: nextName };
          })
        );
        handleActionCompleted(res);
        setActiveModal(null);
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "Failed to rename products.");
      }
    });
  };

  // ── Formatters ─────────────────────────────────────────────────────────────
  const formatPrice = (p: number | null, curr = "INR") => {
    if (p === null || p === undefined) return <span style={{ color: "var(--color-espresso-muted)", fontStyle: "italic" }}>—</span>;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(p);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: selectedIds.size > 0 ? "7rem" : "2rem" }}>
      {/* ── Heading Row ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ width: "2rem", height: "1px", background: "var(--color-gold-muted)", marginBottom: "0.875rem" }} aria-hidden="true" />
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link
              href="/admin/products"
              style={{
                fontSize: "0.6875rem",
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-espresso-muted)",
                textDecoration: "none",
              }}
            >
              ← Products
            </Link>
            <span style={{ color: "var(--color-espresso-muted)", fontSize: "0.75rem" }}>/</span>
            <span style={eyebrow}>Bulk Management</span>
          </div>
          <h2 style={pageHeading}>
            {products.length} Total Products
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href="/admin/products"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1.25rem",
              background: "var(--color-ivory)",
              border: "1px solid var(--border)",
              color: "var(--color-espresso)",
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Standard View
          </Link>
          <Link
            href="/admin/products/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1.25rem",
              background: "var(--color-espresso)",
              color: "var(--color-ivory)",
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Add Product
          </Link>
        </div>
      </div>

      {/* ── Inline Notification Banner ──────────────────────────────────── */}
      {notification && (
        <div
          style={{
            padding: "1rem 1.25rem",
            background:
              notification.type === "success"
                ? "rgba(74, 124, 89, 0.12)"
                : notification.type === "warning"
                ? "rgba(202, 138, 4, 0.12)"
                : "rgba(184, 76, 76, 0.12)",
            border: `1px solid ${
              notification.type === "success"
                ? "#4a7c59"
                : notification.type === "warning"
                ? "#ca8a04"
                : "#b84c4c"
            }`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.125rem", lineHeight: 1 }}>
              {notification.type === "success" ? "✓" : "⚠️"}
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color:
                    notification.type === "success"
                      ? "#3a5e44"
                      : notification.type === "warning"
                      ? "#a16207"
                      : "#b84c4c",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                }}
              >
                {notification.title}
              </p>
              <p
                style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: "0.8125rem",
                  color: "var(--color-espresso)",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                }}
              >
                {notification.message}
              </p>
              {notification.failures && notification.failures.length > 0 && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#b84c4c" }}>
                  <p style={{ margin: "0 0 0.25rem 0", fontWeight: 700 }}>Failures:</p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {notification.failures.map((f, i) => (
                      <li key={i}>
                        <strong>{f.name}</strong>: {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-espresso-muted)",
              fontSize: "1rem",
              padding: "0.25rem",
            }}
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Comprehensive Filter & Sort Toolbar ──────────────────────────── */}
      <div
        style={{
          background: "var(--color-ivory)",
          border: "1px solid var(--border)",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Top Controls Row: Search & Sort */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {/* Search Box */}
          <div>
            <label style={filterLabelStyle}>Search Name or Slug</label>
            <input
              type="text"
              placeholder="e.g. Chain 10, bracelets-47, earings..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={inputStyle}
            />
          </div>

          {/* Sort Dropdown */}
          <div>
            <label style={filterLabelStyle}>Sort Products By</label>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value as SortOption);
                setCurrentPage(1);
              }}
              style={inputStyle}
            >
              <option value="created-desc">Created: Newest → Oldest (Default)</option>
              <option value="created-asc">Created: Oldest → Newest</option>
              <option value="name-asc">Name: A → Z</option>
              <option value="name-desc">Name: Z → A</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="mrp-asc">MRP: Low → High</option>
              <option value="mrp-desc">MRP: High → Low</option>
              <option value="stock-asc">Stock: Low → High</option>
              <option value="stock-desc">Stock: High → Low</option>
              <option value="updated-desc">Updated: Newest → Oldest</option>
              <option value="updated-asc">Updated: Oldest → Newest</option>
              <option value="category-asc">Category: A → Z</option>
              <option value="category-desc">Category: Z → A</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Category, Status, Stock, Featured, Care, Price, MRP */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.875rem" }}>
          {/* Category Filter */}
          <div>
            <label style={filterLabelStyle}>Collection</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={inputStyle}
            >
              <option value="all">All 7 Collections</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.subtitle || cat.collectionName} ({cat.label})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={filterLabelStyle}>Publication Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={inputStyle}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft (Unpublished)</option>
              <option value="live">Live (Published)</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <label style={filterLabelStyle}>Stock Level</label>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={inputStyle}
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt; 5)</option>
              <option value="low_stock">Low Stock (1 – 5)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>

          {/* Featured Filter */}
          <div>
            <label style={filterLabelStyle}>Featured</label>
            <select
              value={featuredFilter}
              onChange={(e) => {
                setFeaturedFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={inputStyle}
            >
              <option value="all">All Featured</option>
              <option value="featured">Featured Only</option>
              <option value="not_featured">Not Featured</option>
            </select>
          </div>

          {/* Care Instructions Filter */}
          <div>
            <label style={filterLabelStyle}>Care Instructions</label>
            <select
              value={careFilter}
              onChange={(e) => {
                setCareFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={inputStyle}
            >
              <option value="all">All</option>
              <option value="included">Included</option>
              <option value="not_included">Not Included</option>
            </select>
          </div>

          {/* Price Filter */}
          <div>
            <label style={filterLabelStyle}>Selling Price</label>
            <select
              value={priceFilter}
              onChange={(e) => {
                setPriceFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={inputStyle}
            >
              <option value="all">All Prices</option>
              <option value="has_price">Has Price (&gt; ₹0)</option>
              <option value="missing_price">Missing Price (₹0 / None)</option>
            </select>
          </div>

          {/* MRP Filter */}
          <div>
            <label style={filterLabelStyle}>MRP / Compare-at</label>
            <select
              value={mrpFilter}
              onChange={(e) => {
                setMrpFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={inputStyle}
            >
              <option value="all">All MRPs</option>
              <option value="has_mrp">Has MRP (&gt; ₹0)</option>
              <option value="missing_mrp">Missing MRP (None)</option>
            </select>
          </div>
        </div>

        {/* Selection & Filter Count Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid var(--border)",
            paddingTop: "0.875rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-body), Manrope, sans-serif", color: "var(--color-espresso-muted)" }}>
              Showing <strong>{filteredAndSortedProducts.length}</strong> of {products.length} products
            </span>

            {/* Reset Filters */}
            {(searchQuery ||
              categoryFilter !== "all" ||
              statusFilter !== "all" ||
              stockFilter !== "all" ||
              featuredFilter !== "all" ||
              careFilter !== "all" ||
              priceFilter !== "all" ||
              mrpFilter !== "all" ||
              sortOption !== "created-desc") && (
              <button
                type="button"
                onClick={resetFilters}
                style={{ ...textButtonStyle, color: "var(--color-gold-muted)", fontWeight: 700 }}
              >
                Reset Filters
              </button>
            )}

            {filteredAndSortedProducts.length > 0 && (
              <button
                type="button"
                onClick={selectAllFiltered}
                style={textButtonStyle}
              >
                Select all {filteredAndSortedProducts.length} filtered
              </button>
            )}

            {paginatedProducts.length > 0 && (
              <button
                type="button"
                onClick={selectAllVisible}
                style={textButtonStyle}
              >
                {isAllVisibleSelected ? "Deselect visible" : `Select ${paginatedProducts.length} visible`}
              </button>
            )}

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                style={{ ...textButtonStyle, color: "#b84c4c" }}
              >
                Clear selection ({selectedIds.size})
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)", fontFamily: "var(--font-body), Manrope, sans-serif" }}>
              Per page:
            </span>
            {[25, 50, 100, 200].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.6875rem",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontWeight: pageSize === sz ? 700 : 400,
                  background: pageSize === sz ? "var(--color-espresso)" : "var(--color-parchment-deep)",
                  color: pageSize === sz ? "var(--color-ivory)" : "var(--color-espresso)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Selection Status Alert ───────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            background: "color-mix(in srgb, var(--color-gold-muted) 15%, transparent)",
            border: "1px solid var(--color-gold-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1rem", color: "var(--color-gold-muted)" }}>✓</span>
            <p style={{ margin: 0, fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso)", fontWeight: 600 }}>
              <strong>{selectedIds.size}</strong> product{selectedIds.size !== 1 ? "s" : ""} selected
              <span style={{ fontWeight: 400, color: "var(--color-espresso-muted)", marginLeft: "0.5rem" }}>
                ({visibleSelectedCount} visible on current page · {filteredSelectedCount} in filtered set)
              </span>
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={clearSelection}
              style={{
                fontSize: "0.6875rem",
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "0.375rem 0.75rem",
                background: "transparent",
                border: "1px solid var(--color-espresso)",
                color: "var(--color-espresso)",
                cursor: "pointer",
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* ── Products Table ──────────────────────────────────────────────── */}
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", background: "var(--color-ivory)" }}>
        {filteredAndSortedProducts.length === 0 ? (
          <div style={{ padding: "3.5rem", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso-muted)", fontStyle: "italic", margin: "0 0 1rem 0" }}>
              No products match your active filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              style={{ ...confirmButtonStyle, padding: "0.5rem 1.25rem" }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body), Manrope, sans-serif" }} aria-label="Bulk Product Management Table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--color-parchment-deep) 70%, transparent)" }}>
                {/* Select All Visible */}
                <th style={{ ...thStyle, width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeVisibleSelected;
                    }}
                    onChange={selectAllVisible}
                    aria-label="Select all visible products"
                    style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--color-espresso)" }}
                  />
                </th>
                <th style={thStyle}>Image</th>
                <th style={thStyle}>Product &amp; Slug</th>
                <th style={thStyle}>Categories</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Stock</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Featured</th>
                <th style={thStyle}>Updated</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((p, idx) => {
                const isSelected = selectedIds.has(p.id);
                const assignedCats = p.categoryIds && p.categoryIds.length > 0
                  ? p.categoryIds
                  : (p.category ? [p.category] : []);
                const primaryCat = p.category;

                // Stock badges
                const stockQty = p.stock_quantity;
                const isOutOfStock = stockQty <= 0;
                const isLowStock = stockQty > 0 && stockQty <= p.low_stock_threshold;

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: idx < paginatedProducts.length - 1 ? "1px solid var(--border)" : "none",
                      background: isSelected ? "rgba(184, 154, 104, 0.1)" : undefined,
                      opacity: p.archived ? 0.45 : 1,
                    }}
                    className="admin-table-row"
                  >
                    {/* Checkbox */}
                    <td style={{ ...tdStyle, textAlign: "center", width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(p.id)}
                        aria-label={`Select product ${p.name || p.slug}`}
                        style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--color-espresso)" }}
                      />
                    </td>

                    {/* Image */}
                    <td style={tdStyle}>
                      <div style={{ width: "44px", height: "54px", background: "var(--color-parchment-deep)", overflow: "hidden", flexShrink: 0 }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <circle cx="8" cy="8" r="4" stroke="#bbb" strokeWidth="1" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Product & Slug */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)" }}>
                          {p.name || <span style={{ color: "#b84c4c", fontStyle: "italic" }}>[Unnamed Product]</span>}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.625rem", color: "var(--color-espresso-muted)", letterSpacing: "0.04em" }}>
                            {p.slug}
                          </span>
                          {p.show_care_instructions && (
                            <span
                              style={{
                                fontSize: "0.5625rem",
                                padding: "0.08rem 0.35rem",
                                background: "rgba(184, 154, 104, 0.15)",
                                border: "1px solid var(--color-gold-muted)",
                                color: "var(--color-espresso)",
                                borderRadius: "2px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                              title="Care instructions enabled on product page"
                            >
                              Care
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Categories */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", alignItems: "center" }}>
                        {assignedCats.map((catId) => {
                          const cat = getCategoryById(catId);
                          const isPrimary = catId === primaryCat;
                          return (
                            <span
                              key={catId}
                              style={{
                                fontSize: "0.6875rem",
                                padding: "0.125rem 0.375rem",
                                background: isPrimary ? "rgba(184,154,104,0.18)" : "var(--color-parchment-deep)",
                                border: isPrimary ? "1px solid var(--color-gold-muted)" : "1px solid var(--border)",
                                color: "var(--color-espresso)",
                                fontWeight: isPrimary ? 600 : 400,
                              }}
                              title={isPrimary ? `${cat?.collectionName || catId} (Primary)` : (cat?.collectionName || catId)}
                            >
                              {cat?.subtitle || cat?.collectionName || catId}
                              {isPrimary && " ★"}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Price & MRP */}
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {(() => {
                        const discount = calculateDiscountPercent(p.mrp, p.price);
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                            <span>{formatPrice(p.price, p.currency)}</span>
                            {p.mrp !== null && p.mrp !== undefined && (
                              <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)", fontWeight: 400 }}>
                                MRP: <span style={{ textDecoration: p.price && p.mrp > p.price ? "line-through" : "none" }}>{formatPrice(p.mrp, p.currency)}</span>
                                {discount !== null && (
                                  <span style={{ marginLeft: "0.25rem", color: "#2e7d32", fontWeight: 700 }}>
                                    ({discount}% off)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Stock */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            padding: "0.15rem 0.4rem",
                            background: isOutOfStock
                              ? "rgba(184, 76, 76, 0.12)"
                              : isLowStock
                              ? "rgba(202, 138, 4, 0.12)"
                              : "rgba(74, 124, 89, 0.12)",
                            color: isOutOfStock
                              ? "#b84c4c"
                              : isLowStock
                              ? "#a16207"
                              : "#3a5e44",
                            border: `1px solid ${
                              isOutOfStock ? "#b84c4c" : isLowStock ? "#ca8a04" : "#4a7c59"
                            }`,
                          }}
                        >
                          {stockQty} {isOutOfStock ? "Out" : isLowStock ? "Low" : "In Stock"}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={tdStyle}>
                      {p.archived ? (
                        <span style={badgeArchived}>Archived</span>
                      ) : p.published ? (
                        <span style={badgeLive}>Live</span>
                      ) : (
                        <span style={badgeDraft}>Draft</span>
                      )}
                    </td>

                    {/* Featured */}
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: p.featured ? "var(--color-gold-muted)" : "var(--color-espresso-muted)",
                          opacity: p.featured ? 1 : 0.4,
                        }}
                      >
                        {p.featured ? "★ Featured" : "—"}
                      </span>
                    </td>

                    {/* Updated */}
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-espresso-muted)" }}>
                        {formatDate(p.updated_at || p.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          color: "var(--color-espresso)",
                          textDecoration: "none",
                          borderBottom: "1px solid currentColor",
                          paddingBottom: "1px",
                        }}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination Controls ─────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-espresso-muted)", fontFamily: "var(--font-body), Manrope, sans-serif" }}>
            Page {safeCurrentPage} of {totalPages} ({filteredAndSortedProducts.length} products total)
          </p>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={paginationButtonStyle(safeCurrentPage <= 1)}
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={paginationButtonStyle(safeCurrentPage >= totalPages)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky Bulk Action Bar ──────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "0",
            left: "0",
            right: "0",
            background: "var(--color-espresso)",
            color: "var(--color-ivory)",
            padding: "0.875rem clamp(1rem, 4vw, 3rem)",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.25)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            borderTop: "2px solid var(--color-gold-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div>
              <span
                style={{
                  fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                  fontSize: "1.25rem",
                  fontStyle: "italic",
                  color: "var(--color-gold-muted)",
                  marginRight: "0.5rem",
                }}
              >
                {selectedIds.size} Selected
              </span>
              <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-body), Manrope, sans-serif" }}>
                ({visibleSelectedCount} on this page)
              </span>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              style={{
                background: "transparent",
                border: "none",
                color: "#e88080",
                fontSize: "0.6875rem",
                textDecoration: "underline",
                cursor: "pointer",
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontWeight: 600,
              }}
            >
              Clear Selection
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {/* Set Selling Price */}
            <button
              type="button"
              onClick={() => {
                setPriceInput("");
                setActionError(null);
                setActiveModal("price");
              }}
              style={bulkActionButtonStyle}
            >
              ₹ Set Selling Price
            </button>

            {/* Set MRP */}
            <button
              type="button"
              onClick={() => {
                setMrpInput("");
                setClearMrpMode(false);
                setActionError(null);
                setActiveModal("mrp");
              }}
              style={bulkActionButtonStyle}
            >
              🏷️ Set MRP
            </button>

            {/* Set Stock */}
            <button
              type="button"
              onClick={() => {
                setStockInput("");
                setActionError(null);
                setActiveModal("stock");
              }}
              style={bulkActionButtonStyle}
            >
              📦 Set Stock
            </button>

            {/* Edit Categories */}
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryIds([]);
                setPrimaryCategoryInput("");
                setCategoryMode("add");
                setActionError(null);
                setActiveModal("categories");
              }}
              style={bulkActionButtonStyle}
            >
              🏷️ Edit Categories
            </button>

            {/* Bulk Rename */}
            <button
              type="button"
              onClick={() => {
                setRenameType("prefix");
                setRenamePrefix("");
                setRenameFind("");
                setRenameReplace("");
                setActionError(null);
                setActiveModal("rename");
              }}
              style={bulkActionButtonStyle}
            >
              ✏️ Rename
            </button>

            {/* Publish */}
            <button
              type="button"
              onClick={handleOpenPublishModal}
              style={{ ...bulkActionButtonStyle, background: "var(--color-gold-muted)", color: "var(--color-espresso)", fontWeight: 700 }}
            >
              🚀 Publish
            </button>

            {/* Unpublish */}
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActiveModal("unpublish");
              }}
              style={bulkActionButtonStyle}
            >
              ⏸️ Unpublish
            </button>

            {/* Feature */}
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActiveModal("feature");
              }}
              style={bulkActionButtonStyle}
            >
              ★ Feature
            </button>

            {/* Unfeature */}
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActiveModal("unfeature");
              }}
              style={bulkActionButtonStyle}
            >
              Unfeature
            </button>

            {/* Archive */}
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActiveModal("archive");
              }}
              style={{ ...bulkActionButtonStyle, color: "#e88080", borderColor: "#823737" }}
            >
              🗄️ Archive
            </button>

            {/* Include Care Instructions */}
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActiveModal("include_care");
              }}
              style={bulkActionButtonStyle}
            >
              📖 Include Care Instructions
            </button>

            {/* Remove Care Instructions */}
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActiveModal("remove_care");
              }}
              style={bulkActionButtonStyle}
            >
              Remove Care Instructions
            </button>

            {/* Unarchive */}
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActiveModal("unarchive");
              }}
              style={bulkActionButtonStyle}
            >
              Unarchive
            </button>
          </div>
        </div>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────── */}

      {/* 1. SET SELLING PRICE MODAL */}
      {activeModal === "price" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <ModalContent
            title={`Set Selling Price for ${selectedIds.size} Products`}
            eyebrow="Bulk Selling Price Update"
            onClose={() => setActiveModal(null)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={modalDescription}>
                Enter the exact selling price in INR to apply to all <strong>{selectedIds.size}</strong> selected products.
              </p>

              <div>
                <label style={filterLabelStyle}>Target Selling Price (₹ INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 699"
                  min="0"
                  step="1"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  style={inputStyle}
                  autoFocus
                />
              </div>

              {actionError && <p style={errorMessageStyle}>{actionError}</p>}

              {/* Preview Table */}
              <PreviewSection products={selectedProductList} targetPrice={parseFloat(priceInput)} />

              <div style={modalFooterStyle}>
                <button type="button" onClick={() => setActiveModal(null)} style={cancelButtonStyle}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending || !priceInput}
                  onClick={handleApplyPrice}
                  style={confirmButtonStyle}
                >
                  {isPending ? "Applying..." : `Confirm & Set ₹${priceInput || 0}`}
                </button>
              </div>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 1b. SET MRP MODAL */}
      {activeModal === "mrp" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <ModalContent
            title={`Set MRP for ${selectedIds.size} Products`}
            eyebrow="Bulk MRP / Compare-at Price Update"
            onClose={() => setActiveModal(null)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={modalDescription}>
                Enter the compare-at MRP in INR to apply to all <strong>{selectedIds.size}</strong> selected products. Must be ≥ each product&apos;s selling price.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label style={filterLabelStyle}>Target MRP (₹ INR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 999"
                    min="1"
                    step="1"
                    disabled={clearMrpMode}
                    value={mrpInput}
                    onChange={(e) => setMrpInput(e.target.value)}
                    style={{
                      ...inputStyle,
                      opacity: clearMrpMode ? 0.5 : 1,
                    }}
                    autoFocus
                  />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.75rem", fontFamily: "var(--font-body), Manrope, sans-serif", color: "var(--color-espresso)" }}>
                  <input
                    type="checkbox"
                    checked={clearMrpMode}
                    onChange={(e) => setClearMrpMode(e.target.checked)}
                    style={{ accentColor: "var(--color-espresso)", width: "14px", height: "14px" }}
                  />
                  Clear MRP (remove compare-at price)
                </label>
              </div>

              {actionError && <p style={errorMessageStyle}>{actionError}</p>}

              {/* Preview Table */}
              <PreviewSection
                products={selectedProductList}
                targetMrp={clearMrpMode ? null : (mrpInput.trim() !== "" ? parseFloat(mrpInput) : undefined)}
              />

              <div style={modalFooterStyle}>
                <button type="button" onClick={() => setActiveModal(null)} style={cancelButtonStyle}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending || (!clearMrpMode && !mrpInput)}
                  onClick={handleApplyMrp}
                  style={confirmButtonStyle}
                >
                  {isPending ? "Applying..." : clearMrpMode ? "Confirm & Clear MRP" : `Confirm & Set MRP ₹${mrpInput || 0}`}
                </button>
              </div>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 2. SET STOCK MODAL */}
      {activeModal === "stock" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <ModalContent
            title={`Set Stock Quantity for ${selectedIds.size} Products`}
            eyebrow="Bulk Inventory Update"
            onClose={() => setActiveModal(null)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={modalDescription}>
                Set the stock level in <code>public.inventory</code> for all <strong>{selectedIds.size}</strong> selected products.
              </p>

              <div>
                <label style={filterLabelStyle}>Stock Units</label>
                <input
                  type="number"
                  placeholder="e.g. 25"
                  min="0"
                  step="1"
                  value={stockInput}
                  onChange={(e) => setStockInput(e.target.value)}
                  style={inputStyle}
                  autoFocus
                />
              </div>

              {actionError && <p style={errorMessageStyle}>{actionError}</p>}

              {/* Preview Table */}
              <PreviewSection products={selectedProductList} targetStock={parseInt(stockInput, 10)} />

              <div style={modalFooterStyle}>
                <button type="button" onClick={() => setActiveModal(null)} style={cancelButtonStyle}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending || !stockInput}
                  onClick={handleApplyStock}
                  style={confirmButtonStyle}
                >
                  {isPending ? "Applying..." : `Confirm & Set ${stockInput || 0} Units`}
                </button>
              </div>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 3. EDIT CATEGORIES MODAL */}
      {activeModal === "categories" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <ModalContent
            title={`Edit Categories for ${selectedIds.size} Products`}
            eyebrow="Multi-Category Management"
            onClose={() => setActiveModal(null)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={modalDescription}>
                Choose whether to <strong>Add</strong>, <strong>Remove</strong>, or <strong>Replace</strong> category assignments for all {selectedIds.size} products.
              </p>

              {/* Mode Selection */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["add", "remove", "replace"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCategoryMode(mode)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      background: categoryMode === mode ? "var(--color-espresso)" : "var(--color-parchment-deep)",
                      color: categoryMode === mode ? "var(--color-ivory)" : "var(--color-espresso)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    {mode === "add" && "➕ Add Categories"}
                    {mode === "remove" && "➖ Remove Categories"}
                    {mode === "replace" && "🔄 Replace All"}
                  </button>
                ))}
              </div>

              {/* Category Checkboxes */}
              <div>
                <label style={filterLabelStyle}>Select Collections:</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.35rem" }}>
                  {CATEGORIES.map((cat) => {
                    const isChecked = selectedCategoryIds.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          background: isChecked ? "rgba(184, 154, 104, 0.15)" : "var(--color-parchment-deep)",
                          border: isChecked ? "1px solid var(--color-gold-muted)" : "1px solid var(--border)",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                              if (!primaryCategoryInput) setPrimaryCategoryInput(cat.id);
                            } else {
                              const remaining = selectedCategoryIds.filter((c) => c !== cat.id);
                              setSelectedCategoryIds(remaining);
                              if (primaryCategoryInput === cat.id) {
                                setPrimaryCategoryInput(remaining[0] || "");
                              }
                            }
                          }}
                          style={{ accentColor: "var(--color-espresso)" }}
                        />
                        <span>{cat.subtitle || cat.collectionName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Primary Category Selector (if mode is replace or if multiple selected) */}
              {selectedCategoryIds.length > 1 && (
                <div>
                  <label style={filterLabelStyle}>Designate Primary Category:</label>
                  <select
                    value={primaryCategoryInput}
                    onChange={(e) => setPrimaryCategoryInput(e.target.value)}
                    style={inputStyle}
                  >
                    {selectedCategoryIds.map((catId) => {
                      const cat = getCategoryById(catId);
                      return (
                        <option key={catId} value={catId}>
                          {cat?.subtitle || cat?.collectionName || catId} (★ Primary)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {actionError && <p style={errorMessageStyle}>{actionError}</p>}

              <div style={modalFooterStyle}>
                <button type="button" onClick={() => setActiveModal(null)} style={cancelButtonStyle}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending || selectedCategoryIds.length === 0}
                  onClick={handleApplyCategories}
                  style={confirmButtonStyle}
                >
                  {isPending ? "Applying..." : "Confirm & Apply Categories"}
                </button>
              </div>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 4. BULK RENAME MODAL */}
      {activeModal === "rename" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <ModalContent
            title={`Bulk Rename ${selectedIds.size} Products`}
            eyebrow="Name & Copy Tool"
            onClose={() => setActiveModal(null)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={modalDescription}>
                Rename multiple products using a prefix or find-and-replace text rule. Slugs remain untouched for URL/SEO stability.
              </p>

              {/* Type Switcher */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setRenameType("prefix")}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    background: renameType === "prefix" ? "var(--color-espresso)" : "var(--color-parchment-deep)",
                    color: renameType === "prefix" ? "var(--color-ivory)" : "var(--color-espresso)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                >
                  Add Prefix (e.g. "Signature")
                </button>
                <button
                  type="button"
                  onClick={() => setRenameType("replace")}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    background: renameType === "replace" ? "var(--color-espresso)" : "var(--color-parchment-deep)",
                    color: renameType === "replace" ? "var(--color-ivory)" : "var(--color-espresso)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                >
                  Find &amp; Replace Text
                </button>
              </div>

              {renameType === "prefix" ? (
                <div>
                  <label style={filterLabelStyle}>Prefix to prepend:</label>
                  <input
                    type="text"
                    placeholder="e.g. Premium Silver"
                    value={renamePrefix}
                    onChange={(e) => setRenamePrefix(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={filterLabelStyle}>Find text:</label>
                    <input
                      type="text"
                      placeholder="e.g. Bracelets"
                      value={renameFind}
                      onChange={(e) => setRenameFind(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={filterLabelStyle}>Replace with:</label>
                    <input
                      type="text"
                      placeholder="e.g. Everyday Bracelets"
                      value={renameReplace}
                      onChange={(e) => setRenameReplace(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {actionError && <p style={errorMessageStyle}>{actionError}</p>}

              {/* Preview Table of Names */}
              <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid var(--border)", background: "var(--color-parchment-deep)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                  <thead>
                    <tr style={{ background: "color-mix(in srgb, var(--color-espresso) 10%, transparent)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "0.4rem 0.75rem", textAlign: "left" }}>Current Name</th>
                      <th style={{ padding: "0.4rem 0.75rem", textAlign: "left" }}>→ New Name Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProductList.slice(0, 8).map((p) => {
                      const cur = p.name || p.slug;
                      let nxt = cur;
                      if (renameType === "prefix" && renamePrefix.trim()) {
                        nxt = `${renamePrefix.trim()} ${cur}`;
                      } else if (renameType === "replace" && renameFind) {
                        nxt = cur.replaceAll(renameFind, renameReplace);
                      }
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "0.4rem 0.75rem", color: "var(--color-espresso-muted)" }}>{cur}</td>
                          <td style={{ padding: "0.4rem 0.75rem", fontWeight: 600, color: "var(--color-espresso)" }}>{nxt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={modalFooterStyle}>
                <button type="button" onClick={() => setActiveModal(null)} style={cancelButtonStyle}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending || (renameType === "prefix" ? !renamePrefix.trim() : !renameFind.trim())}
                  onClick={handleApplyRename}
                  style={confirmButtonStyle}
                >
                  {isPending ? "Applying..." : "Confirm & Rename"}
                </button>
              </div>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 5. PUBLISH VALIDATION MODAL */}
      {activeModal === "publish" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <ModalContent
            title="Publish Readiness Check"
            eyebrow="Preflight Validation"
            onClose={() => setActiveModal(null)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {isValidatingPublish ? (
                <div style={{ padding: "2.5rem", textAlign: "center" }}>
                  <p style={{ fontStyle: "italic", color: "var(--color-espresso-muted)" }}>
                    Validating price, inventory, images, and category assignments...
                  </p>
                </div>
              ) : publishReadiness ? (
                <>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <div
                      style={{
                        flex: 1,
                        padding: "1rem",
                        background: "rgba(74, 124, 89, 0.1)",
                        border: "1px solid #4a7c59",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#3a5e44" }}>
                        {publishReadiness.readyIds.length}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#3a5e44" }}>
                        Ready to Publish
                      </p>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        padding: "1rem",
                        background: publishReadiness.invalidItems.length > 0 ? "rgba(184, 76, 76, 0.1)" : "var(--color-parchment-deep)",
                        border: publishReadiness.invalidItems.length > 0 ? "1px solid #b84c4c" : "1px solid var(--border)",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: publishReadiness.invalidItems.length > 0 ? "#b84c4c" : "var(--color-espresso-muted)" }}>
                        {publishReadiness.invalidItems.length}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.1em", color: publishReadiness.invalidItems.length > 0 ? "#b84c4c" : "var(--color-espresso-muted)" }}>
                        Need Attention
                      </p>
                    </div>
                  </div>

                  {publishReadiness.invalidItems.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#b84c4c", margin: "0 0 0.5rem 0" }}>
                        The following products cannot be published until missing requirements are resolved:
                      </p>
                      <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid var(--border)", background: "var(--color-parchment-deep)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                          <thead>
                            <tr style={{ background: "color-mix(in srgb, #b84c4c 15%, transparent)", borderBottom: "1px solid var(--border)" }}>
                              <th style={{ padding: "0.4rem 0.75rem", textAlign: "left" }}>Product</th>
                              <th style={{ padding: "0.4rem 0.75rem", textAlign: "left" }}>Missing Requirements</th>
                            </tr>
                          </thead>
                          <tbody>
                            {publishReadiness.invalidItems.map((item) => (
                              <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "0.4rem 0.75rem", fontWeight: 600, color: "var(--color-espresso)" }}>
                                  {item.name} ({item.slug})
                                </td>
                                <td style={{ padding: "0.4rem 0.75rem", color: "#b84c4c" }}>
                                  {item.reasons.join(" • ")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div style={modalFooterStyle}>
                    <button type="button" onClick={() => setActiveModal(null)} style={cancelButtonStyle}>
                      Cancel
                    </button>
                    {publishReadiness.readyIds.length > 0 && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleApplyPublish(publishReadiness.readyIds)}
                        style={{ ...confirmButtonStyle, background: "var(--color-gold-muted)", color: "var(--color-espresso)" }}
                      >
                        {isPending ? "Publishing..." : `Publish ${publishReadiness.readyIds.length} Ready Products`}
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 6. GENERIC CONFIRMATION MODALS (Unpublish, Feature, Unfeature, Archive, Unarchive, Care Instructions) */}
      {["unpublish", "feature", "unfeature", "archive", "unarchive", "include_care", "remove_care"].includes(activeModal || "") && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <ModalContent
            title={
              activeModal === "include_care"
                ? "Include Care Instructions"
                : activeModal === "remove_care"
                ? "Remove Care Instructions"
                : `Confirm Bulk ${activeModal?.toUpperCase()}`
            }
            eyebrow="Action Confirmation"
            onClose={() => setActiveModal(null)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={modalDescription}>
                {activeModal === "include_care" && `Include Care Instructions for ${selectedIds.size} products? The standard jewellery care guidance card will be rendered on their product pages.`}
                {activeModal === "remove_care" && `Remove Care Instructions for ${selectedIds.size} products? The care guidance card will be hidden on their product pages.`}
                {activeModal === "unpublish" && `Unpublish ${selectedIds.size} products? They will immediately disappear from the customer storefront.`}
                {activeModal === "feature" && `Set ${selectedIds.size} products as FEATURED on the homepage editorial grid?`}
                {activeModal === "unfeature" && `Remove ${selectedIds.size} products from the featured grid?`}
                {activeModal === "archive" && `Archive ${selectedIds.size} products? Archived products are hidden from customers. Historical order records are strictly preserved.`}
                {activeModal === "unarchive" && `Unarchive ${selectedIds.size} products to make them available in the admin draft catalog?`}
              </p>

              <PreviewSection products={selectedProductList} />

              <div style={modalFooterStyle}>
                <button type="button" onClick={() => setActiveModal(null)} style={cancelButtonStyle}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (activeModal === "include_care") handleApplyCareInstructions(true);
                    else if (activeModal === "remove_care") handleApplyCareInstructions(false);
                    else if (activeModal === "unpublish") handleApplyUnpublish();
                    else if (activeModal === "feature") handleApplyFeature(true);
                    else if (activeModal === "unfeature") handleApplyFeature(false);
                    else if (activeModal === "archive") handleApplyArchive(true);
                    else if (activeModal === "unarchive") handleApplyArchive(false);
                  }}
                  style={activeModal === "archive" ? { ...confirmButtonStyle, background: "#b84c4c" } : confirmButtonStyle}
                >
                  {isPending
                    ? "Applying..."
                    : activeModal === "include_care"
                    ? "Confirm Include Care"
                    : activeModal === "remove_care"
                    ? "Confirm Remove Care"
                    : `Confirm ${activeModal}`}
                </button>
              </div>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW SECTION HELPER
// ─────────────────────────────────────────────────────────────────────────────

function PreviewSection({
  products,
  targetPrice,
  targetMrp,
  targetStock,
}: {
  products: AdminProductWithDetails[];
  targetPrice?: number;
  targetMrp?: number | null;
  targetStock?: number;
}) {
  if (products.length === 0) return null;

  const sample = products.slice(0, 5);
  const remaining = products.length - sample.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <p style={{ margin: 0, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso-muted)" }}>
        Affected Products Preview ({products.length} total):
      </p>
      <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border)", background: "var(--color-parchment-deep)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
          <tbody>
            {sample.map((p) => {
              const isInvalidMrp =
                typeof targetMrp === "number" &&
                typeof p.price === "number" &&
                p.price > 0 &&
                targetMrp < p.price;

              const isInvalidSellingPrice =
                typeof targetPrice === "number" &&
                typeof p.mrp === "number" &&
                p.mrp > 0 &&
                targetPrice > p.mrp;

              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.35rem 0.75rem", fontWeight: 600, color: "var(--color-espresso)" }}>
                    {p.name || p.slug}
                  </td>
                  <td style={{ padding: "0.35rem 0.75rem", color: "var(--color-espresso-muted)" }}>
                    {p.slug}
                  </td>
                  {typeof targetPrice === "number" && !isNaN(targetPrice) && (
                    <td style={{ padding: "0.35rem 0.75rem", textAlign: "right", color: isInvalidSellingPrice ? "#b84c4c" : "var(--color-espresso)" }}>
                      {p.price !== null ? `₹${p.price}` : "—"} → <strong>₹{targetPrice}</strong>
                      {isInvalidSellingPrice && (
                        <span style={{ display: "block", fontSize: "0.625rem", color: "#b84c4c", fontWeight: 700 }}>
                          ⚠️ Exceeds MRP (₹{p.mrp})
                        </span>
                      )}
                    </td>
                  )}
                  {targetMrp !== undefined && (
                    <td style={{ padding: "0.35rem 0.75rem", textAlign: "right", color: isInvalidMrp ? "#b84c4c" : "var(--color-espresso)" }}>
                      {p.mrp !== null ? `MRP ₹${p.mrp}` : "No MRP"} → <strong>{targetMrp !== null ? `₹${targetMrp}` : "Cleared"}</strong>
                      {isInvalidMrp && (
                        <span style={{ display: "block", fontSize: "0.625rem", color: "#b84c4c", fontWeight: 700 }}>
                          ⚠️ Below Selling (₹{p.price})
                        </span>
                      )}
                      {!isInvalidMrp && targetMrp !== null && typeof p.price === "number" && targetMrp > p.price && (
                        <span style={{ display: "block", fontSize: "0.625rem", color: "#2e7d32", fontWeight: 700 }}>
                          ({calculateDiscountPercent(targetMrp, p.price)}% OFF)
                        </span>
                      )}
                    </td>
                  )}
                  {typeof targetStock === "number" && !isNaN(targetStock) && (
                    <td style={{ padding: "0.35rem 0.75rem", textAlign: "right", color: "var(--color-espresso)" }}>
                      {p.stock_quantity} units → <strong>{targetStock} units</strong>
                    </td>
                  )}
                </tr>
              );
            })}
            {remaining > 0 && (
              <tr>
                <td colSpan={3} style={{ padding: "0.4rem 0.75rem", textAlign: "center", color: "var(--color-espresso-muted)", fontStyle: "italic" }}>
                  + {remaining} more products
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26, 17, 11, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

function ModalContent({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--color-ivory)",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        maxWidth: "620px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "clamp(1.5rem, 3vw, 2.25rem)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          {eyebrow && (
            <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-gold-muted)" }}>
              {eyebrow}
            </p>
          )}
          <h3 style={{ margin: 0, fontFamily: "var(--font-display), 'Cormorant Garamond', serif", fontSize: "1.75rem", fontWeight: 400, fontStyle: "italic", color: "var(--color-espresso)" }}>
            {title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "var(--color-espresso-muted)" }}
        >
          ✕
        </button>
      </div>

      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "0.625rem 0.875rem",
  textAlign: "left",
  fontSize: "0.5625rem",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--color-espresso-muted)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.75rem 0.875rem",
  verticalAlign: "middle",
};

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize: "0.625rem",
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--color-gold-muted)",
};

const pageHeading: React.CSSProperties = {
  fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
  fontSize: "clamp(1.5rem, 3vw, 2rem)",
  fontWeight: 400,
  fontStyle: "italic",
  color: "var(--color-espresso)",
  lineHeight: 1.05,
  margin: "0.35rem 0 0 0",
};

const filterLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.625rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-espresso-muted)",
  marginBottom: "0.35rem",
  fontFamily: "var(--font-body), Manrope, sans-serif",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  fontSize: "0.8125rem",
  fontFamily: "var(--font-body), Manrope, sans-serif",
  background: "var(--color-parchment-deep)",
  border: "1px solid var(--border)",
  color: "var(--color-espresso)",
  boxSizing: "border-box",
};

const textButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--color-espresso)",
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize: "0.75rem",
  fontWeight: 600,
  textDecoration: "underline",
  cursor: "pointer",
  padding: 0,
};

const bulkActionButtonStyle: React.CSSProperties = {
  padding: "0.5rem 0.875rem",
  background: "rgba(255, 255, 255, 0.12)",
  border: "1px solid rgba(255, 255, 255, 0.25)",
  color: "var(--color-ivory)",
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize: "0.6875rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const modalDescription: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "var(--color-espresso-muted)",
  lineHeight: 1.6,
  margin: 0,
  fontFamily: "var(--font-body), Manrope, sans-serif",
};

const modalFooterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "0.75rem",
  borderTop: "1px solid var(--border)",
  paddingTop: "1.25rem",
  marginTop: "0.5rem",
};

const cancelButtonStyle: React.CSSProperties = {
  padding: "0.625rem 1.25rem",
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--color-espresso-muted)",
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const confirmButtonStyle: React.CSSProperties = {
  padding: "0.625rem 1.5rem",
  background: "var(--color-espresso)",
  border: "none",
  color: "var(--color-ivory)",
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const errorMessageStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#b84c4c",
  margin: 0,
  fontWeight: 600,
  fontFamily: "var(--font-body), Manrope, sans-serif",
};

const badgeDraft: React.CSSProperties = {
  fontSize: "0.625rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "0.15rem 0.4rem",
  background: "rgba(100, 100, 100, 0.1)",
  border: "1px solid rgba(100, 100, 100, 0.3)",
  color: "var(--color-espresso-muted)",
};

const badgeLive: React.CSSProperties = {
  fontSize: "0.625rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "0.15rem 0.4rem",
  background: "rgba(74, 124, 89, 0.15)",
  border: "1px solid #4a7c59",
  color: "#3a5e44",
};

const badgeArchived: React.CSSProperties = {
  fontSize: "0.625rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "0.15rem 0.4rem",
  background: "rgba(184, 76, 76, 0.15)",
  border: "1px solid #b84c4c",
  color: "#b84c4c",
};

function paginationButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "0.4rem 0.875rem",
    background: disabled ? "var(--color-parchment-deep)" : "var(--color-ivory)",
    border: "1px solid var(--border)",
    color: disabled ? "rgba(0,0,0,0.25)" : "var(--color-espresso)",
    fontSize: "0.75rem",
    fontFamily: "var(--font-body), Manrope, sans-serif",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
