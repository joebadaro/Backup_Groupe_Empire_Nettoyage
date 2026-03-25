import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const img1Path = "C:\\Users\\joeba\\Desktop\\76\\location.jpg"; // left image (location)
const img2Path = "C:\\Users\\joeba\\Desktop\\76\\location ou pro.jpeg"; // right image (pro)
const outputPath = path.join(process.cwd(), 'public', 'images', 'conseils', 'nettoyage-vapeur-vs-location.webp');

async function createComposite() {
  try {
    if (!fs.existsSync(img1Path) || !fs.existsSync(img2Path)) {
      console.error("Error: Missing one or both source files on Desktop!");
      return;
    }

    // Target dimensions for EACH half: 400x600 (Total image: 800x600)
    const halfWidth = 400;
    const height = 600;

    // Process left image
    const leftBuffer = await sharp(img1Path)
      .resize(halfWidth, height, { fit: 'cover', position: 'center' })
      .toBuffer();

    // Process right image
    const rightBuffer = await sharp(img2Path)
      .resize(halfWidth, height, { fit: 'cover', position: 'center' })
      .toBuffer();

    // Create a beautiful VS badge in SVG
    const svgBadge = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" flood-opacity="0.4" />
          </filter>
        </defs>
        <!-- Center line -->
        <line x1="400" y1="0" x2="400" y2="600" stroke="#ffffff" stroke-width="4" />
        
        <!-- VS Badge Circle -->
        <circle cx="400" cy="300" r="38" fill="#0f172a" stroke="#ffffff" stroke-width="3" filter="url(#shadow)" />
        
        <!-- VS Text -->
        <text x="400" y="312" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle" letter-spacing="2">VS</text>
      </svg>
    `;

    // Composite them together onto an 800x600 canvas
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .composite([
        { input: leftBuffer, left: 0, top: 0 },
        { input: rightBuffer, left: 400, top: 0 },
        { input: Buffer.from(svgBadge), left: 0, top: 0 }
      ])
      .webp({ quality: 85 })
      .toFile(outputPath);

    console.log(`Successfully created VS collage at ${outputPath}`);
  } catch (error) {
    console.error("Error creating composite image:", error);
  }
}

createComposite();
