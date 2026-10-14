/**
 * Optimise les photos du diaporama céramique → WebP responsive.
 * Noms versionnés (v3) pour invalider le cache navigateur des anciennes URLs.
 * Sources Desktop non modifiées.
 */
import sharp from "sharp";
import { mkdir, writeFile, copyFile, access, readdir, unlink } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { constants as fsConstants } from "fs";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceDir = "C:\\Users\\joeba\\Desktop\\empire tuile2026";
const outDir = join(root, "public", "images", "catalog");
const archiveDir = join(outDir, "_source-ceramique-2026");
const metaPath = join(root, "src", "data", "ceramiqueSlideshow.meta.json");

/** Préfixe versionné — change si le cache navigateur sert encore d'anciens WebP */
const FILE_PREFIX = "ceramique-slide-v4";
const TARGET_WIDTHS = [640, 960, 1600];
const QUALITY = 82;

const SLIDES = [
  { id: "01", file: "1c.jpeg" },
  { id: "02", file: "1b.jpeg" },
  { id: "03", file: "2.jpeg" },
  { id: "04", file: "3.jpeg" },
  { id: "05", file: "7.png" },
  { id: "06", file: "5.png" },
  { id: "07", file: "WhatsApp Image 2026-10-14 at 11.51.09 AM.jpeg" },
  { id: "08", file: "20.jpeg" },
  { id: "09", file: "6.png" },
  { id: "10", file: "10.jpeg" },
];

async function exists(p) {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function fingerprint(path) {
  const { data } = await sharp(path)
    .rotate()
    .resize(48, 48, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return createHash("sha1").update(data).digest("hex").slice(0, 16);
}

async function correlate(srcPath, webpPath) {
  const W = 32;
  const H = 32;
  const a = await sharp(srcPath).rotate().resize(W, H, { fit: "fill" }).raw().toBuffer();
  const b = await sharp(webpPath).rotate().resize(W, H, { fit: "fill" }).raw().toBuffer();
  let sum = 0;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
    sa += a[i] * a[i];
    sb += b[i] * b[i];
  }
  return sum / Math.sqrt(sa * sb);
}

async function removeStaleOutputs() {
  const files = await readdir(outDir);
  const stale = files.filter(
    (f) =>
      /^ceramique-slide-2026-\d{2}/.test(f) ||
      /^ceramique-slide-v3-\d{2}/.test(f) ||
      /^ceramique-slide-v4-\d{2}/.test(f),
  );
  for (const f of stale) {
    await unlink(join(outDir, f));
  }
  if (stale.length) {
    console.log(`Nettoyage ${stale.length} anciens WebP diaporama…`);
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(archiveDir, { recursive: true });
  await removeStaleOutputs();

  const report = [];
  const verify = [];

  for (const slide of SLIDES) {
    const inputPath = join(sourceDir, slide.file);
    if (!(await exists(inputPath))) {
      throw new Error(`Source manquante: ${inputPath}`);
    }

    const archiveName = slide.file.replace(/[<>:"/\\|?*]/g, "_");
    await copyFile(inputPath, join(archiveDir, archiveName));

    const srcFp = await fingerprint(inputPath);
    const meta = await sharp(inputPath).rotate().metadata();
    const origW = meta.width || 0;
    const origH = meta.height || 0;
    const origBytes = (await sharp(inputPath).toBuffer()).byteLength;

    // Garde-fou : ne jamais réutiliser 1a pour la slide 01
    if (slide.id === "01") {
      const fp1a = await fingerprint(join(sourceDir, "1a.jpeg"));
      if (srcFp === fp1a) {
        throw new Error("Slide 01 pointe encore sur 1a.jpeg — abort");
      }
      if (slide.file !== "1c.jpeg") {
        throw new Error(`Slide 01 doit être 1c.jpeg, reçu: ${slide.file}`);
      }
    }

    const widths = [
      ...new Set(
        TARGET_WIDTHS.filter((w) => w < origW).concat([origW]).sort((a, b) => a - b),
      ),
    ];

    const variants = [];

    for (const w of widths) {
      const suffix = w === origW ? "" : `-${w}`;
      const outName = `${FILE_PREFIX}-${slide.id}${suffix}.webp`;
      const outPath = join(outDir, outName);

      const img = sharp(inputPath)
        .rotate()
        .resize({
          width: w,
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({
          quality: QUALITY,
          effort: 5,
          smartSubsample: true,
        });

      const { data, info } = await img.toBuffer({ resolveWithObject: true });
      await writeFile(outPath, data);

      variants.push({
        path: `/images/catalog/${outName}`,
        width: info.width,
        height: info.height,
        bytes: data.byteLength,
      });
    }

    const primary = variants[variants.length - 1];
    const primaryPath = join(outDir, `${FILE_PREFIX}-${slide.id}.webp`);
    const corr = await correlate(inputPath, primaryPath);

    if (corr < 0.98) {
      throw new Error(
        `Corrélation trop faible pour ${slide.id} (${slide.file}): ${corr.toFixed(4)} — WebP ≠ source`,
      );
    }

    verify.push({
      id: slide.id,
      sourceFile: slide.file,
      sourceFingerprint: srcFp,
      correlation: +corr.toFixed(4),
    });

    report.push({
      id: slide.id,
      sourceFile: slide.file,
      sourceBytes: origBytes,
      sourceWidth: origW,
      sourceHeight: origH,
      sourceFingerprint: srcFp,
      primary: primary.path,
      width: primary.width,
      height: primary.height,
      primaryBytes: primary.bytes,
      variants,
      savingsPct: Math.round((1 - primary.bytes / origBytes) * 100),
      sourceCorrelation: +corr.toFixed(4),
    });

    console.log(
      `OK ${slide.id} ${slide.file} corr=${corr.toFixed(4)} → ${variants
        .map((v) => `${v.width}w/${Math.round(v.bytes / 1024)}KB`)
        .join(", ")}`,
    );
  }

  // Contrôles croisés anti-double / anti-1a
  const fp1a = await fingerprint(join(sourceDir, "1a.jpeg"));
  if (report.some((r) => r.sourceFingerprint === fp1a)) {
    throw new Error("Une slide du diaporama correspond encore à 1a.jpeg");
  }
  const fps = report.map((r) => r.sourceFingerprint);
  if (new Set(fps).size !== fps.length) {
    throw new Error("Doublons détectés dans les sources du diaporama");
  }

  await writeFile(
    metaPath,
    JSON.stringify(
      {
        quality: QUALITY,
        filePrefix: FILE_PREFIX,
        generatedAt: new Date().toISOString(),
        slides: report,
        verify,
      },
      null,
      2,
    ),
  );

  console.log(`\nMeta écrit: ${metaPath}`);
  console.log(
    "Total WebP primary:",
    Math.round(report.reduce((s, r) => s + r.primaryBytes, 0) / 1024),
    "KB",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
