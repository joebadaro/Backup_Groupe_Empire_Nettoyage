import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const images = [
    { src: 'public/images/hero-bg.png', dest: 'public/images/hero-bg-optimized.webp', width: 1920 }, // Full HD max
    { src: 'public/images/camion-tech.webp', dest: 'public/images/camion-tech-optimized.webp', width: 800 }, // Reduced width for section image
    { src: 'public/images/service-tapis.jpg', dest: 'public/images/service-tapis-optimized.webp', width: 800 },
    { src: 'public/images/service-meubles.jpg', dest: 'public/images/service-meubles-optimized.webp', width: 800 }
];

async function optimize() {
    for (const img of images) {
        if (fs.existsSync(img.src)) {
            console.log(`Optimizing ${img.src}...`);
            await sharp(img.src)
                .resize({ width: img.width, withoutEnlargement: true })
                .webp({ quality: 80 }) // Good balance for photos
                .toFile(img.dest);
            console.log(`Saved to ${img.dest}`);
        } else {
            console.log(`Skipping ${img.src} (Not found)`);
        }
    }
}

optimize().catch(console.error);
