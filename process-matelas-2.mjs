import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:/Users/joeba/.gemini/antigravity/brain/b86ba5c0-2d9d-4283-84de-24e785067f7f/';
const outputDir = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/public/images/catalog/';

const images = [
    { src: 'uploaded_image_0_1766343846356.png', dest: 'photo-matelas-6.webp' },
    { src: 'uploaded_image_1_1766343846356.jpg', dest: 'photo-matelas-7.webp' },
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

            await sharp(inputPath)
                .resize(1200, 800, { // Standardize size
                    fit: 'contain', // User liked 'contain' previously to avoid cropping
                    background: { r: 255, g: 255, b: 255, alpha: 1 } // White bg for contain padding
                })
                .webp({ quality: 80 })
                .toFile(outputPath);

            console.log(`Processed ${img.src} -> ${img.dest}`);
        } catch (error) {
            console.error(`Error processing ${img.src}:`, error);
        }
    }
}

processImages();
