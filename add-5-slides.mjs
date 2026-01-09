
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outputDir = 'public/images/catalog';
const newImages = [
    'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_0_1766550177468.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_1_1766550177468.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_2_1766550177468.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_3_1766550177468.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_4_1766550177468.jpg'
];

// 1. Shift existing images (8...1 -> 13...6)
// We shift by 5 places.
if (fs.existsSync(path.join(outputDir, 'equipment-slide-1.webp'))) {
    console.log('Shifting existing images...');
    for (let i = 8; i >= 1; i--) {
        const oldPath = path.join(outputDir, `equipment-slide-${i}.webp`);
        const newPath = path.join(outputDir, `equipment-slide-${i + 5}.webp`);
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            console.log(`Renamed usage: ${i} -> ${i + 5}`);
        }
    }
}

// 2. Process New Images as Slides 1-5
async function processNewImages() {
    console.log('Processing new images...');

    for (let i = 0; i < newImages.length; i++) {
        const destPath = path.join(outputDir, `equipment-slide-${i + 1}.webp`);
        try {
            await sharp(newImages[i])
                .resize({
                    width: 1200,
                    withoutEnlargement: true
                })
                .webp({ quality: 85 })
                .toFile(destPath);

            console.log(`Saved: equipment-slide-${i + 1}.webp`);
        } catch (err) {
            console.error(`Error processing ${newImages[i]}:`, err);
        }
    }
}

processNewImages();
