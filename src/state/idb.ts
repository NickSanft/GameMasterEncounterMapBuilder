import { IDB_DB_NAME as DB_NAME } from '../util/constants.js';

/**
 * Current IndexedDB schema version. Bump when adding/changing stores and
 * extend `onupgradeneeded` below.
 *
 * Version history:
 *   v1 — `images` object store
 *   v2 — added `tokenCatalog` + `templateCatalog` object stores
 *   v3 — added `sessions` object store for SessionState persistence
 *   v4 — no schema change; bumped to re-run `onupgradeneeded` so browsers
 *        that reached v3 without the `sessions` store (from a partial /
 *        interrupted upgrade) pick it up. The upgrade handler below is
 *        idempotent — every store is gated on `objectStoreNames.contains`.
 *   v5 — added `snapshots` object store for Phase 97 auto-save snapshot
 *        history. Same idempotent pattern; existing data unaffected.
 *   v6 — added `encounters` object store for Phase 180 saved-encounter
 *        library. Idempotent — pre-180 databases gain the store on
 *        first boot of v1.55 without migration.
 */
export const DB_VERSION = 6;

export const IMAGES_STORE = 'images';
export const TOKEN_CATALOG_STORE = 'tokenCatalog';
export const TEMPLATE_CATALOG_STORE = 'templateCatalog';
export const SESSIONS_STORE = 'sessions';
export const SNAPSHOTS_STORE = 'snapshots';
export const ENCOUNTERS_STORE = 'encounters';

/**
 * Record id used by Phase 39 when the app only supported one session.
 * Phase 40+ migrates any record stored under this id into a named scene
 * and then deletes it. Left here as a shared constant so both
 * `persistence.ts` (legacy paths) and `scenes.ts` (migration) can refer
 * to the same key without reintroducing a circular module dependency.
 */
export const LEGACY_ACTIVE_SESSION_ID = 'active';

export type StoreName =
  | typeof IMAGES_STORE
  | typeof TOKEN_CATALOG_STORE
  | typeof TEMPLATE_CATALOG_STORE
  | typeof SESSIONS_STORE
  | typeof SNAPSHOTS_STORE
  | typeof ENCOUNTERS_STORE;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TOKEN_CATALOG_STORE)) {
        db.createObjectStore(TOKEN_CATALOG_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TEMPLATE_CATALOG_STORE)) {
        db.createObjectStore(TEMPLATE_CATALOG_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        // Phase 97 — `id` is a generated string per snapshot. The
        // `sceneId` index lets us look up snapshots per scene cheaply
        // (the GM might have many scenes; we don't want to scan every
        // snapshot just to list one scene's history).
        const store = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
        store.createIndex('sceneId', 'sceneId', { unique: false });
        store.createIndex('takenAt', 'takenAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(ENCOUNTERS_STORE)) {
        // Phase 180 — saved encounters store. `id` is the keyPath;
        // `updatedAt` index supports newest-first listing.
        const store = db.createObjectStore(ENCOUNTERS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
  return dbPromise;
}

/** Exposed for tests only — resets the cached open handle. */
export function _resetDBForTests(): void {
  dbPromise = null;
}

/**
 * Run a single-store IndexedDB transaction. The returned promise resolves
 * with the request result once the transaction completes.
 *
 * If the named store doesn't exist on the opened DB (which should never
 * happen — the upgrade handler above creates it unconditionally), we
 * throw a clear actionable error instead of the raw DOMException. Users
 * hit with this can recover by clearing site data in devtools.
 */
export async function runTx<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  if (!db.objectStoreNames.contains(storeName)) {
    throw new Error(
      `IndexedDB store "${storeName}" is missing. The database schema is out ` +
        `of sync with the app. Open devtools → Application → IndexedDB, delete ` +
        `the "${DB_NAME}" database, and reload.`,
    );
  }
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const s = t.objectStore(storeName);
    let result: T;
    const req = fn(s);
    req.onsuccess = () => {
      result = req.result;
    };
    req.onerror = () => reject(req.error);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error ?? new Error('IDB transaction error'));
    t.onabort = () => reject(t.error ?? new Error('IDB transaction aborted'));
  });
}
