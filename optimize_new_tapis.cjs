const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = "C:\\Users\\joeba\\Desktop\\temporarare";
const outputDir = path.join(__dirname, "public", "images", "videos");

const files = [
  { name: "tapis resulta berbere.jpg", out: "video-thumb-tapis-berbere.webp" },
  { name: "TAPIS ORIENTAL.jpg", out: "video-thumb-tapis-oriental.webp" },
];

async function processImages() {
  for (const file of files) {
    const inputPath = path.join(inputDir, file.name);
    const outputPath = path.join(outputDir, file.out);
    
    await sharp(inputPath)
      .resize(600, 1066, {
        fit: sharp.fit.cover,
        position: sharp.strategy.attention,
        withoutEnlargement: true
      })
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPath);
    console.log(`Processed ${file.out}`);
  }
}

processImages().catch(console.error);
