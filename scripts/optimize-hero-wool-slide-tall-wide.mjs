/**
 * 3e slide hero (laine) : source tall → mobile ; source wide → desktop.
 */
import sharp from "sharp";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "images", "catalog");

const TALL =
  process.env.WOOL_TALL ||
  "C:\\Users\\joeba\\Desktop\\New folder (2)\\tall hero wool.jpeg";
const WIDE =
  process.env.WOOL_WIDE ||
  "C:\\Users\\joeba\\Desktop\\New folder (2)\\wool hero wide.jpeg";

const BASE = "hero-tapis-laine-wool-quebec";

const q = 78;
const effort = 5;

async function main() {
  if (!existsSync(TALL) || !existsSync(WIDE)) {
    console.error("Sources introuvables.");
    process.exit(1);
  }

  const tall800 = join(outDir, `${BASE}-tall-portrait-800.webp`);
  const tall1600 = join(outDir, `${BASE}-tall-portrait-1600.webp`);
  await sharp(TALL)
    .rotate()
    .resize({ width: 800, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: q, effort })
    .toFile(tall800);
  await sharp(TALL)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: q, effort })
    .toFile(tall1600);

  const wideMain = join(outDir, `${BASE}-wide.webp`);
  const wide800 = join(outDir, `${BASE}-wide-800.webp`);
  await sharp(WIDE)
    .rotate()
    .resize({ width: 1920, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: q, effort })
    .toFile(wideMain);
  await sharp(WIDE)
    .rotate()
    .resize({ width: 800, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: q, effort })
    .toFile(wide800);

  const m = await sharp(wideMain).metadata();
  console.log("Wide:", m.width, "x", m.height);
  const t = await sharp(tall800).metadata();
  console.log("Tall 800:", t.width, "x", t.height);
  console.log("OK", BASE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
