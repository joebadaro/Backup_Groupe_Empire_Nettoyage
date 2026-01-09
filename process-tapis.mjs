
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// New uploaded file path
const uploadedPath = 'C:\\Users\\joeba\\.gemini\\antigravity\\brain\\9c36adeb-c785-4829-a439-897510260665\\uploaded_image_1766037246820.jpg';
const outputPath = 'public/images/catalog/photo-tapis-clean.webp';

async function processImage() {
    try {
        // Resize to max 1920px width (Full HD ready)
        // WebP, 90% Quality
        await sharp(uploadedPath)
            .resize({ width: 1920, withoutEnlargement: true })
            .webp({ quality: 90 })
            .toFile(outputPath);
        console.log(`Successfully processed Carpet Image to ${outputPath}`);
    } catch (error) {
        console.error('Error processing image:', error);
    }
}

processImage();
