
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outputDir = 'public/images/catalog';

// 1. Shift existing images (4,3,2,1 -> 7,6,5,4) to avoid overwrite
if (fs.existsSync(path.join(outputDir, 'equipment-slide-4.webp'))) {
    console.log('Shifting existing images...');
    for (let i = 4; i >= 1; i--) {
        const oldPath = path.join(outputDir, `equipment-slide-${i}.webp`);
        const newPath = path.join(outputDir, `equipment-slide-${i + 3}.webp`);
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            console.log(`Renamed usage: ${i} -> ${i + 3}`);
        }
    }
}

// 2. Process New Images
// Order: Last uploaded (2) first, then 0, then 1.
const newImages = [
    { src: 'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_2_1766546840764.jpg', dest: 'equipment-slide-1.webp' }, // The two men
    { src: 'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_0_1766546840764.jpg', dest: 'equipment-slide-2.webp' }, // Van side
    { src: 'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_1_1766546840764.jpg', dest: 'equipment-slide-3.webp' }  // Machine
];

async function processNewImages() {
    console.log('Processing new images...');

    for (const img of newImages) {
        const destPath = path.join(outputDir, img.dest);
        try {
            await sharp(img.src)
                .resize({
                    width: 1200,
                    withoutEnlargement: true
                })
                .webp({ quality: 85 })
                .toFile(destPath);

            console.log(`Saved: ${img.dest}`);
        } catch (err) {
            console.error(`Error processing ${img.src}:`, err);
        }
    }
}

processNewImages();
