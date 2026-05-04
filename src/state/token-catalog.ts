import type { ID, Token } from './types.js';
import { nid } from '../util/id.js';
import { runTx, TOKEN_CATALOG_STORE } from './idb.js';

export interface TokenCatalogEntry {
  id: ID;
  label: string;
  color: string;
  size: number;
  borderColor: string | null;
  imageId: ID | null;
  createdAt: number;
  /**
   * Phase 69 — initiative bonus, copied from the token at save-time.
   * Optional + back-compat: catalog entries written before Phase 69
   * don't have this field; consumers default missing values to 0.
   */
  initiativeMod?: number;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return runTx<T>(TOKEN_CATALOG_STORE, mode, fn);
}

/** Create a library entry from a placed token. Returns the new entry id. */
export async function saveTokenToLibrary(token: Token): Promise<ID> {
  const entry: TokenCatalogEntry = {
    id: nid(),
    label: token.label,
    color: token.color,
    size: token.size,
    borderColor: token.borderColor,
    imageId: token.imageId,
    createdAt: Date.now(),
    initiativeMod: token.initiativeMod,
  };
  await run('readwrite', (s) => s.put(entry));
  return entry.id;
}

export async function putTokenCatalogEntry(entry: TokenCatalogEntry): Promise<void> {
  await run('readwrite', (s) => s.put(entry));
}

export async function listLibraryTokens(): Promise<TokenCatalogEntry[]> {
  const all = await run<TokenCatalogEntry[]>('readonly', (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLibraryToken(id: ID): Promise<TokenCatalogEntry | null> {
  const entry = await run<TokenCatalogEntry | undefined>('readonly', (s) => s.get(id));
  return entry ?? null;
}

export async function deleteLibraryToken(id: ID): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}

/**
 * Turn a catalog entry into a placed token at the given grid cell.
 * The caller owns the placement logic (grid bounds, colliding stacks, etc.).
 */
export function tokenFromCatalogEntry(
  entry: TokenCatalogEntry,
  gx: number,
  gy: number,
): Token {
  return {
    id: nid(),
    x: gx,
    y: gy,
    label: entry.label,
    color: entry.color,
    imageId: entry.imageId,
    size: entry.size,
    borderColor: entry.borderColor,
    hp: null,
    conditions: [],
    rotation: 0,
    losRadius: null,
    light: null,
    initiativeMod: entry.initiativeMod ?? 0,
    // Library tokens intentionally don't carry round timers — those
    // are transient per-combat state, not a property of the creature
    // template. Fresh placements start with no active expirations.
    conditionExpirations: {},
    // Phase 72 — death saves are also transient. A fresh placement
    // is alive at full HP; saves only matter if the token gets
    // dropped during combat.
    deathSaves: { successes: 0, failures: 0 },
    // Phase 126 — ownership is GM-authored after placement; library
    // tokens always start GM-controlled.
    ownerId: null,
    auras: [],
  };
}
