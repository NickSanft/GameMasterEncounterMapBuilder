import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store.js';
import { createDefaultState, type Token } from './types.js';

function newToken(id: string, overrides: Partial<Token> = {}): Token {
  return {
    id,
    x: 0,
    y: 0,
    label: id,
    color: '#ffffff',
    imageId: null,
    size: 1,
    borderColor: null,
    hp: null,
    conditions: [],
    rotation: 0,
    losRadius: null,
    light: null,
    initiativeMod: 0,
    conditionExpirations: {},
    deathSaves: { successes: 0, failures: 0 },
    ...overrides,
  };
}

describe('createStore', () => {
  it('starts with default state when none supplied', () => {
    const store = createStore();
    const s = store.getState();
    expect(s.version).toBe(1);
    expect(s.tokens).toEqual([]);
    expect(s.grid.cols).toBe(30);
    expect(s.grid.rows).toBe(20);
    expect(s.fog.length).toBe(30 * 20);
  });

  it('accepts an explicit initial state', () => {
    const initial = createDefaultState();
    initial.tokens.push(newToken('preload'));
    const store = createStore(initial);
    expect(store.getState().tokens).toHaveLength(1);
  });
});

describe('applyPatch', () => {
  it('token-add appends', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    expect(store.getState().tokens).toHaveLength(1);
  });

  it('token-update merges changes', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    store.applyPatch({ kind: 'token-update', id: 'a', changes: { label: 'Updated' } });
    expect(store.getState().tokens[0]!.label).toBe('Updated');
  });

  it('token-update on missing id is a no-op', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.applyPatch({ kind: 'token-update', id: 'missing', changes: { label: 'x' } });
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState().tokens).toHaveLength(0);
  });

  it('token-remove drops the token', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    store.applyPatch({ kind: 'token-add', token: newToken('b') });
    store.applyPatch({ kind: 'token-remove', id: 'a' });
    expect(store.getState().tokens.map((t) => t.id)).toEqual(['b']);
  });

  it('fog-set updates specified cells', () => {
    const store = createStore();
    store.applyPatch({
      kind: 'fog-set',
      cells: [
        { x: 0, y: 0, value: 1 },
        { x: 1, y: 0, value: 1 },
      ],
    });
    const s = store.getState();
    expect(s.fog[0]).toBe(1);
    expect(s.fog[1]).toBe(1);
    expect(s.fog[2]).toBe(0);
  });

  it('fog-set ignores out-of-bounds cells', () => {
    const store = createStore();
    store.applyPatch({
      kind: 'fog-set',
      cells: [
        { x: -1, y: 0, value: 1 },
        { x: 30, y: 0, value: 1 },
        { x: 0, y: 20, value: 1 },
      ],
    });
    const s = store.getState();
    for (let i = 0; i < s.fog.length; i++) expect(s.fog[i]).toBe(0);
  });

  it('grid-update preserves fog in overlapping area', () => {
    const store = createStore();
    store.applyPatch({
      kind: 'fog-set',
      cells: [
        { x: 0, y: 0, value: 1 },
        { x: 5, y: 3, value: 1 },
      ],
    });
    store.applyPatch({ kind: 'grid-update', changes: { cols: 20 } });
    const s = store.getState();
    expect(s.grid.cols).toBe(20);
    expect(s.fog.length).toBe(20 * 20);
    expect(s.fog[0]).toBe(1);
    expect(s.fog[3 * 20 + 5]).toBe(1);
  });

  it('grid-update with only showGridLines does not touch fog', () => {
    const store = createStore();
    store.applyPatch({ kind: 'fog-set', cells: [{ x: 0, y: 0, value: 1 }] });
    const fogBefore = store.getState().fog;
    store.applyPatch({ kind: 'grid-update', changes: { showGridLines: false } });
    expect(store.getState().fog).toBe(fogBefore);
  });

  it('background-update merges fields', () => {
    const store = createStore();
    store.applyPatch({
      kind: 'background-update',
      changes: { imageId: 'img1', scaleX: 2, scaleY: 2 },
    });
    const bg = store.getState().background;
    expect(bg.imageId).toBe('img1');
    expect(bg.scaleX).toBe(2);
    expect(bg.scaleY).toBe(2);
  });

  it('session-reset replaces state entirely', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    const fresh = createDefaultState();
    store.applyPatch({ kind: 'session-reset', state: fresh });
    expect(store.getState().tokens).toEqual([]);
  });

  it('notifies subscribers with the patch', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'token-add' }),
    );
  });

  it('unsubscribe stops notifications', () => {
    const store = createStore();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('undo / redo', () => {
  it('undo reverts a single patch', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    expect(store.canUndo()).toBe(true);
    const ok = store.undo();
    expect(ok).toBe(true);
    expect(store.getState().tokens).toHaveLength(0);
  });

  it('redo replays an undone patch', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    store.undo();
    expect(store.canRedo()).toBe(true);
    store.redo();
    expect(store.getState().tokens).toHaveLength(1);
  });

  it('undo / redo return false when the stack is empty', () => {
    const store = createStore();
    expect(store.undo()).toBe(false);
    expect(store.redo()).toBe(false);
  });

  it('applyPatch after undo clears the redo stack', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    store.undo();
    expect(store.canRedo()).toBe(true);
    store.applyPatch({ kind: 'token-add', token: newToken('b') });
    expect(store.canRedo()).toBe(false);
  });

  it('coalesces rapid token-update patches for the same id', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    store.applyPatch({ kind: 'token-update', id: 'a', changes: { x: 1 } });
    store.applyPatch({ kind: 'token-update', id: 'a', changes: { x: 2 } });
    store.applyPatch({ kind: 'token-update', id: 'a', changes: { x: 3 } });
    // One undo should take the token back to its pre-drag position (x=0)
    store.undo();
    expect(store.getState().tokens[0]!.x).toBe(0);
  });

  it('does not coalesce updates to different tokens', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    store.applyPatch({ kind: 'token-add', token: newToken('b') });
    store.applyPatch({ kind: 'token-update', id: 'a', changes: { x: 1 } });
    store.applyPatch({ kind: 'token-update', id: 'b', changes: { x: 1 } });
    store.undo();
    expect(store.getState().tokens.find((t) => t.id === 'b')!.x).toBe(0);
    expect(store.getState().tokens.find((t) => t.id === 'a')!.x).toBe(1);
  });

  it('preserves Uint8Array identity independence across undo', () => {
    const store = createStore();
    store.applyPatch({ kind: 'fog-set', cells: [{ x: 0, y: 0, value: 1 }] });
    store.undo();
    expect(store.getState().fog[0]).toBe(0);
  });
});

