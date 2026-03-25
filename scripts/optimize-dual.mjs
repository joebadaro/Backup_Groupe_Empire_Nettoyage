import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const img1Path = "C:\\Users\\joeba\\Desktop\\76\\location.jpg";
const img2Path = "C:\\Users\\joeba\\Desktop\\76\\procleaners.jpeg";

const out1 = path.join(process.cwd(), 'public', 'images', 'conseils', 'location-vs-pro-1.webp');
const out2 = path.join(process.cwd(), 'public', 'images', 'conseils', 'location-vs-pro-2.webp');

async function processImages() {
  try {
    await sharp(img1Path).resize(800, null, { withoutEnlargement: true }).webp({ quality: 85 }).toFile(out1);
    await sharp(img2Path).resize(800, null, { withoutEnlargement: true }).webp({ quality: 85 }).toFile(out2);
    console.log("Successfully created simple optimized Webp files: location-vs-pro-1.webp and location-vs-pro-2.webp");
  } catch (error) {
    console.error("Error processing simple images:", error);
  }
}

processImages();
