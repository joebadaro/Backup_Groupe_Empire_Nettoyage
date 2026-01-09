
import sharp from 'sharp';
import path from 'path';

const file = 'public/images/catalog/photo-27.webp';
const matched = 'public/images/catalog/photo-27-fixed.webp';

async function rotate() {
    try {
        console.log('Reading ' + file);
        // 90 degrees clockwise
        await sharp(file)
            .rotate(90)
            .toFile(matched);

        console.log('Created ' + matched);
    } catch (err) {
        console.error('Error rotating image:', err);
    }
}

rotate();
