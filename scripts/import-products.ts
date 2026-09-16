/**
 * VEER ELEGANCE — Bulk Product Importer V2
 *
 * Real Filename-Based Multi-Category Catalog Importer
 *
 * Usage:
 *   pnpm products:import <image-folder-path> [--dry-run]
 *
 * Examples:
 *   pnpm products:import /Users/Apple/veerelegance/veer-elegance/bulk-images --dry-run
 *   pnpm products:import /Users/Apple/veerelegance/veer-elegance/bulk-images
 *
 * Security:
 *   Uses SUPABASE_SERVICE_ROLE_KEY (server-side only, never committed/exposed).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── 1. ENVIRONMENT LOADING ───────────────────────────────────────────────────

function loadEnv(): { supabaseUrl: string; supabaseKey: string } {
  // If not already loaded via node/tsx --env-file
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const envPaths = [
      path.resolve(process.cwd(), ".env.local"),
      path.resolve(process.cwd(), ".env"),
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            // Remove wrapping quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "\n❌  Missing environment variables.\n" +
      "    NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local\n"
    );
    process.exit(1);
  }

  return { supabaseUrl, supabaseKey };
}

// ── 2. CONSTANTS & CATEGORY CONFIGURATION ────────────────────────────────────

export const CANONICAL_CATEGORIES = [
  "chains",
  "rings",
  "earrings",
  "bracelets",
  "bangles",
  "mystery-box",
  "gen-z-accessories",
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

export const CATEGORY_ALIASES: Record<string, CanonicalCategory> = {
  // chains
  chain: "chains",
  chains: "chains",

  // rings
  ring: "rings",
  rings: "rings",

  // earrings
  earring: "earrings",
  earrings: "earrings",
  earings: "earrings",

  // bracelets
  bracelet: "bracelets",
  bracelets: "bracelets",

  // bangles
  bangle: "bangles",
  bangles: "bangles",

  // gen-z-accessories
  genz: "gen-z-accessories",
  "gen-z": "gen-z-accessories",
  "gen-z-accessories": "gen-z-accessories",
  "genz-accessories": "gen-z-accessories",
  genzaccessories: "gen-z-accessories",
  "gen_z": "gen-z-accessories",
  "gen_z_accessories": "gen-z-accessories",

  // mystery-box
  "mystery-box": "mystery-box",
  mysterybox: "mystery-box",
  mystery_box: "mystery-box",
  "mystery box": "mystery-box",
};

export const CATEGORY_DISPLAY_NAMES: Record<CanonicalCategory, string> = {
  chains: "Chain",
  rings: "Rings",
  earrings: "Earrings",
  bracelets: "Bracelets",
  bangles: "Bangles",
  "mystery-box": "Mystery Box",
  "gen-z-accessories": "Gen-Z Accessories",
};

export const CATEGORY_SLUG_PREFIXES: Record<CanonicalCategory, string> = {
  chains: "chain",
  rings: "rings",
  earrings: "earrings",
  bracelets: "bracelets",
  bangles: "bangles",
  "mystery-box": "mystery-box",
  "gen-z-accessories": "gen-z-accessories",
};

const STORAGE_BUCKET = "product-images";
const SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

// ── ANSI COLORS ──────────────────────────────────────────────────────────────
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// ── 3. PARSING & NORMALIZATION ───────────────────────────────────────────────

export interface ParsedProductFile {
  originalFilename: string;
  filePath: string;
  extension: string;
  productNumber: number;
  categories: CanonicalCategory[];
  primaryCategory: CanonicalCategory;
  generatedName: string;
  generatedSlug: string;
  normalizedKey: string; // Used for collision checking (e.g. chains:1)
  isValid: boolean;
  unrecognizedReason?: string;
}

export function parseFilename(filename: string, fullPath: string): ParsedProductFile {
  const ext = path.extname(filename).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return {
      originalFilename: filename,
      filePath: fullPath,
      extension: ext,
      productNumber: 0,
      categories: [],
      primaryCategory: "chains",
      generatedName: "",
      generatedSlug: "",
      normalizedKey: "",
      isValid: false,
      unrecognizedReason: `Unsupported file extension "${ext}"`,
    };
  }

  const baseName = path.basename(filename, ext);

  // Match pattern: <category_tokens>[-_\s]+<product_number>
  // e.g. "chain-101", "bracelets+genz -64", "earings-25", "genz-17"
  const match = baseName.match(/^(.+?)[-_\s]+(\d+)$/i);
  if (!match) {
    return {
      originalFilename: filename,
      filePath: fullPath,
      extension: ext,
      productNumber: 0,
      categories: [],
      primaryCategory: "chains",
      generatedName: "",
      generatedSlug: "",
      normalizedKey: "",
      isValid: false,
      unrecognizedReason: `Filename format does not match expected pattern: "<categories>-<number>${ext}"`,
    };
  }

  const [, rawCatPart, rawNumPart] = match;
  const productNumber = parseInt(rawNumPart, 10);

  if (isNaN(productNumber) || productNumber <= 0) {
    return {
      originalFilename: filename,
      filePath: fullPath,
      extension: ext,
      productNumber: 0,
      categories: [],
      primaryCategory: "chains",
      generatedName: "",
      generatedSlug: "",
      normalizedKey: "",
      isValid: false,
      unrecognizedReason: `Invalid product number "${rawNumPart}"`,
    };
  }

  // Parse category tokens separated by '+'
  const rawTokens = rawCatPart
    .split("+")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (rawTokens.length === 0) {
    return {
      originalFilename: filename,
      filePath: fullPath,
      extension: ext,
      productNumber,
      categories: [],
      primaryCategory: "chains",
      generatedName: "",
      generatedSlug: "",
      normalizedKey: "",
      isValid: false,
      unrecognizedReason: "No category tokens found",
    };
  }

  const categories: CanonicalCategory[] = [];
  for (const raw of rawTokens) {
    // Normalize dashes/underscores/spaces in token if any
    const normalizedRaw = raw.replace(/\s+/g, "-");
    const canonical = CATEGORY_ALIASES[raw] || CATEGORY_ALIASES[normalizedRaw];
    if (!canonical) {
      return {
        originalFilename: filename,
        filePath: fullPath,
        extension: ext,
        productNumber,
        categories: [],
        primaryCategory: "chains",
        generatedName: "",
        generatedSlug: "",
        normalizedKey: "",
        isValid: false,
        unrecognizedReason: `Unknown category alias "${raw}"`,
      };
    }
    if (!categories.includes(canonical)) {
      categories.push(canonical);
    }
  }

  // First token in filename is the primary category
  const primaryCategory = categories[0];

  // Generated Product Name:
  // Single: "Chain 101", "Earrings 25", "Bangles 40", "Gen-Z Accessories 17"
  // Multi: "Bracelets & Gen-Z Accessories 66"
  const nameTokens = categories.map((cat) => CATEGORY_DISPLAY_NAMES[cat]);
  const generatedName = `${nameTokens.join(" & ")} ${productNumber}`;

  // Generated Product Slug:
  // Single: "chain-101", "earrings-25", "bangles-40", "gen-z-accessories-17"
  // Multi: "bracelets-gen-z-accessories-66"
  const slugTokens = categories.map((cat) => CATEGORY_SLUG_PREFIXES[cat]);
  const generatedSlug = `${slugTokens.join("-")}-${productNumber}`.toLowerCase();

  // Normalized key for deduplication across leading zeroes and category synonyms:
  // e.g. "chains:1" or "bracelets+gen-z-accessories:64"
  const sortedCategories = [...categories].sort();
  const normalizedKey = `${sortedCategories.join("+")}:${productNumber}`;

  return {
    originalFilename: filename,
    filePath: fullPath,
    extension: ext,
    productNumber,
    categories,
    primaryCategory,
    generatedName,
    generatedSlug,
    normalizedKey,
    isValid: true,
  };
}

function sanitizeStorageFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.\-]+/, "")
    .slice(0, 120);
}

function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

// ── 4. EXISTING DB PRODUCTS LOOKUP ───────────────────────────────────────────

interface ExistingProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
}

interface ExistingLookup {
  slugMap: Map<string, ExistingProduct>;
  normalizedKeyMap: Map<string, ExistingProduct>;
}

async function fetchExistingProducts(supabase: SupabaseClient): Promise<ExistingLookup> {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, category");

  if (error) {
    console.error("❌ Failed to fetch existing products:", error.message);
    throw error;
  }

  const slugMap = new Map<string, ExistingProduct>();
  const normalizedKeyMap = new Map<string, ExistingProduct>();

  for (const prod of (data || []) as ExistingProduct[]) {
    slugMap.set(prod.slug.toLowerCase(), prod);

    // Normalize existing slugs like "chain-01", "chain-1", "earings-03"
    const match = prod.slug.toLowerCase().match(/^(.+?)[-_]+(\d+)$/);
    if (match) {
      const [, prefix, numStr] = match;
      const num = parseInt(numStr, 10);
      const canon = CATEGORY_ALIASES[prefix] || (prod.category as CanonicalCategory);
      if (canon) {
        normalizedKeyMap.set(`${canon}:${num}`, prod);
      }
    }
  }

  return { slugMap, normalizedKeyMap };
}

// ── 5. IMPORT RUNNER ─────────────────────────────────────────────────────────

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB per Supabase bucket limit

export interface ImportOptions {
  folderPath: string;
  isDryRun: boolean;
}

export interface ImportFailure {
  filename: string;
  reason: string;
  isImageUploadFailure: boolean;
  stage: string;
}

export interface ImportSummary {
  scannedFiles: number;
  validParsed: number;
  unrecognized: Array<{ filename: string; reason: string }>;
  duplicates: Array<{ filename: string; slug: string; matchedExisting: string }>;
  readyToImport: number;
  imported: number;
  failed: ImportFailure[];
  imageUploadFailedCount: number;
  dbFailedCount: number;
  productsCreated: number;
  productImagesCreated: number;
  inventoryRowsCreated: number;
  categoryCounts: Record<CanonicalCategory, number>;
  primaryCategoryCounts: Record<CanonicalCategory, number>;
}

/**
 * Validates that an imported product has all required database records and storage objects.
 * Throws a ValidationError or ImageUploadError if any check fails.
 */
