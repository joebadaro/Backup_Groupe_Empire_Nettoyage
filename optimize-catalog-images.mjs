
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_DIR = path.join(__dirname, 'public', 'images', 'catalog');
const OUT_DIR = path.join(__dirname, 'public', 'images', 'catalog_optimized');
const MAX_SIZE_MB = 0.5; // 500KB target
const MAX_WIDTH = 1920; // Full HD max width
const QUALITY = 80;

async function optimizeImages() {
    console.log(`Starting image optimization...`);
    console.log(`Source: ${CATALOG_DIR}`);
    console.log(`Target: ${OUT_DIR}`);

    if (!fs.existsSync(CATALOG_DIR)) {
        console.error(`Directory not found: ${CATALOG_DIR}`);
        return;
    }

    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    const files = fs.readdirSync(CATALOG_DIR);
    let optimizedCount = 0;
    let copiedCount = 0;

    for (const file of files) {
        if (!file.match(/\.(webp|jpg|jpeg|png)$/i)) continue;

        const sourcePath = path.join(CATALOG_DIR, file);
        const targetPath = path.join(OUT_DIR, file);
        const stats = fs.statSync(sourcePath);
        const fileSizeMB = stats.size / (1024 * 1024);

        if (fileSizeMB > MAX_SIZE_MB) {
            console.log(`Optimizing: ${file} (${fileSizeMB.toFixed(2)} MB)`);
            try {
                await sharp(sourcePath)
                    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
                    .webp({ quality: QUALITY })
                    .toFile(targetPath);

                const newStats = fs.statSync(targetPath);
                console.log(`  -> Optimized to: ${(newStats.size / (1024 * 1024)).toFixed(2)} MB`);
                optimizedCount++;
            } catch (err) {
                console.error(`  Error processing ${file}:`, err);
            }
        } else {
            // Just copy small files so we have a full complete set
            fs.copyFileSync(sourcePath, targetPath);
            copiedCount++;
        }
    }

    console.log(`\nOptimization Complete!`);
    console.log(`Images Optimized: ${optimizedCount}`);
    console.log(`Images Copied (Already small): ${copiedCount}`);
    console.log(`\nIMPORTANT: The optimized images are in 'public/images/catalog_optimized'.`);
    console.log(`Please stop the dev server and replace the 'catalog' folder content with 'catalog_optimized' manually to avoid lock errors.`);
}

optimizeImages();
