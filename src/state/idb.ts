import { IDB_DB_NAME as DB_NAME } from '../util/constants.js';

/**
 * Current IndexedDB schema version. Bump when adding/changing stores and
 * extend `onupgradeneeded` below.
 *
 * Version history:
 *   v1 — `images` object store
 *   v2 — added `tokenCatalog` + `templateCatalog` object stores
 *   v3 — added `sessions` object store for SessionState persistence
 */
export const DB_VERSION = 3;

export const IMAGES_STORE = 'images';
export const TOKEN_CATALOG_STORE = 'tokenCatalog';
export const TEMPLATE_CATALOG_STORE = 'templateCatalog';
export const SESSIONS_STORE = 'sessions';

export type StoreName =
  | typeof IMAGES_STORE
  | typeof TOKEN_CATALOG_STORE
  | typeof TEMPLATE_CATALOG_STORE
  | typeof SESSIONS_STORE;

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
 */
export async function runTx<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
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
