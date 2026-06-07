import https from "https";
import sharp from "sharp";
import { mkdirSync } from "fs";
import { stat } from "fs/promises";

const outDir = "public/images/videos";
mkdirSync(outDir, { recursive: true });

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function downloadThumb(id, outName) {
  const candidates = [
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  ];
  let buf = null;
  for (const url of candidates) {
    try {
      const b = await fetchBuffer(url);
      if (b.length > 1000) {
        buf = b;
        console.log("Using", url);
        break;
      }
    } catch (e) {
      console.log("Skip", url, e.message);
    }
  }
  if (!buf) throw new Error(`No thumb for ${id}`);
  const outPath = `${outDir}/${outName}`;
  const meta = await sharp(buf).metadata();
  await sharp(buf)
    .resize(720, 1280, { fit: "cover", position: "centre" })
    .webp({ quality: 82 })
    .toFile(outPath);
  const fileStat = await stat(outPath);
  console.log(`${outName}: ${meta.width}x${meta.height} -> ${fileStat.size} bytes`);
}

await downloadThumb("qN362y2IN_0", "video-presentation-groupe-nettoyage-empire-fr.webp");
await downloadThumb("Ayk97N_OxDQ", "video-presentation-groupe-nettoyage-empire-en.webp");
