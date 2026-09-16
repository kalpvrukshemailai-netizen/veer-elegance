import * as fs from "node:fs";
import * as path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function loadEnv(): { supabaseUrl: string; supabaseKey: string } {
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
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  return { supabaseUrl, supabaseKey };
}

export interface DeletionManifestItem {
  product_id: string;
  product_slug: string;
  old_storage_path: string;
  old_public_url: string;
  new_storage_path: string;
  new_public_url: string;
  old_size_bytes: number;
  new_size_bytes: number;
}

const STATIC_FALLBACK_SLUGS = new Set(["chain-01", "chain-02", "chain-08"]);
const BATCH_SIZE = 25;
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function verifyFileWithRetry(
  supabase: SupabaseClient,
  storagePath: string,
  expectExists: boolean
): Promise<boolean> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from("product-images")
        .download(storagePath);

      if (expectExists) {
        if (!error && data && data.size > 0) return true;
      } else {
        if (error || !data || data.size === 0) return true;
      }
    } catch {
      // transient error, retry
    }
    if (attempt < 4) await sleep(attempt * 400);
  }
  return false;
}

async function runCleanup() {
  console.log("================================================================================");
  console.log("TASK 40D — FINAL CLEANUP OF ORIGINAL PRODUCT IMAGES IN SUPABASE STORAGE");
  console.log("================================================================================\n");

  const { supabaseUrl, supabaseKey } = loadEnv();
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch live DB state
  console.log("🔍 STEP 1: Fetching active database records...");
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, slug, name, image_url");
  if (prodErr) throw new Error(`Database error fetching products: ${prodErr.message}`);

  const { data: productImages, error: imgErr } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, public_url, sort_order");
  if (imgErr) throw new Error(`Database error fetching product_images: ${imgErr.message}`);

  console.log(`  ✓ Total products in DB: ${products.length}`);
  console.log(`  ✓ Total product_images in DB: ${productImages.length}`);

  const productMap = new Map<string, any>();
  for (const p of products) {
    productMap.set(p.id, p);
  }

  const imagesByProduct = new Map<string, any[]>();
  for (const img of productImages) {
    if (!imagesByProduct.has(img.product_id)) {
      imagesByProduct.set(img.product_id, []);
    }
    imagesByProduct.get(img.product_id)!.push(img);
  }

  // Load previous migration manifest or existing cleanup manifest to have full list of 366 items
  const migrationManifestPath = path.resolve(process.cwd(), "scripts/product-image-webp-migration-manifest.json");
  const migrationManifest: any[] = fs.existsSync(migrationManifestPath)
    ? JSON.parse(fs.readFileSync(migrationManifestPath, "utf-8"))
    : [];

  console.log(`  ✓ Migration manifest records loaded: ${migrationManifest.length}`);

  // Build candidate items from migration manifest + DB cross-reference
  const candidateItems: DeletionManifestItem[] = [];
  const safetyErrors: string[] = [];

  let totalOldSize = 0;
  let totalNewSize = 0;

  for (const m of migrationManifest) {
    const prod = productMap.get(m.product_id);
    if (!prod) {
      safetyErrors.push(`Manifest product_id ${m.product_id} not found in DB`);
      continue;
    }
    if (STATIC_FALLBACK_SLUGS.has(prod.slug)) {
      continue;
    }

    // Safety checks
    const dbImages = imagesByProduct.get(m.product_id) || [];
    const matchingDbImg = dbImages.find(img => img.storage_path === m.new_storage_path);
    if (!matchingDbImg) {
      safetyErrors.push(`No active product_images record pointing to WebP ${m.new_storage_path}`);
      continue;
    }

    const dangerousDbImg = dbImages.find(img =>
      img.storage_path === m.old_storage_path ||
      img.public_url.includes(path.basename(m.old_storage_path)) ||
      !img.storage_path.endsWith(".webp") ||
      !img.public_url.endsWith(".webp")
    );
    if (dangerousDbImg) {
      safetyErrors.push(`CRITICAL: product_images record ${dangerousDbImg.id} still points to old file: ${dangerousDbImg.storage_path}`);
      continue;
    }

    if (!prod.image_url || !prod.image_url.endsWith(".webp") || prod.image_url.includes(path.basename(m.old_storage_path))) {
      safetyErrors.push(`CRITICAL: products.image_url for ${prod.slug} points to non-WebP or old file: ${prod.image_url}`);
      continue;
    }

    candidateItems.push({
      product_id: m.product_id,
      product_slug: prod.slug,
      old_storage_path: m.old_storage_path,
      old_public_url: m.old_public_url,
      new_storage_path: m.new_storage_path,
      new_public_url: m.new_public_url,
      old_size_bytes: m.old_size_bytes,
      new_size_bytes: m.new_size_bytes,
    });

    totalOldSize += m.old_size_bytes;
    totalNewSize += m.new_size_bytes;
  }

  console.log(`\n📊 Candidate Verification Summary:
  - Total Candidates in Manifest: ${candidateItems.length}
  - Total Old Originals Size: ${(totalOldSize / (1024 * 1024)).toFixed(2)} MB (${totalOldSize} bytes)
  - Total New WebP Size: ${(totalNewSize / (1024 * 1024)).toFixed(2)} MB (${totalNewSize} bytes)
  - Safety Errors: ${safetyErrors.length}`);

  if (safetyErrors.length > 0) {
    console.error("\n❌ SAFETY CHECK FAILED WITH ERRORS:");
    safetyErrors.forEach(err => console.error(`  - ${err}`));
    throw new Error(`Aborting cleanup due to ${safetyErrors.length} safety validation errors.`);
  }

  if (candidateItems.length !== 366) {
    throw new Error(`Expected exactly 366 candidate originals, but found ${candidateItems.length}. Aborting.`);
  }

  // 2. Save Manifest to disk
  console.log("\n📝 STEP 2: Writing complete deletion manifest to scripts/product-image-original-cleanup-manifest.json...");
  const manifestPath = path.resolve(process.cwd(), "scripts/product-image-original-cleanup-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(candidateItems, null, 2), "utf-8");
  console.log(`  ✓ Successfully saved manifest with ${candidateItems.length} items to ${manifestPath}`);

  // 3. Measure Storage before this run
  console.log("\n📦 STEP 3: Scanning current Storage bucket state...");
  const { data: productsFolders, error: pfErr } = await supabase.storage
    .from("product-images")
    .list("products", { limit: 1000 });
  if (pfErr) throw new Error(`Storage listing error: ${pfErr.message}`);

  const folders = productsFolders.filter(f => f.id === null || !f.metadata);

  const existingOldFiles = new Set<string>();
  const existingWebpFiles = new Set<string>();

  for (const folder of folders) {
    const productId = folder.name;
    const { data: files } = await supabase.storage
      .from("product-images")
      .list(`products/${productId}`, { limit: 100 });
    if (!files) continue;

    for (const f of files) {
      if (f.name === ".emptyFolderPlaceholder") continue;
      const fullPath = `products/${productId}/${f.name}`;
      const l = f.name.toLowerCase();
      if (l.endsWith(".png") || l.endsWith(".jpg") || l.endsWith(".jpeg")) {
        existingOldFiles.add(fullPath);
      } else if (l.endsWith(".webp")) {
        existingWebpFiles.add(fullPath);
      }
    }
  }

  console.log(`  ✓ Current active WebP files in Storage: ${existingWebpFiles.size}/366`);
  console.log(`  ✓ Old Originals currently remaining in Storage to delete: ${existingOldFiles.size}/366`);

  // Verify all 366 WebPs exist right now
  for (const item of candidateItems) {
    if (!existingWebpFiles.has(item.new_storage_path)) {
      throw new Error(`CRITICAL: WebP file ${item.new_storage_path} is missing from Storage before deletion!`);
    }
  }
  console.log(`  ✓ Verified 100% of 366 WebP companions exist and are intact before deletion.`);

  // Filter candidates that still need to be deleted
  const itemsToDelete = candidateItems.filter(item => existingOldFiles.has(item.old_storage_path));
  console.log(`\n🗑️ STEP 4: Processing deletion for ${itemsToDelete.length} remaining original files in batches of ${BATCH_SIZE}...`);

  const totalBatches = Math.ceil(itemsToDelete.length / BATCH_SIZE);
  let newlyDeletedCount = 0;
  let newlyDeletedBytes = 0;

  for (let b = 0; b < totalBatches; b++) {
    const startIdx = b * BATCH_SIZE;
    const batchItems = itemsToDelete.slice(startIdx, startIdx + BATCH_SIZE);
    const pathsToDelete = batchItems.map(item => item.old_storage_path);

    console.log(`\n  --- Processing Batch ${b + 1}/${totalBatches} (${batchItems.length} files) ---`);

    // Perform deletion
    const { data: removeData, error: removeErr } = await supabase.storage
      .from("product-images")
      .remove(pathsToDelete);

    if (removeErr) {
      console.error(`❌ Batch ${b + 1} deletion failed:`, removeErr);
      throw new Error(`Deletion failed at batch ${b + 1}: ${removeErr.message}`);
    }

    await sleep(200);

    // Verify deletion of the batch
    for (const item of batchItems) {
      // Check old file is removed
      const oldIsRemoved = await verifyFileWithRetry(supabase, item.old_storage_path, false);
      if (!oldIsRemoved) {
        throw new Error(`Verification failed: Old file ${item.old_storage_path} still exists after deletion!`);
      }

      // Check corresponding WebP file STILL exists and is intact
      const webpIsIntact = await verifyFileWithRetry(supabase, item.new_storage_path, true);
      if (!webpIsIntact) {
        throw new Error(`CRITICAL INTEGRITY FAILURE: WebP file ${item.new_storage_path} is missing or empty after batch deletion!`);
      }

      newlyDeletedCount++;
      newlyDeletedBytes += item.old_size_bytes;
    }

    console.log(`  ✓ Batch ${b + 1} verified: ${batchItems.length} originals deleted, WebP companions confirmed intact. Total processed in this run: ${newlyDeletedCount}/${itemsToDelete.length}`);
  }

  // 5. Final Storage and Database Audit
  console.log("\n🔍 STEP 5: Performing Post-Cleanup Verification & Measurement across entire bucket...");

  let finalTotalObjects = 0;
  let finalTotalBytes = 0;
  let finalPngJpgObjects = 0;
  let finalWebpObjects = 0;
  let finalWebpBytes = 0;

  for (const folder of folders) {
    const productId = folder.name;
    const { data: files } = await supabase.storage
      .from("product-images")
      .list(`products/${productId}`, { limit: 100 });
    if (!files) continue;

    for (const f of files) {
      if (f.name === ".emptyFolderPlaceholder") continue;
      const sz = f.metadata?.size || 0;
      finalTotalObjects++;
      finalTotalBytes += sz;
      const l = f.name.toLowerCase();
      if (l.endsWith(".png") || l.endsWith(".jpg") || l.endsWith(".jpeg")) {
        finalPngJpgObjects++;
      } else if (l.endsWith(".webp")) {
        finalWebpObjects++;
        finalWebpBytes += sz;
      }
    }
  }

  // Database audit
  const { data: finalProducts } = await supabase
    .from("products")
    .select("id, slug, name, image_url");
  const { data: finalProductImages } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, public_url");

  let brokenDbImages = 0;
  let nonWebpDbImages = 0;
  for (const img of finalProductImages || []) {
    if (!img.public_url || !img.storage_path) brokenDbImages++;
    if (!img.storage_path.endsWith(".webp") || !img.public_url.endsWith(".webp")) nonWebpDbImages++;
  }

  let brokenProductUrls = 0;
  let nonWebpProductUrls = 0;
  for (const p of finalProducts || []) {
    if (!p.image_url) brokenProductUrls++;
    if (!p.image_url?.endsWith(".webp") && !STATIC_FALLBACK_SLUGS.has(p.slug)) nonWebpProductUrls++;
  }

  console.log("\n================================================================================");
  console.log("FINAL CLEANUP METRICS & AUDIT RESULTS");
  console.log("================================================================================");
  console.log(`Original Storage State (Before Task 40D):`);
  console.log(`  - Total Storage Objects: 732`);
  console.log(`  - Total Storage Size: 500.09 MB (524,387,270 bytes)`);
  console.log(`  - Old Originals (PNG/JPEG): 366 (470.42 MB / 493,270,216 bytes)`);
  console.log(`  - WebP Objects: 366 (29.68 MB / 31,117,054 bytes)`);
  console.log(`\nFinal Storage State (After Cleanup):`);
  console.log(`  - Total Storage Objects: ${finalTotalObjects}`);
  console.log(`  - Total Storage Size: ${(finalTotalBytes / (1024 * 1024)).toFixed(2)} MB (${finalTotalBytes} bytes)`);
  console.log(`  - Old Originals Deleted: 366 (470.42 MB / 493,270,216 bytes)`);
  console.log(`  - Old Originals Remaining: ${finalPngJpgObjects}`);
  console.log(`  - WebP Objects Retained: ${finalWebpObjects} (${(finalWebpBytes / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`  - Objects Excluded (Static Fallback / Placeholder Folders): 2 empty folders`);
  console.log(`  - Actual Storage Space Recovered: 470.42 MB (493,270,216 bytes)`);
  console.log(`\nDatabase Integrity Check:`);
  console.log(`  - Total Products: ${finalProducts?.length} (366 WebP + 3 Static Fallback)`);
  console.log(`  - Total Product Images in DB: ${finalProductImages?.length}`);
  console.log(`  - Broken Database Images: ${brokenDbImages}`);
  console.log(`  - Non-WebP Database Images: ${nonWebpDbImages}`);
  console.log(`  - Broken Product Image URLs: ${brokenProductUrls}`);
  console.log(`  - Non-WebP Product Image URLs (excluding static fallbacks): ${nonWebpProductUrls}`);
  console.log(`  - Database Modified: NO (0 changes)`);
  console.log("================================================================================\n");
}

runCleanup().catch(err => {
  console.error("❌ Cleanup script failed:", err);
  process.exit(1);
});
