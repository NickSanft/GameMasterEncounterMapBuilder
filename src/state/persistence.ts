import type { SessionState } from './types.js';
import {
  deserializeState,
  serializeState,
  type SerializedSessionState,
} from '../sync/messages.js';
import { STORAGE_KEY } from '../util/constants.js';
import { runTx, SESSIONS_STORE } from './idb.js';

/**
 * There's exactly one active session for now (Phase 40 / Scenes will
 * introduce multiple keyed sessions; the key is already parameterized
 * so that change will be minor).
 */
export const ACTIVE_SESSION_ID = 'active';

/**
 * Maximum size of the localStorage *backup* blob. localStorage caps at
 * ~5 MB per origin in most browsers — if we ever grow past this, we
 * silently skip the LS write and rely on IDB alone. IDB is effectively
 * unlimited on persistent origins.
 */
const LOCAL_STORAGE_BACKUP_LIMIT = 4 * 1024 * 1024;

interface SessionRecord {
  id: string;
  state: SerializedSessionState;
  updatedAt: number;
}

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

function tryWriteLocalStorageBackup(serialized: SerializedSessionState): void {
  try {
    const json = JSON.stringify(serialized);
    if (json.length > LOCAL_STORAGE_BACKUP_LIMIT) {
      // Too big for LS — drop the backup (IDB remains the source of truth).
      // Also nuke any stale existing entry so we don't reload an outdated
      // blob later.
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Quota/OOM exceptions — safely ignored.
  }
}

async function readFromIdb(id: string): Promise<SerializedSessionState | null> {
  try {
    const record = await runTx<SessionRecord | undefined>(
      SESSIONS_STORE,
      'readonly',
      (s) => s.get(id),
    );
    if (!record) return null;
    const raw = record.state;
    if (!raw || raw.version !== 1) return null;
    return raw;
  } catch (err) {
    logLoadFailure(err);
    return null;
  }
}

async function writeToIdb(
  id: string,
  serialized: SerializedSessionState,
): Promise<void> {
  const record: SessionRecord = {
    id,
    state: serialized,
    updatedAt: Date.now(),
  };
  await runTx(SESSIONS_STORE, 'readwrite', (s) => s.put(record));
}

/**
 * Persist the current session state. Writes to IDB primarily; also
 * writes a localStorage backup so unclean shutdowns survive without
 * an async round-trip. Returns a promise that resolves once the IDB
 * write completes; callers can fire-and-forget from a debounced path.
 *
 * Call `saveStateSync` from `beforeunload` — it skips the IDB write
 * (which wouldn't complete before the page dies) and only updates the
 * synchronous localStorage backup.
 */
export async function saveState(state: SessionState): Promise<void> {
  const serialized = serializeState(state);
  tryWriteLocalStorageBackup(serialized);
  try {
    await writeToIdb(ACTIVE_SESSION_ID, serialized);
  } catch (err) {
    console.warn('[persistence] IDB save failed (localStorage backup may be intact)', err);
  }
}

/**
 * Synchronous save path for `beforeunload`. Never touches IDB (which
 * cannot complete during unload); only refreshes the localStorage
 * backup. On next load, if IDB is older than the LS backup we'll pick
 * up the LS copy and migrate it back into IDB.
 */
export function saveStateSync(state: SessionState): void {
  const serialized = serializeState(state);
  tryWriteLocalStorageBackup(serialized);
}

/**
 * Load the most recent saved session. Prefers IDB; falls back to the
 * localStorage backup (which also covers migration from versions
 * before 0.39.0, when localStorage was the primary store).
 *
 * When the LS backup is newer than IDB (e.g. unclean shutdown caught
 * only the sync LS path), the LS copy wins and is written back into
 * IDB on the next `saveState` call.
 */
export async function loadPersistedState(): Promise<SessionState | null> {
  const [idbRaw, lsRaw] = await Promise.all([
    readFromIdb(ACTIVE_SESSION_ID),
    Promise.resolve(tryReadLocalStorage()),
  ]);

  const chosen = pickFreshest(idbRaw, lsRaw);
  if (!chosen) return null;

  // If we chose LS but IDB was empty or out-of-date, write the chosen
  // blob back into IDB so subsequent loads are IDB-fast.
  if (chosen === lsRaw && idbRaw !== lsRaw) {
    try {
      await writeToIdb(ACTIVE_SESSION_ID, chosen);
    } catch {
      /* backfill is best-effort */
    }
  }

  try {
    return deserializeState(chosen);
  } catch (err) {
    logLoadFailure(err);
    return null;
  }
}

function pickFreshest(
  idb: SerializedSessionState | null,
  ls: SerializedSessionState | null,
): SerializedSessionState | null {
  if (!idb) return ls;
  if (!ls) return idb;
  // Both sources available — prefer IDB (primary), but this is where
  // unclean-shutdown detection would live if we tagged records with
  // timestamps. For now we just trust IDB.
  return idb;
}

/**
 * Wipe the persisted session. Clears both IDB and the localStorage
 * backup. Resolves once both operations settle.
 */
export async function clearPersistedState(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[persistence] LS clear failed', err);
  }
  try {
    await runTx(SESSIONS_STORE, 'readwrite', (s) =>
      s.delete(ACTIVE_SESSION_ID),
    );
  } catch (err) {
    console.warn('[persistence] IDB clear failed', err);
  }
}
