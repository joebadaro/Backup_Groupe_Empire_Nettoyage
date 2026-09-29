/**
 * Installe l'image finale en 2550×3300 sans déformation (mise à l'échelle uniforme + fond blanc).
 */
import sharp from "sharp";
import { copyFileSync, mkdirSync } from "fs";

const SRC =
  process.argv[2] ??
  "C:/Users/joeba/.cursor/projects/c-Projects-Backup-Groupe-Empire-Nettoyage/assets/c__Users_joeba_AppData_Roaming_Cursor_User_workspaceStorage_0702762a32356e804427791f01082e21_images_image-dd24eadd-df84-4057-a528-dc66c279d63a.png";
const OUT = "public/images/admin/estimation-letter-template.webp";

const TARGET_W = 2550;
const TARGET_H = 3300;

mkdirSync("public/images/admin", { recursive: true });

const resized = await sharp(SRC)
  .resize(TARGET_W, TARGET_H, { fit: "inside", withoutEnlargement: false })
  .toBuffer();

await sharp({
  create: {
    width: TARGET_W,
    height: TARGET_H,
    channels: 3,
    background: { r: 255, g: 255, b: 255 },
  },
})
  .composite([{ input: resized, gravity: "center" }])
  .webp({ quality: 92, effort: 6 })
  .toFile(OUT);

const meta = await sharp(OUT).metadata();
console.log("Written", OUT, meta.width, meta.height, "bytes");
