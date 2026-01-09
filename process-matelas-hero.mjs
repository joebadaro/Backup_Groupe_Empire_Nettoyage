
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// New uploaded file path
const uploadedPath = 'C:\\Users\\joeba\\.gemini\\antigravity\\brain\\00f82399-c86f-489f-8a04-bc7b4194de1f\\uploaded_image_1766016356647.jpg';
const outputPath = 'public/images/catalog/photo-matelas-hero-new.webp';

async function processImage() {
  try {
    // Resize to max 2500px width (High Quality Hero)
    // WebP, 90% Quality
    await sharp(uploadedPath)
      .resize({ width: 2500, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(outputPath);
    console.log(`Successfully processed Mattress Hero to ${outputPath}`);
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processImage();
