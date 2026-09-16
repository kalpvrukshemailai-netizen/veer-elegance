import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

async function rollback() {
  console.log("================================================================================");
  console.log("ROLLBACK SCRIPT — REVERTING TO ORIGINAL PRODUCT IMAGE REFERENCES");
  console.log("================================================================================\n");

  const manifestPath = path.resolve(process.cwd(), "scripts/product-image-webp-migration-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifest not found at: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  console.log(`Loaded ${manifest.length} manifest items.`);

  const { supabaseUrl, supabaseKey } = loadEnv();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  let revertedImagesCount = 0;
  let revertedProductsCount = 0;

  for (let i = 0; i < manifest.length; i++) {
    const item = manifest[i];

    // Revert product_images
    const { error: imgErr } = await supabase
      .from("product_images")
      .update({
        storage_path: item.old_storage_path,
        public_url: item.old_public_url,
      })
      .eq("id", item.image_id);

    if (imgErr) {
      console.error(`Failed to revert product_images id ${item.image_id}:`, imgErr);
    } else {
      revertedImagesCount++;
    }

    // Revert products.image_url if it was changed
    if (item.product_image_url_before) {
      const { error: prodErr } = await supabase
        .from("products")
        .update({
          image_url: item.product_image_url_before,
        })
        .eq("id", item.product_id);

      if (prodErr) {
        console.error(`Failed to revert products id ${item.product_id}:`, prodErr);
      } else {
        revertedProductsCount++;
      }
    }
  }

  console.log("\n================================================================================");
  console.log("ROLLBACK COMPLETED");
  console.log(`Reverted product_images records: ${revertedImagesCount}`);
  console.log(`Reverted products.image_url records: ${revertedProductsCount}`);
  console.log("================================================================================\n");
}

rollback().catch((err) => {
  console.error("Rollback error:", err);
  process.exit(1);
});
