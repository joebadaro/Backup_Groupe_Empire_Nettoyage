const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = "C:\\Users\\joeba\\Desktop\\temporarare";
const outputDir = path.join(__dirname, "public", "images", "videos");

const file = { name: "TAPIS ORIENTAL.jpg", out: "video-thumb-tapis-oriental-v3.webp" };

async function processImage() {
  const inputPath = path.join(inputDir, file.name);
  const outputPath = path.join(outputDir, file.out);
  
  await sharp(inputPath)
    .withMetadata(false)
    .rotate(270) // 270 degrees is exactly 90 degrees counterclockwise
    .resize(600, 1066, {
      fit: sharp.fit.cover,
      position: sharp.position.center,
      withoutEnlargement: true
    })
    .webp({ quality: 80, effort: 6 })
    .toFile(outputPath);
  
  console.log(`Successfully rotated -90deg and exported ${file.out} (CACHE BUSTED v3)`);
}

processImage().catch(console.error);
