import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const img1Path = "C:\\Users\\joeba\\Desktop\\76\\location.jpg"; // left image (location)
const img2Path = "C:\\Users\\joeba\\Desktop\\76\\procleaners.jpeg"; // right image (procleaners)
const outputPath = path.join(process.cwd(), 'public', 'images', 'conseils', 'nettoyage-vapeur-vs-location.webp');

async function createStaggeredComposite() {
  try {
    if (!fs.existsSync(img1Path) || !fs.existsSync(img2Path)) {
      console.error("Error: Missing one or both source files on Desktop!");
      return;
    }

    // Process Left Image (Location - smaller, higher up)
    const leftBufferRaw = await sharp(img1Path)
      .resize(360, 360, { fit: 'inside' })
      .toBuffer();
    
    // Add white frame border
    const leftBuffer = await sharp(leftBufferRaw)
      .extend({ top: 12, bottom: 12, left: 12, right: 12, background: '#ffffff' })
      .toBuffer();

    // Process Right Image (Pro - larger, lower down)
    const rightBufferRaw = await sharp(img2Path)
      .resize(440, 440, { fit: 'inside' })
      .toBuffer();

    // Add white frame border
    const rightBuffer = await sharp(rightBufferRaw)
      .extend({ top: 12, bottom: 12, left: 12, right: 12, background: '#ffffff' })
      .toBuffer();

    // SVG Badges and Accents
    const svgBadge = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <!-- Connecting decorative swoosh line behind the circle -->
        <path d="M 280 200 C 350 200, 350 280, 420 280" fill="none" stroke="#64b5f6" stroke-width="4" stroke-dasharray="8 6" />
        
        <!-- Big VS Circle -->
        <circle cx="410" cy="270" r="45" fill="#0f172a" stroke="#ffffff" stroke-width="4" />
        
        <!-- VS Text -->
        <text x="410" y="284" font-family="Arial, sans-serif" font-weight="900" font-size="36" fill="#ffffff" text-anchor="middle" letter-spacing="2">VS</text>
      </svg>
    `;

    // Composite them together onto an 800x600 transparent canvas
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent
      }
    })
      .composite([
        { input: leftBuffer, left: 20, top: 20 },
        { input: rightBuffer, left: 320, top: 120 },
        { input: Buffer.from(svgBadge), left: 0, top: 0 }
      ])
      .webp({ quality: 90 }) // High quality WebP
      .toFile(outputPath);

    console.log(`Successfully created staggered VS collage at ${outputPath}`);
  } catch (error) {
    console.error("Error creating composite image:", error);
  }
}

createStaggeredComposite();
