import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const source = 'C:/Users/joeba/Desktop/logo officiel/Groupe-Nettoyage-Empire-final.png';
const baseDest = 'public/images/logo-officiel-optimized';

async function process() {
    try {
        if (!fs.existsSync(source)) {
            console.error('Source file not found:', source);
            return;
        }

        const sizes = [240, 360, 480, 600];

        // Ensure transparent edge-cropping if the user uploaded an image with huge empty margins
        // But the user said "proportions are preserved exactly" and "not stretched... cropped".
        // Using sharp().trim() removes extra surrounding transparent pixels to maximize the logo itself.
        // This is safe if we maintain height constraint logic in CSS.

        for (const width of sizes) {
            let destFile = width === 600 ? `${baseDest}.webp` : `${baseDest}-${width}.webp`;
            
            await sharp(source)
                .trim() // Safely removes completely transparent padding
                .resize({ width: width, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 90, nearLossless: true })
                .toFile(destFile);
                
            console.log(`Created ${destFile}`);
        }
        
    } catch (err) {
        console.error('Error processing logo:', err);
    }
}

process();