async function verifyImportedProduct(
  supabase: SupabaseClient,
  productId: string,
  slug: string,
  storagePath: string,
  expectedPublicUrl: string,
  originalFilename: string
): Promise<void> {
  // 1. Verify Product record exists with valid image_url
  const { data: prod, error: prodErr } = await supabase
    .from("products")
    .select("id, slug, image_url")
    .eq("id", productId)
    .single();

  if (prodErr || !prod) {
    throw new ValidationError(`Verification failed: Product ${productId} not found in database (${prodErr?.message || "missing"})`);
  }

  if (prod.slug !== slug) {
    throw new ValidationError(`Verification failed: Product slug mismatch. Expected "${slug}", got "${prod.slug}"`);
  }

  if (!prod.image_url || prod.image_url !== expectedPublicUrl) {
    throw new ValidationError(`Verification failed: Product image_url is missing or incorrect. Expected "${expectedPublicUrl}", got "${prod.image_url}"`);
  }

  // 2. Verify Inventory record exists
  const { data: inv, error: invErr } = await supabase
    .from("inventory")
    .select("id, product_id")
    .eq("product_id", productId)
    .single();

  if (invErr || !inv) {
    throw new ValidationError(`Verification failed: Inventory record not found for product ${productId} (${invErr?.message || "missing"})`);
  }

  // 3. Verify product_images record exists with correct storage_path & public_url
  const { data: images, error: imgErr } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, public_url, sort_order")
    .eq("product_id", productId);

  if (imgErr || !images || images.length === 0) {
    throw new ValidationError(`Verification failed: No product_images records found for product ${productId} (${imgErr?.message || "none found"})`);
  }

  const primaryImage = images.find((i) => i.sort_order === 0) || images[0];
  if (primaryImage.storage_path !== storagePath || primaryImage.public_url !== expectedPublicUrl) {
    throw new ValidationError(`Verification failed: product_images row mismatch. storage_path: "${primaryImage.storage_path}", public_url: "${primaryImage.public_url}"`);
  }

  // 4. Verify Supabase Storage object exists
  const folder = `products/${productId}`;
  const sanitizedName = sanitizeStorageFilename(originalFilename);
  const { data: fileList, error: listErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folder, { search: sanitizedName });

  if (listErr) {
    throw new ImageUploadError(`Verification failed: Could not query storage bucket ${STORAGE_BUCKET} (${listErr.message})`);
  }

  const fileExists = Array.isArray(fileList) && fileList.some((f) => f.name === sanitizedName);
  if (!fileExists) {
    throw new ImageUploadError(`Verification failed: Uploaded storage object not found in bucket ${STORAGE_BUCKET} at ${storagePath}`);
  }
}

