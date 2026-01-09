import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:/Users/joeba/.gemini/antigravity/brain/b86ba5c0-2d9d-4283-84de-24e785067f7f/';
const outputDir = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/public/images/catalog/';
const inputFile = 'uploaded_image_1766345146594.jpg';
const outputFile = 'photo-matelas-floating.webp';

async function processImage() {
    const inputPath = path.join(artifactsDir, inputFile);
    const outputPath = path.join(outputDir, outputFile);

    try {
        if (!fs.existsSync(inputPath)) {
            console.error(`Input file not found: ${inputPath}`);
            return;
        }

        await sharp(inputPath)
            .resize(800, null, { // Resize width to 800px, auto height - not too large
                withoutEnlargement: true
            })
            .webp({ quality: 85 })
            .toFile(outputPath);

        console.log(`Processed ${inputFile} -> ${outputFile}`);
    } catch (error) {
        console.error(`Error processing ${inputFile}:`, error);
    }
}

processImage();
