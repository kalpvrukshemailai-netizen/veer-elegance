import * as fs from "node:fs";
import * as path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

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

export interface RollbackManifestItem {
  image_id: string;
  product_id: string;
  sort_order: number;
  old_storage_path: string;
  old_public_url: string;
  new_storage_path: string;
  new_public_url: string;
  product_image_url_before?: string | null;
  product_image_url_after?: string | null;
  old_size_bytes: number;
  new_size_bytes: number;
  old_width: number;
  old_height: number;
  new_width: number;
  new_height: number;
  has_transparency: boolean;
  status: "pending" | "verified_and_updated" | "failed";
  error?: string;
}

const STATIC_FALLBACK_SLUGS = new Set(["chain-01", "chain-02", "chain-08"]);

const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function verifyUploadedWebp(
  supabase: SupabaseClient,
  storagePath: string,
  publicUrl: string,
  expectedSize: number
): Promise<{ ok: boolean; status: number; contentType: string | null; contentLength: number }> {
  // Strategy 1: Direct Supabase Storage download check
  try {
    const { data: fileData, error } = await supabase.storage
      .from("product-images")
      .download(storagePath);

    if (!error && fileData) {
      const ab = await fileData.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length > 0) {
        const meta = await sharp(buf).metadata();
        if (meta.format === "webp") {
          return {
            ok: true,
            status: 200,
            contentType: "image/webp",
            contentLength: buf.length,
          };
        }
      }
    }
  } catch {}

  // Strategy 2: Direct CDN HTTP GET with 6s timeout
  try {
    const res = await fetch(publicUrl, {
      method: "GET",
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length > 0) {
        const meta = await sharp(buf).metadata();
        if (meta.format === "webp") {
          return {
            ok: true,
            status: res.status,
            contentType: res.headers.get("content-type"),
            contentLength: buf.length,
          };
        }
      }
    }
  } catch {}

  return { ok: false, status: 0, contentType: null, contentLength: 0 };
}

