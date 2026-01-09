
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const source = 'C:/Users/joeba/.gemini/antigravity/brain/00f82399-c86f-489f-8a04-bc7b4194de1f/uploaded_image_1765997371487.jpg';
const dest = 'public/images/catalog/photo-oriental-custom.webp';

async function process() {
    try {
        if (!fs.existsSync(source)) {
            console.error('Source file not found:', source);
            return;
        }

        await sharp(source)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(dest);

        console.log('Created ' + dest);
    } catch (err) {
        console.error('Error processing image:', err);
    }
}

process();
