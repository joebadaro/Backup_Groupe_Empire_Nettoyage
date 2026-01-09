
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = 'C:/Users/joeba/.gemini/antigravity/brain/a43a8088-735b-424a-a635-99f1b936decf';
const DEST_DIR = path.join(__dirname, 'public/images/catalog');

// Uploaded files map
const uploadedFiles = [
    'uploaded_image_1766581738725.jpg'
];

async function processImages() {
    // 1. Find next index
    const files = fs.readdirSync(DEST_DIR);
    let maxIndex = 0;
    const photoRegex = /^photo-(\d+)\.webp$/;

    files.forEach(file => {
        const match = file.match(photoRegex);
        if (match) {
            const index = parseInt(match[1], 10);
            if (index > maxIndex) maxIndex = index;
        }
    });

    console.log(`Current max index is ${maxIndex}. Starting from ${maxIndex + 1}`);

    let currentIndex = maxIndex + 1;
    const processedFiles = [];

    for (const filename of uploadedFiles) {
        const sourcePath = path.join(UPLOAD_DIR, filename);
        if (!fs.existsSync(sourcePath)) {
            console.error(`File not found: ${sourcePath}`);
            continue;
        }

        const newFilename = `photo-${currentIndex}.webp`;
        const destPath = path.join(DEST_DIR, newFilename);

        console.log(`Processing ${filename} -> ${newFilename}`);

        try {
            await sharp(sourcePath)
                .resize({ width: 1600, withoutEnlargement: true }) // Good for hero
                .webp({ quality: 80 })
                .toFile(destPath);

            processedFiles.push(`/images/catalog/${newFilename}`);
            currentIndex++;
        } catch (err) {
            console.error(`Error processing ${filename}:`, err);
        }
    }

    console.log("Processed Files:", JSON.stringify(processedFiles, null, 2));
}

processImages().catch(console.error);