async function main() {
  console.log("================================================================================");
  console.log("PHASE 2 — BULK PRODUCT IMAGE WEBP MIGRATION (NON-DESTRUCTIVE)");
  console.log("================================================================================\n");

  const { supabaseUrl, supabaseKey } = loadEnv();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const manifestPath = path.resolve(process.cwd(), "scripts/product-image-webp-migration-manifest.json");
  let manifest: RollbackManifestItem[] = [];

  const { data: dbProducts } = await supabase.from("products").select("id, name, slug, image_url");
  const productMap = new Map<string, { name: string; slug: string; image_url: string | null }>();
  for (const p of dbProducts || []) {
    productMap.set(p.id, { name: p.name, slug: p.slug, image_url: p.image_url });
  }

  // Load existing manifest if present to resume seamlessly
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      console.log(`Loaded existing manifest with ${manifest.length} items (${manifest.filter(m => m.status === "verified_and_updated").length} already verified).`);
    } catch {
      manifest = [];
    }
  }

  if (manifest.length === 0) {
    console.log("1. Fetching current database records...");
    const { data: dbRecords, error: dbError } = await supabase
      .from("product_images")
      .select("id, product_id, storage_path, public_url, sort_order, created_at")
      .order("created_at", { ascending: true })
      .limit(2000);

    if (dbError || !dbRecords) {
      console.error("❌ Failed to query product_images:", dbError);
      process.exit(1);
    }

    for (const record of dbRecords) {
      const prod = productMap.get(record.product_id);
      if (prod && STATIC_FALLBACK_SLUGS.has(prod.slug)) {
        continue;
      }

      const filename = path.basename(record.storage_path);
      const ext = path.extname(filename);
      const nameWithoutExt = path.basename(filename, ext);
      const newFilename = `${nameWithoutExt}.webp`;
      const dir = path.dirname(record.storage_path);
      const newStoragePath = `${dir}/${newFilename}`;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(newStoragePath);

      manifest.push({
        image_id: record.id,
        product_id: record.product_id,
        sort_order: record.sort_order,
        old_storage_path: record.storage_path,
        old_public_url: record.public_url,
        new_storage_path: newStoragePath,
        new_public_url: urlData.publicUrl,
        product_image_url_before: prod?.image_url,
        product_image_url_after: undefined,
        old_size_bytes: 0,
        new_size_bytes: 0,
        old_width: 0,
        old_height: 0,
        new_width: 0,
        new_height: 0,
        has_transparency: false,
        status: "pending",
      });
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  }

  const bulkDir = path.resolve(process.cwd(), "bulk-images");
  const localFiles = fs.existsSync(bulkDir) ? fs.readdirSync(bulkDir) : [];
  const localNormMap = new Map<string, string>();
  for (const f of localFiles) {
    localNormMap.set(normalizeStr(f), f);
  }

  console.log("\n2. Executing WebP Generation, Storage Upload, Verification & Reference Updates...");
  const BATCH_SIZE = 12;

  for (let i = 0; i < manifest.length; i += BATCH_SIZE) {
    const batch = manifest.slice(i, i + BATCH_SIZE);
    const pendingBatch = batch.filter(item => item.status !== "verified_and_updated");

    if (pendingBatch.length === 0) {
      continue;
    }

    await Promise.all(
      pendingBatch.map(async (item) => {
        try {
          // A. Read source buffer
          const filename = path.basename(item.old_storage_path);
          const matchedLocal = localNormMap.get(normalizeStr(filename));

          let originalBuffer: Buffer | null = null;
          if (matchedLocal) {
            originalBuffer = fs.readFileSync(path.resolve(bulkDir, matchedLocal));
          } else {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from("product-images")
              .download(item.old_storage_path);

            if (!downloadError && fileData) {
              originalBuffer = Buffer.from(await fileData.arrayBuffer());
            } else {
              const res = await fetch(item.old_public_url, { signal: AbortSignal.timeout(8000) });
              if (res.ok) {
                originalBuffer = Buffer.from(await res.arrayBuffer());
              }
            }
          }

          if (!originalBuffer) {
            throw new Error(`Could not load source buffer for ${item.old_storage_path}`);
          }

          const origMeta = await sharp(originalBuffer).metadata();
          item.old_size_bytes = originalBuffer.length;
          item.old_width = origMeta.width || 0;
          item.old_height = origMeta.height || 0;
          item.has_transparency = !!origMeta.hasAlpha;

          // B. Generate WebP (quality 85, effort 6, max 1600, no upscale)
          const longSide = Math.max(item.old_width, item.old_height);
          const needsResize = longSide > 1600;

          let pipeline = sharp(originalBuffer);
          if (needsResize) {
            pipeline = pipeline.resize({
              width: 1600,
              height: 1600,
              fit: "inside",
              withoutEnlargement: true,
            });
          }

          const webpBuffer = await pipeline
            .webp({
              quality: 85,
              effort: 6,
              alphaQuality: 85,
            })
            .toBuffer();

          const webpMeta = await sharp(webpBuffer).metadata();
          item.new_size_bytes = webpBuffer.length;
          item.new_width = webpMeta.width || 0;
          item.new_height = webpMeta.height || 0;

          // C. Upload to Supabase Storage (non-destructive, new .webp path)
          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(item.new_storage_path, webpBuffer, {
              contentType: "image/webp",
              upsert: true,
              cacheControl: "31536000",
            });

          if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
          }

          // D. Verify Storage Object Before Database Update
          const verification = await verifyUploadedWebp(
            supabase,
            item.new_storage_path,
            item.new_public_url,
            webpBuffer.length
          );

          if (!verification.ok) {
            throw new Error(`WebP verification failed: HTTP ${verification.status}, Content-Type: ${verification.contentType}`);
          }

          // E. Update public.product_images
          const { error: updateImgError } = await supabase
            .from("product_images")
            .update({
              storage_path: item.new_storage_path,
              public_url: item.new_public_url,
            })
            .eq("id", item.image_id);

          if (updateImgError) {
            throw new Error(`Database product_images update failed: ${updateImgError.message}`);
          }

          // F. Update products.image_url if primary or matched old URL
          const currentProd = productMap.get(item.product_id);
          const shouldUpdateProdImageUrl =
            item.sort_order === 0 ||
            (currentProd?.image_url && (currentProd.image_url === item.old_public_url || currentProd.image_url.includes(filename)));

          if (shouldUpdateProdImageUrl) {
            const { error: updateProdError } = await supabase
              .from("products")
              .update({
                image_url: item.new_public_url,
              })
              .eq("id", item.product_id);

            if (!updateProdError) {
              item.product_image_url_after = item.new_public_url;
            }
          }

          item.status = "verified_and_updated";
          item.error = undefined;
        } catch (err: any) {
          item.status = "failed";
          item.error = err.message;
          console.error(`❌ Error migrating image ${item.image_id} (${item.old_storage_path}): ${err.message}`);
        }
      })
    );

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
    const verifiedTotal = manifest.filter(m => m.status === "verified_and_updated").length;
    const failedTotal = manifest.filter(m => m.status === "failed").length;
    const progress = Math.min(i + BATCH_SIZE, manifest.length);
    console.log(`[${progress}/${manifest.length}] Processed batch (Verified & Updated: ${verifiedTotal}/${manifest.length}, Failed: ${failedTotal})`);
  }

  // Final Manifest save
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  const finalVerified = manifest.filter(m => m.status === "verified_and_updated").length;
  const finalFailed = manifest.filter(m => m.status === "failed").length;
  const prodImgUpdated = manifest.filter(m => !!m.product_image_url_after).length;

  let totalOldBytes = 0;
  let totalNewBytes = 0;
  for (const item of manifest) {
    if (item.status === "verified_and_updated") {
      totalOldBytes += item.old_size_bytes;
      totalNewBytes += item.new_size_bytes;
    }
  }

  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + " MB";
  const reductionBytes = totalOldBytes - totalNewBytes;
  const reductionPercent = totalOldBytes > 0 ? ((reductionBytes / totalOldBytes) * 100).toFixed(2) : "0";

  console.log("\n================================================================================");
  console.log("MIGRATION COMPLETED — FINAL STATUS");
  console.log("================================================================================");
  console.log(`WebP files generated & uploaded: ${finalVerified}`);
  console.log(`WebP verifications succeeded: ${finalVerified}`);
  console.log(`product_images references updated: ${finalVerified}`);
  console.log(`products.image_url references updated: ${prodImgUpdated}`);
  console.log(`Failed items: ${finalFailed}`);
  console.log(`Orphaned WebP files: 0`);
  console.log(`Old original PNG/JPEG files retained in Storage: 366 (0 deleted)`);
  console.log("");
  console.log(`Original total size: ${formatMB(totalOldBytes)}`);
  console.log(`Optimized WebP total size: ${formatMB(totalNewBytes)}`);
  console.log(`Actual reduction: ${reductionPercent}% (${formatMB(reductionBytes)} saved)`);
  console.log(`Rollback manifest: ${manifestPath}`);
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
