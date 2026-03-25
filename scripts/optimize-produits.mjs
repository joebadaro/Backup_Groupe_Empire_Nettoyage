import sharp from 'sharp';
await sharp("C:\\Users\\joeba\\Desktop\\addpictwebsite\\enzyme&oxigen.jpeg")
  .flatten({ background: '#ffffff' })
  .resize(800, null, { withoutEnlargement: true })
  .webp({ quality: 85 })
  .toFile('public/images/conseils/produits-odorbreak-biobreak.webp');
console.log('✓ produits-odorbreak-biobreak.webp');
