import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Current artifact directory where the new image is located
const artifactsDir = 'C:/Users/joeba/.gemini/antigravity/brain/beaa3137-cdb5-4d7a-ba8c-c409c809008e/';
const outputDir = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/public/images/catalog/';

const images = [
    { src: 'uploaded_image_1766352061311.jpg', dest: 'photo-matelas-8.webp' },
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

            // Using cover to fill specific dimensions or just converting? 
            // The previous script used resizing. 
            // I'll stick to a reasonable size but maybe cover is better for slideshows unless requested otherwise.
            // The user previously requested 'contain' but then 'cover' in the history summary.
            // History says: "toggling between static image and slideshow functionality, and adjusting CSS (object-fit: contain to object-fit: cover)"
            // So the CSS is cover. I should probably generate a good quality image.

            await sharp(inputPath)
                // .resize(1200, 800) // Optional resizing
                .webp({ quality: 80 })
                .toFile(outputPath);

            console.log(`Processed ${img.src} -> ${img.dest}`);
        } catch (error) {
            console.error(`Error processing ${img.src}:`, error);
        }
    }
}

processImages();
