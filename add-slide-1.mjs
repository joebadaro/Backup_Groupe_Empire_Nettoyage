
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outputDir = 'public/images/catalog';
const newImageSrc = 'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_1766547856067.jpg';

// 1. Shift existing images (7...1 -> 8...2)
if (fs.existsSync(path.join(outputDir, 'equipment-slide-1.webp'))) {
    console.log('Shifting existing images...');
    for (let i = 7; i >= 1; i--) {
        const oldPath = path.join(outputDir, `equipment-slide-${i}.webp`);
        const newPath = path.join(outputDir, `equipment-slide-${i + 1}.webp`);
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            console.log(`Renamed usage: ${i} -> ${i + 1}`);
        }
    }
}

// 2. Process New Image as Slide 1
async function processNewImage() {
    console.log('Processing new image...');
    const destPath = path.join(outputDir, 'equipment-slide-1.webp');

    try {
        await sharp(newImageSrc)
            .resize({
                width: 1200,
                withoutEnlargement: true
            })
            .webp({ quality: 85 })
            .toFile(destPath);

        console.log(`Saved: equipment-slide-1.webp`);
    } catch (err) {
        console.error(`Error processing new image:`, err);
    }
}

processNewImage();
