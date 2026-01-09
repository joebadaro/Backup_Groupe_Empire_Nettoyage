
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImages = [
    'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_0_1766544981890.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_1_1766544981890.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_2_1766544981890.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_3_1766544981890.jpg'
];

const outputDir = 'public/images/catalog';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function processImages() {
    console.log('Processing images...');

    for (let i = 0; i < sourceImages.length; i++) {
        const src = sourceImages[i];
        const filename = `equipment-slide-${i + 1}.webp`;
        const dest = path.join(outputDir, filename);

        try {
            await sharp(src)
                .resize({
                    width: 1200,
                    withoutEnlargement: true
                })
                .webp({ quality: 85 })
                .toFile(dest);

            console.log(`Saved: ${filename}`);
        } catch (err) {
            console.error(`Error processing ${src}:`, err);
        }
    }
}

processImages();
