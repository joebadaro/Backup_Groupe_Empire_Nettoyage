/**
 * Retire le slogan vert sous le téléphone (gauche bas).
 * Conserve le slogan bleu/rouge tout en bas de la feuille.
 */
import sharp from "sharp";

const PATH = "public/images/admin/estimation-letter-template.webp";

const { data, info } = await sharp(PATH).ensureAlpha().raw().toBuffer({
  resolveWithObject: true,
});
const { width, height, channels } = info;
const out = Buffer.from(data);

function px(x, y) {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
}

function isGreenSloganPixel(r, g, b) {
  return g > 95 && g > r + 28 && g > b + 8 && r < 130 && b < 130;
}

function isSloganTextPixel(r, g, b) {
  if (isGreenSloganPixel(r, g, b)) return true;
  // Résidus antialias du texte italique (gris/vert foncé sur fond blanc)
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 200 && lum > 60 && g >= r - 15 && g >= b - 20;
}

let sr = 0,
  sg = 0,
  sb = 0,
  n = 0;
for (let y = 2480; y < 2620; y += 4) {
  for (let x = 300; x < 780; x += 4) {
    const [r, g, b] = px(x, y);
    if (r > 235 && g > 235 && b > 235) {
      sr += r;
      sg += g;
      sb += b;
      n++;
    }
  }
}
const fill = {
  r: Math.round(sr / n) || 252,
  g: Math.round(sg / n) || 252,
  b: Math.round(sb / n) || 252,
};

// Zone du slogan vert uniquement (sous le téléphone, au-dessus du slogan bas)
const x0 = 285;
const x1 = 755;
const y0 = 2715;
const y1 = 2865;

let replaced = 0;
for (let y = y0; y < y1; y++) {
  for (let x = x0; x < x1; x++) {
    const i = (y * width + x) * channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isSloganTextPixel(r, g, b)) {
      out[i] = fill.r;
      out[i + 1] = fill.g;
      out[i + 2] = fill.b;
      if (channels === 4) out[i + 3] = 255;
      replaced++;
    }
  }
}

await sharp(out, { raw: { width, height, channels } })
  .webp({ quality: 92, effort: 6 })
  .toFile(PATH);

console.log("Replaced pixels in slogan band:", replaced, "fill", fill);
