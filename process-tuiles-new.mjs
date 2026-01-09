import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:/Users/joeba/.gemini/antigravity/brain/2f3c153a-c202-4f05-832d-9476db4c86be/';
const outputDir = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/public/images/catalog/';

const images = [
    { src: 'uploaded_image_0_1766415305884.jpg', dest: 'tuile-slide-new-1.webp' },
    { src: 'uploaded_image_1_1766415305884.jpg', dest: 'tuile-slide-new-2.webp' },
    { src: 'uploaded_image_2_1766415305884.jpg', dest: 'tuile-slide-new-3.webp' },
    { src: 'uploaded_image_3_1766415305884.png', dest: 'tuile-slide-new-4.webp' },
    { src: 'uploaded_image_4_1766415305884.jpg', dest: 'tuile-slide-new-5.webp' },
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

            // Using 'inside' to Preserve Aspect Ratio. 
            // Max dimension 1200px (good for quality). 
            // We do NOT crop.
            await sharp(inputPath)
                .resize(1200, 1200, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .webp({ quality: 90 }) // Slightly higher quality
                .toFile(outputPath);

            console.log(`Processed ${img.src} -> ${img.dest} (Preserved Aspect Ratio)`);
        } catch (error) {
            console.error(`Error processing ${img.src}:`, error);
        }
    }
}

processImages();
