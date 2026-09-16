/**
 * VEER ELEGANCE — Announcement Targeting & Storefront Route Matching
 *
 * Provides display target definitions, path normalization, custom URL validation,
 * and pathname-based visibility evaluation.
 */

import type { AnnouncementContent, DisplayTargetKey } from "@/lib/site-content";

export const DISPLAY_TARGET_OPTIONS: { key: DisplayTargetKey; label: string; description: string }[] = [
  { key: "all",         label: "All Pages",        description: "Entire customer-facing storefront" },
  { key: "home",        label: "Homepage",         description: "Home landing page (/)" },
  { key: "shop",        label: "Shop",             description: "Main shop catalogue (/shop)" },
  { key: "collections", label: "Collections",      description: "Collection overview and individual collection pages (/collections/*)" },
  { key: "categories",  label: "Category Pages",   description: "Category-filtered product listings (/shop/[category])" },
  { key: "search",      label: "Search",           description: "Product search results page (/search)" },
  { key: "products",    label: "Product Pages",    description: "All individual product details pages (/product/*)" },
  { key: "cart",        label: "Cart",             description: "Cart / Bag pages (/cart, /bag)" },
  { key: "checkout",    label: "Checkout",         description: "Checkout pages (/checkout/*)" },
  { key: "account",     label: "Account",          description: "Customer account and order history pages (/account/*)" },
  { key: "custom",      label: "Custom URLs",      description: "Exact specific internal URL paths" },
];

/**
 * Normalizes a storefront path string:
 * - Trims whitespace
 * - Ensures leading slash
 * - Removes trailing slash (except root "/")
 */
export function normalizeStorefrontPath(raw: string): string {
  if (!raw) return "/";
  let trimmed = raw.trim();
  if (!trimmed.startsWith("/")) {
    trimmed = "/" + trimmed;
  }
  // Strip trailing slashes unless root "/"
  trimmed = trimmed.replace(/\/+$/, "");
  return trimmed || "/";
}

/**
 * Validates a custom storefront path:
 * - Must start with "/"
 * - No double slashes "//" or "/\"
 * - No protocol "://"
 * - No wildcard syntax "*"
 * - No javascript: or data: schemes
 */
export function isValidStorefrontCustomUrl(path: string): boolean {
  if (!path) return false;
  const trimmed = path.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("://") ||
    trimmed.includes("*") ||
    trimmed.toLowerCase().startsWith("javascript:") ||
    trimmed.toLowerCase().startsWith("data:")
  ) {
    return false;
  }
  return true;
}

/**
 * Determines whether the announcement bar should be rendered for the current route pathname.
 */
export function isAnnouncementVisibleOnRoute(
  content?: AnnouncementContent | null,
  pathname?: string | null,
): boolean {
  if (!content || !content.enabled || !content.text?.trim()) {
    return false;
  }
  if (!pathname) {
    return false;
  }

  // Admin pages, API routes, and Next internal assets must NEVER show the announcement bar
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next")
  ) {
    return false;
  }

  const normalizedPath = normalizeStorefrontPath(pathname);
  const targets = Array.isArray(content.displayTargets) && content.displayTargets.length > 0
    ? content.displayTargets
    : ["all"];

  // "All Pages" active -> matches all customer-facing storefront routes
  if (targets.includes("all")) {
    return true;
  }

  const customUrls = (content.customUrls ?? []).map(normalizeStorefrontPath);

  for (const target of targets) {
    switch (target) {
      case "home":
        if (normalizedPath === "/") return true;
        break;
      case "shop":
        if (normalizedPath === "/shop") return true;
        break;
      case "collections":
        if (normalizedPath === "/collections" || normalizedPath.startsWith("/collections/")) return true;
        break;
      case "categories":
        if (normalizedPath.startsWith("/shop/") && normalizedPath !== "/shop") return true;
        break;
      case "search":
        if (normalizedPath === "/search") return true;
        break;
      case "products":
        if (normalizedPath.startsWith("/product/")) return true;
        break;
      case "cart":
        if (normalizedPath === "/cart" || normalizedPath === "/bag") return true;
        break;
      case "checkout":
        if (normalizedPath === "/checkout" || normalizedPath.startsWith("/checkout/")) return true;
        break;
      case "account":
        if (normalizedPath.startsWith("/account")) return true;
        break;
      case "custom":
        if (customUrls.includes(normalizedPath)) return true;
        break;
    }
  }

  return false;
}
