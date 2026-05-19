/** Persistance locale — visite estimée (incrément si > 24 h depuis lastVisitCountedAt). */

export const STORAGE_KEY = "empire_video_visitor_v1";
export const SESSION_ID_KEY = "empire_vit_session_id";

const MS_24_HOURS = 24 * 60 * 60 * 1000;

export interface VideoVisitorState {
  visitorId: string;
  visitCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastVisitCountedAt: string;
  /** Conservé pour compatibilité des données existantes ; non utilisé pour l’incrément. */
  lastVisitCountedDay?: string;
  currentSessionId: string;
}

export function createVisitorId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `v-${Date.now().toString(36)}-${rand()}${rand()}`;
}

export function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = createVisitorId();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return createVisitorId();
  }
}

function loadState(): VideoVisitorState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VideoVisitorState;
    if (!parsed?.visitorId || typeof parsed.visitCount !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: VideoVisitorState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

function parseIsoMs(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Estime les visites distinctes dans le temps (pas les pages vues).
 * Incrémente visitCount seulement si plus de 24 h depuis lastVisitCountedAt.
 */
export function syncVisitCount(): { visitCount: number; visitorId: string } {
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const sessionId = getOrCreateSessionId();

  let state = loadState();

  if (!state) {
    state = {
      visitorId: createVisitorId(),
      visitCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
      lastVisitCountedAt: now,
      currentSessionId: sessionId,
    };
    saveState(state);
    return { visitCount: state.visitCount, visitorId: state.visitorId };
  }

  state.lastSeenAt = now;
  state.currentSessionId = sessionId;

  const refMs =
    parseIsoMs(state.lastVisitCountedAt) ?? parseIsoMs(state.lastSeenAt);

  if (refMs !== null && nowMs - refMs > MS_24_HOURS) {
    state.visitCount += 1;
    state.lastVisitCountedAt = now;
  }

  saveState(state);
  return { visitCount: state.visitCount, visitorId: state.visitorId };
}

export function formatVisitEstimate(visitCount: number | undefined): string {
  if (!visitCount || visitCount < 1 || !Number.isFinite(visitCount)) {
    return "inconnue";
  }
  if (visitCount === 1) return "1re visite";
  if (visitCount === 2) return "2e visite";
  return `${visitCount}e visite`;
}

/** Dev / test : simuler un retour après N heures */
export function debugSetLastVisitCountedHoursAgo(hoursAgo: number): void {
  const state = loadState();
  if (!state) return;
  state.lastVisitCountedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  saveState(state);
}
