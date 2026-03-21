/**
 * Optimise les visuels produits (WebP) à partir de fichiers placés dans :
 *   public/images/catalog/produits/_source/
 *
 * Noms de fichiers attendus (base name, une extension parmi .jpg .jpeg .png .webp) :
 *   hub-duo          → hub-duo.webp (hero page hub, max 1200px de large)
 *   neutralisant     → neutralisant-odeurs-oxygene.webp (fiche neutralisant, max 960px)
 *   enzymatique      → detachant-enzymatique.webp (fiche enzymatique, max 960px)
 *
 * Met à jour src/data/productImages.meta.json avec les dimensions réelles.
 */
import sharp from "sharp";
import { readFile, writeFile, readdir } from "fs/promises";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceDir = join(root, "public", "images", "catalog", "produits", "_source");
const outDir = join(root, "public", "images", "catalog", "produits");
const metaPath = join(root, "src", "data", "productImages.meta.json");

const JOBS = [
  {
    key: "hubDuo",
    inputBase: "hub-duo",
    outputFile: "hub-duo.webp",
    maxWidth: 1200,
    quality: 82,
  },
  {
    key: "neutralisant",
    inputBase: "neutralisant",
    outputFile: "neutralisant-odeurs-oxygene.webp",
    maxWidth: 960,
    quality: 82,
  },
  {
    key: "enzymatique",
    inputBase: "enzymatique",
    inputBaseAlt: "detachant-enzymatique",
    outputFile: "detachant-enzymatique.webp",
    maxWidth: 960,
    quality: 82,
  },
  {
    key: "neutralisant2",
    inputBase: "neutralisant-2",
    outputFile: "neutralisant-odeurs-oxygene-2.webp",
    maxWidth: 960,
    quality: 82,
  },
  {
    key: "enzymatique2",
    inputBase: "enzymatique-2",
    outputFile: "detachant-enzymatique-2.webp",
    maxWidth: 960,
    quality: 82,
  },
];

const EXT = [".jpg", ".jpeg", ".png", ".webp"];

async function findInput(baseName, altBase) {
  const files = await readdir(sourceDir).catch(() => []);
  for (const name of [baseName, altBase].filter(Boolean)) {
    for (const ext of EXT) {
      const f = `${name}${ext}`;
      if (files.includes(f)) return join(sourceDir, f);
    }
  }
  return null;
}

async function main() {
  const metaOut = {};

  for (const job of JOBS) {
    const inputPath = await findInput(job.inputBase, job.inputBaseAlt);
    if (!inputPath) {
      console.warn(
        `[optimize-product-images] Skipping ${job.outputFile}: no source file for "${job.inputBase}" in _source/`,
      );
      continue;
    }

    const outPath = join(outDir, job.outputFile);
    const metaIn = await sharp(inputPath).metadata();
    const w = metaIn.width || job.maxWidth;

    let chain = sharp(inputPath).rotate();
    if (w > job.maxWidth) {
      chain = chain.resize({
        width: job.maxWidth,
        withoutEnlargement: true,
      });
    }

    const buf = await chain.webp({ quality: job.quality, effort: 5 }).toBuffer();

    await writeFile(outPath, buf);

    const finalMeta = await sharp(buf).metadata();
    const relSrc = `/images/catalog/produits/${job.outputFile}`;

    metaOut[job.key] = {
      src: relSrc,
      width: finalMeta.width || job.maxWidth,
      height: finalMeta.height || Math.round((job.maxWidth * 3) / 4),
    };

    console.log(
      `OK ${basename(inputPath)} → ${job.outputFile} (${metaOut[job.key].width}×${metaOut[job.key].height})`,
    );
  }

  if (Object.keys(metaOut).length === 0) {
    console.error(
      "\nAucun fichier source trouvé. Placez des images dans :\n  public/images/catalog/produits/_source/\navec les noms : hub-duo.jpg, neutralisant.jpg, enzymatique.jpg (ou .png / .webp)\n",
    );
    process.exitCode = 1;
    return;
  }

  // Fusion avec meta existant pour ne pas écraser les clés manquantes si un seul fichier traité
  let existing = {};
  try {
    const raw = await readFile(metaPath, "utf8");
    existing = JSON.parse(raw);
  } catch {
    /* ignore */
  }

  const merged = { ...existing, ...metaOut };
  await writeFile(metaPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.log(`\nMis à jour : ${metaPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
