import sharp from 'sharp';
import path from 'path';

await sharp("C:\\Users\\joeba\\Desktop\\76\\cat urine.png")
  .flatten({ background: '#ffffff' })
  .resize(800, null, { withoutEnlargement: true })
  .webp({ quality: 82 })
  .toFile(path.join('public', 'images', 'conseils', 'urine-chimie-acide-urique.webp'));

console.log('✓ urine-chimie-acide-urique.webp');
