import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const catalogDir = 'c:/Projects/Backup_Groupe_Empire_Nettoyage/public/images/catalog';

async function processImage(filename, actions) {
    const filePath = path.join(catalogDir, filename);
    const tempPath = filePath + '.tmp.webp';
    
    try {
        console.log(`Processing ${filename}...`);
        // Read file into buffer to avoid locking the file
        const buffer = fs.readFileSync(filePath);
        let transformer = sharp(buffer);
        
        for (const action of actions) {
            if (action.type === 'rotate') {
                transformer = transformer.rotate(action.angle);
            } else if (action.type === 'trim') {
                transformer = transformer.trim();
            } else if (action.type === 'extract') {
                const metadata = await sharp(buffer).metadata();
                transformer = transformer.extract({
                    left: action.left || 0,
                    top: action.top || 0,
                    width: metadata.width - (action.left || 0) - (action.right || 0),
                    height: metadata.height - (action.top || 0) - (action.bottom || 0)
                });
            }
        }
        
        await transformer.toFile(tempPath);
        fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);
        console.log(`Successfully updated ${filename}`);
    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
    }
}

async function run() {
    // 1. Rotations (90 deg CW)
    const toRotate = ['photo-27.webp', 'photo-39.webp', 'photo-56.webp', 'photo-58.webp', 'photo-59.webp', 'photo-60.webp'];
    for (const file of toRotate) {
        await processImage(file, [{ type: 'rotate', angle: 90 }]);
    }
    
    // 2. Surgical Trims (Black borders)
    await processImage('photo-40.webp', [{ type: 'extract', left: 10, right: 10, top: 5, bottom: 5 }]);
    await processImage('photo-39.webp', [{ type: 'trim' }]);
    await processImage('resultat-tapis-propre-longueuil.webp', [{ type: 'extract', left: 5, right: 5, top: 5, bottom: 5 }]);
    
    console.log("Image restoration complete!");
}

run();
