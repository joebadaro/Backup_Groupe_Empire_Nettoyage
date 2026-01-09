
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// New uploaded file path
const uploadedPath = 'C:\\Users\\joeba\\.gemini\\antigravity\\brain\\00f82399-c86f-489f-8a04-bc7b4194de1f\\uploaded_image_1766005049251.jpg';
const outputPath = 'public/images/camion-tech.webp';

async function processImage() {
    try {
        // NO Resize, maintain original high resolution, 100% quality, lossless
        await sharp(uploadedPath)
            .webp({ quality: 100, lossless: true })
            .toFile(outputPath);
        console.log(`Successfully processed HIGH QUALITY image to ${outputPath}`);
    } catch (error) {
        console.error('Error processing image:', error);
    }
}

processImage();
