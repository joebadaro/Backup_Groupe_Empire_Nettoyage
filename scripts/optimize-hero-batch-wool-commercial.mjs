/**
 * Génère les variantes WebP pour 3 nouvelles images hero (chemins absolus Windows).
 */
import sharp from "sharp";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "images", "catalog");

const JOBS = [
  {
    input:
      "C:\\Users\\joeba\\Desktop\\New folder (2)\\wool hero.jpeg",
    base: "hero-tapis-laine-wool-nettoyage-quebec",
  },
  {
    input:
      "C:\\Users\\joeba\\Desktop\\New folder (2)\\comercial2.jpeg",
    base: "hero-commercial-bureau-espace2-quebec",
  },
  {
    input:
      "C:\\Users\\joeba\\Desktop\\New folder (2)\\comercial3.jpeg",
    base: "hero-commercial-bureau-espace3-quebec",
  },
];

const q = 80;
const effort = 5;

async function processOne(sourcePath, baseName) {
  if (!existsSync(sourcePath)) {
    throw new Error("Fichier introuvable: " + sourcePath);
  }

  const pipeline = (w) =>
    sharp(sourcePath)
      .rotate()
      .resize({ width: w, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: q, effort });

  await pipeline(1920).toFile(join(outDir, `${baseName}.webp`));
  await pipeline(800).toFile(join(outDir, `${baseName}-mobile.webp`));
  await pipeline(800).toFile(join(outDir, `${baseName}-portrait-800.webp`));
  await pipeline(1600).toFile(join(outDir, `${baseName}-portrait.webp`));

  const main = await sharp(join(outDir, `${baseName}.webp`)).metadata();
  return { width: main.width, height: main.height, base: baseName };
}

async function main() {
  const results = [];
  for (const job of JOBS) {
    console.log("→", job.base);
    const meta = await processOne(job.input, job.base);
    results.push(meta);
    console.log("  ", meta.width, "x", meta.height);
  }
  console.log("OK", results.length, "jeux de variantes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
