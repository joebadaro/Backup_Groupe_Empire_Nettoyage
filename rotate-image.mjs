
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const file = 'public/images/catalog/photo-39.webp';
const temp = 'public/images/catalog/photo-39-rotated.webp';

async function rotate() {
    try {
        // 90 degrees clockwise
        await sharp(file)
            .rotate(90)
            .toFile(temp);

        // Replace original
        fs.unlinkSync(file);
        fs.renameSync(temp, file);
        console.log('Rotated photo-39.webp successfully.');
    } catch (err) {
        console.error('Error rotating image:', err);
    }
}

rotate();
