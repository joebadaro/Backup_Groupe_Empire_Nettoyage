import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = 'C:/Users/joeba/.gemini/antigravity/brain/b86ba5c0-2d9d-4283-84de-24e785067f7f/uploaded_image_1766339274782.jpg';
const outputPath = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/public/images/catalog/photo-168.webp';

async function processImage() {
    try {
        if (!fs.existsSync(inputPath)) {
            console.error('Input file not found:', inputPath);
            return;
        }

        await sharp(inputPath)
            .resize(1200, null, { // Resize to standard width, maintain aspect ratio
                withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .toFile(outputPath);

        console.log(`Successfully processed and saved to ${outputPath}`);
    } catch (error) {
        console.error('Error processing image:', error);
    }
}

processImage();
