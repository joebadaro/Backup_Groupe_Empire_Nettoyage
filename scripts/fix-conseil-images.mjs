import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Re-process all conseil images with a white background to eliminate any transparent areas.
// This fixes black borders showing through the dark CSS background-color.
const conseils = [
  { input: 'C:\\Users\\joeba\\Desktop\\76\\preparation pour nett.png',   output: 'preparer-visite-nettoyage.webp' },
  { input: 'C:\\Users\\joeba\\Desktop\\76\\frequancenett.png',            output: 'frequence-nettoyage-tapis.webp' },
  { input: 'C:\\Users\\joeba\\Desktop\\76\\cuiretlingettes.png',          output: 'entretien-cuir-erreurs.webp' },
  { input: 'C:\\Users\\joeba\\Desktop\\76\\enlever-odeur-pipi-chat-tapis.webp', output: 'urine-animaux-tapis.webp' },
  { input: 'C:\\Users\\joeba\\Desktop\\76\\canape-tissu-tache-vin-rouge-salon-famille.webp', output: 'erreurs-taches-tapis.webp' },
  { input: 'C:\\Users\\joeba\\Desktop\\76\\location.jpg',                 output: 'location-vs-pro-1.webp' },
];

const outDir = 'public/images/conseils';

async function reprocess() {
  for (const { input, output } of conseils) {
    if (!fs.existsSync(input)) {
      console.warn(`MISSING: ${input}`);
      continue;
    }
    
    const meta = await sharp(input).metadata();
    const w = Math.min(meta.width, 900); // max 900px wide

    await sharp(input)
      // Flatten transparency onto a solid white background before converting
      .flatten({ background: '#ffffff' })
      .resize(w, null, { withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(outDir, output));

    console.log(`✓ ${output}`);
  }
  console.log('All done!');
}

reprocess().catch(console.error);
