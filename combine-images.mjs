import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = path.join(__dirname, 'public', 'images', 'catalog');
const outputDir = path.join(__dirname, 'public', 'images', 'catalog');
const img1Path = path.join(inputDir, 'photo-14.webp');
const img2Path = path.join(inputDir, 'photo-30.webp');
const outputPath = path.join(outputDir, 'tapis-commercial-combo.webp');

async function combineImages() {
    try {
        console.log(`Loading images...`);
        const img1 = sharp(img1Path);
        const img2 = sharp(img2Path);

        const meta1 = await img1.metadata();
        const meta2 = await img2.metadata();

        // Resize to same height
        const targetHeight = 600;

        // Resize maintaining aspect ratio
        const buffer1 = await img1.resize({ height: targetHeight }).toBuffer();
        const buffer2 = await img2.resize({ height: targetHeight }).toBuffer();

        // Get new widths
        const meta1Resized = await sharp(buffer1).metadata();
        const meta2Resized = await sharp(buffer2).metadata();

        const width1 = meta1Resized.width;
        const width2 = meta2Resized.width;
        const totalWidth = width1 + width2;

        console.log(`Combined dimensions: ${totalWidth}x${targetHeight}`);

        await sharp({
            create: {
                width: totalWidth,
                height: targetHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .composite([
                { input: buffer1, left: 0, top: 0 },
                { input: buffer2, left: width1, top: 0 }
            ])
            .webp({ quality: 90 })
            .toFile(outputPath);

        console.log(`Success! Created ${outputPath}`);

    } catch (error) {
        console.error("Error creating composite:", error);
        process.exit(1);
    }
}

combineImages();
