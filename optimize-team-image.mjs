import sharp from 'sharp';

async function optimize() {
    console.log('Optimizing team image...');
    await sharp('public/images/catalog/equipe-interne.png')
        .resize({ width: 800 })
        .webp({ quality: 85 })
        .toFile('public/images/catalog/equipe-interne-optimized.webp');
    console.log('Saved to public/images/catalog/equipe-interne-optimized.webp');
}

optimize().catch(console.error);
