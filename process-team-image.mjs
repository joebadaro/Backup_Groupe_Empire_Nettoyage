
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const input = 'C:/Users/joeba/.gemini/antigravity/brain/eb57f956-4f9a-461f-b3d7-5fd8b679be70/uploaded_image_1_1766551870525.jpg';
const output = 'public/images/catalog/team-van-back.webp';

async function process() {
    try {
        await sharp(input)
            .resize({ width: 800 }) // Good size for half-width column
            .webp({ quality: 85 })
            .toFile(output);
        console.log('Image processed:', output);
    } catch (err) {
        console.error(err);
    }
}
process();
