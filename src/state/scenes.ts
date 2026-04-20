import type { ID, SessionState } from './types.js';
import { createDefaultState } from './types.js';
import {
  deserializeState,
  serializeState,
  type SerializedSessionState,
} from '../sync/messages.js';
import { runTx, SESSIONS_STORE, LEGACY_ACTIVE_SESSION_ID } from './idb.js';
import { nid } from '../util/id.js';

/**
 * localStorage pointer to the currently-active scene id. Kept outside
 * of SessionState so the pointer itself isn't part of the session blob
 * (and doesn't get bundled into exports / imports).
 */
export const ACTIVE_SCENE_ID_KEY = 'gm-encounter-maps-active-scene-id';

export interface SceneRecord {
  id: ID;
  name: string;
  state: SerializedSessionState;
  /** Optional JPEG data URL thumbnail for the scenes picker. */
  thumbnail: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Metadata-only projection used for the scenes list UI. Omits the
 * (potentially large) `state` blob to keep the scenes modal snappy.
 */
export interface SceneSummary {
  id: ID;
  name: string;
  thumbnail: string | null;
  createdAt: number;
  updatedAt: number;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return runTx<T>(SESSIONS_STORE, mode, fn);
}

function summarize(record: SceneRecord): SceneSummary {
  return {
    id: record.id,
    name: record.name,
    thumbnail: record.thumbnail,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Read all scene records and return metadata sorted by most-recently-updated.
 * The Phase 39 legacy `LEGACY_ACTIVE_SESSION_ID` record is excluded — it only
 * exists during migration and is consumed by `ensureActiveScene`.
 */
export async function listScenes(): Promise<SceneSummary[]> {
  const all = await run<SceneRecord[]>('readonly', (s) => s.getAll());
  return all
    .filter((r) => r.id !== LEGACY_ACTIVE_SESSION_ID && isSceneRecord(r))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(summarize);
}

export async function getScene(id: ID): Promise<SceneRecord | null> {
  const r = await run<SceneRecord | undefined>('readonly', (s) => s.get(id));
  if (!r || !isSceneRecord(r)) return null;
  return r;
}

export async function getSceneState(id: ID): Promise<SessionState | null> {
  const r = await getScene(id);
  if (!r) return null;
  try {
    return deserializeState(r.state);
  } catch {
    return null;
  }
}

function isSceneRecord(value: unknown): value is SceneRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<SceneRecord>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    !!v.state &&
    typeof v.state === 'object' &&
    typeof v.createdAt === 'number' &&
    typeof v.updatedAt === 'number'
  );
}

/**
 * Write a scene record. Overwrites any existing record with the same id.
 * Updates `updatedAt` to now; preserves `createdAt`.
 */
export async function saveScene(
  id: ID,
  state: SessionState,
  meta: { name?: string; thumbnail?: string | null } = {},
): Promise<SceneRecord> {
  const existing = await getScene(id);
  const now = Date.now();
  const record: SceneRecord = {
    id,
    name: meta.name ?? existing?.name ?? 'Untitled scene',
    state: serializeState(state),
    thumbnail:
      meta.thumbnail !== undefined ? meta.thumbnail : existing?.thumbnail ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await run('readwrite', (s) => s.put(record));
  return record;
}

/** Update just the name of an existing scene. No-op if the id is unknown. */
export async function renameScene(id: ID, name: string): Promise<void> {
  const r = await getScene(id);
  if (!r) return;
  const trimmed = name.trim() || r.name;
  const next: SceneRecord = { ...r, name: trimmed, updatedAt: Date.now() };
  await run('readwrite', (s) => s.put(next));
}

/** Delete a scene. */
export async function deleteScene(id: ID): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}

/**
 * Create a brand new scene with a fresh id and default state. Returns
 * the freshly-saved record.
 */
export async function createScene(name = 'New scene'): Promise<SceneRecord> {
  const id = nid();
  return saveScene(id, createDefaultState(), { name, thumbnail: null });
}

/**
 * Clone an existing scene under a new id. `newName` defaults to
 * `${source.name} (copy)`. Throws if the source doesn't exist.
 */
export async function duplicateScene(
  sourceId: ID,
  newName?: string,
): Promise<SceneRecord> {
  const source = await getScene(sourceId);
  if (!source) throw new Error(`No scene with id ${sourceId}`);
  const id = nid();
  const now = Date.now();
  const record: SceneRecord = {
    id,
    name: newName ?? `${source.name} (copy)`,
    state: JSON.parse(JSON.stringify(source.state)) as SerializedSessionState,
    thumbnail: source.thumbnail,
    createdAt: now,
    updatedAt: now,
  };
  await run('readwrite', (s) => s.put(record));
  return record;
}

/** Read the active-scene pointer from localStorage. */
export function getActiveSceneId(): ID | null {
  try {
    const id = localStorage.getItem(ACTIVE_SCENE_ID_KEY);
    return id && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/** Write the active-scene pointer to localStorage. */
export function setActiveSceneId(id: ID): void {
  try {
    localStorage.setItem(ACTIVE_SCENE_ID_KEY, id);
  } catch {
    /* quota overflow — pointer is tiny, this should never happen */
  }
}

/**
 * Guarantee that at least one scene exists and that the active-scene
 * pointer targets a real record. Returns the id of the active scene.
 *
 * Migration paths handled in one place:
 *   - Legacy Phase 39 session under `LEGACY_ACTIVE_SESSION_ID` with no scenes
 *     → promote to the first named scene ("Session").
 *   - Stale pointer that no longer maps to a record → pick the
 *     most-recently-updated remaining scene, or create a new one.
 *   - Empty database → create a blank "Untitled scene".
 */
export async function ensureActiveScene(): Promise<ID> {
  // Legacy 0.39 record?
  const legacy = await run<SceneRecord | undefined>('readonly', (s) =>
    s.get(LEGACY_ACTIVE_SESSION_ID),
  );
  if (legacy && legacy.state) {
    const scenes = await listScenes();
    if (scenes.length === 0) {
      // Promote: write the legacy blob under a fresh scene id and drop
      // the old 'active' record.
      const id = nid();
      const now = Date.now();
      const record: SceneRecord = {
        id,
        name: 'Session',
        state: legacy.state,
        thumbnail: null,
        createdAt: now,
        updatedAt: now,
      };
      await run('readwrite', (s) => s.put(record));
      await run('readwrite', (s) => s.delete(LEGACY_ACTIVE_SESSION_ID));
      setActiveSceneId(id);
      return id;
    }
    // Scenes already exist — just drop the stale legacy record.
    await run('readwrite', (s) => s.delete(LEGACY_ACTIVE_SESSION_ID));
  }

  const scenes = await listScenes();
  const pointer = getActiveSceneId();
  if (pointer && scenes.some((s) => s.id === pointer)) return pointer;

  if (scenes.length > 0) {
    setActiveSceneId(scenes[0]!.id);
    return scenes[0]!.id;
  }

  // Fresh install — create a blank scene.
  const created = await createScene('Untitled scene');
  setActiveSceneId(created.id);
  return created.id;
}

/**
 * Capture a JPEG thumbnail of the given canvas at the target width.
 * Returns `null` (not a rejected promise) when the canvas is too small
 * or the browser refuses the draw for any reason — thumbnails are a
 * nice-to-have, never critical.
 */
export function captureThumbnail(
  canvas: HTMLCanvasElement,
  maxWidth = 240,
): string | null {
  try {
    const srcW = canvas.width;
    const srcH = canvas.height;
    if (srcW === 0 || srcH === 0) return null;
    const scale = Math.min(1, maxWidth / srcW);
    const w = Math.max(1, Math.floor(srcW * scale));
    const h = Math.max(1, Math.floor(srcH * scale));
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, w, h);
    return off.toDataURL('image/jpeg', 0.6);
  } catch {
    return null;
  }
}
