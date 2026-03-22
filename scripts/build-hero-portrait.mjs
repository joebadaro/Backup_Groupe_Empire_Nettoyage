/**
 * Regenerate mobile hero portrait WebP from source JPEGs.
 * Edit SOURCE_PATHS below, then: node scripts/build-hero-portrait.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const OUT = {
  slide1: {
    full: "public/images/catalog/hero-tapis-commercial-bureau-quebec-portrait.webp",
    w800: "public/images/catalog/hero-tapis-commercial-bureau-quebec-portrait-800.webp",
  },
  slide2: {
    full: "public/images/catalog/hero-salon-nettoyage-vapeur-montreal-portrait.webp",
    w800: "public/images/catalog/hero-salon-nettoyage-vapeur-montreal-portrait-800.webp",
  },
};

// Update these paths to your source files (JPEG/PNG/WebP).
const SOURCE_PATHS = {
  slide1: path.join(root, "public/images/catalog/_source/hero-portrait-slide1.jpg"),
  slide2: path.join(root, "public/images/catalog/_source/hero-portrait-slide2.jpg"),
};

async function buildOne(srcPath, outFull, out800) {
  if (!fs.existsSync(srcPath)) {
    console.warn("Skip (missing):", srcPath);
    return;
  }
  const dir = path.dirname(path.join(root, outFull));
  await fs.promises.mkdir(dir, { recursive: true });
  await sharp(srcPath)
    .webp({ quality: 82, effort: 6 })
    .toFile(path.join(root, outFull));
  await sharp(srcPath)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(path.join(root, out800));
  const m = await sharp(path.join(root, outFull)).metadata();
  console.log("OK", outFull, `${m.width}x${m.height}`);
}

await buildOne(SOURCE_PATHS.slide1, OUT.slide1.full, OUT.slide1.w800);
await buildOne(SOURCE_PATHS.slide2, OUT.slide2.full, OUT.slide2.w800);
