
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const input = 'public/images/catalog/hero-slide-2.webp';
const output = 'public/images/catalog/hero-slide-2-mobile.webp';

async function generateMobileHero() {
    try {
        console.log(`Optimizing ${input} for mobile...`);
        const image = sharp(input);
        const metadata = await image.metadata();

        console.log(`Original: ${metadata.width}x${metadata.height}, ${fs.statSync(input).size} bytes`);

        // Resize to width 800px (sufficient for high-DPI mobile)
        // Lighter quality (80)
        await image
            .resize({ width: 800 })
            .webp({ quality: 80, effort: 6 })
            .toFile(output);

        const newStats = fs.statSync(output);
        console.log(`Mobile: 800px width, ${newStats.size} bytes`);
        console.log(`Reduction: ${Math.round((1 - newStats.size / fs.statSync(input).size) * 100)}%`);

    } catch (err) {
        console.error('Error:', err);
    }
}

generateMobileHero();
