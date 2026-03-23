/**
 * One-shot: génère les variantes WebP du 3e hero depuis le JPEG source (chemin absolu).
 * Usage: node scripts/optimize-hero-slide-3.mjs
 */
import sharp from "sharp";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "images", "catalog");

const SOURCE =
  process.env.HERO3_SOURCE ||
  "C:\\Users\\joeba\\Desktop\\New folder (2)\\iphone home page2 .jpeg";

const BASE = "hero-salon-prestige-tapis-residentiel-quebec";

async function main() {
  if (!existsSync(SOURCE)) {
    console.error("Source introuvable:", SOURCE);
    process.exit(1);
  }

  const meta = await sharp(SOURCE).metadata();
  console.log("Source:", meta.width, "x", meta.height, meta.format);

  const q = 82;
  const effort = 4;

  // Desktop principal (aligné hero-slide-2 : max 1920 de large)
  const desktop = sharp(SOURCE)
    .resize({ width: 1920, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: q, effort });
  const desktopPath = join(outDir, `${BASE}.webp`);
  await desktop.toFile(desktopPath);
  const dMeta = await sharp(desktopPath).metadata();
  console.log("Written:", desktopPath, dMeta.width, "x", dMeta.height);

  // Mobile 800w (même logique que hero-slide-*-mobile)
  await sharp(SOURCE)
    .resize({ width: 800, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: q, effort })
    .toFile(join(outDir, `${BASE}-mobile.webp`));

  // Portrait ≤768px (source + picture) — 800w et 1600w comme les autres heroes
  await sharp(SOURCE)
    .resize({ width: 800, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: q, effort })
    .toFile(join(outDir, `${BASE}-portrait-800.webp`));

  await sharp(SOURCE)
    .resize({ width: 1600, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: q, effort })
    .toFile(join(outDir, `${BASE}-portrait.webp`));

  console.log("OK — variantes:", BASE + ".webp", BASE + "-mobile.webp", BASE + "-portrait*.webp");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