describe('batch', () => {
  it('collapses multiple patches into a single undo step', () => {
    const store = createStore();
    store.batch(() => {
      store.applyPatch({ kind: 'token-add', token: newToken('a') });
      store.applyPatch({ kind: 'token-add', token: newToken('b') });
      store.applyPatch({ kind: 'token-add', token: newToken('c') });
    });
    expect(store.getState().tokens).toHaveLength(3);
    store.undo();
    expect(store.getState().tokens).toHaveLength(0);
  });

  it('does not push an undo entry when no patches are applied', () => {
    const store = createStore();
    expect(store.canUndo()).toBe(false);
    store.batch(() => {
      /* no-op */
    });
    expect(store.canUndo()).toBe(false);
  });

  it('does not push an undo entry when patches are applied but state is unchanged', () => {
    const store = createStore();
    expect(store.canUndo()).toBe(false);
    store.batch(() => {
      // token-update on a missing id does not mutate state
      store.applyPatch({
        kind: 'token-update',
        id: 'missing',
        changes: { label: 'x' },
      });
    });
    expect(store.canUndo()).toBe(false);
  });

  it('nested batches are treated as part of the outer batch', () => {
    const store = createStore();
    store.batch(() => {
      store.applyPatch({ kind: 'token-add', token: newToken('a') });
      store.batch(() => {
        store.applyPatch({ kind: 'token-add', token: newToken('b') });
      });
      store.applyPatch({ kind: 'token-add', token: newToken('c') });
    });
    expect(store.getState().tokens).toHaveLength(3);
    store.undo();
    expect(store.getState().tokens).toHaveLength(0);
  });

  it('notifies subscribers once per applied patch during batch', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.batch(() => {
      store.applyPatch({ kind: 'token-add', token: newToken('a') });
      store.applyPatch({ kind: 'token-add', token: newToken('b') });
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('redo after batch-undo restores the whole batch', () => {
    const store = createStore();
    store.batch(() => {
      store.applyPatch({ kind: 'token-add', token: newToken('a') });
      store.applyPatch({ kind: 'token-add', token: newToken('b') });
    });
    store.undo();
    expect(store.getState().tokens).toHaveLength(0);
    store.redo();
    expect(store.getState().tokens).toHaveLength(2);
  });

  it('clears redo stack just like a plain patch', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    store.undo();
    expect(store.canRedo()).toBe(true);
    store.batch(() => {
      store.applyPatch({ kind: 'token-add', token: newToken('b') });
    });
    expect(store.canRedo()).toBe(false);
  });

  it('throws from the callback still closes the batch cleanly', () => {
    const store = createStore();
    expect(() =>
      store.batch(() => {
        store.applyPatch({ kind: 'token-add', token: newToken('a') });
        throw new Error('boom');
      }),
    ).toThrow(/boom/);
    // Subsequent plain patches should still work and create their own undo step.
    store.applyPatch({ kind: 'token-add', token: newToken('b') });
    expect(store.getState().tokens).toHaveLength(2);
    store.undo();
    expect(store.getState().tokens).toHaveLength(1);
  });
});

describe('resetSession / loadState', () => {
  it('resetSession clears tokens and fog via session-reset', () => {
    const store = createStore();
    store.applyPatch({ kind: 'token-add', token: newToken('a') });
    store.resetSession();
    expect(store.getState().tokens).toEqual([]);
  });

  it('loadState replaces state without broadcasting a patch', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const fresh = createDefaultState();
    store.loadState(fresh);
    expect(listener).toHaveBeenCalledWith(null);
    expect(store.getState()).toBe(fresh);
  });
});

describe('applyPatch — Phase 70 round-based condition expiry', () => {
  function makeStoreWithTimered() {
    const initial = createDefaultState();
    initial.tokens.push(
      newToken('tok-a', {
        conditions: ['poisoned', 'prone', 'charmed'],
        conditionExpirations: { poisoned: 5, prone: 7 },
      }),
      newToken('tok-b', {
        conditions: ['blinded'],
        conditionExpirations: { blinded: 4 },
      }),
    );
    initial.initiative.round = 3;
    return createStore(initial);
  }

  it('advancing the round past a timer strips the condition from affected tokens', () => {
    const store = makeStoreWithTimered();
    // round 3 → round 5: poisoned on tok-a expires (expiresAt 5 <= 5),
    // blinded on tok-b expires (4 <= 5). prone on tok-a (7) stays.
    store.applyPatch({ kind: 'initiative-set-active', activeId: null, round: 5 });
    const state = store.getState();
    const a = state.tokens.find((t) => t.id === 'tok-a')!;
    const b = state.tokens.find((t) => t.id === 'tok-b')!;
    expect(a.conditions).toEqual(['prone', 'charmed']);
    expect(a.conditionExpirations).toEqual({ prone: 7 });
    expect(b.conditions).toEqual([]);
    expect(b.conditionExpirations).toEqual({});
  });

  it('does not strip anything when the round is unchanged', () => {
    const store = makeStoreWithTimered();
    store.applyPatch({ kind: 'initiative-set-active', activeId: 'anything', round: 3 });
    const a = store.getState().tokens.find((t) => t.id === 'tok-a')!;
    expect(a.conditions).toEqual(['poisoned', 'prone', 'charmed']);
    expect(a.conditionExpirations).toEqual({ poisoned: 5, prone: 7 });
  });

  it('does not strip anything when the round RETREATS (undo / prev-turn wrap)', () => {
    const store = makeStoreWithTimered();
    // Retreat from round 3 to round 2 — timers at 5 and 7 shouldn't fire.
    store.applyPatch({ kind: 'initiative-set-active', activeId: null, round: 2 });
    const a = store.getState().tokens.find((t) => t.id === 'tok-a')!;
    expect(a.conditions).toEqual(['poisoned', 'prone', 'charmed']);
  });

  it('ignores tokens with no conditions or no timers (no-op fast-path)', () => {
    const initial = createDefaultState();
    initial.tokens.push(
      newToken('no-conditions', { conditions: [] }),
      newToken('permanent-conditions', {
        conditions: ['prone'],
        conditionExpirations: {},
      }),
    );
    const store = createStore(initial);
    const tokensBefore = store.getState().tokens;
    store.applyPatch({ kind: 'initiative-set-active', activeId: null, round: 100 });
    const tokensAfter = store.getState().tokens;
    // Same object identities → no reallocation for untouched tokens.
    expect(tokensAfter[0]).toBe(tokensBefore[0]);
    expect(tokensAfter[1]).toBe(tokensBefore[1]);
  });
});

describe('Phase 72 — death-save round-trip', () => {
  it('preserves deathSaves through token-update', () => {
    const initial = createDefaultState();
    initial.tokens.push(
      newToken('hero', {
        hp: { current: 0, max: 12, visibility: 'shared' },
        deathSaves: { successes: 1, failures: 2 },
      }),
    );
    const store = createStore(initial);
    // Bumping a non-deathSaves field doesn't lose the count.
    store.applyPatch({
      kind: 'token-update',
      id: 'hero',
      changes: { x: 5 },
    });
    expect(store.getState().tokens[0]!.deathSaves).toEqual({
      successes: 1,
      failures: 2,
    });
  });

  it('overwrites deathSaves when included in changes', () => {
    const initial = createDefaultState();
    initial.tokens.push(
      newToken('hero', {
        deathSaves: { successes: 1, failures: 1 },
      }),
    );
    const store = createStore(initial);
    store.applyPatch({
      kind: 'token-update',
      id: 'hero',
      changes: { deathSaves: { successes: 3, failures: 0 } },
    });
    expect(store.getState().tokens[0]!.deathSaves).toEqual({
      successes: 3,
      failures: 0,
    });
  });
});
