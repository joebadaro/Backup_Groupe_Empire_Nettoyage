const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = "C:\\Users\\joeba\\Desktop\\temporarare";
const outputDir = path.join(__dirname, "public", "images", "videos");

const file = { name: "TUILE.jpeg", out: "video-thumb-tuile-v2.webp" };

async function processImage() {
  const inputPath = path.join(inputDir, file.name);
  const outputPath = path.join(outputDir, file.out);
  
  await sharp(inputPath)
    .resize(600, 1066, {
      fit: sharp.fit.cover,
      position: sharp.position.center, // Strictly lock to absolute middle center!
      withoutEnlargement: true
    })
    .webp({ quality: 80, effort: 6 })
    .toFile(outputPath);
  
  console.log(`Successfully centered and processed ${file.out} (CACHE BUSTED)`);
}

processImage().catch(console.error);
