import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const SOURCE_DIR = '../new pic'; // Relative to project root, on Desktop
const DEST_DIR = 'public/images/catalog';

async function processPhotos() {
    console.log('Starting photo import...');

    // 1. Get existing max index
    const existingFiles = await fs.readdir(DEST_DIR);
    let maxIndex = 0;
    for (const file of existingFiles) {
        const match = file.match(/photo-(\d+)(?:-rotated)?\.webp/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxIndex) maxIndex = num;
        }
    }
    console.log(`Current max photo index: ${maxIndex}`);

    // 2. Read new files
    try {
        const newFiles = await fs.readdir(SOURCE_DIR);
        let count = 0;

        for (const file of newFiles) {
            const ext = path.extname(file).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) {
                count++;
                const nextIndex = maxIndex + count;
                const inputPath = path.join(SOURCE_DIR, file);
                const outputPath = path.join(DEST_DIR, `photo-${nextIndex}.webp`);

                console.log(`Processing ${file} -> photo-${nextIndex}.webp`);

                await sharp(inputPath)
                    .webp({ quality: 80 })
                    .toFile(outputPath);
            }
        }
        console.log(`Successfully imported ${count} new photos.`);
    } catch (err) {
        console.error("Error reading source directory:", err.message);
    }
}

processPhotos();
