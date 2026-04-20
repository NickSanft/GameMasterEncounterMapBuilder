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

beforeEach(() => {
  _resetDBForTests();
});

describe('saveState / loadPersistedState', () => {
  it('returns null when nothing is stored', async () => {
    expect(await loadPersistedState()).toBeNull();
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
    });
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

  it('rejects unknown version blobs in localStorage fallback', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(await loadPersistedState()).toBeNull();
  });

  it('tolerates malformed JSON by returning null', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(await loadPersistedState()).toBeNull();
  });

  it('clearPersistedState removes both IDB and localStorage copies', async () => {
    await saveState(createDefaultState());
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    await clearPersistedState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(await loadPersistedState()).toBeNull();
  });

  it('migrates a legacy localStorage blob into IDB on first load', async () => {
    // Seed only localStorage — simulates a session from before 0.39.0.
    const legacy = createDefaultState();
    legacy.tokens.push({
      id: 'legacy-1',
      x: 5,
      y: 5,
      label: 'Legacy',
      color: '#888',
      imageId: null,
      size: 1,
      borderColor: null,
      hp: null,
      conditions: [],
      rotation: 0,
    });
    // Write via saveStateSync (LS-only, no IDB).
    saveStateSync(legacy);

    const loaded = await loadPersistedState();
    expect(loaded).not.toBeNull();
    expect(loaded!.tokens[0]?.id).toBe('legacy-1');

    // After the first load, IDB should now have the record — verify by
    // clearing LS and loading again.
    localStorage.removeItem(STORAGE_KEY);
    const afterBackfill = await loadPersistedState();
    expect(afterBackfill).not.toBeNull();
    expect(afterBackfill!.tokens[0]?.id).toBe('legacy-1');
  });

  it('saveStateSync writes only to localStorage (no IDB round-trip)', async () => {
    // IDB is empty at start; saveStateSync populates LS only.
    const state = createDefaultState();
    saveStateSync(state);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('skips the localStorage backup for oversized states but still saves to IDB', async () => {
    const state = createDefaultState();
    // Balloon the state past the ~4 MB LS backup limit with a big
    // synthetic token label. Serialization produces a string of roughly
    // that size.
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
    });
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