/**
 * Cleans up partially created resources if an import fails.
 * Checks for historical order references before removing a product row.
 */
async function cleanupFailedProduct(
  supabase: SupabaseClient,
  productId: string | null,
  slug: string,
  storagePath: string | null
): Promise<{ cleanedUp: boolean; reason?: string }> {
  // 1. Remove partially uploaded storage file if any
  if (storagePath) {
    try {
      const { error: removeErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);
      if (removeErr) {
        console.warn(c.yellow(`\n⚠️ Storage cleanup warning for "${storagePath}": ${removeErr.message}`));
      }
    } catch (e: any) {
      console.warn(c.yellow(`\n⚠️ Storage cleanup exception for "${storagePath}": ${e?.message || e}`));
    }
  }

  if (!productId) {
    return { cleanedUp: true };
  }

  try {
    // 2. Check if product has historical order references
    const { data: orderItemRefs, error: orderCheckErr } = await supabase
      .from("order_items")
      .select("id, order_id")
      .or(`product_id.eq.${productId},product_slug.eq.${slug}`)
      .limit(1);

    if (orderCheckErr) {
      console.warn(c.yellow(`\n⚠️ Error checking order_items for product ${productId}: ${orderCheckErr.message}`));
    }

    const hasHistoricalOrders = Boolean(orderItemRefs && orderItemRefs.length > 0);

    if (hasHistoricalOrders) {
      console.warn(
        c.yellow(
          `\n⚠️ Product ${productId} (${slug}) has historical order references. Preserving product row to maintain order integrity, but resetting image_url to null.`
        )
      );
      // Reset image_url to null to avoid dangling references
      await supabase.from("products").update({ image_url: null }).eq("id", productId);
      // Remove any product_images rows for this product
      await supabase.from("product_images").delete().eq("product_id", productId);
      return { cleanedUp: false, reason: "Product has historical order references" };
    }

    // 3. Remove product_images rows (if any)
    const { error: imgDelErr } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId);
    if (imgDelErr) {
      console.warn(c.yellow(`\n⚠️ Error deleting product_images for ${productId}: ${imgDelErr.message}`));
    }

    // 4. Remove product_categories rows
    const { error: catDelErr } = await supabase
      .from("product_categories")
      .delete()
      .eq("product_id", productId);
    if (catDelErr) {
      console.warn(c.yellow(`\n⚠️ Error deleting product_categories for ${productId}: ${catDelErr.message}`));
    }

    // 5. Remove inventory_movements rows (if any)
    const { error: movDelErr } = await supabase
      .from("inventory_movements")
      .delete()
      .eq("product_id", productId);
    if (movDelErr) {
      console.warn(c.yellow(`\n⚠️ Error deleting inventory_movements for ${productId}: ${movDelErr.message}`));
    }

    // 6. Remove inventory row
    const { error: invDelErr } = await supabase
      .from("inventory")
      .delete()
      .eq("product_id", productId);
    if (invDelErr) {
      console.warn(c.yellow(`\n⚠️ Error deleting inventory for ${productId}: ${invDelErr.message}`));
    }

    // 7. Remove product row
    const { error: prodDelErr } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    if (prodDelErr) {
      console.warn(c.yellow(`\n⚠️ Error deleting product ${productId}: ${prodDelErr.message}`));
      return { cleanedUp: false, reason: prodDelErr.message };
    }

    return { cleanedUp: true };
  } catch (cleanErr: any) {
    console.warn(c.yellow(`\n⚠️ Cleanup error for product ${productId}: ${cleanErr?.message || cleanErr}`));
    return { cleanedUp: false, reason: cleanErr?.message || String(cleanErr) };
  }
}

