import { describe, it, expect } from 'vitest';
import { createFirstUseHintsStore } from './first-use-hints.js';

function makeMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    /** Test-only inspector. */
    _peek: (k: string) => map.get(k),
  };
}

describe('createFirstUseHintsStore', () => {
  it('starts empty when no prior persisted state', () => {
    const storage = makeMemoryStorage();
    const store = createFirstUseHintsStore({ storage });
    expect(store.listShown()).toEqual([]);
    expect(store.wasShown('any')).toBe(false);
  });

  it('markShown() persists + survives a fresh store reading the same storage', () => {
    const storage = makeMemoryStorage();
    const a = createFirstUseHintsStore({ storage });
    a.markShown('hint-1');
    a.markShown('hint-2');
    expect(a.wasShown('hint-1')).toBe(true);
    expect(a.wasShown('hint-2')).toBe(true);

    const b = createFirstUseHintsStore({ storage });
    expect(b.wasShown('hint-1')).toBe(true);
    expect(b.wasShown('hint-2')).toBe(true);
  });

  it('markShown() is idempotent (no double-write, listShown stable)', () => {
    const storage = makeMemoryStorage();
    const store = createFirstUseHintsStore({ storage });
    store.markShown('x');
    store.markShown('x');
    store.markShown('x');
    expect(store.listShown()).toEqual(['x']);
  });

  it('reset() forgets every shown hint + clears localStorage', () => {
    const storage = makeMemoryStorage();
    const store = createFirstUseHintsStore({ storage });
    store.markShown('hint-1');
    store.markShown('hint-2');
    store.reset();
    expect(store.listShown()).toEqual([]);
    expect(store.wasShown('hint-1')).toBe(false);
    expect(storage._peek('gm-encounter-maps-first-use-hints')).toBeUndefined();
  });

  it('reset() on an empty set is a no-op (does not write to storage)', () => {
    const storage = makeMemoryStorage();
    let writeCount = 0;
    const wrapped = {
      ...storage,
      setItem: (k: string, v: string) => {
        writeCount++;
        storage.setItem(k, v);
      },
    };
    const store = createFirstUseHintsStore({ storage: wrapped });
    store.reset();
    expect(writeCount).toBe(0);
  });

  it('honors a custom key', () => {
    const storage = makeMemoryStorage();
    const store = createFirstUseHintsStore({ storage, key: 'custom-key' });
    store.markShown('hint');
    expect(storage._peek('custom-key')).toBeTruthy();
    expect(storage._peek('gm-encounter-maps-first-use-hints')).toBeUndefined();
  });

  it('drops malformed persisted state (non-array, non-string entries)', () => {
    const storage = makeMemoryStorage();
    storage.setItem(
      'gm-encounter-maps-first-use-hints',
      JSON.stringify(['ok', 42, null, '', 'good']),
    );
    const store = createFirstUseHintsStore({ storage });
    // Filtered: drops 42 (number), null, and '' (empty string).
    expect(store.listShown().sort()).toEqual(['good', 'ok']);
  });

  it('treats malformed JSON as empty', () => {
    const storage = makeMemoryStorage();
    storage.setItem('gm-encounter-maps-first-use-hints', '{not json');
    const store = createFirstUseHintsStore({ storage });
    expect(store.listShown()).toEqual([]);
  });

  it('treats a non-array JSON value as empty', () => {
    const storage = makeMemoryStorage();
    storage.setItem(
      'gm-encounter-maps-first-use-hints',
      JSON.stringify({ shown: ['hint'] }),
    );
    const store = createFirstUseHintsStore({ storage });
    expect(store.listShown()).toEqual([]);
  });

  it('survives a localStorage write throwing (quota / privacy mode)', () => {
    const throwingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    const store = createFirstUseHintsStore({ storage: throwingStorage });
    // markShown should NOT throw, but the in-memory set still updates.
    expect(() => store.markShown('hint')).not.toThrow();
    expect(store.wasShown('hint')).toBe(true);
  });
});
