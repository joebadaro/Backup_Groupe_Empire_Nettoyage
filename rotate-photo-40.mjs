
import sharp from 'sharp';
import fs from 'fs';

const file = 'public/images/catalog/photo-40.webp';
const temp = 'public/images/catalog/photo-40-rotated.webp';

async function rotate() {
    try {
        console.log(`Rotating ${file}...`);
        await sharp(file)
            .rotate(90)
            .toFile(temp);

        // We will keep the rotated file with a new name to avoid destroying the original if something goes wrong, 
        // or we can just point the code to the new file.
        // User asked to "place it", so pointing to the new file is safer.
        console.log(`Success! Created ${temp}`);
    } catch (err) {
        console.error('Error rotating image:', err);
    }
}

rotate();
