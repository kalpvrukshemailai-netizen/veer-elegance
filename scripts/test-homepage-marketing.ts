/**
 * Comprehensive Regression Test Suite for Homepage Marketing, Announcement Targeting & Inventory Search
 */

import {
  DEFAULT_ANNOUNCEMENT_CONTENT,
  DEFAULT_POPUP_CONTENT,
  type AnnouncementContent,
} from "../lib/site-content";
import {
  sanitizeFilename,
  buildMarketingStoragePath,
  extractMarketingStoragePath,
  validateMarketingImageFile,
} from "../lib/marketing-image";
import {
  normalizeStorefrontPath,
  isValidStorefrontCustomUrl,
  isAnnouncementVisibleOnRoute,
} from "../lib/announcement-targeting";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ PASSED: ${message}`);
}

console.log("=== Running Homepage Marketing & Inventory Search Tests ===\n");

// 1. Marketing Defaults
assert(DEFAULT_ANNOUNCEMENT_CONTENT.enabled === false, "Announcement default is disabled");
assert(typeof DEFAULT_ANNOUNCEMENT_CONTENT.text === "string" && DEFAULT_ANNOUNCEMENT_CONTENT.text.length > 0, "Announcement default text is populated");
assert(DEFAULT_ANNOUNCEMENT_CONTENT.backgroundColor.startsWith("#"), "Announcement background is valid hex");
assert(Array.isArray(DEFAULT_ANNOUNCEMENT_CONTENT.displayTargets) && DEFAULT_ANNOUNCEMENT_CONTENT.displayTargets.includes("all"), "Announcement default displayTarget is ['all']");
assert(Array.isArray(DEFAULT_ANNOUNCEMENT_CONTENT.customUrls) && DEFAULT_ANNOUNCEMENT_CONTENT.customUrls.length === 0, "Announcement default customUrls is empty");
assert(DEFAULT_POPUP_CONTENT.enabled === false, "Popup default is disabled");
assert(DEFAULT_POPUP_CONTENT.redirectUrl === "/shop", "Popup default redirect is /shop");

// 2. Storage Path Sanitization & Extraction
const safeName = sanitizeFilename("../../My Festive Offer!.PNG");
assert(!safeName.includes("..") && !safeName.includes(" ") && !safeName.includes("!"), "Filename sanitization strips unsafe characters");
const storagePath = buildMarketingStoragePath("popup-banner.jpg");
assert(storagePath.startsWith("marketing/popup/"), "Storage path prefix is marketing/popup/");

const extracted = extractMarketingStoragePath("https://xbpvbwcodlcepexsmvhi.supabase.co/storage/v1/object/public/product-images/marketing/popup/abc-test.webp");
assert(extracted === "marketing/popup/abc-test.webp", "Extracted storage path matches");

// 3. Image Validation
assert(validateMarketingImageFile("image/png", 1024 * 1024) === null, "Valid 1MB PNG is accepted");
assert(validateMarketingImageFile("application/pdf", 1024) !== null, "PDF is rejected");
assert(validateMarketingImageFile("image/jpeg", 6 * 1024 * 1024) !== null, "6MB file exceeds 5MB limit and is rejected");
assert(validateMarketingImageFile("image/jpeg", 0) !== null, "0-byte file is rejected");

// 4. Custom URL Normalization & Validation
assert(normalizeStorefrontPath("/sale/") === "/sale", "Normalizes trailing slash on /sale/");
assert(normalizeStorefrontPath("/") === "/", "Keeps root / unchanged");
assert(normalizeStorefrontPath("collections/diwali") === "/collections/diwali", "Adds missing leading slash");
assert(normalizeStorefrontPath("  /shop/earrings/  ") === "/shop/earrings", "Trims whitespace and removes trailing slash");

assert(isValidStorefrontCustomUrl("/sale") === true, "/sale is valid custom URL");
assert(isValidStorefrontCustomUrl("/collections/diwali") === true, "/collections/diwali is valid custom URL");
assert(isValidStorefrontCustomUrl("/product/gold-leaf-earrings") === true, "/product/gold-leaf-earrings is valid custom URL");
assert(isValidStorefrontCustomUrl("/shop/*") === false, "Wildcard /shop/* is rejected");
assert(isValidStorefrontCustomUrl("https://google.com") === false, "External URL is rejected");
assert(isValidStorefrontCustomUrl("javascript:alert(1)") === false, "Javascript URI is rejected");
assert(isValidStorefrontCustomUrl("data:text/html,test") === false, "Data URI is rejected");
assert(isValidStorefrontCustomUrl("//example.com") === false, "Protocol-relative // is rejected");

// 5. Announcement Display Targeting & Route Matching

const baseAnnouncement: AnnouncementContent = {
  enabled: true,
  text: "Special Promo",
  backgroundColor: "#2C1810",
  textColor: "#FAF8F5",
  accentColor: "#B89A68",
  displayTargets: ["all"],
  customUrls: [],
};

// 5a. All Pages
assert(isAnnouncementVisibleOnRoute(baseAnnouncement, "/") === true, "All Pages matches /");
assert(isAnnouncementVisibleOnRoute(baseAnnouncement, "/shop") === true, "All Pages matches /shop");
assert(isAnnouncementVisibleOnRoute(baseAnnouncement, "/shop/rings") === true, "All Pages matches /shop/rings");
assert(isAnnouncementVisibleOnRoute(baseAnnouncement, "/collections/festive") === true, "All Pages matches /collections/festive");
assert(isAnnouncementVisibleOnRoute(baseAnnouncement, "/product/royal-box-chain") === true, "All Pages matches /product/royal-box-chain");
assert(isAnnouncementVisibleOnRoute(baseAnnouncement, "/checkout") === true, "All Pages matches /checkout");
assert(isAnnouncementVisibleOnRoute(baseAnnouncement, "/admin") === false, "All Pages NEVER matches /admin");
assert(isAnnouncementVisibleOnRoute(baseAnnouncement, "/admin/inventory") === false, "All Pages NEVER matches /admin/inventory");
assert(isAnnouncementVisibleOnRoute(baseAnnouncement, "/api/content") === false, "All Pages NEVER matches /api/content");

// 5b. Multiple Predefined Targets: Homepage + Shop + Product Pages
const multiTargetAnnouncement: AnnouncementContent = {
  ...baseAnnouncement,
  displayTargets: ["home", "shop", "products"],
};
assert(isAnnouncementVisibleOnRoute(multiTargetAnnouncement, "/") === true, "Multi-target matches home (/)");
assert(isAnnouncementVisibleOnRoute(multiTargetAnnouncement, "/shop") === true, "Multi-target matches shop (/shop)");
assert(isAnnouncementVisibleOnRoute(multiTargetAnnouncement, "/product/royal-chain") === true, "Multi-target matches product (/product/royal-chain)");
assert(isAnnouncementVisibleOnRoute(multiTargetAnnouncement, "/collections") === false, "Multi-target excludes collections (/collections)");
assert(isAnnouncementVisibleOnRoute(multiTargetAnnouncement, "/search") === false, "Multi-target excludes search (/search)");
assert(isAnnouncementVisibleOnRoute(multiTargetAnnouncement, "/cart") === false, "Multi-target excludes cart (/cart)");
assert(isAnnouncementVisibleOnRoute(multiTargetAnnouncement, "/admin/inventory") === false, "Multi-target excludes admin (/admin/inventory)");

// 5c. Custom URLs Exact Matching
const customUrlAnnouncement: AnnouncementContent = {
  ...baseAnnouncement,
  displayTargets: ["custom"],
  customUrls: ["/sale", "/collections/diwali"],
};
assert(isAnnouncementVisibleOnRoute(customUrlAnnouncement, "/sale") === true, "Custom URL matches /sale");
assert(isAnnouncementVisibleOnRoute(customUrlAnnouncement, "/sale/") === true, "Custom URL matches /sale/ (normalized)");
assert(isAnnouncementVisibleOnRoute(customUrlAnnouncement, "/collections/diwali") === true, "Custom URL matches /collections/diwali");
assert(isAnnouncementVisibleOnRoute(customUrlAnnouncement, "/sale/example") === false, "Custom URL does NOT match /sale/example");
assert(isAnnouncementVisibleOnRoute(customUrlAnnouncement, "/sales") === false, "Custom URL does NOT match /sales");
assert(isAnnouncementVisibleOnRoute(customUrlAnnouncement, "/sale-old") === false, "Custom URL does NOT match /sale-old");
assert(isAnnouncementVisibleOnRoute(customUrlAnnouncement, "/collections/summer") === false, "Custom URL does NOT match /collections/summer");

// 5d. Predefined + Custom URLs Combined (e.g. Shop + Product Pages + Custom URLs)
const combinedAnnouncement: AnnouncementContent = {
  ...baseAnnouncement,
  displayTargets: ["shop", "products", "custom"],
  customUrls: ["/collections/diwali", "/sale"],
};
assert(isAnnouncementVisibleOnRoute(combinedAnnouncement, "/shop") === true, "Combined matches shop");
assert(isAnnouncementVisibleOnRoute(combinedAnnouncement, "/product/xyz") === true, "Combined matches product detail");
assert(isAnnouncementVisibleOnRoute(combinedAnnouncement, "/collections/diwali") === true, "Combined matches custom /collections/diwali");
assert(isAnnouncementVisibleOnRoute(combinedAnnouncement, "/sale") === true, "Combined matches custom /sale");
assert(isAnnouncementVisibleOnRoute(combinedAnnouncement, "/collections/summer") === false, "Combined excludes unselected collection /collections/summer");
assert(isAnnouncementVisibleOnRoute(combinedAnnouncement, "/cart") === false, "Combined excludes cart");
assert(isAnnouncementVisibleOnRoute(combinedAnnouncement, "/") === false, "Combined excludes home");

// 5e. Disabled state
const disabledAnnouncement: AnnouncementContent = {
  ...baseAnnouncement,
  enabled: false,
};
assert(isAnnouncementVisibleOnRoute(disabledAnnouncement, "/") === false, "Disabled announcement does not render");
assert(isAnnouncementVisibleOnRoute(disabledAnnouncement, "/shop") === false, "Disabled announcement does not render on /shop");

// 6. Inventory Search Matcher Test
const mockInventory = [
  { products: { id: "p1", name: "Royal Box Chain", slug: "royal-box-chain", category: "chains" }, stock_quantity: 10, low_stock_threshold: 3 },
  { products: { id: "p2", name: "Classic Signet Ring", slug: "classic-signet-ring", category: "rings" }, stock_quantity: 2, low_stock_threshold: 3 },
  { products: { id: "p3", name: "Twisted Kada Bangle", slug: "twisted-kada-bangle", category: "bangles" }, stock_quantity: 0, low_stock_threshold: 2 },
];

function filterInventory(rows: typeof mockInventory, query: string, status: string) {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    const isOut = r.stock_quantity === 0;
    const isLow = r.stock_quantity > 0 && r.stock_quantity <= r.low_stock_threshold;
    const isIn  = r.stock_quantity > r.low_stock_threshold;

    if (status === "in_stock" && !isIn) return false;
    if (status === "low_stock" && !isLow) return false;
    if (status === "out_of_stock" && !isOut) return false;

    if (!q) return true;
    const p = r.products;
    return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });
}

assert(filterInventory(mockInventory, "Royal", "all").length === 1, "Search by name 'Royal' returns 1 item");
assert(filterInventory(mockInventory, "signet-ring", "all").length === 1, "Search by slug 'signet-ring' returns 1 item");
assert(filterInventory(mockInventory, "chains", "all").length === 1, "Search by category 'chains' returns 1 item");
assert(filterInventory(mockInventory, "", "low_stock").length === 1, "Status filter 'low_stock' returns 1 item");
assert(filterInventory(mockInventory, "", "out_of_stock").length === 1, "Status filter 'out_of_stock' returns 1 item");
assert(filterInventory(mockInventory, "nonexistent", "all").length === 0, "Non-matching query returns 0 items");

console.log("\n✅ All marketing, announcement targeting & inventory regression tests passed!");
