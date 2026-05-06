/**
 * Phase 180 — saved encounter library.
 *
 * A separate IDB-backed store for "encounters" — pre-built groups of
 * tokens (and optionally walls) the GM can drop into any scene. The
 * use case: build a "Goblin Ambush" once, save, then drop into the
 * dungeon scene of any campaign without rebuilding from scratch.
 *
 * Storage shape: each saved encounter carries a snapshot payload
 * `{ tokens: Token[], walls?: Wall[] }`. The drop path generates
 * fresh ids for every dropped entity so a GM can drop the same
 * encounter twice without id collisions.
 *
 * Pure module — no DOM, no store coupling. The entry decides when
 * to call `saveEncounter` (palette command) and what to do with
 * `listEncounters` (palette picker). Drop logic that turns the
 * snapshot into `'token-add'` / `'wall-add'` patches lives in the
 * entry where the store + announcer are available.
 */

import { ENCOUNTERS_STORE, runTx } from './idb.js';
import type { Token, Wall } from './types.js';
import { nid } from '../util/id.js';

export interface EncounterPayload {
  /** Token snapshots — copied as-is into the destination scene. */
  tokens: Token[];
  /** Optional wall snapshots — same forward-only deserialize-friendly shape. */
  walls?: Wall[];
}

export interface Encounter {
  id: string;
  name: string;
  /** Wall-clock ms when the record was first saved. */
  createdAt: number;
  /** Wall-clock ms of the most recent update. */
  updatedAt: number;
  payload: EncounterPayload;
}

/**
 * Save a new encounter or update an existing one (when `id` matches).
 * Returns the persisted record — useful for the caller to surface
 * "saved as <name> at <time>" in a toast.
 */
export async function saveEncounter(
  partial: Pick<Encounter, 'name' | 'payload'> & Partial<Pick<Encounter, 'id'>>,
  options: { now?: number } = {},
): Promise<Encounter> {
  const now = options.now ?? Date.now();
  const id = partial.id ?? nid();
  const existing = await runTx<Encounter | undefined>(
    ENCOUNTERS_STORE,
    'readonly',
    (s) => s.get(id) as IDBRequest<Encounter | undefined>,
  );
  const record: Encounter = {
    id,
    name: partial.name.trim() || 'Untitled encounter',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    payload: {
      tokens: partial.payload.tokens.map((t) => ({ ...t })),
      ...(partial.payload.walls
        ? { walls: partial.payload.walls.map((w) => ({ ...w })) }
        : {}),
    },
  };
  await runTx(ENCOUNTERS_STORE, 'readwrite', (s) => s.put(record));
  return record;
}

/**
 * List every saved encounter, newest-first by `updatedAt`. Used by
 * the picker UI to populate a list.
 */
export async function listEncounters(): Promise<Encounter[]> {
  const all = await runTx<Encounter[]>(
    ENCOUNTERS_STORE,
    'readonly',
    (s) =>
      s.getAll() as IDBRequest<Encounter[]>,
  );
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Look up a single encounter by id. Returns `null` when not found. */
export async function getEncounter(id: string): Promise<Encounter | null> {
  const result = await runTx<Encounter | undefined>(
    ENCOUNTERS_STORE,
    'readonly',
    (s) => s.get(id) as IDBRequest<Encounter | undefined>,
  );
  return result ?? null;
}

/** Delete an encounter by id. No-op when the id doesn't exist. */
export async function deleteEncounter(id: string): Promise<void> {
  await runTx(ENCOUNTERS_STORE, 'readwrite', (s) => s.delete(id));
}

/**
 * Phase 180 — produce drop-ready entities with fresh ids. Mutates
 * a fresh copy; the input is untouched. Callers feed each output
 * token through `'token-add'` and each wall through `'wall-add'`.
 *
 * Why fresh ids: dropping the same encounter twice into one scene
 * shouldn't produce two tokens with the same id (the store treats
 * id as a primary key; the second add silently no-ops). Also
 * prevents cross-scene id collisions.
 */
export function instantiateEncounter(payload: EncounterPayload): {
  tokens: Token[];
  walls?: Wall[];
} {
  const tokens = payload.tokens.map((t) => ({ ...t, id: nid() }));
  const walls = payload.walls?.map((w) => ({ ...w, id: nid() }));
  return walls ? { tokens, walls } : { tokens };
}
