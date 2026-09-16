import * as fs from "fs";
import * as path from "path";
import { CATEGORIES } from "@/data/categories";

async function main() {
  console.log("================================================================================");
  console.log("HOMEPAGE VIDEO OPTIMIZATION VERIFICATION SUITE (TASK 40C)");
  console.log("================================================================================\n");

  // ── 1. Check generated poster files ──────────────────────────────────────────
  console.log("--- 1. Checking Static WebP Posters ---");
  const posterDir = path.resolve(process.cwd(), "public/images/categories");
  if (!fs.existsSync(posterDir)) {
    throw new Error("❌ Poster directory does not exist!");
  }

  let totalPosterBytes = 0;
  for (const cat of CATEGORIES) {
    if (!cat.poster) {
      throw new Error(`❌ Category ${cat.id} has no poster defined!`);
    }
    const posterPath = path.resolve(process.cwd(), "public", cat.poster.replace(/^\//, ""));
    if (!fs.existsSync(posterPath)) {
      throw new Error(`❌ Poster file missing: ${posterPath}`);
    }
    const stats = fs.statSync(posterPath);
    totalPosterBytes += stats.size;
    console.log(`  ✓ [${cat.id}] ${cat.poster} (${(stats.size / 1024).toFixed(1)} KB)`);
  }
  console.log(`\n  Total poster bundle size for all 7 categories: ${(totalPosterBytes / 1024).toFixed(1)} KB`);

  // ── 2. Check SSR Homepage HTML ───────────────────────────────────────────────
  console.log("\n--- 2. Checking SSR Homepage HTML ---");
  const res = await fetch("http://localhost:3000/");
  if (!res.ok) {
    throw new Error(`Failed to fetch homepage: HTTP ${res.status}`);
  }
  const html = await res.text();

  const videoMatches = [...html.matchAll(/<video[^>]*>([\s\S]*?)<\/video>/g)];
  console.log(`  Total <video> elements in SSR HTML: ${videoMatches.length}`);
  videoMatches.forEach((v, idx) => {
    const srcMatch = v[1].match(/src="([^"]+)"/);
    console.log(`    Video #${idx + 1}: src=${srcMatch ? srcMatch[1] : "unknown"}`);
  });

  const posterImgMatches = [...html.matchAll(/<img[^>]*src="([^"]*poster-[^"]*)"[^>]*>/g)];
  console.log(`  Total Poster <img> elements in SSR HTML: ${posterImgMatches.length}`);
  posterImgMatches.forEach((m, idx) => {
    console.log(`    Poster #${idx + 1}: src=${m[1]}`);
  });

  if (videoMatches.length !== 1) {
    throw new Error(`❌ Expected exactly 1 video element in SSR HTML (Spotlight), found ${videoMatches.length}`);
  }
  if (posterImgMatches.length !== 7) {
    throw new Error(`❌ Expected exactly 7 poster images in SSR HTML, found ${posterImgMatches.length}`);
  }

  // ── 3. Check Hero Section Preload & Client Configuration ────────────────────
  console.log("\n--- 3. Checking Hero Section Preload & Client Configuration ---");
  const heroSectionPath = path.resolve(process.cwd(), "components/sections/HeroSection.tsx");
  const heroContent = fs.readFileSync(heroSectionPath, "utf-8");
  if (!heroContent.includes('preload="metadata"')) {
    throw new Error("❌ HeroSection does not use preload=\"metadata\"");
  }
  console.log("  ✓ HeroSection configured with preload=\"metadata\"");

  // ── 4. Verify Responsive CSS Layouts ─────────────────────────────────────────
  console.log("\n--- 4. Checking Responsive Layout Classes in globals.css ---");
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  const expectedClasses = [
    ".explorer-layout-wrapper",
    ".explorer-active-wrapper",
    ".explorer-separator",
    ".explorer-inactive-grid",
    ".explorer-inactive-item",
    ".spotlight-wrapper",
    ".spotlight-video-col",
    ".spotlight-content-col",
  ];

  for (const cls of expectedClasses) {
    if (!cssContent.includes(cls)) {
      throw new Error(`❌ Missing CSS class in globals.css: ${cls}`);
    }
    console.log(`  ✓ Found responsive class: ${cls}`);
  }

  console.log("\n================================================================================");
  console.log("ALL HOMEPAGE VIDEO OPTIMIZATION VERIFICATIONS PASSED (100%)");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
