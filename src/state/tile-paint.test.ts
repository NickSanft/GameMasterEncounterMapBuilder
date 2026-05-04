/**
 * Phase 142 — tile-paint store reducer + deserialize tests.
 *
 * The store reducer logic lives in `state/store.ts` (the cases for
 * `tile-paint-add` / `-remove` / `-clear`). The defensive parse
 * lives in `sync/messages.ts` (`normalizeTilePaints`). We exercise
 * both via the public store API so the unit suite catches drift in
 * either path.
 */
import { describe, it, expect } from 'vitest';
import { createStore } from './store.js';
import { createDefaultState, type TilePaint } from './types.js';
import {
  serializeState,
  deserializeState,
  type SerializedSessionState,
} from '../sync/messages.js';

function tile(
  id: string,
  cellX: number,
  cellY: number,
  kind: TilePaint['kind'] = 'floor',
): TilePaint {
  return { id, cellX, cellY, kind };
}

describe('tile-paint store reducer (Phase 142)', () => {
  it('starts with an empty tilePaints array', () => {
    const store = createStore(createDefaultState());
    expect(store.getState().tilePaints).toEqual([]);
  });

  it('tile-paint-add appends a new tile', () => {
    const store = createStore(createDefaultState());
    store.applyPatch({ kind: 'tile-paint-add', tile: tile('a', 1, 1) });
    expect(store.getState().tilePaints).toEqual([
      { id: 'a', cellX: 1, cellY: 1, kind: 'floor' },
    ]);
  });

  it('tile-paint-add dedupes by (cellX, cellY, kind) — same kind on same cell is a no-op', () => {
    const store = createStore(createDefaultState());
    store.applyPatch({ kind: 'tile-paint-add', tile: tile('a', 2, 3, 'water') });
    store.applyPatch({ kind: 'tile-paint-add', tile: tile('b', 2, 3, 'water') });
    expect(store.getState().tilePaints.length).toBe(1);
    expect(store.getState().tilePaints[0]!.id).toBe('a');
  });

  it('tile-paint-add allows different kinds on the same cell to stack', () => {
    const store = createStore(createDefaultState());
    store.applyPatch({ kind: 'tile-paint-add', tile: tile('a', 5, 5, 'rough') });
    store.applyPatch({ kind: 'tile-paint-add', tile: tile('b', 5, 5, 'water') });
    expect(store.getState().tilePaints.length).toBe(2);
  });

  it('tile-paint-remove drops the tile by id', () => {
    const store = createStore(createDefaultState());
    store.applyPatch({ kind: 'tile-paint-add', tile: tile('a', 1, 1) });
    store.applyPatch({ kind: 'tile-paint-add', tile: tile('b', 2, 2) });
    store.applyPatch({ kind: 'tile-paint-remove', id: 'a' });
    expect(store.getState().tilePaints.length).toBe(1);
    expect(store.getState().tilePaints[0]!.id).toBe('b');
  });

  it('tile-paint-remove with unknown id is a silent no-op', () => {
    const store = createStore(createDefaultState());
    store.applyPatch({ kind: 'tile-paint-add', tile: tile('a', 1, 1) });
    store.applyPatch({ kind: 'tile-paint-remove', id: 'unknown' });
    expect(store.getState().tilePaints.length).toBe(1);
  });

  it('tile-paint-clear empties the array', () => {
    const store = createStore(createDefaultState());
    store.applyPatch({ kind: 'tile-paint-add', tile: tile('a', 1, 1) });
    store.applyPatch({ kind: 'tile-paint-add', tile: tile('b', 2, 2) });
    store.applyPatch({ kind: 'tile-paint-clear' });
    expect(store.getState().tilePaints).toEqual([]);
  });

  it('tile-paint-clear when already empty is a silent no-op', () => {
    const store = createStore(createDefaultState());
    let notifyCount = 0;
    store.subscribe(() => notifyCount++);
    store.applyPatch({ kind: 'tile-paint-clear' });
    expect(notifyCount).toBe(0);
  });
});

describe('tile-paint deserialize (Phase 142)', () => {
  it('defaults tilePaints to [] for legacy saves (pre-142)', () => {
    const legacy = serializeState(createDefaultState());
    delete (legacy as { tilePaints?: unknown }).tilePaints;
    const restored = deserializeState(legacy as SerializedSessionState);
    expect(restored.tilePaints).toEqual([]);
  });

  it('preserves valid tile entries across a round-trip', () => {
    const state = createDefaultState();
    state.tilePaints = [
      { id: 't1', cellX: 5, cellY: 7, kind: 'water' },
      { id: 't2', cellX: 5, cellY: 7, kind: 'rough' },
    ];
    const restored = deserializeState(serializeState(state));
    expect(restored.tilePaints).toEqual(state.tilePaints);
  });

  it('drops malformed entries (defensive parse)', () => {
    const state = serializeState(createDefaultState());
    (state as { tilePaints: unknown[] }).tilePaints = [
      { id: 'good', cellX: 0, cellY: 0, kind: 'floor' },
      { id: '', cellX: 0, cellY: 0, kind: 'floor' }, // empty id
      { id: 'a', cellX: NaN, cellY: 0, kind: 'floor' }, // NaN coord
      { id: 'a', cellX: 0, cellY: 0, kind: 'lava' }, // unknown kind
      'not an object',
      null,
    ];
    const restored = deserializeState(state);
    expect(restored.tilePaints.length).toBe(1);
    expect(restored.tilePaints[0]!.id).toBe('good');
  });

  it('rounds non-integer coords (defensive)', () => {
    const state = serializeState(createDefaultState());
    (state as { tilePaints: unknown[] }).tilePaints = [
      { id: 'a', cellX: 3.7, cellY: 5.2, kind: 'pit' },
    ];
    const restored = deserializeState(state);
    expect(restored.tilePaints[0]!.cellX).toBe(4);
    expect(restored.tilePaints[0]!.cellY).toBe(5);
  });
});
