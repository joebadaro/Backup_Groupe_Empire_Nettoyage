
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// New uploaded logo path (High Res)
const uploadedPath = 'C:\\Users\\joeba\\.gemini\\antigravity\\brain\\00f82399-c86f-489f-8a04-bc7b4194de1f\\uploaded_image_0_1766005586015.png';
const outputPath = 'public/images/logo-empire.webp';

async function processLogo() {
    try {
        // Process logo:
        // 1. Resize to height 200px (higher res than before) to look sharp on Retina
        // 2. Convert to WebP
        // 3. Lossless for maximum crispness of text
        await sharp(uploadedPath)
            .resize({ height: 200, withoutEnlargement: true })
            .webp({ lossless: true })
            .toFile(outputPath);
        console.log(`Successfully processed HIGH RES LOGO to ${outputPath}`);
    } catch (error) {
        console.error('Error processing logo:', error);
    }
}

processLogo();
