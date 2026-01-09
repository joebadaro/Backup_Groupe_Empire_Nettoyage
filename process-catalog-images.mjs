import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SOURCE_DIR = 'src/images/originals';
const DEST_DIR = 'public/images/catalog';
const ARCHIVE_DIR = 'src/images/originals/processed';

// Ensure directories exist
if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

async function processImages() {
    // 1. Find the highest existing photo number
    const existingFiles = fs.readdirSync(DEST_DIR);
    let maxNum = 0;

    existingFiles.forEach(file => {
        const match = file.match(/^photo-(\d+)\.webp$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });

    console.log(`Current highest photo number: ${maxNum}`);
    let currentNum = maxNum + 1;

    // 2. Read new images
    const files = fs.readdirSync(SOURCE_DIR).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

    console.log(`Found ${files.length} images to process.`);

    // 3. Process each image
    for (const file of files) {
        const srcPath = path.join(SOURCE_DIR, file);
        const newFileName = `photo-${currentNum}.webp`;
        const destPath = path.join(DEST_DIR, newFileName);

        console.log(`Processing ${file} -> ${newFileName}...`);

        try {
            await sharp(srcPath)
                .rotate() // Auto-rotate based on EXIF
                .resize({ width: 1600, withoutEnlargement: true }) // meaningful max width
                .webp({ quality: 80 })
                .toFile(destPath);

            console.log(`Saved to ${destPath}`);

            // Move original to processed folder to avoid re-processing
            const archivePath = path.join(ARCHIVE_DIR, file);
            fs.renameSync(srcPath, archivePath);

            currentNum++;
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
        }
    }

    console.log(`Done! added ${currentNum - maxNum - 1} images.`);
}

processImages();
