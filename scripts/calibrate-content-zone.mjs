/**
 * Détecte la boîte centrale (bordure bleue) sur le template letterhead.
 */
import sharp from "sharp";

const imagePath =
  process.argv[2] ?? "public/images/admin/estimation-letter-template.webp";

const { data, info } = await sharp(imagePath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

function px(x, y) {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
}

function isBlueBorder(r, g, b) {
  return b > 100 && b > r + 30 && b > g + 15 && r < 75 && g < 110;
}

// Centre horizontal de la page
const cx = Math.round(width / 2);

// Trouver les bords verticaux du cadre (scan au milieu de la zone attendue)
let leftBorder = 0;
let rightBorder = width - 1;
for (let x = Math.round(width * 0.05); x < Math.round(width * 0.45); x++) {
  const [r, g, b] = px(x, Math.round(height * 0.42));
  if (isBlueBorder(r, g, b)) {
    leftBorder = x;
    break;
  }
}
for (let x = Math.round(width * 0.95); x > Math.round(width * 0.55); x--) {
  const [r, g, b] = px(x, Math.round(height * 0.42));
  if (isBlueBorder(r, g, b)) {
    rightBorder = x;
    break;
  }
}

function rowBlueCount(y) {
  let count = 0;
  for (let x = leftBorder; x <= rightBorder; x += 2) {
    const [r, g, b] = px(x, y);
    if (isBlueBorder(r, g, b)) count++;
  }
  return count;
}

const span = rightBorder - leftBorder;
const threshold = span / 8;

// Haut du cadre
let topBorder = 0;
for (let y = Math.round(height * 0.26); y < Math.round(height * 0.42); y++) {
  if (rowBlueCount(y) > threshold) {
    topBorder = y;
    break;
  }
}

// Bas du cadre — chercher la dernière ligne bleue avant le texte fixe
let bottomBorder = 0;
for (let y = Math.round(height * 0.42); y < Math.round(height * 0.62); y++) {
  if (rowBlueCount(y) > threshold) bottomBorder = y;
}

if (!bottomBorder) {
  // repli : première ligne sans blanc dominant sous le cadre
  for (let y = Math.round(height * 0.38); y < Math.round(height * 0.58); y++) {
    const [r, g, b] = px(cx, y);
    if (!(r > 240 && g > 240 && b > 240) && y > topBorder + 50) {
      bottomBorder = y;
      break;
    }
  }
}

// Padding intérieur (coins arrondis + marge de lecture)
const padX = Math.round(width * 0.014);
const padTop = Math.round(height * 0.011);
const padBottom = Math.round(height * 0.012);

const inner = {
  left: leftBorder + padX,
  right: rightBorder - padX,
  top: topBorder + padTop,
  bottom: bottomBorder - padBottom,
};

const pct = {
  top: ((inner.top / height) * 100).toFixed(2) + "%",
  bottom: (((height - inner.bottom) / height) * 100).toFixed(2) + "%",
  left: ((inner.left / width) * 100).toFixed(2) + "%",
  right: (((width - inner.right) / width) * 100).toFixed(2) + "%",
};

console.log(
  JSON.stringify(
    {
      width,
      height,
      borders: { leftBorder, rightBorder, topBorder, bottomBorder },
      innerPx: inner,
      innerSize: { w: inner.right - inner.left, h: inner.bottom - inner.top },
      contentZonePercent: pct,
      innerHeightPct: (((inner.bottom - inner.top) / height) * 100).toFixed(2) + "%",
    },
    null,
    2,
  ),
);
