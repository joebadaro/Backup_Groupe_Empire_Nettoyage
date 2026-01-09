import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const uploadedFiles = [
    'C:/Users/joeba/.gemini/antigravity/brain/2f3c153a-c202-4f05-832d-9476db4c86be/uploaded_image_0_1766408404806.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/2f3c153a-c202-4f05-832d-9476db4c86be/uploaded_image_1_1766408404806.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/2f3c153a-c202-4f05-832d-9476db4c86be/uploaded_image_2_1766408404806.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/2f3c153a-c202-4f05-832d-9476db4c86be/uploaded_image_3_1766408404806.jpg',
    'C:/Users/joeba/.gemini/antigravity/brain/2f3c153a-c202-4f05-832d-9476db4c86be/uploaded_image_4_1766408404806.jpg'
];

const destDir = 'public/images/catalog';
const outputBaseName = 'tuile-slide';

async function processImages() {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    // We will keep the existing one as index 0 maybe? Or just overwrite.
    // The existing one is photo-ceramique-detail.jpg. We can leave it or include it.
    // Let's just create new ones.

    for (let i = 0; i < uploadedFiles.length; i++) {
        const src = uploadedFiles[i];
        const dest = path.join(destDir, `${outputBaseName}-${i + 1}.webp`);

        if (fs.existsSync(src)) {
            console.log(`Processing ${src} -> ${dest}`);
            await sharp(src)
                .resize({ width: 1000, withoutEnlargement: true }) // Good width for split screen
                .webp({ quality: 85 })
                .toFile(dest);
            console.log('Done.');
        } else {
            console.error(`File not found: ${src}`);
        }
    }
}

processImages().catch(console.error);
