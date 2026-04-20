import { describe, it, expect } from 'vitest';
import {
  saveState,
  loadPersistedState,
  clearPersistedState,
} from './persistence.js';
import { createDefaultState } from './types.js';
import { STORAGE_KEY } from '../util/constants.js';

describe('saveState / loadPersistedState', () => {
  it('returns null when nothing is stored', () => {
    expect(loadPersistedState()).toBeNull();
  });

  it('round-trips a session state', () => {
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
    });
    state.fog[0] = 1;
    state.fog[99] = 1;

    saveState(state);
    const restored = loadPersistedState();
    expect(restored).not.toBeNull();
    expect(restored!.tokens).toEqual(state.tokens);
    expect(restored!.fog).toBeInstanceOf(Uint8Array);
    expect(restored!.fog[0]).toBe(1);
    expect(restored!.fog[99]).toBe(1);
    expect(restored!.grid).toEqual(state.grid);
  });

  it('rejects unknown version blobs', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadPersistedState()).toBeNull();
  });

  it('tolerates malformed JSON by returning null', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(loadPersistedState()).toBeNull();
  });

  it('clearPersistedState removes the entry', () => {
    saveState(createDefaultState());
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    clearPersistedState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
