
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// New uploaded file path
const uploadedPath = 'C:\\Users\\joeba\\.gemini\\antigravity\\brain\\00f82399-c86f-489f-8a04-bc7b4194de1f\\uploaded_image_0_1766006432651.jpg';
const outputPath = 'public/images/water-logo.webp';

async function processImage() {
    try {
        // Resize to 800px (good for background decoration)
        // WebP, Lossless to keep edges sharp
        await sharp(uploadedPath)
            .resize({ width: 800 })
            .webp({ lossless: true })
            .toFile(outputPath);
        console.log(`Successfully processed Water Logo to ${outputPath}`);
    } catch (error) {
        console.error('Error processing image:', error);
    }
}

processImage();
