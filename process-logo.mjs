
import sharp from 'sharp';
import fs from 'fs';

const source = 'C:/Users/joeba/.gemini/antigravity/brain/00f82399-c86f-489f-8a04-bc7b4194de1f/uploaded_image_0_1766001988280.png';
const dest = 'public/images/logo-empire.webp';

async function process() {
    try {
        if (!fs.existsSync(source)) {
            console.error('Source file not found:', source);
            return;
        }

        // Convert to webp, ensuring transparency is preserved
        await sharp(source)
            .trim() // Remove extra whitespace around the logo if any
            .resize({ height: 150 }) // Resizing for optimal web header usage, keeping aspect ratio
            .webp({ quality: 90, nearLossless: true })
            .toFile(dest);

        console.log('Created ' + dest);
    } catch (err) {
        console.error('Error processing logo:', err);
    }
}

process();
