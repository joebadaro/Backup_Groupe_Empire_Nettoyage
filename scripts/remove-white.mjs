import sharp from 'sharp';

async function removeWhite() {
    const src = 'public/images/logo-avec-background.png';
    const metadata = await sharp(src).metadata();
    
    // We will ensure an alpha channel exists and turn any pixel that is near-white into transparent.
    const { data, info } = await sharp(src)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Loop through every pixel (4 channels: r, g, b, a)
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];

        // If the pixel is pure white or very close to it, make it transparent
        if (r > 240 && g > 240 && b > 240) {
            data[i+3] = 0; // alpha = 0
        }
    }

    // Save as transparent WebP
    const transparentBuffer = await sharp(data, {
        raw: {
            width: info.width,
            height: info.height,
            channels: 4
        }
    })
    .trim() // removes transparent padding!
    .webp({ quality: 100, nearLossless: true })
    .toBuffer();

    // Now write out to all responsive sizes
    const basename = 'public/images/logo-avec-background-optimized';
    await sharp(transparentBuffer).toFile(basename + '.webp');
    
    const sizes = [240, 360, 480, 600];
    for (const width of sizes) {
        await sharp(transparentBuffer)
            .resize({ width, withoutEnlargement: true })
            .toFile(`${basename}-${width}.webp`);
    }

    console.log("White background completely removed!");
}

removeWhite().catch(console.error);
