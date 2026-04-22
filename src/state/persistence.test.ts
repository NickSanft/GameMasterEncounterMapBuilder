import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveState,
  saveStateSync,
  loadPersistedState,
  clearPersistedState,
} from './persistence.js';
import { createDefaultState } from './types.js';
import { STORAGE_KEY } from '../util/constants.js';
import { _resetDBForTests } from './idb.js';
import { ACTIVE_SCENE_ID_KEY } from './scenes.js';

beforeEach(() => {
  _resetDBForTests();
  // Reset the scenes pointer so each test starts from a clean slate.
  localStorage.removeItem(ACTIVE_SCENE_ID_KEY);
});

describe('saveState / loadPersistedState', () => {
  it('returns a default-state blank scene on first load (no prior data)', async () => {
    const loaded = await loadPersistedState();
    // After 0.40, ensureActiveScene() auto-creates a blank scene so the
    // GM canvas always has something to render. The returned state is
    // structurally equivalent to createDefaultState().
    expect(loaded).not.toBeNull();
    expect(loaded!.tokens).toEqual([]);
    expect(loaded!.strokes).toEqual([]);
    expect(loaded!.fog.length).toBe(
      createDefaultState().grid.cols * createDefaultState().grid.rows,
    );
  });

  it('round-trips a session state through IDB', async () => {
    const state = createDefaultState();
    state.tokens.push({
      id: 't1',
      x: 1,
      y: 2,
      label: 'Hero',
      color: '#ff8000',
      imageId: null,
      size: 2,
      borderColor: '#4caf50',
      hp: null,
      conditions: [],
      rotation: 0,
      losRadius: null,
      light: null,    });
    state.fog[0] = 1;
    state.fog[99] = 1;

    await saveState(state);
    const restored = await loadPersistedState();
    expect(restored).not.toBeNull();
    expect(restored!.tokens).toEqual(state.tokens);
    expect(restored!.fog).toBeInstanceOf(Uint8Array);
    expect(restored!.fog[0]).toBe(1);
    expect(restored!.fog[99]).toBe(1);
    expect(restored!.grid).toEqual(state.grid);
  });

  it('treats unknown-version LS blobs as no backup (blank scene is created instead)', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    const loaded = await loadPersistedState();
    // Blank scene is still created; the bad LS blob is ignored.
    expect(loaded).not.toBeNull();
    expect(loaded!.tokens).toEqual([]);
  });

  it('tolerates malformed JSON in the LS backup', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const loaded = await loadPersistedState();
    expect(loaded).not.toBeNull();
    expect(loaded!.tokens).toEqual([]);
  });

  it('clearPersistedState removes both IDB and localStorage copies', async () => {
    const state = createDefaultState();
    state.tokens.push({
      id: 't1',
      x: 0,
      y: 0,
      label: 'A',
      color: '#fff',
      imageId: null,
      size: 1,
      borderColor: null,
      hp: null,
      conditions: [],
      rotation: 0,
      losRadius: null,
      light: null,    });
    await saveState(state);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    await clearPersistedState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    // After clearing, the subsequent load auto-creates a new blank
    // scene — verified by checking that tokens are gone.
    const after = await loadPersistedState();
    expect(after?.tokens).toEqual([]);
  });

  it('saveStateSync writes only to localStorage (no IDB round-trip)', () => {
    const state = createDefaultState();
    saveStateSync(state);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('skips the localStorage backup for oversized states but still saves to IDB', async () => {
    const state = createDefaultState();
    state.tokens.push({
      id: 'big',
      x: 0,
      y: 0,
      label: 'x'.repeat(5 * 1024 * 1024),
      color: '#000',
      imageId: null,
      size: 1,
      borderColor: null,
      hp: null,
      conditions: [],
      rotation: 0,
      losRadius: null,
      light: null,    });
    // Seed LS with an old value so we can detect that the oversized
    // save removed it rather than overwriting.
    localStorage.setItem(STORAGE_KEY, '"stale"');

    await saveState(state);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // IDB still has the big blob — a fresh load should see the token.
    const restored = await loadPersistedState();
    expect(restored?.tokens[0]?.id).toBe('big');
  });
});
