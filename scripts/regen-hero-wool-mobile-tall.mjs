/**
 * Régénère uniquement les WebP mobile (≤768px source) de la 3e slide laine.
 * Desktop wide inchangé.
 */
import sharp from "sharp";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "images", "catalog");

const SOURCE =
  process.env.WOOL_MOBILE ||
  "C:\\Users\\joeba\\Desktop\\New folder (2)\\woolhero tall zoom out cell.jpeg";

const BASE = "hero-tapis-laine-wool-quebec-tall-portrait";

/** Ratio largeur/hauteur aligné sur le hero mobile (global.css : ~390×717) pour que cover recadre surtout en hauteur, pas sur les côtés. */
const MOBILE_HERO_ASPECT = 390 / 717;

async function main() {
  if (!existsSync(SOURCE)) {
    console.error("Source introuvable:", SOURCE);
    process.exit(1);
  }

  const q = 78;
  const effort = 5;

  const w800 = 800;
  const h800 = Math.round(w800 / MOBILE_HERO_ASPECT);
  const w1600 = 1600;
  const h1600 = Math.round(w1600 / MOBILE_HERO_ASPECT);

  const pipeline = (outW, outH) =>
    sharp(SOURCE)
      .rotate()
      .resize({
        width: outW,
        height: outH,
        fit: "cover",
        // Scène salon + fenêtres + marches : centré légèrement vers le haut pour favoriser la partie haute de la pièce
        position: "attention",
      })
      .webp({ quality: q, effort });

  await pipeline(w800, h800).toFile(join(outDir, `${BASE}-800.webp`));
  await pipeline(w1600, h1600).toFile(join(outDir, `${BASE}-1600.webp`));

  const m = await sharp(join(outDir, `${BASE}-800.webp`)).metadata();
  console.log("800w:", m.width, "x", m.height);
  const m2 = await sharp(join(outDir, `${BASE}-1600.webp`)).metadata();
  console.log("1600w:", m2.width, "x", m2.height);
  console.log("OK — mêmes noms de fichiers (remplacement mobile uniquement)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
