/**
 * Prépare les photos avant envoi : compression JPEG côté navigateur quand c’est possible.
 * Les HEIC / formats non décodables par le canvas sont renvoyés tels quels s’ils respectent la taille max.
 */

const MAX_FILES = 5;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // aligné sur la fonction Netlify
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.78;

function mimeForCanvas(type: string): boolean {
  return /image\/(jpeg|jpg|pjpeg|png|webp)/i.test(type.trim());
}

function canTryBitmapDecode(file: File): boolean {
  if (mimeForCanvas(file.type)) return true;
  const t = (file.type || "").toLowerCase();
  if (t.includes("heic") || t.includes("heif")) return true;
  return /\.hei[cf]$/i.test(file.name);
}

async function compressWithCanvas(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  try {
    let w = bmp.width;
    let h = bmp.height;
    if (w > MAX_DIMENSION) {
      h = (h * MAX_DIMENSION) / w;
      w = MAX_DIMENSION;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no_canvas_context");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob_failed"))),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
    const base = file.name.replace(/\.[^.]+$/i, "") || "photo";
    return new File([blob], `${base}-estimation.jpg`, { type: "image/jpeg" });
  } finally {
    bmp.close();
  }
}

/**
 * Retourne jusqu’à 5 fichiers prêts pour FormData (compressés si possible).
 */
export async function preparePhotoFiles(
  fileList: FileList | null,
  isEn: boolean,
): Promise<{ files: File[]; warnings: string[] }> {
  const warnings: string[] = [];
  const out: File[] = [];
  if (!fileList?.length) return { files: out, warnings };

  const list = Array.from(fileList).slice(0, MAX_FILES);
  for (const file of list) {
    if (!file.type.startsWith("image/")) {
      warnings.push(
        file.name
          ? isEn
            ? `${file.name}: not recognized as an image.`
            : `${file.name} : fichier non reconnu comme image.`
          : isEn
            ? "Ignored: not an image."
            : "Fichier ignoré.",
      );
      continue;
    }

    let candidate: File = file;

    if (canTryBitmapDecode(file)) {
      try {
        candidate = await compressWithCanvas(file);
      } catch {
        candidate = file;
      }
    }

    if (candidate.size > MAX_PHOTO_BYTES) {
      const kb = Math.round(candidate.size / 1024);
      warnings.push(
        isEn
          ? `${file.name}: still too large after compression (${kb} KB). This file was not included.`
          : `${file.name} : fichier trop volumineux même après réduction (${kb} Ko). Ce fichier n'a pas été inclus.`,
      );
      continue;
    }

    out.push(candidate);
  }

  return { files: out, warnings };
}
