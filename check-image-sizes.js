
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const directory = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/public/images/catalog';

async function checkDimensions() {
    console.log('--- Checking Image Dimensions ---');
    try {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            if (file.endsWith('.webp') || file.endsWith('.jpg') || file.endsWith('.png')) {
                const filePath = path.join(directory, file);
                const metadata = await sharp(filePath).metadata();
                console.log(`${file}: ${metadata.width}x${metadata.height} (Ratio: ${(metadata.width / metadata.height).toFixed(2)})`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkDimensions();
