import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["\x27]|["\x27]$/g, "");
      process.env[key] = val;
    }
  }
}

const verifiedUrlCache = new Map<string, boolean>();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function verifyUrl(url: string, description: string): Promise<boolean> {
  if (verifiedUrlCache.has(url)) {
    return verifiedUrlCache.get(url)!;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        const contentLength = res.headers.get("content-length") || "";
        console.log(`  ✓ [${description}] HTTP ${res.status} (${contentType}, ${contentLength} bytes): ${url}`);
        verifiedUrlCache.set(url, true);
        return true;
      }
    } catch {
      if (attempt < 3) await sleep(200);
    }
  }

  console.error(`  ❌ [${description}] FAILED to fetch: ${url}`);
  verifiedUrlCache.set(url, false);
  return false;
}

async function verifyPage(url: string, pageName: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      console.error(`❌ [${pageName}] HTTP ${res.status} for ${url}`);
      return false;
    }
    const html = await res.text();
    console.log(`✓ [${pageName}] Loaded HTML (${html.length} bytes)`);

    // Extract image sources
    const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)].map(m => m[1]);
    const nextImgMatches = [...html.matchAll(/"image":"([^"]+)"/g)].map(m => m[1].replace(/\\u0026/g, "&"));
    const srcSetMatches = [...html.matchAll(/srcset=["']([^"']+)["']/g)].flatMap(m =>
      m[1].split(",").map(s => s.trim().split(" ")[0])
    );

    const rawUrls = Array.from(new Set([...imgMatches, ...nextImgMatches, ...srcSetMatches]));
    const allUrls = rawUrls.map(u => {
      if (u.startsWith("/_next/image") || u.startsWith("http://localhost:3000/_next/image")) {
        try {
          const parsed = new URL(u, "http://localhost:3000");
          const target = parsed.searchParams.get("url");
          if (target) return target;
        } catch {}
      }
      return u;
    });

    const uniqueUrls = Array.from(new Set(allUrls)).filter(
      u => u.startsWith("http") || u.startsWith("/images/")
    );
    console.log(`   Found ${uniqueUrls.length} unique image reference(s):`);

    let pageAllOk = true;
    const CONCURRENCY = 4;
    for (let i = 0; i < uniqueUrls.length; i += CONCURRENCY) {
      const batch = uniqueUrls.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async imgUrl => {
          const fullUrl = imgUrl.startsWith("http") ? imgUrl : `http://localhost:3000${imgUrl}`;
          return verifyUrl(fullUrl, `${pageName}`);
        })
      );
      if (results.some(r => !r)) pageAllOk = false;
      await sleep(20);
    }
    return pageAllOk;
  } catch (err: any) {
    console.error(`❌ [${pageName}] Failed to fetch page: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("================================================================================");
  console.log("STOREFRONT IMAGE RESOLUTION & HTTP STATUS VERIFICATION");
  console.log("================================================================================\n");

  const baseUrl = "http://localhost:3000";

  const pagesToTest = [
    { url: `${baseUrl}/`, name: "Home: /" },
    { url: `${baseUrl}/shop`, name: "Shop All: /shop" },
    { url: `${baseUrl}/collections`, name: "Collections: /collections" },
    { url: `${baseUrl}/shop/chains`, name: "Category: Chains (/shop/chains)" },
    { url: `${baseUrl}/shop/earrings`, name: "Category: Earrings (/shop/earrings)" },
    { url: `${baseUrl}/shop/bracelets`, name: "Category: Bracelets (/shop/bracelets)" },
    { url: `${baseUrl}/shop/bangles`, name: "Category: Bangles (/shop/bangles)" },
    { url: `${baseUrl}/shop/gen-z-accessories`, name: "Category: Gen-Z (/shop/gen-z-accessories)" },
    { url: `${baseUrl}/product/chain-01`, name: "PDP: /product/chain-01 (Static fallback)" },
    { url: `${baseUrl}/product/earings-03`, name: "PDP: /product/earings-03 (Migrated WebP)" },
    { url: `${baseUrl}/product/bracelets-47`, name: "PDP: /product/bracelets-47 (Migrated WebP)" },
    { url: `${baseUrl}/product/chain-10`, name: "PDP: /product/chain-10 (Migrated WebP)" },
  ];

  let totalOk = true;
  for (const p of pagesToTest) {
    console.log(`\n--- Testing ${p.name} ---`);
    const ok = await verifyPage(p.url, p.name);
    if (!ok) totalOk = false;
  }

  console.log("\n================================================================================");
  if (totalOk) {
    console.log("✓ ALL STOREFRONT PAGES AND PRODUCT IMAGES VERIFIED WITH HTTP 200 (ZERO ERRORS)");
  } else {
    console.log("❌ SOME STOREFRONT CHECKS FAILED!");
  }
  console.log("================================================================================\n");
}

main();
