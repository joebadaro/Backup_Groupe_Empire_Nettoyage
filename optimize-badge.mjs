import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'public', 'images', 'choix-quebec-transparent-v3.png');
const outputPath = path.join(__dirname, 'public', 'images', 'choix-quebec-optimized.webp');

async function optimizeBadge() {
    try {
        console.log(`Optimizing ${inputPath}...`);

        await sharp(inputPath)
            .resize({ width: 200 }) // Resize to reasonable max width for an icon
            .webp({ quality: 90, nearLossless: true })
            .toFile(outputPath);

        console.log(`Success! Created ${outputPath}`);

    } catch (error) {
        console.error("Error optimizing image:", error);
        process.exit(1);
    }
}

optimizeBadge();
