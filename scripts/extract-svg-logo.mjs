import fs from 'fs';
import sharp from 'sharp';

async function check() {
    const svgData = fs.readFileSync('public/images/logo-avec-background.svg', 'utf8');
    const img1Match = svgData.match(/id="_Image1" width="1685px" height="218px" xlink:href="data:image\/png;base64,([^"]+)"/);
    if(img1Match) {
       const m = await sharp(Buffer.from(img1Match[1], 'base64')).metadata();
       console.log("Image1 hasAlpha:", m.hasAlpha);
    }
}
check().catch(console.error);
