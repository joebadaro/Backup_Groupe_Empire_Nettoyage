const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = "C:\\Users\\joeba\\Desktop\\pictures empire\\raw-asset\\Photo 2025-09-16, 10 01 11 AM.jpg";
const outputDir = path.join(__dirname, "public", "images", "videos");
const outFileName = "video-thumb-tapis-oriental-new.webp";

async function processImage() {
  const outputPath = path.join(outputDir, outFileName);
  
  await sharp(inputPath)
    .withMetadata() // Maintain native orientation if any embedded EXIF exists
    .resize(600, 1066, {
      fit: sharp.fit.cover,
      position: sharp.position.center,
      withoutEnlargement: true
    })
    .webp({ quality: 80, effort: 6 })
    .toFile(outputPath);
  
  console.log(`Successfully processed and exported ${outFileName} (COMPLETELY NEW ASSET)`);
}

processImage().catch(console.error);
