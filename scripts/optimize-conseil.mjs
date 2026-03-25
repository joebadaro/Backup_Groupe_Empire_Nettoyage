import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = "C:\\Users\\joeba\\Desktop\\76\\location ou pro.jpeg";
const outputPath = path.join(process.cwd(), 'public', 'images', 'conseils', 'nettoyage-vapeur-vs-location.webp');

async function processImage() {
  try {
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: File not found at ${inputPath}`);
      return;
    }
    
    await sharp(inputPath)
      .resize(800, null, { withoutEnlargement: true }) // max width 800px, keep aspect ratio
      .webp({ quality: 80 })
      .toFile(outputPath);
      
    console.log(`Successfully optimized and saved to ${outputPath}`);
  } catch (error) {
    console.error("Error processing image:", error);
  }
}

processImage();
