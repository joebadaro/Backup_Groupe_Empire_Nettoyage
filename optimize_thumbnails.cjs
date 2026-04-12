const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = "C:\\Users\\joeba\\Desktop\\temporarare";
const outputDir = path.join(__dirname, "public", "images", "videos");

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

const files = [
  { name: "banquette.jpeg", out: "video-thumb-banquette.webp" },
  { name: "sofa CAUSEUSE.jpeg", out: "video-thumb-causeuse.webp" },
  { name: "PRODUITS.jpeg", out: "video-thumb-produits.webp" },
  { name: "TACHE DE CAFE.jpeg", out: "video-thumb-cafe.webp" },
  { name: "TUILE.jpeg", out: "video-thumb-tuile.webp" },
  { name: "VELOUR  VERT.jpeg", out: "video-thumb-velour.webp" },
];

async function processImages() {
  for (const file of files) {
    const inputPath = path.join(inputDir, file.name);
    const outputPath = path.join(outputDir, file.out);
    
    // Vertical shorts are generally 9:16 so max bounds 600x1066 is ideal for web thumbnails without heavy payload
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
