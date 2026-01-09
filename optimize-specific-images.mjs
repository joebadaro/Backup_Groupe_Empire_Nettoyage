
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const imagesToOptimize = [
    'public/images/camion-tech.webp',
    'public/images/catalog/photo-117.webp',
    'public/images/catalog/photo-118.webp',
    'public/images/catalog/photo-122.webp',
    'public/images/catalog/photo-123.webp',
    'public/images/catalog/photo-124.webp',
    'public/images/catalog/photo-125.webp',
    'public/images/catalog/photo-126.webp',
    'public/images/catalog/photo-127.webp',
    'public/images/catalog/photo-128.webp',
    'public/images/catalog/photo-130.webp',
    'public/images/catalog/photo-132.webp',
    'public/images/catalog/photo-136.webp',
    'public/images/catalog/photo-137.webp',
    'public/images/catalog/photo-138.webp',
    'public/images/catalog/photo-140.webp',
    'public/images/catalog/photo-141.webp',
    'public/images/catalog/photo-142.webp',
    'public/images/catalog/photo-143.webp',
    'public/images/catalog/photo-144.webp',
    'public/images/catalog/photo-145.webp',
    'public/images/catalog/photo-147.webp',
    'public/images/catalog/photo-150.webp',
    'public/images/catalog/photo-155.webp',
    'public/images/choix-consommateur.png',
    'public/images/choix-quebec-transparent-v3.png',
    'public/images/choix-quebec-v3.png',
    'public/images/choix-quebec.png'
];

const rootDir = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage';

async function optimizeImages() {
    console.log('Starting image optimization...');

    for (const relativePath of imagesToOptimize) {
        const filePath = path.join(rootDir, relativePath);
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            continue;
        }

        try {
            const metadata = await sharp(filePath).metadata();
            const needsResize = metadata.width > 1920; // Only resize if wider than 1920px
            const isPng = filePath.endsWith('.png');

            console.log(`Processing ${relativePath} (${metadata.width}x${metadata.height})...`);

            let pipeline = sharp(filePath);

            if (needsResize) {
                pipeline = pipeline.resize(1920, null, { withoutEnlargement: true });
            }

            if (isPng) {
                // Compress PNG
                pipeline = pipeline.png({ quality: 80, compressionLevel: 9 });
            } else {
                // Compress WebP
                pipeline = pipeline.webp({ quality: 80 });
            }

            const tempPath = filePath + '.tmp';
            const buffer = await pipeline.toBuffer();
            fs.writeFileSync(tempPath, buffer);

            try {
                fs.copyFileSync(tempPath, filePath);
                fs.unlinkSync(tempPath);
                console.log(`Optimized ${relativePath}`);
            } catch (e) {
                console.error(`Could not write to ${relativePath} (locked?):`, e.message);
                // Try to clean up temp
                try { fs.unlinkSync(tempPath); } catch (z) { }
            }
        } catch (err) {
            console.error(`Error processing ${relativePath}:`, err);
        }
    }

    console.log('Optimization complete.');
}

optimizeImages();
