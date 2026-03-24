/**
 * Tighter WebP for Lighthouse-flagged 640w homepage assets.
 * Writes to ./recompress-output/ then uses cmd copy /Y into public/ (reliable on Windows when public/ is sync-mapped).
 * Run from repo root: node scripts/recompress-flagged-640.mjs
 */
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const FILES = [
  "public/images/catalog/photo-47-home-640.webp",
  "public/images/catalog/team-van-back-home-640.webp",
  "public/images/catalog/photo-oriental-custom-home-640.webp",
  "public/images/catalog/photo-22-home-640.webp",
];

const quality = 80;

const outDir = path.join(root, "recompress-output");
await fs.mkdir(outDir, { recursive: true });

for (const rel of FILES) {
  const abs = path.join(root, rel);
  const staged = path.join(outDir, path.basename(rel));
  await sharp(abs)
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(staged);
  await execFileAsync("cmd", ["/c", "copy", "/Y", staged, abs], {
    windowsHide: true,
  });
  const st = await fs.stat(abs);
  console.log(rel, `${(st.size / 1024).toFixed(1)} KiB`);
}

await fs.rm(outDir, { recursive: true, force: true });
