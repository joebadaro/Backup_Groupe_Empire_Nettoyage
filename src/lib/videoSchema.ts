/** Valeur par défaut si une vidéo n'a pas de date de publication connue. */
export const DEFAULT_VIDEO_UPLOAD_DATE = "2024-01-01T08:00:00+00:00";

/** Date YouTube — salon sectionnel (em1yhDedcOQ), utilisée sur l'accueil. */
export const SALON_SECTIONNEL_UPLOAD_DATE = "2026-04-13T15:55:36-07:00";

export function resolveVideoUploadDate(uploadDate?: string | null): string {
  const trimmed = uploadDate?.trim();
  return trimmed || DEFAULT_VIDEO_UPLOAD_DATE;
}
