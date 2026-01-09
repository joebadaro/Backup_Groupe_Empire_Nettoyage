import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Artifacts directory where uploaded images are stored
const artifactsDir = 'C:/Users/joeba/.gemini/antigravity/brain/0b510772-9fc4-489b-9a77-858b52acc8a1/';
// Target directory
const outputDir = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/public/images/catalog/';

const images = [
    { src: 'uploaded_image_1766438548779.png', dest: 'hero-slide-office.webp' }
];

async function processImages() {
    for (const img of images) {
        const inputPath = path.join(artifactsDir, img.src);
        const outputPath = path.join(outputDir, img.dest);

        try {
            if (!fs.existsSync(inputPath)) {
                console.error(`Input file not found: ${inputPath}`);
                continue;
            }

            // Hero images need to be large and high quality
            await sharp(inputPath)
                .resize(1920, 1080, {
                    fit: 'cover',
                    position: 'center'
                })
                .webp({ quality: 85 })
                .toFile(outputPath);

            console.log(`Processed ${img.src} -> ${img.dest}`);
        } catch (error) {
            console.error(`Error processing ${img.src}:`, error);
        }
    }
}

processImages();
