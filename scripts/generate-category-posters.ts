import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import sharp from "sharp";

const VIDEOS = [
  { id: "chains", file: "chain-rain.mp4", poster: "poster-chain-rain.webp" },
  { id: "rings", file: "ring-waterfall.mp4", poster: "poster-ring-waterfall.webp" },
  { id: "earrings", file: "earrings-rain.mp4", poster: "poster-earrings-rain.webp" },
  { id: "bracelets", file: "bracelet-ocean.mp4", poster: "poster-bracelet-ocean.webp" },
  { id: "bangles", file: "halo.mp4", poster: "poster-halo.webp" },
  { id: "mystery-box", file: "unknown.mp4", poster: "poster-unknown.webp" },
  { id: "gen-z-accessories", file: "rebel.mp4", poster: "poster-rebel.webp" },
];

async function main() {
  console.log("================================================================================");
  console.log("GENERATING LIGHTWEIGHT WEBP POSTERS FROM CATEGORY VIDEOS (via QuickLook & Sharp)");
  console.log("================================================================================\n");

  const targetDir = path.resolve(process.cwd(), "public/images/categories");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const tmpDir = path.resolve(process.cwd(), ".tmp-posters");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  for (const item of VIDEOS) {
    const videoPath = path.resolve(process.cwd(), "public/videos/products", item.file);
    const outputWebpPath = path.resolve(targetDir, item.poster);

    console.log(`Extracting frame for: ${item.file}...`);

    // Use native macOS QuickLook thumbnail generator
    execSync(`qlmanage -t -s 600 -o "${tmpDir}" "${videoPath}"`, { stdio: "ignore" });

    const generatedPngName = `${item.file}.png`;
    const generatedPngPath = path.resolve(tmpDir, generatedPngName);

    if (!fs.existsSync(generatedPngPath)) {
      throw new Error(`Failed to generate thumbnail for ${item.file}`);
    }

    const pngBuffer = fs.readFileSync(generatedPngPath);
    const webpBuffer = await sharp(pngBuffer)
      .resize({
        width: 480,
        height: 480,
        fit: "cover",
        position: "center",
      })
      .webp({
        quality: 85,
        effort: 6,
      })
      .toBuffer();

    fs.writeFileSync(outputWebpPath, webpBuffer);
    console.log(`✓ Saved ${item.poster} (${(webpBuffer.length / 1024).toFixed(1)} KB)`);

    fs.unlinkSync(generatedPngPath);
  }

  // Cleanup tmp dir and any leftovers
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  const leftover = path.resolve(targetDir, "chain-rain.mp4.png");
  if (fs.existsSync(leftover)) fs.unlinkSync(leftover);

  console.log("\n================================================================================");
  console.log("ALL 7 WEBP POSTERS CREATED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

main().catch(err => {
  console.error("Poster generation error:", err);
  process.exit(1);
});
