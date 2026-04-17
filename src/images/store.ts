import type { ID } from '../state/types.js';
import { nid } from '../util/id.js';

const DB_NAME = 'dnd-maps';
const DB_VERSION = 1;
const STORE = 'images';

export interface ImageRecord {
  id: ID;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
  return dbPromise;
}

async function runTx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
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

const urlCache = new Map<ID, string>();

export async function putImage(blob: Blob, mimeType: string): Promise<ID> {
  const id = nid();
  const record: ImageRecord = {
    id,
    blob,
    mimeType,
    createdAt: Date.now(),
  };
  await runTx('readwrite', (s) => s.put(record));
  return id;
}

export async function getImage(id: ID): Promise<ImageRecord | null> {
  const record = await runTx<ImageRecord | undefined>('readonly', (s) => s.get(id));
  return record ?? null;
}

export async function getImageURL(id: ID): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const record = await getImage(id);
  if (!record) return null;
  const url = URL.createObjectURL(record.blob);
  urlCache.set(id, url);
  return url;
}

export async function deleteImage(id: ID): Promise<void> {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  await runTx('readwrite', (s) => s.delete(id));
}

export async function listImages(): Promise<ImageRecord[]> {
  return runTx<ImageRecord[]>('readonly', (s) => s.getAll());
}
