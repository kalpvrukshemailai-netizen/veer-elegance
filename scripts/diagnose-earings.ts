import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        process.env[key] = val;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("=== DIAGNOSING EARINGS-03 ===");
  
  // 1. Fetch products row for earings-03
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("*")
    .eq("slug", "earings-03")
    .single();

  console.log("PRODUCT ROW:");
  console.log(JSON.stringify(product, null, 2));
  console.log("PRODUCT ERROR:", pErr);

  if (product) {
    // 2. Fetch product_images rows for earings-03
    const { data: images, error: imgErr } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", product.id)
      .order("sort_order", { ascending: true });

    console.log("PRODUCT_IMAGES ROWS:");
    console.log(JSON.stringify(images, null, 2));
    console.log("PRODUCT_IMAGES ERROR:", imgErr);

    // 3. Test HTTP reachable for product.image_url and product_images public_url
    if (product.image_url) {
      try {
        const res = await fetch(product.image_url);
        console.log(`HTTP check for product.image_url (${product.image_url}): status ${res.status}`);
      } catch (err: any) {
        console.log(`HTTP check for product.image_url failed: ${err.message}`);
      }
    }

    if (images && images.length > 0) {
      for (const img of images) {
        if (img.public_url) {
          try {
            const res = await fetch(img.public_url);
            console.log(`HTTP check for product_images.public_url (${img.public_url}): status ${res.status}`);
          } catch (err: any) {
            console.log(`HTTP check for product_images.public_url failed: ${err.message}`);
          }
        }
      }
    }
  }

  // Also check 3 other products: bangles-15, bracelets-47, chain-10
  console.log("\n=== CHECKING OTHER SAMPLE PRODUCTS ===");
  for (const slug of ["bangles-15", "bracelets-47", "chain-10"]) {
    const { data: p } = await supabase
      .from("products")
      .select("id, slug, name, image_url")
      .eq("slug", slug)
      .single();
    
    if (p) {
      const { data: imgs } = await supabase
        .from("product_images")
        .select("id, public_url, sort_order")
        .eq("product_id", p.id);
      console.log(`\nProduct [${slug}]:`);
      console.log(`  products.image_url: ${p.image_url}`);
      console.log(`  product_images count: ${imgs?.length}`);
      if (imgs && imgs.length > 0) {
        for (const im of imgs) {
          console.log(`    img (sort ${im.sort_order}): ${im.public_url}`);
        }
      }
    } else {
      console.log(`\nProduct [${slug}]: NOT FOUND`);
    }
  }
}

main();
