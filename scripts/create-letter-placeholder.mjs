import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/images/admin", { recursive: true });

const w = 850;
const h = 1100;
const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f4f6f8"/>
  <rect x="0" y="0" width="100%" height="22%" fill="#001f3f"/>
  <text x="50%" y="12%" text-anchor="middle" fill="#fff" font-family="Arial" font-size="28" font-weight="700">GROUPE NETTOYAGE EMPIRE</text>
  <text x="50%" y="18%" text-anchor="middle" fill="#c8d4e0" font-family="Arial" font-size="16">(514) 893-9939</text>
  <rect x="7%" y="27%" width="86%" height="53%" fill="#fff" stroke="#c5cdd6" stroke-width="2" stroke-dasharray="8 6" rx="4"/>
  <text x="50%" y="30%" text-anchor="middle" fill="#94a3b8" font-family="Arial" font-size="14">Zone de contenu — placeholder</text>
  <rect x="0" y="84%" width="100%" height="16%" fill="#e2e8f0"/>
  <text x="50%" y="92%" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="13">Pied de page — placeholder</text>
</svg>`;

await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(
  "public/images/admin/estimation-letter-template.webp",
);
console.log("Created public/images/admin/estimation-letter-template.webp");
