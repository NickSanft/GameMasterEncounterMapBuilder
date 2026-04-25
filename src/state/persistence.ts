import type { SessionState } from './types.js';
import {
  deserializeState,
  serializeState,
  type SerializedSessionState,
} from '../sync/messages.js';
import { STORAGE_KEY } from '../util/constants.js';
import { runTx, SESSIONS_STORE, LEGACY_ACTIVE_SESSION_ID } from './idb.js';
import {
  ensureActiveScene,
  getActiveSceneId,
  getScene,
  saveScene,
} from './scenes.js';

/**
 * Re-exported as an alias so external callers don't need to know the
 * legacy constant name. (Phase 39 exported `ACTIVE_SESSION_ID`.)
 */
export const ACTIVE_SESSION_ID = LEGACY_ACTIVE_SESSION_ID;

/**
 * Maximum size of the localStorage *backup* blob. localStorage caps at
 * ~5 MB per origin in most browsers — if we ever grow past this, we
 * silently skip the LS write and rely on IDB alone. IDB is effectively
 * unlimited on persistent origins.
 */
const LOCAL_STORAGE_BACKUP_LIMIT = 4 * 1024 * 1024;

function logLoadFailure(err: unknown): void {
  console.warn('[persistence] load failed', err);
}

function tryReadLocalStorage(): SerializedSessionState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    const raw = JSON.parse(json) as SerializedSessionState | null;
    if (!raw || raw.version !== 1) return null;
    return raw;
  } catch (err) {
    logLoadFailure(err);
    return null;
  }
}

function tryWriteLocalStorageBackup(serialized: SerializedSessionState): boolean {
  try {
    const json = JSON.stringify(serialized);
    if (json.length > LOCAL_STORAGE_BACKUP_LIMIT) {
      localStorage.removeItem(STORAGE_KEY);
      // Oversized → not persisted to LS; IDB still might succeed.
      return false;
    }
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch {
    // Quota/OOM exceptions — safely ignored.
    return false;
  }
}

/**
 * Persist the current session state to the currently-active scene.
 * Writes to IDB primarily; also writes a localStorage backup so
 * unclean shutdowns survive without an async round-trip.
 *
 * Call `saveStateSync` from `beforeunload` — it skips the async IDB
 * write (which wouldn't complete before the page dies) and only
 * updates the synchronous localStorage backup.
 *
 * Returns `true` when at least one of the durable stores accepted
 * the write (IDB OR LS — IDB is preferred but LS is a viable backup
 * for the next boot). Returns `false` when BOTH failed — typically
 * a private-browsing mode or a hard quota exhaustion. Phase 76's
 * save-status pill reads this return value to surface "Save failed"
 * proactively instead of waiting for the user to discover it on
 * reload.
 */
export async function saveState(state: SessionState): Promise<boolean> {
  const serialized = serializeState(state);
  const lsOk = tryWriteLocalStorageBackup(serialized);
  let idbOk = false;
  try {
    const sceneId = await ensureActiveScene();
    await saveScene(sceneId, state);
    idbOk = true;
  } catch (err) {
    console.warn('[persistence] IDB save failed (localStorage backup may be intact)', err);
  }
  return idbOk || lsOk;
}

/**
 * Synchronous save path for `beforeunload`. Never touches IDB (which
 * cannot complete during unload); only refreshes the localStorage
 * backup. On next load, if IDB is missing the latest changes we'll
 * pick up the LS copy and migrate it back into IDB.
 */
export function saveStateSync(state: SessionState): void {
  tryWriteLocalStorageBackup(serializeState(state));
}

/**
 * Load the active scene's state. Prefers IDB; falls back to the
 * localStorage backup (which also covers migration from versions
 * before 0.39.0 — pre-0.40 `ensureActiveScene` promotes those into
 * a named scene the first time it's called).
 */
export async function loadPersistedState(): Promise<SessionState | null> {
  const lsRaw = tryReadLocalStorage();

  let sceneId: string | null = null;
  try {
    sceneId = await ensureActiveScene();
  } catch (err) {
    logLoadFailure(err);
  }

  let idbState: SessionState | null = null;
  if (sceneId) {
    try {
      const scene = await getScene(sceneId);
      if (scene) idbState = deserializeState(scene.state);
    } catch (err) {
      logLoadFailure(err);
    }
  }

  if (idbState) return idbState;

  // IDB empty but LS has data — deserialize + backfill into IDB via
  // the scene catalog so the next load is fast.
  if (lsRaw) {
    try {
      const state = deserializeState(lsRaw);
      if (sceneId) {
        try {
          await saveScene(sceneId, state);
        } catch {
          /* backfill is best-effort */
        }
      }
      return state;
    } catch (err) {
      logLoadFailure(err);
      return null;
    }
  }

  return null;
}

/**
 * Wipe the persisted active-scene session. Clears the scene record in
 * IDB and the localStorage backup. The active-scene pointer is left
 * alone — callers typically reset the pointer themselves (e.g.
 * "New Session" creates a fresh scene). Resolves once both operations
 * settle.
 */
export async function clearPersistedState(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[persistence] LS clear failed', err);
  }
  try {
    const sceneId = getActiveSceneId();
    if (sceneId) {
      await runTx(SESSIONS_STORE, 'readwrite', (s) => s.delete(sceneId));
    }
    // Also clear the legacy key if it still exists.
    await runTx(SESSIONS_STORE, 'readwrite', (s) =>
      s.delete(LEGACY_ACTIVE_SESSION_ID),
    );
  } catch (err) {
    console.warn('[persistence] IDB clear failed', err);
  }
}
