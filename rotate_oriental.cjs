const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = "C:\\Users\\joeba\\Desktop\\temporarare";
const outputDir = path.join(__dirname, "public", "images", "videos");

const file = { name: "TAPIS ORIENTAL.jpg", out: "video-thumb-tapis-oriental-v2.webp" };

async function processImage() {
  const inputPath = path.join(inputDir, file.name);
  const outputPath = path.join(outputDir, file.out);
  
  // EXIF issue or cache issue: first rotate, then resize, output to v2.
  await sharp(inputPath)
    .withMetadata(false) // strip EXIF orientation that might override
    .rotate(90) // rotate properly 90deg CW
    .resize(600, 1066, {
      fit: sharp.fit.cover,
      position: sharp.strategy.attention,
      withoutEnlargement: true
    })
    .webp({ quality: 80, effort: 6 })
    .toFile(outputPath);
  
  console.log(`Successfully rotated and processed ${file.out} (CACHE BUSTED)`);
}

processImage().catch(console.error);