export async function runImporter(options: ImportOptions): Promise<ImportSummary> {
  const { folderPath, isDryRun } = options;

  console.log(`\n${c.bold("==================================================")}`);
  console.log(`${c.bold("VEER ELEGANCE — BULK PRODUCT IMPORTER V2")}`);
  console.log(`${c.bold("==================================================")}`);
  console.log(`Mode:       ${isDryRun ? c.yellow(c.bold("DRY RUN (No database/storage writes)")) : c.green(c.bold("REAL IMPORT"))}`);
  console.log(`Folder:     ${c.cyan(folderPath)}\n`);

  if (!fs.existsSync(folderPath)) {
    console.error(c.red(`❌ Folder does not exist: ${folderPath}`));
    process.exit(1);
  }

  const { supabaseUrl, supabaseKey } = loadEnv();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Step 1: Query existing DB products
  console.log(c.dim("Fetching existing products from database..."));
  const existingLookup = await fetchExistingProducts(supabase);
  console.log(c.dim(`Found ${existingLookup.slugMap.size} existing products in database.\n`));

  // Step 2: Read files in folder
  const allEntries = fs.readdirSync(folderPath);
  const fileEntries = allEntries.filter((f) => !f.startsWith(".")); // Skip hidden files like .DS_Store

  const summary: ImportSummary = {
    scannedFiles: fileEntries.length,
    validParsed: 0,
    unrecognized: [],
    duplicates: [],
    readyToImport: 0,
    imported: 0,
    failed: [],
    imageUploadFailedCount: 0,
    dbFailedCount: 0,
    productsCreated: 0,
    productImagesCreated: 0,
    inventoryRowsCreated: 0,
    categoryCounts: {
      chains: 0,
      rings: 0,
      earrings: 0,
      bracelets: 0,
      bangles: 0,
      "mystery-box": 0,
      "gen-z-accessories": 0,
    },
    primaryCategoryCounts: {
      chains: 0,
      rings: 0,
      earrings: 0,
      bracelets: 0,
      bangles: 0,
      "mystery-box": 0,
      "gen-z-accessories": 0,
    },
  };

  const parsedItems: ParsedProductFile[] = [];
  const seenBatchSlugs = new Map<string, string>();
  const seenBatchKeys = new Map<string, string>();

  // Step 3: Parse and validate all files
  for (const filename of fileEntries) {
    const fullPath = path.join(folderPath, filename);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const parsed = parseFilename(filename, fullPath);
    if (!parsed.isValid) {
      summary.unrecognized.push({
        filename,
        reason: parsed.unrecognizedReason || "Unrecognized pattern",
      });
      continue;
    }

    summary.validParsed++;

    // Check duplicate against existing DB products
    let isDuplicate = false;
    let matchedReason = "";

    if (existingLookup.slugMap.has(parsed.generatedSlug)) {
      isDuplicate = true;
      const existing = existingLookup.slugMap.get(parsed.generatedSlug)!;
      matchedReason = `DB product slug "${existing.slug}" (${existing.name})`;
    } else if (existingLookup.normalizedKeyMap.has(parsed.normalizedKey)) {
      isDuplicate = true;
      const existing = existingLookup.normalizedKeyMap.get(parsed.normalizedKey)!;
      matchedReason = `DB product normalized collision "${existing.slug}" (${existing.name})`;
    } else if (seenBatchSlugs.has(parsed.generatedSlug)) {
      isDuplicate = true;
      matchedReason = `In-batch slug collision with "${seenBatchSlugs.get(parsed.generatedSlug)}"`;
    } else if (seenBatchKeys.has(parsed.normalizedKey)) {
      isDuplicate = true;
      matchedReason = `In-batch normalized collision with "${seenBatchKeys.get(parsed.normalizedKey)}"`;
    }

    if (isDuplicate) {
      summary.duplicates.push({
        filename,
        slug: parsed.generatedSlug,
        matchedExisting: matchedReason,
      });
    } else {
      seenBatchSlugs.set(parsed.generatedSlug, filename);
      seenBatchKeys.set(parsed.normalizedKey, filename);
      parsedItems.push(parsed);

      // Track categories for valid non-duplicates
      summary.primaryCategoryCounts[parsed.primaryCategory]++;
      for (const cat of parsed.categories) {
        summary.categoryCounts[cat]++;
      }
    }
  }

  summary.readyToImport = parsedItems.length;

  // ── DRY RUN OUTPUT ─────────────────────────────────────────────────────────
  if (isDryRun) {
    console.log(c.bold("--- PARSED FILES DETAILS ---"));
    for (const item of parsedItems) {
      console.log(`\n${c.bold("File:")}        ${item.originalFilename}`);
      console.log(`${c.bold("Categories:")}  ${item.categories.join(", ")}`);
      console.log(`${c.bold("Primary:")}     ${item.primaryCategory}`);
      console.log(`${c.bold("Product:")}     ${item.generatedName}`);
      console.log(`${c.bold("Slug:")}        ${item.generatedSlug}`);
      console.log(`${c.bold("Status:")}      ${c.green("READY")}`);
    }

    if (summary.duplicates.length > 0) {
      console.log(`\n${c.bold("--- SKIPPED DUPLICATES (" + summary.duplicates.length + ") ---")}`);
      for (const dup of summary.duplicates) {
        console.log(`• ${dup.filename} → ${c.yellow("SKIP")} (Matches ${dup.matchedExisting})`);
      }
    }

    if (summary.unrecognized.length > 0) {
      console.log(`\n${c.bold("--- UNRECOGNIZED FILES (" + summary.unrecognized.length + ") ---")}`);
      for (const unrec of summary.unrecognized) {
        console.log(`• ${unrec.filename} → ${c.red("UNRECOGNIZED")} (${unrec.reason})`);
      }
    }

    printSummaryReport(summary, true);
    return summary;
  }

  // ── REAL IMPORT EXECUTION ──────────────────────────────────────────────────
  console.log(c.bold(`Starting import of ${parsedItems.length} products...\n`));

  let progress = 0;
  for (const item of parsedItems) {
    progress++;
    const progressTag = `[${progress}/${parsedItems.length}]`;
    process.stdout.write(`${progressTag} Importing ${item.originalFilename} (${item.generatedSlug})... `);

    let createdProductId: string | null = null;
    let uploadedStoragePath: string | null = null;
    let isImageError = false;

    try {
      // Step 1: Pre-validate local image file before any database writes
      if (!fs.existsSync(item.filePath)) {
        isImageError = true;
        throw new ImageUploadError(`Source image file does not exist on disk: ${item.filePath}`);
      }

      let fileBuffer: Buffer;
      try {
        fileBuffer = fs.readFileSync(item.filePath);
      } catch (readErr: any) {
        isImageError = true;
        throw new ImageUploadError(`Failed to read local image file: ${readErr?.message || readErr}`);
      }

      if (fileBuffer.length === 0) {
        isImageError = true;
        throw new ImageUploadError(`Source image file is empty (0 bytes): ${item.originalFilename}`);
      }

      if (fileBuffer.length > MAX_IMAGE_SIZE) {
        isImageError = true;
        throw new ImageUploadError(
          `Image file size (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds 5 MB limit`
        );
      }

      const mimeType = getMimeType(item.extension);

      // Step 2: Create product row (initially image_url = null)
      const { data: prodData, error: prodErr } = await supabase
        .from("products")
        .insert({
          slug: item.generatedSlug,
          name: item.generatedName,
          category: item.primaryCategory,
          price: null,
          currency: "INR",
          short_description: null,
          description: null,
          material: null,
          anti_tarnish: true,
          featured: false,
          published: false,
          archived: false,
          image_url: null,
          display_order: 999,
        })
        .select("id")
        .single();

      if (prodErr || !prodData) {
        throw new Error(`Failed to create product: ${prodErr?.message || "Unknown database error"}`);
      }

      createdProductId = prodData.id;

      // Step 3: Insert category memberships in product_categories
      const categoryRows = item.categories.map((catId) => ({
        product_id: createdProductId,
        category_id: catId,
      }));

      const { error: catErr } = await supabase
        .from("product_categories")
        .upsert(categoryRows, { onConflict: "product_id,category_id", ignoreDuplicates: true });

      if (catErr) {
        throw new Error(`Failed to assign categories: ${catErr.message}`);
      }

      // Step 4: Ensure inventory row exists (trigger creates it, upsert ensures idempotency)
      const { error: invErr } = await supabase
        .from("inventory")
        .upsert(
          {
            product_id: createdProductId,
            stock_quantity: 0,
            low_stock_threshold: 5,
          },
          { onConflict: "product_id", ignoreDuplicates: true }
        );

      if (invErr) {
        throw new Error(`Failed to create inventory record: ${invErr.message}`);
      }

      // Step 5: Upload image to Supabase Storage (Required Step)
      const sanitizedName = sanitizeStorageFilename(item.originalFilename);
      const storagePath = `products/${createdProductId}/${sanitizedName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadErr || !uploadData) {
        isImageError = true;
        throw new ImageUploadError(`Storage upload failed: ${uploadErr?.message || "No data returned from storage upload"}`);
      }
      uploadedStoragePath = storagePath;

      // Step 6: Derive public CDN URL
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);
      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        isImageError = true;
        throw new ImageUploadError("Failed to derive public CDN URL from Supabase Storage");
      }

      // Step 7: Create product_images row (primary image, sort_order = 0)
      const { data: imgData, error: imgErr } = await supabase
        .from("product_images")
        .insert({
          product_id: createdProductId,
          storage_path: storagePath,
          public_url: publicUrl,
          sort_order: 0,
        })
        .select("id")
        .single();

      if (imgErr || !imgData) {
        isImageError = true;
        throw new ImageUploadError(`Failed to insert product_images record: ${imgErr?.message || "Unknown database error"}`);
      }

      // Step 8: Update products.image_url
      const { error: updateImgErr } = await supabase
        .from("products")
        .update({ image_url: publicUrl })
        .eq("id", createdProductId);

      if (updateImgErr) {
        isImageError = true;
        throw new ImageUploadError(`Failed to update products.image_url: ${updateImgErr.message}`);
      }

      if (!createdProductId) {
        throw new ValidationError("Failed to verify: createdProductId is null");
      }

      // Step 9: Post-import verification check (Strict Success Gate)
      await verifyImportedProduct(
        supabase,
        createdProductId,
        item.generatedSlug,
        storagePath,
        publicUrl,
        item.originalFilename
      );

      // Only print SUCCESS and increment success counters if ALL checks pass
      summary.imported++;
      summary.productsCreated++;
      summary.productImagesCreated++;
      summary.inventoryRowsCreated++;
      console.log(c.green("SUCCESS"));
    } catch (err: any) {
      const isImgErr = isImageError || err instanceof ImageUploadError;
      const errorMessage = err?.message || String(err);

      console.log(c.red(`FAILED: ${errorMessage}`));

      if (isImgErr) {
        summary.imageUploadFailedCount++;
      } else {
        summary.dbFailedCount++;
      }

      summary.failed.push({
        filename: item.originalFilename,
        reason: errorMessage,
        isImageUploadFailure: isImgErr,
        stage: isImgErr ? "image_upload" : "database_or_validation",
      });

      // Cleanup on failure
      await cleanupFailedProduct(
        supabase,
        createdProductId,
        item.generatedSlug,
        uploadedStoragePath
      );
    }
  }

  printSummaryReport(summary, false);
  return summary;
}

// ── 6. SUMMARY REPORTING ─────────────────────────────────────────────────────

function printSummaryReport(summary: ImportSummary, isDryRun: boolean): void {
  console.log(`\n${c.bold("==================================================")}`);
  console.log(`${c.bold("IMPORT SUMMARY REPORT" + (isDryRun ? " (DRY RUN)" : ""))}`);
  console.log(`${c.bold("==================================================")}`);

  console.log(`Total Files Scanned:       ${c.bold(String(summary.scannedFiles))}`);
  console.log(`Valid Patterns Detected:   ${c.bold(String(summary.validParsed))}`);
  console.log(`Unrecognized Files:        ${summary.unrecognized.length > 0 ? c.red(String(summary.unrecognized.length)) : "0"}`);
  console.log(`Duplicates / Skipped:      ${summary.duplicates.length > 0 ? c.yellow(String(summary.duplicates.length)) : "0"}`);

  if (isDryRun) {
    console.log(`Ready for Import:          ${c.green(c.bold(String(summary.readyToImport)))}`);
  } else {
    console.log(`Successfully Imported:     ${c.green(c.bold(String(summary.imported)))}`);
    console.log(`Total Failed:              ${summary.failed.length > 0 ? c.red(String(summary.failed.length)) : "0"}`);
    console.log(`  ├─ Image Upload Failures: ${summary.imageUploadFailedCount > 0 ? c.red(String(summary.imageUploadFailedCount)) : "0"}`);
    console.log(`  └─ DB / Other Failures:   ${summary.dbFailedCount > 0 ? c.red(String(summary.dbFailedCount)) : "0"}`);
    console.log(`Products Created:          ${summary.productsCreated}`);
    console.log(`Product Images Created:    ${summary.productImagesCreated}`);
    console.log(`Inventory Rows Created:    ${summary.inventoryRowsCreated}`);
  }

  console.log(`\n${c.bold("--- CATEGORY MEMBERSHIP SUMMARY (All Assigned Categories) ---")}`);
  console.log(`Chains:            ${summary.categoryCounts.chains}`);
  console.log(`Earrings:          ${summary.categoryCounts.earrings}`);
  console.log(`Bracelets:         ${summary.categoryCounts.bracelets}`);
  console.log(`Bangles:           ${summary.categoryCounts.bangles}`);
  console.log(`Mystery Box:       ${summary.categoryCounts["mystery-box"]}`);
  console.log(`Gen-Z Accessories: ${summary.categoryCounts["gen-z-accessories"]}`);
  console.log(`Rings:             ${summary.categoryCounts.rings}`);

  console.log(`\n${c.bold("--- PRIMARY CATEGORY SUMMARY (Unique Products) ---")}`);
  console.log(`Chains:            ${summary.primaryCategoryCounts.chains}`);
  console.log(`Earrings:          ${summary.primaryCategoryCounts.earrings}`);
  console.log(`Bracelets:         ${summary.primaryCategoryCounts.bracelets}`);
  console.log(`Bangles:           ${summary.primaryCategoryCounts.bangles}`);
  console.log(`Mystery Box:       ${summary.primaryCategoryCounts["mystery-box"]}`);
  console.log(`Gen-Z Accessories: ${summary.primaryCategoryCounts["gen-z-accessories"]}`);
  console.log(`Rings:             ${summary.primaryCategoryCounts.rings}`);

  if (summary.failed.length > 0) {
    console.log(`\n${c.bold(c.red("--- FAILURES BREAKDOWN ---"))}`);
    const imageFails = summary.failed.filter((f) => f.isImageUploadFailure);
    const otherFails = summary.failed.filter((f) => !f.isImageUploadFailure);

    if (imageFails.length > 0) {
      console.log(c.bold(c.yellow(`\nImage Upload Failures (${imageFails.length}):`)));
      for (const f of imageFails) {
        console.log(`• ${c.bold(f.filename)}: ${f.reason}`);
      }
    }

    if (otherFails.length > 0) {
      console.log(c.bold(c.yellow(`\nDatabase / Other Failures (${otherFails.length}):`)));
      for (const f of otherFails) {
        console.log(`• ${c.bold(f.filename)}: ${f.reason}`);
      }
    }
  }

  console.log(`${c.bold("==================================================")}\n`);
}

// ── 7. CLI ENTRYPOINT ────────────────────────────────────────────────────────

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run") || args.includes("-d") || args.includes("--dryRun");
  const pathArgs = args.filter((a) => !a.startsWith("-"));

  const defaultFolder = path.resolve(process.cwd(), "bulk-images");
  const targetFolder = pathArgs.length > 0 ? path.resolve(pathArgs[0]) : defaultFolder;

  runImporter({
    folderPath: targetFolder,
    isDryRun,
  }).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

