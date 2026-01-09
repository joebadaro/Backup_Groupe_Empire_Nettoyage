
import sharp from 'sharp';
import fs from 'fs';

const imgPath = 'public/images/catalog/hero-slide-2.webp';
const metadata = await sharp(imgPath).metadata();

console.log(`Dimensions: ${metadata.width}x${metadata.height}`);
console.log(`Format: ${metadata.format}`);
console.log(`Size: ${fs.statSync(imgPath).size} bytes`);
