import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp, { type Sharp, type Metadata } from "sharp";

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
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  return { supabaseUrl, supabaseKey };
}

export interface AnalyzedImageRecord {
  product_id: string;
  product_name?: string;
  product_slug?: string;
  image_id: string;
  storage_path: string;
  public_url: string;
  filename: string;
  extension: string;
  currentSizeBytes: number;
  currentWidth: number;
  currentHeight: number;
  currentFormat: string;
  hasAlpha: boolean;
  hasActualTransparency: boolean;
  projectedSizeBytes: number;
  projectedWidth: number;
  projectedHeight: number;
  projectedFormat: string;
  projectedReductionPercent: number;
  wouldConvert: boolean;
  reasonUnchanged?: string;
  sourceVerification: string;
}

async function analyzeTransparency(image: Sharp, metadata: Metadata): Promise<boolean> {
  if (!metadata.hasAlpha) {
    return false;
  }
  try {
    const stats = await image.clone().extractChannel("alpha").stats();
    return stats.channels[0]?.min !== undefined ? stats.channels[0].min < 255 : !!metadata.hasAlpha;
  } catch {
    return !!metadata.hasAlpha;
  }
}

async function runDryRun() {
  const { supabaseUrl, supabaseKey } = loadEnv();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log("================================================================================");
  console.log("PHASE 1 — BULK PRODUCT IMAGE OPTIMIZATION (DRY RUN ONLY)");
  console.log("================================================================================\n");

  // 1. Fetch all product_images
  const { data: dbRecords, error: dbError } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, public_url, sort_order, created_at")
    .order("created_at", { ascending: true })
    .limit(2000);

  if (dbError || !dbRecords) {
    console.error("❌ Failed to query product_images:", dbError);
    process.exit(1);
  }

  // 2. Fetch all products to correlate metadata
  const { data: dbProducts, error: prodError } = await supabase
    .from("products")
    .select("id, name, slug, image_url");

  if (prodError || !dbProducts) {
    console.error("❌ Failed to query products:", prodError);
    process.exit(1);
  }

  const productMap = new Map<string, { name: string; slug: string; image_url: string | null }>();
  for (const p of dbProducts) {
    productMap.set(p.id, { name: p.name, slug: p.slug, image_url: p.image_url });
  }

  console.log(`✓ Retrieved ${dbProducts.length} total products from public.products`);
  console.log(`✓ Retrieved ${dbRecords.length} image records from public.product_images`);

  const bulkDir = path.resolve(process.cwd(), "bulk-images");
  const localFiles = fs.existsSync(bulkDir) ? fs.readdirSync(bulkDir) : [];

  // Build a lookup map of normalized local filenames
  const localFileMap = new Map<string, string>();
  for (const f of localFiles) {
    localFileMap.set(f.toLowerCase(), f);
    localFileMap.set(f.toLowerCase().replace(/\+/g, "-").replace(/\s+/g, ""), f);
  }

  const analyzedImages: AnalyzedImageRecord[] = [];
  let localHitCount = 0;
  let remoteFetchCount = 0;

  console.log("\nStarting inspection and in-memory optimization simulation...\n");

  for (let i = 0; i < dbRecords.length; i++) {
    const record = dbRecords[i];
    const filename = path.basename(record.storage_path);
    const ext = path.extname(filename).toLowerCase().replace(".", "");
    const prodInfo = productMap.get(record.product_id);

    let buffer: Buffer | null = null;
    let sourceVerification = "supabase_storage_cdn";

    // Try finding exact local file matching the record
    const normName = filename.toLowerCase();
    const cleanName = normName.replace(/\+/g, "-").replace(/\s+/g, "");
    const matchedLocal = localFileMap.get(normName) || localFileMap.get(cleanName);

    if (matchedLocal) {
      const localFilePath = path.resolve(bulkDir, matchedLocal);
      buffer = fs.readFileSync(localFilePath);
      sourceVerification = `local_verified (${matchedLocal})`;
      localHitCount++;
    } else {
      // Fetch via Supabase Storage public CDN URL
      try {
        const res = await fetch(record.public_url);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          buffer = Buffer.from(ab);
          sourceVerification = "supabase_storage_cdn";
          remoteFetchCount++;
        }
      } catch (err) {
        console.warn(`⚠️ CDN fetch failed for ${record.public_url}`);
      }
    }

    if (!buffer) {
      console.error(`❌ Could not load buffer for image id ${record.id}, path: ${record.storage_path}`);
      continue;
    }

    const currentSizeBytes = buffer.length;

    // Analyze with sharp
    const img = sharp(buffer);
    const metadata = await img.metadata();

    const currentWidth = metadata.width || 0;
    const currentHeight = metadata.height || 0;
    const currentFormat = (metadata.format || ext).toLowerCase();
    const hasAlpha = !!metadata.hasAlpha;
    const hasActualTransparency = await analyzeTransparency(img, metadata);

    // Target Optimization Rules:
    // Output: WebP
    // Long side: max 1600px (without enlargement — never upscale)
    // Quality: 85, effort 6, preserve alpha
    const longSide = Math.max(currentWidth, currentHeight);
    const needsResize = longSide > 1600;

    // Condition to leave unchanged: already WebP, <= 500KB, <= 1600px
    const isAlreadyOptimal = currentFormat === "webp" && currentSizeBytes <= 500 * 1024 && !needsResize;

    let projectedSizeBytes = currentSizeBytes;
    let projectedWidth = currentWidth;
    let projectedHeight = currentHeight;
    let projectedFormat = currentFormat;
    let wouldConvert = true;
    let reasonUnchanged: string | undefined = undefined;

    if (isAlreadyOptimal) {
      wouldConvert = false;
      reasonUnchanged = "Already optimal WebP format (<=500 KB, <=1600px)";
    } else {
      let pipeline = sharp(buffer);
      if (needsResize) {
        pipeline = pipeline.resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      const optimizedBuffer = await pipeline
        .webp({
          quality: 85,
          effort: 6,
          alphaQuality: 85,
        })
        .toBuffer();

      let newW = currentWidth;
      let newH = currentHeight;
      if (needsResize && currentWidth > 0 && currentHeight > 0) {
        if (currentWidth >= currentHeight) {
          newW = 1600;
          newH = Math.round((currentHeight / currentWidth) * 1600);
        } else {
          newH = 1600;
          newW = Math.round((currentWidth / currentHeight) * 1600);
        }
      }

      if (optimizedBuffer.length < currentSizeBytes || currentFormat !== "webp") {
        projectedSizeBytes = optimizedBuffer.length;
        projectedWidth = newW;
        projectedHeight = newH;
        projectedFormat = "webp";
        wouldConvert = true;
      } else {
        wouldConvert = false;
        reasonUnchanged = "Original file is already smaller than converted WebP";
      }
    }

    const reductionBytes = currentSizeBytes - projectedSizeBytes;
    const reductionPercent = currentSizeBytes > 0 ? (reductionBytes / currentSizeBytes) * 100 : 0;

    analyzedImages.push({
      product_id: record.product_id,
      product_name: prodInfo?.name,
      product_slug: prodInfo?.slug,
      image_id: record.id,
      storage_path: record.storage_path,
      public_url: record.public_url,
      filename,
      extension: ext,
      currentSizeBytes,
      currentWidth,
      currentHeight,
      currentFormat,
      hasAlpha,
      hasActualTransparency,
      projectedSizeBytes,
      projectedWidth,
      projectedHeight,
      projectedFormat,
      projectedReductionPercent: parseFloat(reductionPercent.toFixed(2)),
      wouldConvert,
      reasonUnchanged,
      sourceVerification,
    });

    if ((i + 1) % 50 === 0 || i === dbRecords.length - 1) {
      console.log(`[${i + 1}/${dbRecords.length}] Inspected & measured image: ${filename}`);
    }
  }

  // Save complete JSON report
  const reportPath = path.resolve(process.cwd(), "scripts/dry-run-product-images-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(analyzedImages, null, 2), "utf-8");
  console.log(`\n✓ Detailed per-image analysis written to ${reportPath}`);

  // Summary Calculations
  const totalRecords = dbRecords.length;
  const totalInspected = analyzedImages.length;

  let pngCount = 0;
  let jpgCount = 0;
  let webpCount = 0;
  let otherCount = 0;

  let transparentCount = 0;
  let convertedCount = 0;
  let unchangedCount = 0;

  let currentTotalBytes = 0;
  let currentMinBytes = Infinity;
  let currentMaxBytes = 0;

  let projectedTotalBytes = 0;
  let projectedMinBytes = Infinity;
  let projectedMaxBytes = 0;

  for (const img of analyzedImages) {
    const ext = img.extension.toLowerCase();
    const fmt = img.currentFormat.toLowerCase();

    if (ext === "png" || fmt === "png") pngCount++;
    else if (ext === "jpg" || ext === "jpeg" || fmt === "jpeg") jpgCount++;
    else if (ext === "webp" || fmt === "webp") webpCount++;
    else otherCount++;

    if (img.hasActualTransparency || img.hasAlpha) {
      transparentCount++;
    }

    if (img.wouldConvert) convertedCount++;
    else unchangedCount++;

    currentTotalBytes += img.currentSizeBytes;
    if (img.currentSizeBytes < currentMinBytes) currentMinBytes = img.currentSizeBytes;
    if (img.currentSizeBytes > currentMaxBytes) currentMaxBytes = img.currentSizeBytes;

    projectedTotalBytes += img.projectedSizeBytes;
    if (img.projectedSizeBytes < projectedMinBytes) projectedMinBytes = img.projectedSizeBytes;
    if (img.projectedSizeBytes > projectedMaxBytes) projectedMaxBytes = img.projectedSizeBytes;
  }

  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + " MB";
  const formatKB = (bytes: number) => (bytes / 1024).toFixed(1) + " KB";
  const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? formatMB(bytes) : formatKB(bytes));

  const currentAvgBytes = totalInspected > 0 ? currentTotalBytes / totalInspected : 0;
  const projectedAvgBytes = totalInspected > 0 ? projectedTotalBytes / totalInspected : 0;
  const totalReductionBytes = currentTotalBytes - projectedTotalBytes;
  const totalReductionPercent = currentTotalBytes > 0 ? ((totalReductionBytes / currentTotalBytes) * 100).toFixed(2) : "0";

  console.log("\n================================================================================");
  console.log("REPORT — PHASE 1 DRY RUN OPTIMIZATION SUMMARY");
  console.log("================================================================================");
  console.log(`Total product image records: ${totalRecords}`);
  console.log(`Total Storage objects inspected: ${totalInspected}`);
  console.log(`PNG count: ${pngCount}`);
  console.log(`JPG/JPEG count: ${jpgCount}`);
  console.log(`WEBP count: ${webpCount}`);
  if (otherCount > 0) console.log(`Other format count: ${otherCount}`);
  console.log("");
  console.log("Current:");
  console.log(`- minimum size: ${formatSize(currentMinBytes)} (${currentMinBytes.toLocaleString()} bytes)`);
  console.log(`- maximum size: ${formatSize(currentMaxBytes)} (${currentMaxBytes.toLocaleString()} bytes)`);
  console.log(`- average size: ${formatSize(currentAvgBytes)} (${Math.round(currentAvgBytes).toLocaleString()} bytes)`);
  console.log(`- total storage size: ${formatMB(currentTotalBytes)} (${currentTotalBytes.toLocaleString()} bytes)`);
  console.log("");
  console.log("Projected after optimization:");
  console.log(`- estimated minimum: ${formatSize(projectedMinBytes)} (${projectedMinBytes.toLocaleString()} bytes)`);
  console.log(`- estimated maximum: ${formatSize(projectedMaxBytes)} (${projectedMaxBytes.toLocaleString()} bytes)`);
  console.log(`- estimated average: ${formatSize(projectedAvgBytes)} (${Math.round(projectedAvgBytes).toLocaleString()} bytes)`);
  console.log(`- estimated total storage: ${formatMB(projectedTotalBytes)} (${projectedTotalBytes.toLocaleString()} bytes)`);
  console.log(`- estimated percentage reduction: ${totalReductionPercent}% (${formatMB(totalReductionBytes)} saved)`);
  console.log("");
  console.log(`How many images contain transparency: ${transparentCount}`);
  console.log(`How many images would be converted: ${convertedCount}`);
  console.log(`How many would be left unchanged: ${unchangedCount}`);
  console.log("");
  console.log("================================================================================");
  console.log("DRY RUN ONLY — NO DATABASE OR STORAGE CHANGES MADE.");
  console.log("================================================================================");
}

runDryRun().catch((err) => {
  console.error("Dry run execution error:", err);
  process.exit(1);
});
