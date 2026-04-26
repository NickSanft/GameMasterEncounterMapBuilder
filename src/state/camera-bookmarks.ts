/**
 * Phase 102 — named camera bookmarks.
 *
 * The GM can save the current camera (`{x, y, zoom}`) as a named
 * bookmark scoped to the active scene. Later, jumping to a bookmark
 * restores the camera. Slots 1..9 (the first nine bookmarks per
 * scene, in newest-first order) are bound to `Alt+1..9` so the GM
 * can hop between named viewpoints during play without opening a
 * modal.
 *
 * Per-scene scoping: bookmarks for "Throne Room" don't leak into
 * "Forest Glade" — each scene's catalog is independent. We key by
 * the `sceneId` already used by the rest of the persistence layer
 * (`getActiveSceneId()`); deleting a scene also forgets its
 * bookmarks via `forgetScene(sceneId)`.
 *
 * Storage: localStorage under `gm-encounter-maps-camera-bookmarks`,
 * a versioned JSON envelope. Defensive against malformed blobs +
 * version mismatches; falls back to empty.
 *
 * Pure module — no DOM access. The UI + entry layer wire the
 * resulting list into the modal + the keyboard shortcut.
 */
import type { Camera } from './types.js';
import { nid } from '../util/id.js';

const KEY = 'gm-encounter-maps-camera-bookmarks';
const VERSION = 1;
/**
 * Cap per scene. Beyond this we evict the oldest entries — protects
 * localStorage quota when a long-lived session accumulates dozens
 * of named viewpoints. 32 is generous (e.g. Hexcrawl with one
 * bookmark per region) but still bounded.
 */
export const MAX_BOOKMARKS_PER_SCENE = 32;

/** Slots that map to Alt+1..9 in the GM entry. */
export const HOTKEY_SLOTS = 9;

export interface CameraBookmark {
  id: string;
  /** Scene this bookmark belongs to. Bookmarks are scene-scoped. */
  sceneId: string;
  /** GM-supplied display name (e.g. "Throne room"). */
  name: string;
  camera: Camera;
  /** ms since epoch — used for newest-first ordering. */
  createdAt: number;
}

interface Envelope {
  version: number;
  /** Flat list across all scenes; we filter by sceneId on read. */
  entries: CameraBookmark[];
}

function isCamera(v: unknown): v is Camera {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.x === 'number' &&
    typeof o.y === 'number' &&
    typeof o.zoom === 'number' &&
    Number.isFinite(o.x) &&
    Number.isFinite(o.y) &&
    Number.isFinite(o.zoom) &&
    (o.zoom as number) > 0
  );
}

function isBookmark(v: unknown): v is CameraBookmark {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.sceneId === 'string' &&
    typeof o.name === 'string' &&
    typeof o.createdAt === 'number' &&
    Number.isFinite(o.createdAt) &&
    isCamera(o.camera)
  );
}

function read(): Envelope {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: VERSION, entries: [] };
    const parsed = JSON.parse(raw) as Partial<Envelope>;
    if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.entries)) {
      return { version: VERSION, entries: [] };
    }
    return {
      version: VERSION,
      entries: parsed.entries.filter(isBookmark),
    };
  } catch {
    return { version: VERSION, entries: [] };
  }
}

function write(env: Envelope): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(env));
  } catch (err) {
    // Privacy mode / quota exceeded — bookmarks are a convenience,
    // not critical state. Warn so the user can debug, but don't throw.
    console.warn('[camera-bookmarks] persist failed', err);
  }
}

/**
 * Add a new bookmark for `sceneId`. Returns the created entry. Trims
 * the per-scene list down to MAX_BOOKMARKS_PER_SCENE if necessary
 * (oldest first) so quota usage stays bounded.
 */
export function addBookmark(
  sceneId: string,
  name: string,
  camera: Camera,
  now: number = Date.now(),
): CameraBookmark {
  const trimmed = name.trim();
  const entry: CameraBookmark = {
    id: nid(),
    sceneId,
    name: trimmed || 'Untitled bookmark',
    camera: { x: camera.x, y: camera.y, zoom: camera.zoom },
    createdAt: now,
  };
  const env = read();
  const next = [...env.entries, entry];
  // Evict oldest entries within this scene if we're over the cap.
  const sameScene = next.filter((e) => e.sceneId === sceneId);
  if (sameScene.length > MAX_BOOKMARKS_PER_SCENE) {
    sameScene.sort((a, b) => a.createdAt - b.createdAt); // oldest first
    const toEvict = sameScene.slice(0, sameScene.length - MAX_BOOKMARKS_PER_SCENE);
    const evictIds = new Set(toEvict.map((e) => e.id));
    write({
      version: VERSION,
      entries: next.filter((e) => !evictIds.has(e.id)),
    });
  } else {
    write({ version: VERSION, entries: next });
  }
  return entry;
}

/**
 * Patch a bookmark's name and / or camera. No-op if the id isn't
 * known (e.g. it was deleted in another tab).
 */
export function updateBookmark(
  id: string,
  changes: { name?: string; camera?: Camera },
): void {
  const env = read();
  const idx = env.entries.findIndex((e) => e.id === id);
  if (idx < 0) return;
  const existing = env.entries[idx]!;
  const next: CameraBookmark = {
    ...existing,
    ...(changes.name !== undefined
      ? { name: changes.name.trim() || existing.name }
      : {}),
    ...(changes.camera !== undefined
      ? {
          camera: {
            x: changes.camera.x,
            y: changes.camera.y,
            zoom: changes.camera.zoom,
          },
        }
      : {}),
  };
  const entries = env.entries.slice();
  entries[idx] = next;
  write({ version: VERSION, entries });
}

/** Delete a bookmark by id. No-op if unknown. */
export function removeBookmark(id: string): void {
  const env = read();
  if (!env.entries.some((e) => e.id === id)) return;
  write({
    version: VERSION,
    entries: env.entries.filter((e) => e.id !== id),
  });
}

/**
 * Drop all bookmarks for a scene — call on scene deletion so a
 * recreated id (rare but possible via JSON import round-trips)
 * doesn't inherit ghost entries.
 */
export function forgetScene(sceneId: string): void {
  const env = read();
  const next = env.entries.filter((e) => e.sceneId !== sceneId);
  if (next.length === env.entries.length) return;
  write({ version: VERSION, entries: next });
}

/**
 * Bookmarks for a scene, ordered newest-first. Slot N (1-based) of
 * the result is what `Alt+N` jumps to.
 */
export function listBookmarks(sceneId: string): CameraBookmark[] {
  return read()
    .entries.filter((e) => e.sceneId === sceneId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Pick the bookmark at slot `n` (1-based) in newest-first order for
 * `sceneId`. Returns `null` if the slot is empty (fewer than n
 * bookmarks in this scene).
 */
export function pickBookmarkSlot(
  sceneId: string,
  n: number,
): CameraBookmark | null {
  if (!Number.isFinite(n) || n < 1) return null;
  const list = listBookmarks(sceneId);
  return list[n - 1] ?? null;
}

/** Test-only: blow away ALL bookmarks across every scene. */
export function _resetAll(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignored */
  }
}
