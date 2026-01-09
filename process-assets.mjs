
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SOURCE_DIR = 'raw-assets';
const DEST_BASE = 'public/images';
const CATEGORIES = {
    services: ['sofa', 'carpet', 'tapis', 'meuble', 'clean', 'cleaning', 'scotchgard'],
    equipe: ['worker', 'technician', 'technicien', 'equipe', 'team', 'camion', 'truck'],
    about: ['produit', 'product', 'logo'],
    realisations: [] // Default bucket
};

// Ensure dirs exist
['services', 'equipe', 'about', 'realisations'].forEach(dir => {
    const p = path.join(DEST_BASE, dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

async function processImages() {
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`Source directory ${SOURCE_DIR} not found!`);
        return;
    }

    const files = fs.readdirSync(SOURCE_DIR);
    let counters = { services: 1, equipe: 1, about: 1, realisations: 1 };

    console.log(`Found ${files.length} files. Processing...`);

    for (const file of files) {
        if (!file.match(/\.(jpg|jpeg|png|webp)$/i)) continue;

        const lowerName = file.toLowerCase();
        let category = 'realisations'; // Default

        // Determine category
        for (const [cat, keywords] of Object.entries(CATEGORIES)) {
            if (keywords.some(k => lowerName.includes(k))) {
                category = cat;
                break;
            }
        }

        const destDir = path.join(DEST_BASE, category);
        const newName = `${category}-${counters[category]++}.webp`;
        const destPath = path.join(destDir, newName);

        try {
            await sharp(path.join(SOURCE_DIR, file))
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(destPath);

            console.log(`Processed: ${file} -> ${category}/${newName}`);
        } catch (err) {
            console.error(`Failed to process ${file}:`, err.message);
        }
    }
}

processImages().catch(console.error);
