/**
 * Phase 97 — auto-save snapshot history.
 *
 * Rotating per-scene snapshots stored in IndexedDB. The GM entry's
 * existing autosave debounce calls `recordSnapshot(sceneId, state)`
 * after each successful save; up to `MAX_SNAPSHOTS_PER_SCENE` are
 * retained per scene, oldest evicted FIFO.
 *
 * Surfaces:
 *   - `recordSnapshot` — pushes a new snapshot. Rate-limited via
 *     `MIN_INTERVAL_MS` so a busy combat round (multiple patches /
 *     sec, debounced to 200ms by the persist path) doesn't spam
 *     8 near-identical snapshots inside a single minute. Same-state
 *     consecutive calls are also dropped (compared via SerializedSessionState
 *     identity-by-JSON to handle Uint8Array fog buffer correctly).
 *   - `listSnapshots(sceneId)` — newest-first metadata + the full
 *     state for restore. Single IDB index lookup.
 *   - `clearSnapshots(sceneId)` — bulk delete (e.g. on scene delete).
 *   - `deleteSnapshot(id)` — manual delete (e.g. user trims one).
 *
 * Pure module — no DOM, no store coupling. The entry decides when to
 * call `recordSnapshot` and what to do with `listSnapshots`.
 */

import { openDB, SNAPSHOTS_STORE } from './idb.js';
import type { SerializedSessionState } from '../sync/messages.js';
import { nid } from '../util/id.js';

/** How many snapshots to retain per scene. */
export const MAX_SNAPSHOTS_PER_SCENE = 8;

/** Minimum gap between snapshots for the same scene (ms). */
export const MIN_INTERVAL_MS = 30_000;

export interface Snapshot {
  /** Generated unique id. */
  id: string;
  sceneId: string;
  /** Wall-clock ms when the snapshot was recorded. */
  takenAt: number;
  state: SerializedSessionState;
}

/** Last-recorded marker per scene used for the rate-limit + dedup check. */
interface RateLimitEntry {
  takenAt: number;
  serialized: string;
}
const lastRecorded = new Map<string, RateLimitEntry>();

/**
 * Push a new snapshot if rate-limit + dedup checks pass. Returns the
 * recorded snapshot, or `null` if it was suppressed.
 */
export async function recordSnapshot(
  sceneId: string,
  state: SerializedSessionState,
  options: { now?: number } = {},
): Promise<Snapshot | null> {
  const takenAt = options.now ?? Date.now();
  const serialized = JSON.stringify(state);

  const last = lastRecorded.get(sceneId);
  if (last) {
    // Dedup: identical state since last save → don't snapshot.
    if (last.serialized === serialized) return null;
    // Rate-limit: too soon since the last snapshot for this scene.
    if (takenAt - last.takenAt < MIN_INTERVAL_MS) return null;
  }

  const snapshot: Snapshot = {
    id: nid(),
    sceneId,
    takenAt,
    state,
  };

  await putSnapshot(snapshot);
  await evictOldest(sceneId, MAX_SNAPSHOTS_PER_SCENE);
  lastRecorded.set(sceneId, { takenAt, serialized });
  return snapshot;
}

/** Newest-first list of snapshots for a scene. */
export async function listSnapshots(sceneId: string): Promise<Snapshot[]> {
  const all = await getAllForScene(sceneId);
  return all.sort((a, b) => b.takenAt - a.takenAt);
}

export async function getSnapshot(id: string): Promise<Snapshot | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOTS_STORE, 'readonly');
    const req = tx.objectStore(SNAPSHOTS_STORE).get(id);
    req.onsuccess = () => resolve((req.result as Snapshot | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
    tx.objectStore(SNAPSHOTS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Wipe every snapshot for a scene — e.g. when the scene is deleted. */
export async function clearSnapshots(sceneId: string): Promise<void> {
  const all = await getAllForScene(sceneId);
  if (all.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
    const store = tx.objectStore(SNAPSHOTS_STORE);
    for (const s of all) store.delete(s.id);
    tx.oncomplete = () => {
      lastRecorded.delete(sceneId);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Test-only: clear the in-process rate-limit memo. */
export function _resetRateLimitForTests(): void {
  lastRecorded.clear();
}

// ─── Internal helpers ─────────────────────────────────────────────

async function putSnapshot(snapshot: Snapshot): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
    tx.objectStore(SNAPSHOTS_STORE).put(snapshot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllForScene(sceneId: string): Promise<Snapshot[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOTS_STORE, 'readonly');
    const idx = tx.objectStore(SNAPSHOTS_STORE).index('sceneId');
    const req = idx.getAll(IDBKeyRange.only(sceneId));
    req.onsuccess = () => resolve((req.result as Snapshot[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

/** Keep only the newest `keep` snapshots per scene; delete the rest. */
async function evictOldest(sceneId: string, keep: number): Promise<void> {
  const all = await getAllForScene(sceneId);
  if (all.length <= keep) return;
  const sortedNewestFirst = all.sort((a, b) => b.takenAt - a.takenAt);
  const toDelete = sortedNewestFirst.slice(keep);
  if (toDelete.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
    const store = tx.objectStore(SNAPSHOTS_STORE);
    for (const s of toDelete) store.delete(s.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Format a "N minutes ago" relative timestamp. Pure helper for the
 * UI to render snapshot timestamps without per-render Date-math.
 *
 *   < 30 s            → "just now"
 *   30 s – 60 s       → "30 seconds ago"
 *   1 – 60 minutes    → "5 minutes ago" / "1 minute ago"
 *   1 – 24 hours      → "2 hours ago" / "1 hour ago"
 *   > 24 hours        → "3 days ago" / "1 day ago"
 *   future / NaN      → "—"
 */
export function formatRelativeTime(takenAt: number, now: number = Date.now()): string {
  const delta = now - takenAt;
  if (!Number.isFinite(delta) || delta < 0) return '—';
  if (delta < 30_000) return 'just now';
  if (delta < 60_000) {
    const s = Math.round(delta / 1000);
    return `${s} seconds ago`;
  }
  if (delta < 60 * 60_000) {
    const m = Math.round(delta / 60_000);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (delta < 24 * 60 * 60_000) {
    const h = Math.round(delta / (60 * 60_000));
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const d = Math.round(delta / (24 * 60 * 60_000));
  return `${d} day${d === 1 ? '' : 's'} ago`;
}
