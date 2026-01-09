import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Added 27 and 39 as requested
const filesToRotate = [27, 39];
// Note: 32, 56, 58, 59, 60 were already done.

async function rotateImages() {
    console.log('Starting rotation for updates...');

    for (const id of filesToRotate) {
        const inputPath = `public/images/catalog/photo-${id}.webp`;
        const outputPath = `public/images/catalog/photo-${id}-rotated.webp`;

        try {
            // Check if input exists
            await fs.access(inputPath);

            // Rotate 90 degrees clockwise
            await sharp(inputPath)
                .rotate(90)
                .toFile(outputPath);
            console.log(`✅ Rotated photo-${id}.webp`);
        } catch (error) {
            console.error(`❌ Error with photo-${id}:`, error.message);
        }
    }
}

rotateImages();
