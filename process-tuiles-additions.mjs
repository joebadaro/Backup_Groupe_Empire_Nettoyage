import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Artifacts directory where uploaded images are stored
const artifactsDir = 'C:/Users/joeba/.gemini/antigravity/brain/0b510772-9fc4-489b-9a77-858b52acc8a1/';
// Target directory
const outputDir = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/public/images/catalog/';

const images = [
    { src: 'uploaded_image_0_1766434836569.jpg', dest: 'tuile-slide-new-6.webp' },
    { src: 'uploaded_image_1_1766434836569.jpg', dest: 'tuile-slide-new-7.webp' },
    { src: 'uploaded_image_2_1766434836569.jpg', dest: 'tuile-slide-new-8.webp' }
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

            // Using 'inside' to Preserve Aspect Ratio like the previous script
            await sharp(inputPath)
                .resize(1200, 1200, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .webp({ quality: 90 })
                .toFile(outputPath);

            console.log(`Processed ${img.src} -> ${img.dest}`);
        } catch (error) {
            console.error(`Error processing ${img.src}:`, error);
        }
    }
}

processImages();
