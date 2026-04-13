const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = "C:\\Users\\joeba\\Desktop\\pictures empire\\raw-asset\\Photo 2025-09-16, 10 01 11 AM.jpg";
const outputDir = path.join(__dirname, "public", "images", "videos");
const outFileName = "video-thumb-tapis-oriental-new-v2.webp";

async function processImage() {
  const outputPath = path.join(outputDir, outFileName);
  
  await sharp(inputPath)
    .rotate() // Calling .rotate() with no arguments auto-rotates the pixel matrix based on EXIF and removes the tag. This "flattens" it.
    .resize(600, 1066, {
      fit: sharp.fit.cover,
      position: sharp.position.center,
      withoutEnlargement: true
    })
    .webp({ quality: 80, effort: 6 })
    .toFile(outputPath);
  
  console.log(`Successfully flattened, normalized EXIF, and exported ${outFileName} (CACHE BUSTED v2)`);
}

processImage().catch(console.error);
