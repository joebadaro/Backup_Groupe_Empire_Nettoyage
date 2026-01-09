import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'public', 'images', 'choix-quebec-v3.png');
const outputPath = path.join(__dirname, 'public', 'images', 'choix-quebec-transparent-v3.png');

async function removeBackground() {
    try {
        console.log(`Processing ${inputPath}...`);

        // Create a pipeline
        // 1. Load image
        // 2. Ensure alpha channel
        // 3. Simple approach: use a threshold to find white background and make it transparent
        // Since complex background removal is hard with just sharp, we'll try a "trim" or simple band math if possible, 
        // but sharp doesn't have a reliable "magic wand". 
        // However, knowing this is a logo on white, we can try to map white to transparent.

        const { data, info } = await sharp(inputPath)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const pixelArray = new Uint8ClampedArray(data.buffer);

        // Loop through pixels
        // Format is RGBA
        for (let i = 0; i < pixelArray.length; i += 4) {
            const r = pixelArray[i];
            const g = pixelArray[i + 1];
            const b = pixelArray[i + 2];

            // Check if pixel is white (or close to white)
            if (r > 240 && g > 240 && b > 240) {
                pixelArray[i + 3] = 0; // Set Alpha to 0
            }
        }

        await sharp(pixelArray, {
            raw: {
                width: info.width,
                height: info.height,
                channels: 4
            }
        })
            .png()
            .toFile(outputPath);

        console.log(`Success! Created ${outputPath}`);

    } catch (error) {
        console.error("Error processing image:", error);
        process.exit(1);
    }
}

removeBackground();
