const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = "C:\\Users\\joeba\\Desktop\\temporarare\\TAPIS PERSE.jpeg";
const outputPath = path.join(__dirname, "public", "images", "videos", "video-thumb-tapis-perse.webp");

async function processImage() {
  await sharp(inputPath)
    .resize(600, 1066, {
      fit: sharp.fit.cover,
      position: sharp.strategy.attention,
      withoutEnlargement: true
    })
    .webp({ quality: 80, effort: 6 })
    .toFile(outputPath);
  console.log(`Processed video-thumb-tapis-perse.webp`);
}

processImage().catch(console.error);
