/**
 * Phase 108 — recent backgrounds quick switcher.
 *
 * Records every background image the GM has applied (via session
 * menu upload, Phase 100 drag-drop / paste, or the preset-backgrounds
 * modal). The tracked metadata is light: just `{imageId, mimeType,
 * lastUsedAt}` per entry. The actual blob lives in the existing IDB
 * `images` store — recent-backgrounds is a thin index over it that
 * the picker UI reads to surface "recently used" maps for one-click
 * re-application without re-uploading.
 *
 * Mirrors the shape of the Phase 75 scene-recents + Phase 107
 * dice-history modules: pure helper, localStorage-backed, versioned
 * envelope, defensive parsing, move-to-front dedupe, capped at
 * `MAX_RECENT_BACKGROUNDS` (12 — generous for a session, bounded so
 * localStorage stays small even after many imports).
 */
import type { ID } from './types.js';

const KEY = 'gm-encounter-maps-recent-backgrounds';
const VERSION = 1;
export const MAX_RECENT_BACKGROUNDS = 12;

export interface RecentBackground {
  /** IDB images-store key. */
  imageId: ID;
  /** MIME type as captured at upload time. Used by the picker for the thumbnail. */
  mimeType: string;
  /** Optional human label (e.g. an uploaded file's name). */
  name?: string;
  /** ms since epoch of the last application (most-recent-first ordering). */
  lastUsedAt: number;
}

interface Envelope {
  version: number;
  entries: RecentBackground[];
}

function isRecent(v: unknown): v is RecentBackground {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.imageId !== 'string' || o.imageId.length === 0) return false;
  if (typeof o.mimeType !== 'string') return false;
  if (typeof o.lastUsedAt !== 'number' || !Number.isFinite(o.lastUsedAt)) {
    return false;
  }
  if (o.name !== undefined && typeof o.name !== 'string') return false;
  return true;
}

function read(): Envelope {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: VERSION, entries: [] };
    const parsed = JSON.parse(raw) as Partial<Envelope>;
    if (
      !parsed ||
      parsed.version !== VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      return { version: VERSION, entries: [] };
    }
    return {
      version: VERSION,
      entries: parsed.entries.filter(isRecent),
    };
  } catch {
    return { version: VERSION, entries: [] };
  }
}

function write(env: Envelope): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(env));
  } catch (err) {
    console.warn('[recent-backgrounds] persist failed', err);
  }
}

/**
 * Record a background as just-used. If the imageId is already in the
 * list, MOVE IT to the front (move-to-front dedupe) and refresh
 * `lastUsedAt`. Trims to `MAX_RECENT_BACKGROUNDS` after insert.
 */
export function recordBackground(
  imageId: ID,
  mimeType: string,
  options: { name?: string; now?: number } = {},
): void {
  if (!imageId) return;
  const now = options.now ?? Date.now();
  const env = read();
  const existing = env.entries.findIndex((e) => e.imageId === imageId);
  const entry: RecentBackground = {
    imageId,
    mimeType,
    lastUsedAt: now,
    ...(options.name ? { name: options.name } : {}),
  };
  // Preserve the existing name if the new call didn't supply one — a
  // re-application from the picker doesn't have a file name to attach,
  // and we don't want to lose the friendly label the user uploaded with.
  if (existing >= 0 && options.name === undefined) {
    const prior = env.entries[existing]!;
    if (prior.name) entry.name = prior.name;
  }
  const next = env.entries.slice();
  if (existing >= 0) next.splice(existing, 1);
  next.unshift(entry);
  if (next.length > MAX_RECENT_BACKGROUNDS) {
    next.length = MAX_RECENT_BACKGROUNDS;
  }
  write({ version: VERSION, entries: next });
}

/**
 * Newest-first list of recent backgrounds. Returns a fresh array;
 * caller mutations don't affect the store.
 */
export function listRecent(): RecentBackground[] {
  return read().entries.slice();
}

/**
 * Drop a single entry (e.g. when the picker discovers the image is
 * no longer in IDB and the row is broken). No-op for unknown ids.
 */
export function forgetBackground(imageId: ID): void {
  const env = read();
  if (!env.entries.some((e) => e.imageId === imageId)) return;
  write({
    version: VERSION,
    entries: env.entries.filter((e) => e.imageId !== imageId),
  });
}

/** Test-only: blow away the entire list. */
export function _resetAll(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignored */
  }
}
