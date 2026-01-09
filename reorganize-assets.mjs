
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SOURCE_DIR = 'raw-assets';
const DEST_DIR = 'public/images/catalog';

// Ensure dir exists
if (fs.existsSync(DEST_DIR)) {
    fs.rmSync(DEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DEST_DIR, { recursive: true });

async function processImages() {
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`Source directory ${SOURCE_DIR} not found!`);
        return;
    }

    // Get files and sort them to ensure deterministic numbering
    // We sort by name so if user adds files later, order might change, but for now it's stable.
    const files = fs.readdirSync(SOURCE_DIR)
        .filter(f => f.match(/\.(jpg|jpeg|png|webp|JPG|PNG)$/i))
        .sort();

    console.log(`Found ${files.length} files. Renaming and Processing...`);

    let count = 1;

    for (const file of files) {
        const ext = path.extname(file);
        const newName = `photo-${count}.webp`; // Always standardize to webp
        const destPath = path.join(DEST_DIR, newName);

        try {
            await sharp(path.join(SOURCE_DIR, file))
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }) // Good max size for reviewing
                .webp({ quality: 80 })
                .toFile(destPath);

            console.log(`${file} -> ${newName}`);
            count++;
        } catch (err) {
            console.error(`Failed to process ${file}:`, err.message);
        }
    }

    console.log('Done.');
}

processImages().catch(console.error);
