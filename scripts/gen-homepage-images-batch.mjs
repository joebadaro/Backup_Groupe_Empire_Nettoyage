import sharp from "sharp";
import fs from "fs";

const q = { quality: 82, effort: 4 };

async function wOut(src, dest, width) {
  const buf = await sharp(src)
    .resize({ width, withoutEnlargement: true, fit: "inside" })
    .webp(q)
    .toBuffer();
  fs.writeFileSync(dest, buf);
  console.log(dest, buf.length);
}

// Tapis home: add 480w
for (const base of [
  "public/images/catalog/photo-22-home",
  "public/images/catalog/photo-47-home",
  "public/images/catalog/photo-oriental-custom-home",
]) {
  await wOut(`${base}.webp`, `${base}-480.webp`, 480);
}

// Card sources → *-home-{400,480,640,800}.webp
const cards = [
  ["public/images/services/services-4.webp", "public/images/services/services-4-home"],
  ["public/images/catalog/photo-matelas-custom.webp", "public/images/catalog/photo-matelas-custom-home"],
  ["public/images/catalog/photo-leather-final.webp", "public/images/catalog/photo-leather-final-home"],
  ["public/images/catalog/tapis-residentiel-service-card.webp", "public/images/catalog/tapis-residentiel-service-card-home"],
  ["public/images/catalog/tapis-commercial-combo.webp", "public/images/catalog/tapis-commercial-combo-home"],
  ["public/images/catalog/photo-20.webp", "public/images/catalog/photo-20-home"],
];
for (const [src, base] of cards) {
  for (const width of [400, 480, 640, 800]) {
    await wOut(src, `${base}-${width}.webp`, width);
  }
}

// tuile 400×240 — lighter home copy
await sharp("public/images/catalog/tuile-card-optimized.webp")
  .webp({ quality: 80, effort: 4 })
  .toFile("public/images/catalog/tuile-card-optimized-home.webp");
console.log("tuile-card-optimized-home.webp");

// photo-8 eco
for (const width of [320, 400, 533]) {
  await wOut("public/images/catalog/photo-8.webp", `public/images/catalog/photo-8-home-${width}.webp`, width);
}

// team-van 480w
await wOut(
  "public/images/catalog/team-van-back-home.webp",
  "public/images/catalog/team-van-back-home-480.webp",
  480,
);

console.log("done");
