const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = "C:\\Users\\joeba\\Desktop\\temporarare";
const outputDir = path.join(__dirname, "public", "images", "videos");

const file = { name: "WhatsApp Image 2026-04-12 at 7.02.55 AM.jpeg", out: "video-thumb-sofa-brossard.webp" };

async function processImage() {
  const inputPath = path.join(inputDir, file.name);
  const outputPath = path.join(outputDir, file.out);
  
  await sharp(inputPath)
    .resize(600, 1066, {
      fit: sharp.fit.cover,
      position: sharp.position.center, // Keeps it centrally aligned
      withoutEnlargement: true
    })
    .webp({ quality: 80, effort: 6 })
    .toFile(outputPath);
  
  console.log(`Successfully optimized and exported ${file.out} (CACHE BUSTED)`);
}

processImage().catch(console.error);
